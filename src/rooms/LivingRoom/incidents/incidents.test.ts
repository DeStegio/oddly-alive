import { allBehaviors } from '../../../behaviors';
import { ActorChannel } from '../../../engine/actors';
import { AgentDirector } from '../../../engine/agents/director';
import { CAST } from '../../../engine/agents/cast';
import { ManualClock } from '../../../engine/clock';
import { createRng } from '../../../engine/rng';
import { World } from '../../../engine/world';
import { useObjects } from '../../../state/world';
import { initialWorldState, setWorldState } from '../../../state/worldStore';
import type { LivingStage } from '../agentGoals';
import { INCIDENTS } from './incidents';
import { useStageProps } from './stageProps';

function setup(seed = 1) {
  setWorldState({ ...initialWorldState(), room: 'living' });
  useObjects.getState().resetObjects();
  useStageProps.getState().reset();
  const clock = new ManualClock();
  const actors = new ActorChannel();
  for (const id of ['dot', 'tick', 'pim', 'lumen', 'ferdinand', 'button'] as const) actors.subscribe(id, () => {});
  const world = new World({ clock, actors, seed: 3, behaviors: allBehaviors() });
  const director = new AgentDirector(createRng(seed), { settleMs: 0 });
  director.addAgents(...CAST);
  director.addGoals(...INCIDENTS);
  world.use(director);
  let pending: (() => void) | undefined;
  let freed = 0;
  const stage: LivingStage = {
    rect: () => new DOMRect(10, 10, 40, 40),
    dotTo: (_t, onArrive) => (pending = onArrive),
    dotFree: () => {
      pending = undefined;
      freed++;
    },
    dotPoint: () => ({ x: 0.6, y: 0.85 }),
    dotHold: () => {},
    button: () => 'none',
    props: {
      get: (id) => useStageProps.getState()[id],
      move: (id, place, at) => useStageProps.getState().move(id, place, at),
      spot: (on, target) => useStageProps.getState().setSpot({ on, target: on ? (target ?? null) : null }),
      outFor: () => 0,
    },
  };
  director.setStage('living', stage);
  /** Dot gets wherever he was going. */
  const arrive = () => {
    const p = pending;
    pending = undefined;
    p?.();
  };
  const start = (id: string) => expect(director.start(director.goal(id)!, world)).toBe(true);
  const outcome = (id: string) => director.log.filter((l) => l.goal === id && l.event === 'end').at(-1)?.outcome;
  return { clock, world, director, arrive, start, outcome, freed: () => freed };
}

describe('the sofa incident', () => {
  it('Dot takes the cushion; put it back yourself and Pim is grateful', () => {
    const { clock, world, arrive, start, outcome, director } = setup();
    start('incident.sofa');
    clock.advance(2300);
    arrive();
    expect(useStageProps.getState().cushion.place).toBe('dot');
    // the visitor drags it back to the sofa
    useStageProps.getState().move('cushion', 'home');
    world.emit('OBJECT_STATE_CHANGED', { target: 'cushion', key: 'visitor', value: 'home' });
    clock.advance(3000);
    expect(outcome('incident.sofa')).toBe('visitor returned it');
    expect(director.owner('cushion')).toBeNull();
  });

  it('left alone, it always settles: Tick makes Dot bring it back, or Dot naps on it', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const { clock, arrive, start, outcome } = setup(seed);
      start('incident.sofa');
      for (let i = 0; i < 12; i++) {
        clock.advance(1500);
        arrive();
      }
      clock.advance(10_000);
      expect(['tick made dot return it', 'dot napped on it']).toContain(outcome('incident.sofa'));
      expect(useStageProps.getState().cushion.place).not.toBe('dot');
    }
  });

  it('clicking Dot while he has it: he drops it', () => {
    const { clock, world, arrive, start, outcome } = setup();
    start('incident.sofa');
    clock.advance(2300);
    arrive();
    world.emit('OBJECT_CLICKED', { target: 'dot', repeat: 1, via: 'pointer' });
    clock.advance(3000);
    expect(outcome('incident.sofa')).toBe('dot dropped it');
    expect(useStageProps.getState().cushion.place).toBe('floor');
  });

  it('cut short (leaving the room): Dot puts the cushion down rather than vanishing with it', () => {
    const { clock, world, arrive, start, freed } = setup();
    start('incident.sofa');
    clock.advance(2300);
    arrive();
    world.emit('ROOM_EXITED', { room: 'living', dwellMs: 5000 });
    expect(useStageProps.getState().cushion.place).toBe('floor');
    expect(freed()).toBeGreaterThan(0);
  });
});

describe('the stolen teacup', () => {
  it('hidden behind the plant: clicking the plant finds it', () => {
    const { clock, world, arrive, start, outcome } = setup();
    start('incident.teacup');
    arrive(); // reaches the cup
    arrive(); // reaches the plant
    expect(useStageProps.getState().cup.place).toBe('hidden');
    world.emit('OBJECT_CLICKED', { target: 'ferdinand', repeat: 1, via: 'pointer' });
    clock.advance(2500);
    expect(outcome('incident.teacup')).toBe('found behind the plant');
    expect(useStageProps.getState().cup.place).toBe('home');
  });

  it('nobody helps: Tick rings until Dot brings it back', () => {
    const { clock, arrive, start, outcome } = setup();
    start('incident.teacup');
    arrive();
    arrive();
    clock.advance(8000);
    arrive(); // back to the plant
    arrive(); // to the table
    clock.advance(2500);
    expect(outcome('incident.teacup')).toBe('tick rang until dot brought it back');
    expect(useStageProps.getState().cup.place).toBe('home');
  });
});

describe('the spotlight drama', () => {
  it('Lumen picks someone; switching Lumen off ends the show', () => {
    const { clock, world, start, outcome } = setup();
    start('incident.spotlight');
    clock.advance(900);
    expect(useStageProps.getState().spot.on).toBe(true);
    world.emit('OBJECT_STATE_CHANGED', { target: 'lumen', key: 'on', value: false });
    clock.advance(800);
    expect(outcome('incident.spotlight')).toBe('lights out');
    expect(useStageProps.getState().spot.on).toBe(false);
  });

  it('the visitor can move the light onto someone else', () => {
    const { clock, world, start, outcome } = setup();
    start('incident.spotlight');
    clock.advance(900);
    useStageProps.getState().setSpot({ target: 'dot' });
    world.emit('OBJECT_STATE_CHANGED', { target: 'spot', key: 'visitor', value: 'dot' });
    clock.advance(20_000);
    expect(outcome('incident.spotlight')).toBe('redirected to dot');
    expect(useStageProps.getState().spot.on).toBe(false);
  });
});
