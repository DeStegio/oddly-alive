import { createRng } from '../../engine/rng';
import { hybridId, isOpen, makeBugs, stepBugs, type Env, type Flower } from './pollinators';
import { CARRY_PERCH_MS, HOP_MS, LEAVE_MS, PECK_MS, PERCH_MS, arrive, poke, tickThief } from './seedThief';

const env: Env = { w: 1000, h: 500, wind: 0, raining: false, night: false, sunX: 500 };
const flowers: Flower[] = [
  { plot: 0, x: 300, y: 300, kind: 'sunflower' },
  { plot: 3, x: 700, y: 300, kind: 'snapdragon' },
];

function run(ms: number, e = env, fl = flowers, seed = 1) {
  const rng = createRng(seed);
  let bugs = makeBugs(e.w, e.h);
  const visits = [];
  for (let t = 0; t < ms; t += 16) {
    const r = stepBugs(bugs, fl, e, t, 16, rng);
    bugs = r.bugs;
    visits.push(...r.visits);
  }
  return { bugs, visits };
}

describe('pollinators', () => {
  it('go from flower to flower, and carry pollen across: a cross', () => {
    const { visits } = run(30_000);
    expect(visits.length).toBeGreaterThan(5);
    const crosses = visits.filter((v) => v.crossWith);
    expect(crosses.length).toBeGreaterThan(0);
    expect(crosses.every((c) => c.crossWith !== c.kind)).toBe(true);
  });

  it('shelter when it rains and go home at night (no visits)', () => {
    expect(run(15_000, { ...env, raining: true }).visits).toHaveLength(0);
    const night = run(15_000, { ...env, night: true });
    expect(night.visits).toHaveLength(0);
    expect(night.bugs.every((b) => b.x < 150)).toBe(true);
  });

  it('wind blows them sideways', () => {
    const calm = run(4000, env, []);
    const windy = run(4000, { ...env, wind: 160 }, []);
    const meanX = (bs: typeof calm.bugs) => bs.reduce((a, b) => a + b.x, 0) / bs.length;
    expect(meanX(windy.bugs)).toBeGreaterThan(meanX(calm.bugs));
  });

  it('which flowers are open, and hybrids are the same whichever way round', () => {
    expect(isOpen('radish', false)).toBe(false);
    expect(isOpen('moonflower', false)).toBe(false);
    expect(isOpen('moonflower', true)).toBe(true);
    expect(isOpen('sunflower', true)).toBe(false);
    expect(hybridId('sunflower', 'mint')).toBe(hybridId('mint', 'sunflower'));
  });
});

describe('the seed thief', () => {
  it('left alone: perches, hops down, pecks, takes the seed, and is gone', () => {
    let t = arrive(2, 0);
    const outcomes: string[] = [];
    let now = 0;
    for (const ms of [PERCH_MS, HOP_MS, PECK_MS, CARRY_PERCH_MS, LEAVE_MS]) {
      now += ms;
      const r = tickThief(t, now);
      t = r.thief;
      outcomes.push(r.outcome);
    }
    expect(outcomes).toEqual(['arrived', 'none', 'took', 'none', 'gone']);
    expect(t.phase).toBe('away');
  });

  it('shooed while pecking: the seed is safe', () => {
    let t = arrive(2, 0);
    t = tickThief(t, PERCH_MS).thief;
    t = tickThief(t, PERCH_MS + HOP_MS).thief;
    const r = poke(t, PERCH_MS + HOP_MS + 500);
    expect(r.outcome).toBe('shooed');
    expect(r.thief.hasSeed).toBe(false);
  });

  it('followed after it took the seed: it drops it', () => {
    let t = arrive(2, 0);
    let now = 0;
    for (const ms of [PERCH_MS, HOP_MS, PECK_MS]) t = tickThief(t, (now += ms)).thief;
    expect(t.phase).toBe('carrying');
    expect(poke(t, now + 100).outcome).toBe('dropped');
  });
});
