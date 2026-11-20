import { AWAY_RATE, PLANTS, WATER_MS, advance, plant, rate, stage, water, type GrowContext } from './growth';

const MIN = 60_000;
/** A real-ish start time (0 means 'never watered' to the garden). */
const T = 1_000_000;
const here = (weather: GrowContext['weather'] = 'clear', night = false): GrowContext => ({ weather, night, present: true });

describe('garden growth', () => {
  it('a watered radish blooms in about three minutes of clear weather', () => {
    let p = water(plant('radish', T), T);
    p = advance(p, T + 2.9 * MIN, here());
    expect(p.growth).toBeLessThan(1);
    p = advance(p, T + 3.05 * MIN, here());
    expect(p.growth).toBe(1);
    expect(stage(p.growth)).toBe(4);
  });

  it('unwatered plants grow at half speed, and water wears off', () => {
    const dry = advance(plant('mint', T), T + MIN, here());
    const wet = advance(water(plant('mint', T), T), T + MIN, here());
    expect(dry.growth).toBeCloseTo(wet.growth / 2, 5);
    expect(rate('mint', false, here())).toBe(0.5);
    const p = water(plant('mint', T), T);
    expect(advance(p, T + WATER_MS + 1, here()).growth).toBeLessThan(((WATER_MS + 1) / PLANTS.mint.growMs) * 1);
  });

  it('weather matters: sun speeds up, storms stop, rain waters', () => {
    expect(rate('sunflower', true, here('sunny'))).toBe(1.5);
    expect(rate('sunflower', true, here('storm'))).toBe(0);
    expect(rate('sunflower', true, here('snow'))).toBeCloseTo(0.4);
    const rained = advance(plant('sunflower', 0), MIN, here('rain'));
    expect(rained.wateredAt).toBe(MIN);
  });

  it('moonflowers only grow at night (or after hours)', () => {
    expect(advance(plant('moonflower', 0), MIN, here('sunny')).growth).toBe(0);
    expect(advance(plant('moonflower', 0), MIN, here('night')).growth).toBeGreaterThan(0);
    expect(advance(plant('moonflower', 0), MIN, here('clear', true)).growth).toBeGreaterThan(0);
  });

  it('keeps growing while you are away, more slowly, and never past bloom', () => {
    const away: GrowContext = { weather: 'clear', night: false, present: false };
    const p = advance(plant('sunflower', 0), 2 * MIN, away);
    expect(p.growth).toBeCloseTo((2 * MIN) / PLANTS.sunflower.growMs * AWAY_RATE, 5);
    expect(advance(plant('sunflower', 0), 60 * MIN, away).growth).toBe(1);
  });

  it('stages go seed → sprout → leaves → bud → bloom', () => {
    expect([0, 0.2, 0.5, 0.8, 1].map(stage)).toEqual([0, 1, 2, 3, 4]);
  });
});
