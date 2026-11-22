import { ActorChannel } from '../engine/actors';
import { AgentDirector } from '../engine/agents/director';
import { CAST } from '../engine/agents/cast';
import { ManualClock } from '../engine/clock';
import { MAX_STORY, cleanWorld, emptyWorldMemory } from '../engine/memory';
import { createRng } from '../engine/rng';
import { World } from '../engine/world';
import { LIVING_GOALS } from '../rooms/LivingRoom/agentGoals';
import { useKeepsakes } from '../state/keepsakes';
import { initialWorldState, setWorldState } from '../state/worldStore';
import { continuity } from './continuity';

describe('memory: the Phase 3 additions are backwards compatible', () => {
  it('an older save (no story, no button) loads with empty defaults', () => {
    const old = { ...emptyWorldMemory(), story: undefined, button: undefined } as unknown;
    const w = cleanWorld(old);
    expect(w.story).toEqual({});
    expect(w.button).toEqual({ trust: 0.35, suspicion: 0 });
  });

  it('junk is dropped: bad keys, bad times, out-of-range feelings; the story stays short', () => {
    const story: Record<string, unknown> = { 'incident-sofa': 5, 'Bad Key!': 6, 'shadow-bird': -1, 'sky-tune': 'yesterday' };
    for (let i = 0; i < 40; i++) story[`k${i}`] = 1000 + i;
    const w = cleanWorld({ ...emptyWorldMemory(), story, button: { trust: 7, suspicion: 'very' } });
    expect(w.story['incident-sofa']).toBeUndefined(); // too old to make the cut of the 24 newest
    expect(w.story['Bad Key!']).toBeUndefined();
    expect(w.story['shadow-bird']).toBeUndefined();
    expect(Object.keys(w.story).length).toBe(MAX_STORY);
    expect(w.button).toEqual({ trust: 1, suspicion: 0 });
  });

  it('the best volley rally key survives a save and load (it used to be dropped)', () => {
    const w = cleanWorld({ ...emptyWorldMemory(), records: { dotRally: 9 } });
    expect(w.records.dotRally).toBe(9);
  });
});

describe('continuity: real happenings become diary lines and story', () => {
  beforeEach(() => {
    setWorldState({ ...initialWorldState(), room: 'living' });
    useKeepsakes.getState().reset();
  });

  const world = () => {
    const w = new World({ clock: new ManualClock(), actors: new ActorChannel(), seed: 1 });
    w.use(continuity);
    return w;
  };

  it('an incident outcome writes an honest diary line and a story key', () => {
    const w = world();
    w.emit('OBJECT_STATE_CHANGED', { target: 'agent:incident.sofa', key: 'end', value: 'visitor returned it' });
    const k = useKeepsakes.getState();
    expect(k.diary.at(-1)?.detail).toMatch(/You put it back/);
    expect(k.story['incident-sofa']).toBeGreaterThan(0);
  });

  it('button moments are noted once; deep journeys, long rallies, shadows and hybrids are remembered', () => {
    const w = world();
    w.emit('OBJECT_STATE_CHANGED', { target: 'button', key: 'shielded', value: 'shielded' });
    w.emit('OBJECT_STATE_CHANGED', { target: 'button', key: 'shielded', value: 'shielded' });
    w.emit('OBJECT_STATE_CHANGED', { target: 'infinite', key: 'exit', value: 4 });
    w.emit('OBJECT_STATE_CHANGED', { target: 'volley', key: 'point', value: 'dot:7' });
    w.emit('OBJECT_STATE_CHANGED', { target: 'shadow', key: 'creature', value: 'bird' });
    w.emit('OBJECT_STATE_CHANGED', { target: 'garden:hybrid', key: 'harvest', value: 'hybrid:mint:sunflower' });
    const k = useKeepsakes.getState();
    expect(k.diary.filter((e) => e.kind === 'button:shielded')).toHaveLength(1);
    expect(Object.keys(k.story).sort()).toEqual(['button-shielded', 'garden-hybrid', 'infinite-deep', 'shadow-bird', 'volley-rally']);
    expect(k.diary.some((e) => /4 rooms deep/.test(e.detail))).toBe(true);
  });

  it('short rallies and shallow journeys are not worth a diary line', () => {
    const w = world();
    w.emit('OBJECT_STATE_CHANGED', { target: 'volley', key: 'point', value: 'bip:2' });
    w.emit('OBJECT_STATE_CHANGED', { target: 'infinite', key: 'exit', value: 1 });
    expect(useKeepsakes.getState().diary).toHaveLength(0);
  });
});

describe('callbacks: characters bring things up later', () => {
  it('Dot only brags about a rally he actually had', () => {
    setWorldState({ ...initialWorldState(), room: 'living' });
    useKeepsakes.getState().reset();
    const clock = new ManualClock();
    const actors = new ActorChannel();
    actors.subscribe('dot', () => {});
    const world = new World({ clock, actors, seed: 2 });
    const director = new AgentDirector(createRng(1), { settleMs: 0 });
    director.addAgents(...CAST);
    director.addGoals(...LIVING_GOALS.filter((g) => g.id === 'dot.brag'));
    world.use(director);
    clock.advance(6000);
    expect(director.candidates(clock.now(), world)).toHaveLength(0);
    useKeepsakes.getState().record('dotRally', 9);
    useKeepsakes.getState().remember('volley-rally');
    expect(director.candidates(clock.now(), world).map((c) => c.goal.id)).toEqual(['dot.brag']);
  });
});
