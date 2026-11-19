import { allBehaviors } from '../../behaviors';
import { useObjects } from '../../state/world';
import { initialWorldState, setWorldState, getWorldState } from '../../state/worldStore';
import { ActorChannel } from '../actors';
import { ManualClock } from '../clock';
import type { WorldEvent } from '../events';
import { IDLE_LONG_MS, IDLE_SHORT_MS, World } from '../world';

function setup() {
  setWorldState(initialWorldState());
  useObjects.getState().resetObjects();
  const clock = new ManualClock();
  const actors = new ActorChannel();
  const world = new World({ clock, actors, seed: 1234, behaviors: allBehaviors() });
  const events: WorldEvent[] = [];
  world.bus.onAny((e) => events.push(e));
  // pretend every actor is mounted so commands are observable
  const received: Array<[string, string]> = [];
  for (const id of ['pim', 'dot', 'tick', 'lumen', 'ferdinand', 'nimbus', 'button', 'picture', 'room'] as const) {
    actors.subscribe(id, (cmd) => received.push([id, cmd.type]));
  }
  world.enterRoom('living');
  const advance = (ms: number) => {
    for (let t = 0; t < ms; t += 500) {
      clock.advance(500);
      world.tick();
    }
  };
  return { clock, world, events, received, actors, advance };
}

describe('world integration', () => {
  it('repeated clicks on one object → annoyed mood → characters react → recovery', () => {
    const { world, events, actors, advance } = setup();
    advance(5000);
    for (let i = 0; i < 8; i++) {
      world.emit('OBJECT_CLICKED', { target: 'lumen', repeat: i + 1, via: 'pointer' });
      advance(250);
    }
    advance(500);
    const moodChanges = events.filter((e) => e.type === 'MOOD_CHANGED').map((e) => e.type === 'MOOD_CHANGED' && e.payload.to);
    expect(moodChanges).toContain('annoyed');
    expect(actors.history.some((h) => h.id === 'pim' && h.cmd.type === 'say')).toBe(true);
    advance(25_000);
    expect(getWorldState().mood).not.toBe('annoyed');
    const last = events.filter((e) => e.type === 'MOOD_CHANGED').pop();
    expect(last && last.type === 'MOOD_CHANGED' && last.payload.from).toBeTruthy();
  });

  it('emits idle events at both thresholds and an active event on return', () => {
    const { world, events, advance } = setup();
    advance(IDLE_SHORT_MS + 500);
    expect(events.filter((e) => e.type === 'USER_IDLE')).toHaveLength(1);
    advance(IDLE_LONG_MS - IDLE_SHORT_MS);
    const idles = events.filter((e) => e.type === 'USER_IDLE');
    expect(idles).toHaveLength(2);
    expect(idles[1]!.type === 'USER_IDLE' && idles[1]!.payload.level).toBe('long');
    world.emit('POINTER_MOVED', { speed: 0.3 });
    const active = events.find((e) => e.type === 'USER_ACTIVE');
    expect(active && active.type === 'USER_ACTIVE' && active.payload.idleMs).toBeGreaterThanOrEqual(IDLE_LONG_MS);
  });

  it('falls asleep when ignored and wakes on direct input', () => {
    const { world, advance, actors } = setup();
    advance(IDLE_LONG_MS + 1000);
    expect(world.scheduler.activeOn('room')).toBe('idle.long');
    world.emit('OBJECT_CLICKED', { target: 'pim', repeat: 1, via: 'pointer' });
    expect(world.scheduler.activeOn('room')).toBeNull();
    expect(actors.history.some((h) => h.id === 'tick' && h.cmd.type === 'say')).toBe(true);
  });

  it('counts interactions per object', () => {
    const { world } = setup();
    world.emit('OBJECT_CLICKED', { target: 'pim', repeat: 1, via: 'pointer' });
    world.emit('OBJECT_CLICKED', { target: 'pim', repeat: 2, via: 'pointer' });
    world.emit('OBJECT_CLICKED', { target: 'lumen', repeat: 1, via: 'keyboard' });
    expect(getWorldState().counts).toEqual({ pim: 2, lumen: 1 });
    expect(world.view().recent('pim', 1000)).toBe(2);
  });

  it('entering another room cancels running reactions and records visits', () => {
    const { world, advance } = setup();
    advance(IDLE_LONG_MS + 1000);
    expect(world.scheduler.activeCount()).toBeGreaterThan(0);
    expect(world.scheduler.activeOn('room')).toBe('idle.long');
    world.enterRoom('mood');
    // the old room's reactions are gone (the new room may greet you)
    expect(world.scheduler.activeOn('room')).toBeNull();
    expect(getWorldState().room).toBe('mood');
    expect(getWorldState().roomVisits.mood).toBe(1);
    world.enterRoom('living');
    expect(getWorldState().roomVisits.living).toBe(2);
  });

  it('mood persists across rooms (inter-room continuity)', () => {
    const { world, advance } = setup();
    advance(5000);
    world.emit('OBJECT_STATE_CHANGED', { target: 'mood:feather', key: 'use', value: true });
    world.emit('OBJECT_STATE_CHANGED', { target: 'mood:feather', key: 'use', value: true });
    advance(5000);
    const mood = getWorldState().mood;
    expect(mood).toBe('mischievous');
    world.enterRoom('living');
    advance(500);
    expect(getWorldState().mood).toBe('mischievous');
  });

  it('bounds chained event depth', () => {
    const { world, events } = setup();
    let count = 0;
    world.bus.on('RARE_EVENT', () => {
      count++;
    });
    world.use({
      onEvent: (ev, w) => {
        if (ev.type === 'RARE_EVENT') w.emit('RARE_EVENT', { event: 'loop' }, ev.depth + 1);
      },
    });
    world.emit('RARE_EVENT', { event: 'loop' });
    expect(count).toBe(5); // depth 0..4
    expect(events.length).toBeGreaterThan(0);
  });

  it('session reset clears counters and calms reactions but keeps trust', () => {
    const { world, advance } = setup();
    world.personality = { ...world.personality, vars: { ...world.personality.vars, trust: 0.7 } };
    world.emit('OBJECT_CLICKED', { target: 'pim', repeat: 1, via: 'pointer' });
    advance(IDLE_LONG_MS + 1000);
    world.resetSession();
    expect(getWorldState().counts).toEqual({});
    expect(world.scheduler.activeCount()).toBe(0);
    expect(world.personality.vars.trust).toBeCloseTo(0.7, 1);
  });
});
