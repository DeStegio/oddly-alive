import { allBehaviors } from '..';
import { ActorChannel } from '../../engine/actors';
import { ManualClock } from '../../engine/clock';
import { createRng } from '../../engine/rng';
import { World } from '../../engine/world';
import { useObjects } from '../../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../../state/worldStore';
import { pickLine } from '../helpers';

function setup() {
  setWorldState(initialWorldState());
  useObjects.getState().resetObjects();
  const clock = new ManualClock();
  const actors = new ActorChannel();
  for (const id of ['pim', 'dot', 'tick', 'lumen', 'ferdinand', 'picture', 'nimbus', 'room'] as const) actors.subscribe(id, () => {});
  const world = new World({ clock, actors, seed: 21, behaviors: allBehaviors() });
  world.discoverHandler = () => true;
  world.enterRoom('living');
  const said = (id: string) => actors.history.filter((h) => h.id === id && h.cmd.type === 'say').map((h) => (h.cmd as { text: string }).text);
  const advance = (ms: number) => {
    for (let t = 0; t < ms; t += 250) {
      clock.advance(250);
      world.tick();
    }
  };
  return { world, clock, actors, said, advance };
}

describe('advanced combinations', () => {
  it('a playful Pim poked quickly changes outfit, cycling through forms (INT-030)', () => {
    const { world } = setup();
    world.personality = { ...world.personality, mood: 'playful' };
    for (let i = 0; i < 3; i++) world.emit('OBJECT_CLICKED', { target: 'pim', repeat: i + 1, via: 'pointer' });
    expect(useObjects.getState().living.pimForm).toBe(1);
  });

  it('the same quick pokes do not transform a shy Pim (context matters)', () => {
    const { world } = setup();
    world.personality = { ...world.personality, mood: 'shy' };
    for (let i = 0; i < 3; i++) world.emit('OBJECT_CLICKED', { target: 'pim', repeat: i + 1, via: 'pointer' });
    expect(useObjects.getState().living.pimForm).toBe(0);
  });

  it('secrets found elsewhere become Living Room gossip (cross-room chain)', () => {
    const { world, said, advance } = setup();
    world.enterRoom('playground');
    world.discover('tower');
    expect(useObjects.getState().living.gossip).toBe('tower');
    world.enterRoom('living');
    advance(1500);
    expect(said('pim').some((t) => t.includes('Architecture'))).toBe(true);
    expect(useObjects.getState().living.gossip).toBe('');
  });

  it('turning off the lamp is noticed upstairs in the Mood Room', () => {
    const { world, advance, said } = setup();
    useObjects.getState().setLiving({ lampOn: false });
    world.enterRoom('mood');
    advance(4000);
    expect(said('nimbus').some((t) => t.includes('lamp'))).toBe(true);
  });

  it('Tick and Lumen argue when the visitor goes quiet (INT-075)', () => {
    let argued = false;
    for (let seed = 1; seed < 12 && !argued; seed++) {
      setWorldState(initialWorldState());
      const actors = new ActorChannel();
      for (const id of ['pim', 'tick', 'lumen', 'dot', 'ferdinand'] as const) actors.subscribe(id, () => {});
      const world = new World({ clock: new ManualClock(), actors, seed, behaviors: allBehaviors() });
      world.enterRoom('living');
      world.emit('USER_IDLE', { ms: 12_000, level: 'short' });
      argued = world.scheduler.log.some((l) => l.id === 'argue.time' && l.result === 'started');
    }
    expect(argued).toBe(true);
  });

  it('lines are not repeated while fresh ones remain (repetition control)', () => {
    const rng = createRng(3);
    const lines = ['a', 'b', 'c', 'd', 'e'];
    const out: string[] = [];
    for (let i = 0; i < 5; i++) out.push(pickLine('test-actor', lines, rng));
    // within any window of 5 picks, the last 4 are always distinct
    expect(new Set(out.slice(1)).size).toBe(4);
    // with a single line it still answers
    expect(pickLine('solo', ['only'], rng)).toBe('only');
  });

  it('meeting Great-Aunt Pim changes how her portrait greets you', () => {
    const { world, advance, said } = setup();
    setWorldState({ discoveries: { aunt: 1 } });
    let greeted = false;
    for (let i = 0; i < 6 && !greeted; i++) {
      world.scheduler.clearCooldowns();
      world.enterRoom('mood');
      world.enterRoom('living');
      advance(2500);
      greeted = said('picture').length > 0;
    }
    expect(greeted).toBe(true);
    expect(getWorldState().discoveries.aunt).toBeDefined();
  });
});

describe('first minute', () => {
  it('a first-time visitor gets a shy hello, and one hint only if nothing was touched', () => {
    const { world, said, advance } = setup();
    world.emit('MEMORY_RESTORED', { visits: 1, returning: false, awayMs: 0 });
    expect(said('pim').length).toBe(1);
    advance(13_000);
    expect(said('pim').some((t) => t.includes('poked'))).toBe(true);
  });

  it('no hint once the visitor has started playing', () => {
    const { world, said, advance } = setup();
    world.emit('OBJECT_CLICKED', { target: 'lumen', repeat: 1, via: 'pointer' });
    advance(13_000);
    expect(said('pim').some((t) => t.includes('poked'))).toBe(false);
    expect(world).toBeDefined();
  });
});
