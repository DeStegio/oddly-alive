import { allBehaviors } from '../../behaviors';
import { SECRETS, SECRET_IDS } from '../../content/secrets';
import { SOLUTION } from '../../rooms/SecretSpace/puzzle';
import { useObjects } from '../../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../../state/worldStore';
import { ActorChannel } from '../actors';
import { ManualClock } from '../clock';
import { createRng } from '../rng';
import { SurpriseDirector } from '../surpriseDirector';
import { World } from '../world';

function setup() {
  setWorldState(initialWorldState());
  useObjects.getState().resetObjects();
  const clock = new ManualClock();
  const actors = new ActorChannel();
  const world = new World({ clock, actors, seed: 5, behaviors: allBehaviors() });
  world.discoverHandler = (id) => SECRET_IDS.has(id);
  return { world, clock, actors };
}

describe('secret registry', () => {
  it('has unique ids, names and hints for every secret', () => {
    expect(new Set(SECRETS.map((s) => s.id)).size).toBe(SECRETS.length);
    for (const s of SECRETS) {
      expect(s.hint.length).toBeGreaterThan(10);
      expect(s.found.length).toBeGreaterThan(10);
    }
  });

  it('every discover() call in behaviors names a registered secret', async () => {
    const files = import.meta.glob('../../behaviors/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const rooms = import.meta.glob('../../rooms/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const ids = new Set<string>();
    for (const src of [...Object.values(files), ...Object.values(rooms)]) {
      for (const m of src.matchAll(/discover\('([a-z-]+)'\)/g)) ids.add(m[1]!);
    }
    expect(ids.size).toBeGreaterThan(10);
    for (const id of ids) expect(SECRET_IDS.has(id)).toBe(true);
  });

  it('records discoveries once and rejects unknown ids', () => {
    const { world } = setup();
    world.discover('hello');
    const first = getWorldState().discoveries.hello;
    world.discover('hello');
    expect(getWorldState().discoveries.hello).toBe(first);
    world.discover('not-a-secret');
    expect(getWorldState().discoveries['not-a-secret']).toBeUndefined();
  });
});

describe('surprise director', () => {
  const room = 'living' as const;

  it('never fires while the visitor is idle', () => {
    const d = new SurpriseDirector(createRng(1), 0, { warmupMs: 0, chancePerTick: 1 });
    expect(d.maybeFire(100_000, room, 60_000, () => {})).toBeNull();
  });

  it('respects warm-up and minimum interval', () => {
    const d = new SurpriseDirector(createRng(1), 0, { warmupMs: 10_000, minIntervalMs: 30_000, chancePerTick: 1 });
    expect(d.maybeFire(5000, room, 0, () => {})).toBeNull();
    expect(d.maybeFire(10_001, room, 0, () => {})).not.toBeNull();
    expect(d.maybeFire(20_000, room, 0, () => {})).toBeNull();
    expect(d.maybeFire(40_002, room, 0, () => {})).not.toBeNull();
  });

  it('filters by room and per-session limits', () => {
    const d = new SurpriseDirector(createRng(2), 0, {
      warmupMs: 0,
      minIntervalMs: 0,
      chancePerTick: 1,
      events: [
        { id: 'once', rooms: 'any', weight: 1, perSession: 1 },
        { id: 'pg', rooms: ['playground'], weight: 100 },
      ],
    });
    expect(d.eligible('living').map((e) => e.id)).toEqual(['once']);
    expect(d.maybeFire(1, 'living', 0, () => {})).toBe('once');
    expect(d.maybeFire(2, 'living', 0, () => {})).toBeNull();
    expect(d.maybeFire(3, 'playground', 0, () => {})).toBe('pg');
  });

  it('prefers events not yet seen (novelty)', () => {
    const d = new SurpriseDirector(createRng(3), 0, {
      warmupMs: 0,
      minIntervalMs: 0,
      chancePerTick: 1,
      events: [
        { id: 'a', rooms: 'any', weight: 1 },
        { id: 'b', rooms: 'any', weight: 1 },
      ],
    });
    const first = d.maybeFire(1, room, 0, () => {});
    let other = 0;
    for (let i = 0; i < 200; i++) {
      const fresh = new SurpriseDirector(createRng(100 + i), 0, { warmupMs: 0, minIntervalMs: 0, chancePerTick: 1, events: [{ id: 'a', rooms: 'any', weight: 1 }, { id: 'b', rooms: 'any', weight: 1 }] });
      fresh.force(first!, 0, { emit: () => {} } as unknown as World);
      if (fresh.maybeFire(1, room, 0, () => {}) !== first) other++;
    }
    expect(other / 200).toBeGreaterThan(0.65);
  });

  it('is deterministic for a seed', () => {
    const run = () => {
      const d = new SurpriseDirector(createRng(77), 0, { warmupMs: 0, minIntervalMs: 0, chancePerTick: 0.3 });
      const out: Array<string | null> = [];
      for (let t = 0; t < 50; t++) out.push(d.maybeFire(t * 1000, room, 0, () => {}));
      return out.join(',');
    };
    expect(run()).toBe(run());
  });
});

describe('secret space and rare event behaviors', () => {
  it('the chest stays locked until the key was found, then opens', () => {
    const { world } = setup();
    world.enterRoom('secret');
    world.emit('OBJECT_CLICKED', { target: 'chest', repeat: 1, via: 'pointer' });
    expect(world.scheduler.log.map((l) => l.id)).toContain('secret.chest.locked');
    useObjects.getState().setSlice('secret', { keyFound: true, chestOpen: true });
    world.emit('OBJECT_STATE_CHANGED', { target: 'chest', key: 'open', value: true });
    expect(getWorldState().discoveries.chest).toBeDefined();
  });

  it('the right token order summons Great-Aunt Pim; a wrong one resets', () => {
    const { world, clock } = setup();
    world.enterRoom('secret');
    useObjects.getState().setSlice('secret', { slots: 'leaf,moon,button' });
    world.emit('OBJECT_STATE_CHANGED', { target: 'cabinet', key: 'slots', value: 'leaf,moon,button' });
    clock.advance(1000);
    expect(useObjects.getState().secret.slots).toBe('');
    world.emit('OBJECT_STATE_CHANGED', { target: 'cabinet', key: 'slots', value: SOLUTION });
    expect(getWorldState().discoveries.aunt).toBeDefined();
  });

  it('the fake error is labelled, resolves itself and counts as a discovery', () => {
    const { world, clock, actors } = setup();
    actors.subscribe('glitch', () => {});
    world.emit('RARE_EVENT', { event: 'fake-error' });
    const says = actors.history.filter((h) => h.id === 'glitch' && h.cmd.type === 'say');
    expect(says).toHaveLength(1);
    clock.advance(3200);
    expect(getWorldState().discoveries.glitch).toBeDefined();
    clock.advance(2000);
    expect(world.scheduler.isBusy('glitch')).toBe(false);
  });

  it('catching Inch on his walk is a secret', () => {
    const { world } = setup();
    world.emit('RARE_EVENT', { event: 'inch-crawl' });
    world.emit('OBJECT_CLICKED', { target: 'visitor', repeat: 1, via: 'pointer' });
    expect(getWorldState().discoveries.inch).toBeDefined();
  });
});
