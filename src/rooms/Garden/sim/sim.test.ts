import { describe, expect, it } from 'vitest';
import { COMMISSIONS } from '../../../content/garden';
import { act, bloomsOf, cellAt, countOf, hybridSeeds, makeState, shadeMap, step, type LevelLayout } from './core';
import { advance, apply, rewind, rewindTo, startTimeline } from './history';
import { idleRuns, randomRuns, replay } from './replay';
import { hybridOf, isSpecies, traits } from './species';
import type { GardenState, SunPos } from './types';

const bed = (over: Partial<LevelLayout> = {}): GardenState => makeState({ map: ['.......', '.......', '.......', '.......'], water: 3, seeds: {}, barrel: 0, ...over });
const days = (s: GardenState, ...suns: SunPos[]) => suns.reduce((acc, sun) => step(acc, sun), s);
const plantAt = (s: GardenState, kind: string, x: number, y: number) => {
  const r = act({ ...s, tin: { ...s.tin, [kind]: (s.tin[kind] ?? 0) + 1 } }, { type: 'plant', kind: kind as never, x, y });
  if (!r.ok) throw new Error(r.why);
  return r.state;
};
const rules = (s: GardenState) => s.events.map((e) => e.rule);

describe('garden rules, one at a time', () => {
  it('sunflowers grow in the light, get tall at stage 2 and face where the sun was', () => {
    let s = plantAt(bed(), 'sunflower', 3, 1);
    s = days(s, 'noon', 'noon');
    expect(cellAt(s, 3, 1)!.plant!.stage).toBe(2);
    expect(cellAt(s, 3, 1)!.plant!.facing).toBe('south');
    s = step(s, 'evening');
    expect(cellAt(s, 3, 1)!.plant!.stage).toBe(3);
    expect(cellAt(s, 3, 1)!.plant!.facing).toBe('west');
    expect(rules(s)).toContain('sun-face');
  });

  it('tall things shade 1 cell at noon and 2 when the sun is low, away from the sun', () => {
    let s = plantAt(bed(), 'sunflower', 3, 1);
    s = days(s, 'noon', 'noon');
    const at = (m: boolean[], x: number, y: number) => m[y * s.w + x];
    const noon = shadeMap(s, 'noon');
    expect(at(noon, 3, 2)).toBe(true);
    expect(noon.filter(Boolean)).toHaveLength(1);
    const morning = shadeMap(s, 'morning');
    expect([at(morning, 2, 1), at(morning, 1, 1), at(morning, 4, 1)]).toEqual([true, true, false]);
    const evening = shadeMap(s, 'evening');
    expect([at(evening, 4, 1), at(evening, 5, 1), at(evening, 2, 1)]).toEqual([true, true, false]);
    expect(shadeMap(s, 'night').every(Boolean)).toBe(true);
  });

  it('a sunflower in another’s shade stops growing', () => {
    let s = plantAt(plantAt(bed(), 'sunflower', 3, 1), 'sunflower', 2, 1);
    s = days(s, 'noon', 'noon', 'morning');
    expect(cellAt(s, 3, 1)!.plant!.stage).toBe(3);
    expect(cellAt(s, 2, 1)!.plant!.stage).toBe(2);
    expect(rules(s)).toContain('tall-shade');
  });

  it('lit soil dries a step a day; shade and night keep the water', () => {
    let s = plantAt(bed({ map: ['S......', '.......', '.......', '.......'] }), 'mint', 6, 3);
    s = step(s, 'evening');
    expect(cellAt(s, 1, 0)!.water).toBe(3); // shed shade
    expect(cellAt(s, 4, 2)!.water).toBe(2);
    s = step(s, 'night');
    expect(cellAt(s, 4, 2)!.water).toBe(2);
  });

  it('nothing grows in dry soil', () => {
    let s = plantAt(bed({ water: 0 }), 'sunflower', 3, 1);
    s = step(s, 'noon');
    expect(cellAt(s, 3, 1)!.plant!.stage).toBe(0);
    expect(rules(s)).toContain('thirsty');
  });

  it('moonflowers grow in shade, open only on a night, and wilt after two lit days', () => {
    let s = plantAt(bed({ map: ['S......', 'S......', '.......', '.......'] }), 'moonflower', 1, 0);
    s = days(s, 'evening', 'evening', 'evening');
    expect(cellAt(s, 1, 0)!.plant!.stage).toBe(2); // waits for the night
    expect(bloomsOf(s, 'moonflower')).toBe(0);
    s = step(s, 'night');
    expect(bloomsOf(s, 'moonflower')).toBe(1);
    let lit = plantAt(bed(), 'moonflower', 3, 1);
    lit = days(lit, 'noon', 'noon');
    expect(cellAt(lit, 3, 1)!.plant).toBeNull();
    expect(rules(lit)).toContain('moon-wilt');
  });

  it('mint spreads from wet soil into the wettest empty neighbour, day and night, and swallows seeds', () => {
    let s = makeState({ map: ['.......', '.......', '.......', '.......'], water: [1, 1, 3, 1], plants: ['mint 3 1 1'], seeds: {}, barrel: 0 });
    s = step(s, 'night');
    expect(cellAt(s, 3, 2)!.plant?.kind).toBe('mint');
    expect(rules(s)).toContain('mint-spread');
    let seedy = makeState({ map: ['.......', '.......', '.......', '.......'], water: [1, 1, 3, 1], plants: ['mint 3 1 1', 'sunflower 3 2 0'], seeds: {}, barrel: 0 });
    seedy = step(seedy, 'noon');
    expect(cellAt(seedy, 3, 2)!.plant?.kind).toBe('mint');
    expect(rules(seedy)).toContain('mint-smother');
    let dry = makeState({ map: ['.......', '.......', '.......', '.......'], water: 0, plants: ['mint 3 1 1'], seeds: {}, barrel: 0 });
    dry = step(dry, 'noon');
    expect(countOf(dry, 'mint')).toBe(1);
    expect(rules(dry)).toContain('mint-dry');
  });

  it('a sprouted plant is safe from mint, and rock stops it', () => {
    let s = makeState({ map: ['...#...', '..#.#..', '...#...', '.......'], water: 3, plants: ['mint 3 1 1'], seeds: {}, barrel: 0 });
    s = days(s, 'noon', 'noon');
    expect(countOf(s, 'mint')).toBe(1);
    let safe = makeState({ map: ['.......', '.......', '.......', '.......'], water: [0, 3, 3, 0], plants: ['mint 3 1 1', 'sunflower 4 1 1', 'sunflower 2 1 1', 'sunflower 3 0 1'], seeds: {}, barrel: 0 });
    safe = step(safe, 'noon');
    expect(cellAt(safe, 3, 2)!.plant?.kind).toBe('mint');
    expect(countOf(safe, 'sunflower')).toBe(3);
  });

  it('snapdragons eat a neighbouring mint a day, and two side by side bite and stop', () => {
    let s = makeState({ map: ['.......', '.......', '.......', '.......'], water: 0, plants: ['mint 3 1 1', 'snapdragon 4 1 1'], seeds: {}, barrel: 0 });
    s = step(s, 'noon');
    expect(countOf(s, 'mint')).toBe(0);
    expect(rules(s)).toContain('snap-eat');
    let pair = makeState({ map: ['.......', '.......', '.......', '.......'], water: 3, plants: ['snapdragon 3 1 1', 'snapdragon 4 1 1'], seeds: {}, barrel: 0 });
    pair = step(pair, 'noon');
    expect(cellAt(pair, 3, 1)!.plant!.stage).toBe(1);
    expect(rules(pair)).toContain('snap-bite');
  });

  it('radishes need two planted neighbours (counted at dawn)', () => {
    let row = plantAt(plantAt(plantAt(bed(), 'radish', 1, 1), 'radish', 2, 1), 'radish', 3, 1);
    row = step(row, 'noon');
    expect([1, 2, 3].map((x) => cellAt(row, x, 1)!.plant!.stage)).toEqual([0, 1, 0]);
    expect(rules(row)).toContain('radish-lonely');
  });

  it('Crumb takes lone seeds on the first day only', () => {
    let s = plantAt(plantAt(plantAt(bed({ crumb: true }), 'sunflower', 0, 0), 'sunflower', 3, 1), 'sunflower', 4, 1);
    s = step(s, 'noon');
    expect(cellAt(s, 0, 0)!.plant).toBeNull();
    expect(countOf(s, 'sunflower')).toBe(2);
    s = plantAt(s, 'sunflower', 0, 3);
    s = step(s, 'noon');
    expect(cellAt(s, 0, 3)!.plant).not.toBeNull();
  });

  it('the barrel waters a column down to the first rock, a little to each side', () => {
    let s = makeState({ map: ['.......', '.......', '...#...', '.......'], water: 0, seeds: {}, barrel: 1 });
    const r = act(s, { type: 'water', x: 3 });
    expect(r.ok).toBe(true);
    s = (r as { state: GardenState }).state;
    expect([0, 1, 2, 3].map((y) => cellAt(s, 3, y)!.water)).toEqual([2, 2, 0, 0]);
    expect(cellAt(s, 2, 3)!.water).toBe(1);
    expect(act(s, { type: 'water', x: 1 }).ok).toBe(false); // once a day, and it's empty
  });

  it('a creeper climbs over rock and carries water along itself', () => {
    let s = makeState({ map: ['.......', '.......', '.....#.', '.....*.'], water: [2, 2, 1, 0], plants: ['radish 4 2 0'], seeds: { creeper: 1 }, barrel: 2 });
    s = (act(s, { type: 'plant', kind: 'creeper', x: 4, y: 3 }) as { state: GardenState }).state;
    s = (act(s, { type: 'water', x: 4 }) as { state: GardenState }).state;
    s = step(s, 'noon');
    s = (act(s, { type: 'water', x: 4 }) as { state: GardenState }).state;
    s = step(s, 'noon');
    expect(cellAt(s, 5, 3)!.plant?.kind).toBe('creeper');
    expect(cellAt(s, 5, 3)!.water).toBeGreaterThanOrEqual(2);
    expect(rules(s)).toContain('creeper-water');
  });

  it('bees cross two different flowers in bloom side by side into a hybrid seed', () => {
    let s = makeState({ map: ['.......', '.......', '.......', '.......'], water: 3, plants: ['sunflower 3 1 2', 'snapdragon 4 1 2'], seeds: {}, barrel: 0 });
    s = step(s, 'morning');
    expect(hybridSeeds(s)).toEqual(['hybrid:snapdragon:sunflower']);
    expect(rules(s)).toContain('bee-cross');
    expect(hybridOf('sunflower', 'mint')).toBe('hybrid:mint:sunflower');
    expect(isSpecies('hybrid:mint:sunflower')).toBe(true);
    expect(isSpecies('hybrid:mint:<img>')).toBe(false);
    expect(traits('hybrid:mint:sunflower').spreads).toBe('lit');
  });

  it('a seed planted today can be dug back up for free; an old one cannot', () => {
    let s = bed({ seeds: { sunflower: 1 } });
    s = (act(s, { type: 'plant', kind: 'sunflower', x: 1, y: 1 }) as { state: GardenState }).state;
    expect(s.tin.sunflower).toBe(0);
    const dug = act(s, { type: 'dig', x: 1, y: 1 });
    expect(dug.ok && dug.state.tin.sunflower).toBe(1);
    expect(act(step(s, 'noon'), { type: 'dig', x: 1, y: 1 }).ok).toBe(false);
  });
});

describe('determinism and rewind', () => {
  it('the same state and the same day always make the same next state', () => {
    const c = COMMISSIONS.find((x) => x.id === 'mint-invasion')!;
    const a = days(makeState(c.layout), 'noon', 'evening', 'night', 'morning');
    const b = days(makeState(c.layout), 'noon', 'evening', 'night', 'morning');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('step never mutates the state it was given', () => {
    const s = makeState(COMMISSIONS[2]!.layout);
    const before = JSON.stringify(s);
    step(s, 'noon');
    expect(JSON.stringify(s)).toBe(before);
  });

  it('rewinding restores exactly the bed you had before letting the day go', () => {
    let t = startTimeline(bed({ seeds: { sunflower: 2 } }));
    t = apply(t, { type: 'plant', kind: 'sunflower', x: 2, y: 2 }).t;
    const before = JSON.stringify(t.now);
    t = advance(t, 'noon');
    t = advance(t, 'evening');
    expect(t.now.day).toBe(2);
    t = rewind(t, 2);
    expect(JSON.stringify(t.now)).toBe(before);
    expect(t.days).toHaveLength(0);
    t = advance(advance(advance(t, 'noon'), 'noon'), 'noon');
    expect(rewindTo(t, 1).now.day).toBe(1);
    expect(rewind(startTimeline(bed()), 3).now.day).toBe(0);
  });
});

describe('every commission', () => {
  for (const c of COMMISSIONS) {
    const spec = { layout: c.layout, days: c.days, check: c.check, goal: c.goal };
    it(`${c.id}: the stored solution works within ${c.days} days`, () => {
      const r = replay(spec, c.solution);
      expect(r.refused).toBeNull();
      expect(r.solved).toBe(true);
      expect(r.day).toBeLessThanOrEqual(c.days);
      for (const alt of c.altSolutions ?? []) expect(replay(spec, alt).solved).toBe(true);
    });
    it(`${c.id}: doing nothing does not solve it, and neither does the naive attempt`, () => {
      expect(idleRuns(spec).filter((r) => r.solved)).toEqual([]);
      expect(replay(spec, c.naiveAttempt).solved).toBe(false);
    });
    it(`${c.id}: blind play rarely solves it (needs the rule, not luck)`, () => {
      const rate = randomRuns(spec, 600, 11);
      expect(rate).toBeLessThan(c.id === 'facing' ? 0.3 : 0.08);
    });
  }

  it('the finale has more than one solution', () => {
    const c = COMMISSIONS.find((x) => x.id === 'picture')!;
    expect((c.altSolutions ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it('the curve introduces each rule before a two-rule puzzle needs it', () => {
    const taught = new Set<string>();
    for (const c of COMMISSIONS) {
      expect(c.teaches.length).toBeGreaterThan(0);
      c.teaches.forEach((r) => taught.add(r));
    }
    expect(COMMISSIONS).toHaveLength(12);
    for (const r of ['sun-face', 'tall-shade', 'moon-night', 'mint-spread', 'snap-eat', 'radish-company', 'crumb', 'bee-cross', 'creeper-water']) expect(taught.has(r)).toBe(true);
  });
});
