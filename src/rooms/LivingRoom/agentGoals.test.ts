import { allBehaviors } from '../../behaviors';
import { ActorChannel } from '../../engine/actors';
import { AgentDirector } from '../../engine/agents/director';
import { CAST } from '../../engine/agents/cast';
import { ManualClock } from '../../engine/clock';
import { createRng } from '../../engine/rng';
import { World } from '../../engine/world';
import { useObjects } from '../../state/world';
import { initialWorldState, setWorldState } from '../../state/worldStore';
import { LIVING_GOALS, type LivingStage } from './agentGoals';

function setup() {
  setWorldState({ ...initialWorldState(), room: 'living' });
  useObjects.getState().resetObjects();
  const clock = new ManualClock();
  const actors = new ActorChannel();
  for (const id of ['dot', 'tick', 'pim', 'lumen', 'ferdinand', 'picture', 'button'] as const) actors.subscribe(id, () => {});
  const world = new World({ clock, actors, seed: 3, behaviors: allBehaviors() });
  const director = new AgentDirector(createRng(1), { settleMs: 0 });
  director.addAgents(...CAST);
  director.addGoals(...LIVING_GOALS);
  world.use(director);
  let arrive: (() => void) | undefined;
  const stage: LivingStage = {
    rect: () => new DOMRect(10, 10, 40, 40),
    dotTo: (_t, onArrive) => (arrive = onArrive),
    dotFree: () => (arrive = undefined),
    button: () => 'pressed',
  };
  director.setStage('living', stage);
  return { clock, world, director, actors, arrive: () => arrive?.() };
}

describe('Living Room goals', () => {
  it('Tick straightens a crooked portrait on his own', () => {
    const { clock, world, director } = setup();
    expect(useObjects.getState().living.pictureTilt).not.toBe(0);
    expect(director.start(director.goal('tick.straighten')!, world)).toBe(true);
    clock.advance(5000);
    expect(useObjects.getState().living.pictureTilt).toBe(0);
    expect(director.log.at(-1)).toMatchObject({ goal: 'tick.straighten', event: 'end', outcome: 'straightened' });
    // and it isn't on his mind any more
    expect(director.candidates(clock.now(), world).some((c) => c.goal.id === 'tick.straighten')).toBe(false);
  });

  it('Dot walks to the button and presses it; through the button machine', () => {
    const { clock, world, director, arrive } = setup();
    clock.advance(6000); // the visitor has been quiet a while
    expect(director.start(director.goal('dot.press-button')!, world)).toBe(true);
    expect(director.owner('button')).toBe('goal:dot.press-button');
    arrive();
    clock.advance(3000);
    expect(director.log.at(-1)).toMatchObject({ goal: 'dot.press-button', outcome: 'pressed' });
    expect(director.owner('button')).toBeNull();
  });

  it('a dozing Pim wakes when the visitor clicks her (direct input wins)', () => {
    const { clock, world, director } = setup();
    clock.advance(16_000);
    expect(director.start(director.goal('pim.doze')!, world)).toBe(true);
    world.emit('OBJECT_CLICKED', { target: 'pim', repeat: 1, via: 'pointer' });
    expect(director.isRunning('pim.doze')).toBe(false);
  });
});
