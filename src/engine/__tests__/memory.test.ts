import { allBehaviors } from '../../behaviors';
import { clearMemory, composeMemory, setMemoryEnabled, startMemory } from '../../app/memorySync';
import { nickname, favoriteOf } from '../../content/nickname';
import { useSettings } from '../../state/settings';
import { useObjects } from '../../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../../state/worldStore';
import { ActorChannel } from '../actors';
import { ManualClock } from '../clock';
import { MEMORY_KEY, MEMORY_OFF_KEY, MemoryManager, SESSION_KEY, emptyMemory, migrateV1, validateV2, type MemoryV1 } from '../memory';
import { World } from '../world';

class FakeStorage implements Storage {
  map = new Map<string, string>();
  failWrites = false;
  failReads = false;
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    if (this.failReads) throw new Error('SecurityError');
    return this.map.get(k) ?? null;
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  setItem(k: string, v: string) {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.map.set(k, v);
  }
}

const NOW = 1_700_000_000_000;

describe('memory manager', () => {
  it('starts fresh with nothing stored', () => {
    const r = new MemoryManager(new FakeStorage()).load(NOW);
    expect(r.status).toBe('fresh');
    expect(r.data.visits).toBe(0);
  });

  it('restores what it saved', () => {
    const storage = new FakeStorage();
    const mm = new MemoryManager(storage);
    const data = { ...emptyMemory(NOW), visits: 3, discoveries: { hello: NOW }, counts: { pim: 7 } };
    expect(mm.save(data)).toBe(true);
    const r = mm.load(NOW + 1);
    expect(r.status).toBe('restored');
    expect(r.data.visits).toBe(3);
    expect(r.data.counts.pim).toBe(7);
  });

  it('migrates schema v1 to v2', () => {
    const storage = new FakeStorage();
    const v1: MemoryV1 = {
      version: 1,
      visits: 4,
      firstVisit: NOW - 1000,
      lastVisit: NOW - 10,
      discoveries: ['hello', 'keyhole', 'BAD ID!'],
      counts: { lumen: 9 },
      lastRoom: 'mood',
      settings: { sound: true, motion: 'reduced' },
    };
    storage.setItem(MEMORY_KEY, JSON.stringify(v1));
    const r = new MemoryManager(storage).load(NOW);
    expect(r.status).toBe('migrated');
    expect(r.data.version).toBe(2);
    expect(Object.keys(r.data.discoveries).sort()).toEqual(['hello', 'keyhole']);
    expect(r.data.lastRoom).toBe('mood');
    expect(r.data.settings.motion).toBe('reduced');
    // migration writes back the new format
    expect(JSON.parse(storage.getItem(MEMORY_KEY)!).version).toBe(2);
    expect(migrateV1({ version: 1 })).toBeNull();
  });

  it('discards corrupt JSON and unknown shapes safely', () => {
    for (const bad of ['{not json', JSON.stringify({ version: 99 }), JSON.stringify([1, 2]), JSON.stringify({ version: 2, visits: -1, firstVisit: 0, lastVisit: 0 })]) {
      const storage = new FakeStorage();
      storage.setItem(MEMORY_KEY, bad);
      const r = new MemoryManager(storage).load(NOW);
      expect(r.status).toBe('corrupt');
      expect(storage.getItem(MEMORY_KEY)).toBeNull();
    }
  });

  it('validation strips junk, bounds sizes and clamps values', () => {
    const counts: Record<string, number> = { '<script>': 5, pim: 3, 'ok-id': Number.NaN };
    for (let i = 0; i < 100; i++) counts[`obj${i}`] = i;
    const v = validateV2({ ...emptyMemory(NOW), trust: 7, counts, lastRoom: 'kitchen', roomVisits: { mood: 2, attic: 9 }, eventTotals: { OBJECT_CLICKED: 4, POINTER_MOVED: 9999 } })!;
    expect(v.trust).toBe(1);
    expect(Object.keys(v.counts).length).toBeLessThanOrEqual(40);
    expect(v.counts['<script>']).toBeUndefined();
    expect(v.counts['ok-id']).toBeUndefined();
    expect(v.lastRoom).toBeNull();
    expect(v.roomVisits).toEqual({ mood: 2 });
    expect(v.eventTotals).toEqual({ OBJECT_CLICKED: 4 });
  });

  it('survives storage failures', () => {
    const storage = new FakeStorage();
    const mm = new MemoryManager(storage);
    storage.failWrites = true;
    expect(mm.save(emptyMemory(NOW))).toBe(false);
    expect(mm.lastError).toMatch(/Quota/);
    storage.failReads = true;
    expect(mm.load(NOW).status).toBe('unavailable');
    expect(new MemoryManager(null).load(NOW).status).toBe('unavailable');
  });

  it('turning memory off deletes data and refuses to save', () => {
    const storage = new FakeStorage();
    const mm = new MemoryManager(storage);
    mm.save({ ...emptyMemory(NOW), visits: 2 });
    mm.setDisabled(true);
    expect(storage.getItem(MEMORY_KEY)).toBeNull();
    expect(storage.getItem(MEMORY_OFF_KEY)).toBe('1');
    expect(mm.save(emptyMemory(NOW))).toBe(false);
    expect(mm.load(NOW).status).toBe('disabled');
    mm.setDisabled(false);
    expect(mm.save(emptyMemory(NOW))).toBe(true);
  });
});

describe('nickname', () => {
  it('is deterministic and based on favourite objects and visits', () => {
    expect(nickname({ counts: {}, visits: 1, discoveries: 0 })).toBe('Polite Stranger');
    expect(nickname({ counts: { lumen: 5, pim: 2 }, visits: 1, discoveries: 0 })).toBe('Lamp Botherer');
    expect(nickname({ counts: { 'shape:ball': 9 }, visits: 3, discoveries: 0 })).toBe('Returning Professor of Gravity');
    expect(nickname({ counts: { button: 9 }, visits: 8, discoveries: 14 })).toBe('Legendary Presser of Forbidden Buttons');
    expect(favoriteOf({ 'hover:pim': 99, dot: 3 })).toBe('dot');
    expect(favoriteOf({ dot: 2 })).toBeNull();
  });
});

describe('memory sync (startMemory)', () => {
  function setup() {
    localStorage.clear();
    sessionStorage.clear();
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
    useSettings.getState().hydrate({ memoryEnabled: true, sound: false, afterHours: false });
    const actors = new ActorChannel();
    actors.subscribe('pim', () => {});
    const world = new World({ clock: new ManualClock(), actors, seed: 1, behaviors: allBehaviors() });
    return { world, actors };
  }

  it('counts a visit once per tab session and recognizes a returning visitor', () => {
    vi.useFakeTimers();
    const { world } = setup();
    let stop = startMemory(world);
    expect(getWorldState().visits).toBe(1);
    expect(getWorldState().returning).toBe(false);
    stop();
    // reload in the same tab: not a new visit
    stop = startMemory(world);
    expect(getWorldState().visits).toBe(1);
    stop();
    // a new tab session
    sessionStorage.removeItem(SESSION_KEY);
    const events: string[] = [];
    world.bus.onAny((e) => events.push(e.type));
    stop = startMemory(world);
    expect(getWorldState().visits).toBe(2);
    expect(getWorldState().returning).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(events).toContain('MEMORY_RESTORED');
    stop();
    vi.useRealTimers();
  });

  it('persists discoveries and restores them next visit', () => {
    vi.useFakeTimers();
    const { world } = setup();
    const stop = startMemory(world);
    world.discover('hello');
    stop();
    expect(JSON.parse(localStorage.getItem(MEMORY_KEY)!).discoveries.hello).toBeDefined();
    setWorldState(initialWorldState());
    const stop2 = startMemory(world);
    expect(getWorldState().discoveries.hello).toBeDefined();
    stop2();
    vi.useRealTimers();
  });

  it('third visit triggers the returning surprise', () => {
    vi.useFakeTimers();
    const { world } = setup();
    localStorage.setItem(MEMORY_KEY, JSON.stringify({ ...emptyMemory(NOW), visits: 2 }));
    const stop = startMemory(world);
    vi.advanceTimersByTime(1500);
    expect(getWorldState().discoveries.returning).toBeDefined();
    expect(world.scheduler.log.map((l) => l.id)).toContain('return.surprise');
    stop();
    vi.useRealTimers();
  });

  it('never stores per-pointer data, typed text or hover counts', () => {
    const { world } = setup();
    world.emit('POINTER_ENTERED', { target: 'pim', speed: 1 });
    world.emit('KEY_PRESSED', { key: 'h' });
    world.emit('OBJECT_CLICKED', { target: 'pim', repeat: 1, via: 'pointer' });
    const m = composeMemory(NOW);
    const text = JSON.stringify(m);
    expect(text).not.toContain('hover:');
    expect(text).not.toContain('"h"');
    expect(m.counts.pim).toBe(1);
  });

  it('Forget me clears storage and the session knowledge', () => {
    vi.useFakeTimers();
    const { world } = setup();
    const stop = startMemory(world);
    world.discover('hello');
    stop();
    clearMemory(world);
    expect(localStorage.getItem(MEMORY_KEY)).toBeNull();
    expect(getWorldState().discoveries).toEqual({});
    expect(getWorldState().visits).toBe(1);
    vi.useRealTimers();
  });

  it('memory off stops saving', () => {
    const { world } = setup();
    setMemoryEnabled(false);
    world.discover('hello');
    expect(localStorage.getItem(MEMORY_KEY)).toBeNull();
    setMemoryEnabled(true);
    expect(localStorage.getItem(MEMORY_KEY)).not.toBeNull();
  });
});

describe('forget me while memory sync is running', () => {
  it('storage stays empty after Forget me, until something new is discovered', () => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    setWorldState(initialWorldState());
    useSettings.getState().hydrate({ memoryEnabled: true });
    const world = new World({ clock: new ManualClock(), actors: new ActorChannel(), seed: 2, behaviors: allBehaviors() });
    const stop = startMemory(world);
    world.discover('hello');
    expect(localStorage.getItem(MEMORY_KEY)).not.toBeNull();
    clearMemory(world);
    vi.advanceTimersByTime(20_000);
    expect(localStorage.getItem(MEMORY_KEY)).toBeNull();
    world.discover('wonk');
    expect(localStorage.getItem(MEMORY_KEY)).not.toBeNull();
    stop();
    vi.useRealTimers();
  });
});
