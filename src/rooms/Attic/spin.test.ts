import { PROPER_BEAT_MS, PROPER_TURN_MS, WALTZ, angleDelta, beatMs, nextNote, playSpeed, windDown } from './spin';

describe('the hand-spun gramophone', () => {
  it('measures turns across the ±π seam', () => {
    expect(angleDelta(0, 0.5)).toBeCloseTo(0.5);
    expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6);
    expect(angleDelta(-3, 3)).toBeCloseTo(6 - 2 * Math.PI);
  });

  it('proper speed plays at the proper beat; faster is faster, too slow is silence', () => {
    const proper = (2 * Math.PI) / PROPER_TURN_MS;
    expect(playSpeed(proper)).toBeCloseTo(1);
    expect(beatMs(playSpeed(proper))).toBeCloseTo(PROPER_BEAT_MS);
    expect(beatMs(2)!).toBeCloseTo(PROPER_BEAT_MS / 2);
    expect(beatMs(10)!).toBeCloseTo(PROPER_BEAT_MS / 3); // capped
    expect(beatMs(0.1)).toBeNull();
  });

  it('spun backwards, the tune runs backwards', () => {
    expect(nextNote(3, 1)).toBe(4);
    expect(nextNote(3, -1)).toBe(2);
    expect(nextNote(0, -1)).toBe(WALTZ.length - 1);
  });

  it('a record left alone slows to a stop', () => {
    let v = 0.01;
    for (let t = 0; t < 10_000; t += 16) v = windDown(v, 16);
    expect(v).toBe(0);
  });
});
