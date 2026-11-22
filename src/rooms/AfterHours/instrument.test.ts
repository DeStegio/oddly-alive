import { drone, phrase, pitchOf } from './instrument';
import { STARS } from './sky';

describe('the constellation instrument', () => {
  it('higher stars sing higher', () => {
    const high = STARS.findIndex((s) => s.y === Math.min(...STARS.map((x) => x.y)));
    const low = STARS.findIndex((s) => s.y === Math.max(...STARS.map((x) => x.y)));
    expect(pitchOf(high)).toBeGreaterThan(pitchOf(low));
  });

  it('a phrase plays the stars in the order they were joined, longer lines held longer', () => {
    const notes = phrase([
      [0, 1],
      [1, 2],
      [2, 9],
    ]);
    expect(notes.map((n) => n.star)).toEqual([0, 1, 2, 9]);
    // the long line from star 2 to star 9 holds star 9 longer than the short hop to star 1
    expect(notes[3]!.ms).toBeGreaterThan(notes[1]!.ms);
    // notes follow one another
    expect(notes[1]!.at).toBe(notes[0]!.ms);
  });

  it('the same drawing always plays the same tune; the radio adds a low note', () => {
    const links = [
      [3, 4],
      [4, 5],
    ] as const;
    expect(phrase(links)).toEqual(phrase(links));
    expect(drone(phrase(links))).toBeLessThan(Math.min(...phrase(links).map((n) => n.hz)));
  });
});
