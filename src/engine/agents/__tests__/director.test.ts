import { ActorChannel } from '../../actors';
import { ManualClock } from '../../clock';
import { createRng } from '../../rng';
import { Priority } from '../../scheduler';
import { World } from '../../world';
import { initialWorldState, setWorldState } from '../../../state/worldStore';
import { AgentDirector } from '../director';
import { PropLocks, score } from '../model';
import type { AgentDef, GoalDef } from '../types';

const AGENTS: AgentDef[] = [
  { id: 'dot', start: { play: 0.8 }, growth: { play: 0.5 } },
  { id: 'tick', start: { order: 0.8 }, growth: { order: 0.4 }, regard: { dot: -0.4 } },
  { id: 'pim', start: { rest: 0.6 }, growth: { rest: 0.3 } },
];

function setup(seed = 7, goals: GoalDef[] = [], opts = {}) {
  setWorldState({ ...initialWorldState(), room: 'living' });
  const clock = new ManualClock();
  const actors = new ActorChannel();
  for (const id of ['dot', 'tick', 'pim'] as const) actors.subscribe(id, () => {});
  const world = new World({ clock, actors, seed: 1 });
  const director = new AgentDirector(createRng(seed), { settleMs: 0, quietMs: 10_000, urge: 1, ...opts });
  director.addAgents(...AGENTS);
  director.addGoals(...goals);
  world.use(director);
  const run = (ms: number, step = 500) => {
    for (let t = 0; t < ms; t += step) {
      clock.advance(step);
      director.onTick(clock.now(), world);
    }
  };
  return { clock, actors, world, director, run };
}

const goal = (id: string, over: Partial<GoalDef> = {}): GoalDef => ({
  id,
  actor: 'dot',
  rooms: ['living'],
  kind: 'ambient',
  durationMs: 2000,
  cooldownMs: 5000,
  answers: ['play'],
  start: () => {},
  ...over,
});

describe('agent director', () => {
  it('characters act on their own (no clicks), and finish', () => {
    const started: string[] = [];
    const { run, director } = setup(3, [
      goal('dot.poke', { start: () => void started.push('dot') }),
      goal('tick.tidy', { actor: 'tick', answers: ['order'], start: () => void started.push('tick') }),
    ]);
    run(20_000);
    expect(new Set(started)).toEqual(new Set(['dot', 'tick']));
    expect(director.log.filter((l) => l.event === 'end').length).toBeGreaterThanOrEqual(2);
    expect(director.runningGoals().length).toBeLessThanOrEqual(2);
  });

  it('the same seed makes the same decisions', () => {
    const goals = () => [goal('a'), goal('b', { actor: 'tick', answers: ['order'] }), goal('c', { actor: 'pim', answers: ['rest'] })];
    const one = setup(42, goals());
    const two = setup(42, goals());
    one.run(30_000);
    two.run(30_000);
    expect(one.director.log.map((l) => `${l.goal}:${l.event}`)).toEqual(two.director.log.map((l) => `${l.goal}:${l.event}`));
    expect(one.director.log.length).toBeGreaterThan(0);
  });

  it('two goals never hold the same prop at once', () => {
    const { run, director } = setup(5, [
      goal('dot.cushion', { props: ['cushion'], durationMs: 6000 }),
      goal('pim.cushion', { actor: 'pim', answers: ['rest'], props: ['cushion'], durationMs: 6000 }),
    ]);
    const overlaps: number[] = [];
    for (let i = 0; i < 40; i++) {
      run(500);
      overlaps.push(director.runningGoals().length);
    }
    expect(Math.max(...overlaps)).toBe(1);
  });

  it('cleanup always runs: when a goal ends, when the visitor takes over the channel, and on leaving the room', () => {
    const cleaned: string[] = [];
    const { run, world, director, clock } = setup(9, [goal('dot.long', { durationMs: 60_000, start: () => () => cleaned.push('x') })]);
    run(3000);
    expect(director.isRunning('dot.long')).toBe(true);
    // the visitor clicks Dot: a direct reaction on Dot's channel preempts the ambient goal
    world.scheduler.schedule({ id: 'direct', channel: 'dot', priority: Priority.DIRECT, durationMs: 100, run: () => {} });
    expect(cleaned).toHaveLength(1);
    expect(director.isRunning('dot.long')).toBe(false);
    clock.advance(10_000);
    run(3000);
    expect(director.isRunning('dot.long')).toBe(true);
    world.emit('ROOM_EXITED', { room: 'living', dwellMs: 1000 });
    expect(cleaned).toHaveLength(2);
    expect(director.locks.size()).toBe(0);
  });

  it('one incident at a time, a quiet spell after, and none while the visitor is busy', () => {
    const { run, director, world } = setup(11, [
      goal('a.incident', { kind: 'incident', cast: ['pim'], durationMs: 3000 }),
      goal('b.incident', { actor: 'tick', kind: 'incident', answers: ['order'], durationMs: 3000 }),
    ]);
    let maxIncidents = 0;
    let ends = 0;
    for (let i = 0; i < 30; i++) {
      run(500);
      maxIncidents = Math.max(maxIncidents, director.runningGoals().length);
    }
    ends = director.log.filter((l) => l.event === 'end').length;
    expect(maxIncidents).toBe(1);
    // 15 s with a 10 s quiet spell after each 3 s incident: at most two
    expect(ends).toBeLessThanOrEqual(2);
    // a busy visitor: nothing new starts
    const before = director.log.length;
    for (let i = 0; i < 20; i++) {
      world.emit('OBJECT_CLICKED', { target: 'wall', repeat: 1, via: 'pointer' });
      run(500);
    }
    expect(director.log.filter((l) => l.event === 'start').length).toBe(director.log.slice(0, before).filter((l) => l.event === 'start').length);
  });

  it('running goals hear the visitor (interventions)', () => {
    const heard: string[] = [];
    const { run, world } = setup(13, [goal('dot.listen', { durationMs: 30_000, start: (ctl) => ctl.onEvent((t) => heard.push(t)) })]);
    run(3000);
    world.emit('OBJECT_CLICKED', { target: 'cushion', repeat: 1, via: 'pointer' });
    expect(heard).toContain('OBJECT_CLICKED');
  });
});

describe('agent model', () => {
  it('locks are all-or-nothing and released by owner', () => {
    const l = new PropLocks();
    expect(l.acquire('a', ['cup', 'cushion'])).toBe(true);
    expect(l.acquire('b', ['cushion', 'lamp'])).toBe(false);
    expect(l.owner('lamp')).toBeNull();
    l.release('a');
    expect(l.acquire('b', ['cushion'])).toBe(true);
  });

  it('a goal just done is less appealing (novelty), and need drives appeal', () => {
    const p = { needs: () => ({ attention: 0, rest: 0, curiosity: 0, order: 0, play: 0.9 }) } as never;
    const g = goal('x');
    expect(score(g, p, [])).toBeGreaterThan(score(g, p, ['x']));
    const calm = { needs: () => ({ attention: 0, rest: 0, curiosity: 0, order: 0, play: 0.1 }) } as never;
    expect(score(g, p, [])).toBeGreaterThan(score(g, calm, []));
  });
});
