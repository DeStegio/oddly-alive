import { ActorChannel } from '../actors';
import { BehaviorEngine, BehaviorRegistry, defineBehavior, type WorldEffects, type WorldView } from '../behaviorEngine';
import { EventBus } from '../bus';
import { ManualClock } from '../clock';
import { makeEvent, type EventType, type WorldEvent } from '../events';
import { createRng, hashString, weightedPick } from '../rng';
import { Priority, ReactionScheduler } from '../scheduler';

const meta = { room: 'living' as const, timestamp: 0 };

describe('event bus', () => {
  it('delivers typed events to type and wildcard listeners, and unsubscribes', () => {
    const bus = new EventBus();
    const seen: string[] = [];
    const off = bus.on('OBJECT_CLICKED', (e) => seen.push(`click:${e.payload.target}`));
    bus.onAny((e) => seen.push(`any:${e.type}`));
    bus.emit(makeEvent('OBJECT_CLICKED', { target: 'pim', repeat: 1, via: 'pointer' }, meta));
    off();
    bus.emit(makeEvent('OBJECT_CLICKED', { target: 'lamp', repeat: 1, via: 'pointer' }, meta));
    expect(seen).toEqual(['click:pim', 'any:OBJECT_CLICKED', 'any:OBJECT_CLICKED']);
  });

  it('isolates handler errors', () => {
    const errors: unknown[] = [];
    const bus = new EventBus((err) => errors.push(err));
    let reached = false;
    bus.on('USER_IDLE', () => {
      throw new Error('bad');
    });
    bus.on('USER_IDLE', () => (reached = true));
    bus.emit(makeEvent('USER_IDLE', { ms: 1, level: 'short' }, meta));
    expect(reached).toBe(true);
    expect(errors).toHaveLength(1);
  });
});

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect(createRng(43)()).not.toBe(seqA[0]);
    for (const v of seqA) expect(v >= 0 && v < 1).toBe(true);
  });

  it('hashes strings stably', () => {
    expect(hashString('oddly')).toBe(hashString('oddly'));
    expect(hashString('oddly')).not.toBe(hashString('alive'));
  });

  it('weightedPick respects weight boundaries', () => {
    const items = [
      { item: 'never', weight: 0 },
      { item: 'neg', weight: -3 },
      { item: 'nan', weight: Number.NaN },
      { item: 'a', weight: 1 },
      { item: 'b', weight: 3 },
    ];
    const rng = createRng(1);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) {
      const p = weightedPick(items, rng) as string;
      counts[p] = (counts[p] ?? 0) + 1;
    }
    expect(counts.never).toBeUndefined();
    expect(counts.neg).toBeUndefined();
    expect(counts.nan).toBeUndefined();
    expect(counts.b! / counts.a!).toBeGreaterThan(2.4);
    expect(counts.b! / counts.a!).toBeLessThan(3.6);
    expect(weightedPick([{ item: 'x', weight: 0 }], rng)).toBeNull();
    expect(weightedPick([], rng)).toBeNull();
    // roll at the extreme top end still returns an eligible item
    expect(weightedPick(items, () => 0.9999999999)).toBe('b');
    expect(weightedPick(items, () => 0)).toBe('a');
  });
});

describe('reaction scheduler', () => {
  function setup(maxAmbient = 2) {
    const clock = new ManualClock();
    const scheduler = new ReactionScheduler(clock, { maxAmbient });
    return { clock, scheduler };
  }

  it('runs a reaction and cleans up after its duration', () => {
    const { clock, scheduler } = setup();
    const log: string[] = [];
    scheduler.schedule({
      id: 'r',
      channel: 'pim',
      priority: Priority.DIRECT,
      durationMs: 500,
      run: () => {
        log.push('start');
        return () => log.push('cleanup');
      },
    });
    expect(scheduler.isBusy('pim')).toBe(true);
    clock.advance(499);
    expect(log).toEqual(['start']);
    clock.advance(1);
    expect(log).toEqual(['start', 'cleanup']);
    expect(scheduler.isBusy('pim')).toBe(false);
    expect(clock.pending()).toBe(0);
  });

  it('higher or equal priority preempts; lower is dropped', () => {
    const { scheduler } = setup();
    const log: string[] = [];
    const mk = (id: string, priority: (typeof Priority)[keyof typeof Priority]) => ({
      id,
      channel: 'pim',
      priority,
      durationMs: 1000,
      run: () => () => log.push(`cleanup:${id}`),
    });
    expect(scheduler.schedule(mk('char', Priority.CHARACTER))).toBe('started');
    expect(scheduler.schedule(mk('ambient', Priority.AMBIENT))).toBe('dropped');
    expect(scheduler.schedule(mk('direct', Priority.DIRECT))).toBe('preempted');
    expect(log).toEqual(['cleanup:char']);
    expect(scheduler.activeOn('pim')).toBe('direct');
  });

  it('enforces cooldowns', () => {
    const { clock, scheduler } = setup();
    const spec = { id: 'c', channel: 'x', priority: Priority.CHARACTER, durationMs: 10, cooldownMs: 1000, run: () => {} };
    expect(scheduler.schedule(spec)).toBe('started');
    clock.advance(20);
    expect(scheduler.schedule(spec)).toBe('cooldown');
    clock.advance(1000);
    expect(scheduler.schedule(spec)).toBe('started');
  });

  it('caps concurrent ambient reactions', () => {
    const { scheduler } = setup(2);
    const amb = (ch: string) => ({ id: ch, channel: ch, priority: Priority.AMBIENT, durationMs: 1000, ambient: true, run: () => {} });
    expect(scheduler.schedule(amb('a'))).toBe('started');
    expect(scheduler.schedule(amb('b'))).toBe('started');
    expect(scheduler.schedule(amb('c'))).toBe('capped');
  });

  it('direct input cancels ambient reactions on other channels', () => {
    const { scheduler } = setup();
    const log: string[] = [];
    scheduler.schedule({ id: 'amb', channel: 'plant', priority: Priority.AMBIENT, durationMs: 5000, ambient: true, run: () => () => log.push('amb-cleanup') });
    scheduler.schedule({ id: 'char', channel: 'tick', priority: Priority.CHARACTER, durationMs: 5000, run: () => {} });
    scheduler.schedule({ id: 'dir', channel: 'pim', priority: Priority.DIRECT, durationMs: 100, run: () => {} });
    expect(log).toEqual(['amb-cleanup']);
    expect(scheduler.isBusy('tick')).toBe(true);
  });

  it('cancellation clears tracked timers so late steps never run', () => {
    const { clock, scheduler } = setup();
    const log: string[] = [];
    scheduler.schedule({
      id: 'steps',
      channel: 'pim',
      priority: Priority.CHARACTER,
      durationMs: 3000,
      run: (ctl) => {
        ctl.after(500, () => log.push('step1'));
        ctl.after(1500, () => log.push('step2'));
      },
    });
    clock.advance(600);
    expect(scheduler.cancelAll()).toBe(1);
    clock.advance(5000);
    expect(log).toEqual(['step1']);
    expect(clock.pending()).toBe(0);
  });

  it('a throwing reaction is dropped without leaking', () => {
    const errors: unknown[] = [];
    const clock = new ManualClock();
    const scheduler = new ReactionScheduler(clock, { onError: (e) => errors.push(e) });
    const res = scheduler.schedule({
      id: 'boom',
      channel: 'x',
      priority: Priority.DIRECT,
      durationMs: 100,
      run: () => {
        throw new Error('boom');
      },
    });
    expect(res).toBe('dropped');
    expect(scheduler.activeCount()).toBe(0);
    expect(clock.pending()).toBe(0);
    expect(errors).toHaveLength(1);
  });
});

describe('behavior engine', () => {
  function makeView(overrides: Partial<WorldView> = {}): WorldView {
    return {
      room: 'living',
      mood: 'neutral',
      weather: 'clear',
      vars: { curiosity: 0.4, energy: 0.5, trust: 0.3, mischief: 0.2, stimulation: 0, fatigue: 0 },
      afterHours: false,
      reducedMotion: false,
      visits: 1,
      sessionMs: 0,
      count: () => 0,
      recent: () => 0,
      discovered: () => false,
      discoveredCount: () => 0,
      roomVisits: () => 1,
      moodsSeen: () => 1,
      favorite: () => null,
      flag: () => undefined,
      ...overrides,
    };
  }

  function setup(view: WorldView = makeView(), seed = 7) {
    const clock = new ManualClock();
    const scheduler = new ReactionScheduler(clock);
    const registry = new BehaviorRegistry();
    const actors = new ActorChannel();
    const emitted: Array<{ type: EventType; parent: WorldEvent }> = [];
    const effects: WorldEffects = { setFlag: () => {}, discover: () => {}, nudge: () => {}, announce: () => {}, sound: () => {} };
    const engine = new BehaviorEngine({
      registry,
      scheduler,
      rng: createRng(seed),
      actors,
      effects,
      view: () => view,
      now: () => clock.now(),
      emit: (type, _payload, parent) => emitted.push({ type, parent }),
    });
    return { clock, scheduler, registry, engine, emitted, actors };
  }

  const click = (target: string) => makeEvent('OBJECT_CLICKED', { target, repeat: 1, via: 'pointer' }, meta);

  it('filters by event type, room, predicate and cooldown', () => {
    const { registry, engine, clock } = setup();
    const ran: string[] = [];
    registry.register(
      defineBehavior({
        id: 'pim-click',
        on: ['OBJECT_CLICKED'],
        priority: Priority.DIRECT,
        cooldownMs: 1000,
        when: (ctx) => ctx.event.payload.target === 'pim',
        react: () => ({ channel: 'pim', durationMs: 100, run: () => void ran.push('pim') }),
      }),
      defineBehavior({
        id: 'playground-only',
        on: ['OBJECT_CLICKED'],
        rooms: ['playground'],
        priority: Priority.DIRECT,
        react: () => ({ channel: 'x', durationMs: 100, run: () => void ran.push('wrong-room') }),
      }),
    );
    engine.handle(click('lamp'));
    engine.handle(click('pim'));
    engine.handle(click('pim'));
    clock.advance(1001);
    engine.handle(click('pim'));
    expect(ran).toEqual(['pim', 'pim']);
  });

  it('picks one behavior per group and suppresses recent repeats', () => {
    const { registry, engine, clock } = setup(makeView(), 3);
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (const id of ['a', 'b']) {
      registry.register(
        defineBehavior({
          id,
          on: ['OBJECT_CLICKED'],
          group: 'variants',
          priority: Priority.DIRECT,
          weight: id === 'a' ? 10 : 1,
          react: () => ({ channel: 'pim', durationMs: 10, run: () => void counts[id]!++ }),
        }),
      );
    }
    for (let i = 0; i < 200; i++) {
      engine.handle(click('pim'));
      clock.advance(20);
    }
    expect(counts.a! + counts.b!).toBe(200);
    // Without suppression 'b' would win ~9%; recent-penalty lifts it noticeably.
    expect(counts.b!).toBeGreaterThan(20);
    expect(counts.a!).toBeGreaterThan(counts.b!);
  });

  it('is deterministic for the same seed', () => {
    const run = () => {
      const { registry, engine, clock } = setup(makeView(), 99);
      const order: string[] = [];
      for (const id of ['x', 'y', 'z']) {
        registry.register(
          defineBehavior({
            id,
            on: ['OBJECT_CLICKED'],
            group: 'g',
            priority: Priority.DIRECT,
            react: () => ({ channel: 'c', durationMs: 1, run: () => void order.push(id) }),
          }),
        );
      }
      for (let i = 0; i < 20; i++) {
        engine.handle(click('pim'));
        clock.advance(5);
      }
      return order.join('');
    };
    expect(run()).toBe(run());
  });

  it('runs higher-priority groups first and respects chance', () => {
    const { registry, engine } = setup();
    const order: string[] = [];
    registry.register(
      defineBehavior({ id: 'amb', on: ['USER_IDLE'], priority: Priority.AMBIENT, react: () => ({ channel: 'a', durationMs: 1, run: () => void order.push('amb') }) }),
      defineBehavior({ id: 'char', on: ['USER_IDLE'], priority: Priority.CHARACTER, react: () => ({ channel: 'b', durationMs: 1, run: () => void order.push('char') }) }),
      defineBehavior({ id: 'never', on: ['USER_IDLE'], priority: Priority.RARE, chance: 0, react: () => ({ channel: 'c', durationMs: 1, run: () => void order.push('never') }) }),
    );
    engine.handle(makeEvent('USER_IDLE', { ms: 10000, level: 'short' }, meta));
    expect(order).toEqual(['char', 'amb']);
  });

  it('lets reactions emit chained events with the parent attached', () => {
    const { registry, engine, emitted } = setup();
    registry.register(
      defineBehavior({
        id: 'chain',
        on: ['OBJECT_CLICKED'],
        priority: Priority.DIRECT,
        react: (ctx) => ({
          channel: 'lamp',
          durationMs: 10,
          run: () => ctx.emit('OBJECT_STATE_CHANGED', { target: 'lamp', key: 'on', value: false }),
        }),
      }),
    );
    const ev = click('lamp');
    engine.handle(ev);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]!.type).toBe('OBJECT_STATE_CHANGED');
    expect(emitted[0]!.parent).toBe(ev);
  });

  it('rejects duplicate behavior ids', () => {
    const { registry } = setup();
    const b = defineBehavior({ id: 'dup', on: ['USER_IDLE'], priority: Priority.AMBIENT, react: () => null });
    registry.register(b);
    expect(() => registry.register(b)).toThrow(/Duplicate/);
  });
});
