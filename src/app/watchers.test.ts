import { allBehaviors } from '../behaviors';
import { ActorChannel } from '../engine/actors';
import { ManualClock } from '../engine/clock';
import { World } from '../engine/world';
import { useKeepsakes } from '../state/keepsakes';
import { getWorldState, initialWorldState, setWorldState } from '../state/worldStore';
import { HOMEBODY_MS, isSmallHours, isTour, knownRooms, startWatchers } from './watchers';

describe('visit-shaped discoveries', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setWorldState(initialWorldState());
    useKeepsakes.getState().reset();
  });
  afterEach(() => vi.useRealTimers());

  const makeWorld = () => new World({ clock: new ManualClock(), actors: new ActorChannel(), seed: 2, behaviors: allBehaviors() });

  it('night owl is midnight to four, your clock', () => {
    expect(isSmallHours(new Date(2026, 10, 20, 2, 30))).toBe(true);
    expect(isSmallHours(new Date(2026, 10, 20, 4, 0))).toBe(false);
    vi.setSystemTime(new Date(2026, 10, 20, 1, 0));
    const stop = startWatchers(makeWorld());
    expect(getWorldState().discoveries['night-owl']).toBeDefined();
    stop();
  });

  it('tourist: every known room within ninety seconds (the attic only once found)', () => {
    expect(knownRooms()).not.toContain('attic');
    const t = 1_000_000;
    const all = Object.fromEntries(knownRooms().map((r, i) => [r, t + i * 1000]));
    expect(isTour(all, t + 10_000)).toBe(true);
    expect(isTour(all, t + 200_000)).toBe(false);
    useKeepsakes.getState().unlockAttic();
    expect(isTour(all, t + 10_000)).toBe(false);
  });

  it('touring through the rooms counts', () => {
    vi.setSystemTime(new Date(2026, 10, 20, 12, 0));
    const world = makeWorld();
    const stop = startWatchers(world);
    for (const r of knownRooms()) world.enterRoom(r);
    expect(getWorldState().discoveries.tourist).toBeDefined();
    stop();
  });

  it('homebody: five minutes in one room', () => {
    vi.setSystemTime(new Date(2026, 10, 20, 12, 0));
    const stop = startWatchers(makeWorld());
    vi.advanceTimersByTime(HOMEBODY_MS - 20_000);
    expect(getWorldState().discoveries.homebody).toBeUndefined();
    vi.advanceTimersByTime(30_000);
    expect(getWorldState().discoveries.homebody).toBeDefined();
    stop();
  });
});
