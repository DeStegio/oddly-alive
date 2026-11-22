import { STARS, type Link } from './sky';

/**
 * The constellation instrument. Every star has a note: the higher in the
 * sky, the higher the note, on a pentatonic scale (so nothing you draw can
 * sound wrong). A constellation plays as a phrase: the stars in the order
 * you joined them, each held for as long as the line that reached it.
 */
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

/** The note for a star (Hz). */
export function pitchOf(star: number): number {
  const y = STARS[star]?.y ?? 30;
  // sky y runs 10 (high) to 50 (low)
  const t = Math.max(0, Math.min(1, (50 - y) / 40));
  return SCALE[Math.round(t * (SCALE.length - 1))]!;
}

export interface Note {
  star: number;
  hz: number;
  /** When it starts, from the beginning of the phrase (ms). */
  at: number;
  ms: number;
}

/** A phrase from the lines drawn: stars in the order they joined, durations from line lengths. */
export function phrase(links: readonly Link[]): Note[] {
  const order: number[] = [];
  const lenTo = new Map<number, number>();
  for (const [a, b] of links) {
    const d = Math.hypot((STARS[a]?.x ?? 0) - (STARS[b]?.x ?? 0), (STARS[a]?.y ?? 0) - (STARS[b]?.y ?? 0));
    for (const s of [a, b]) {
      if (!order.includes(s)) {
        order.push(s);
        lenTo.set(s, d);
      }
    }
  }
  let at = 0;
  return order.map((star) => {
    const ms = Math.round(Math.max(180, Math.min(620, (lenTo.get(star) ?? 10) * 14)));
    const n = { star, hz: pitchOf(star), at, ms };
    at += ms;
    return n;
  });
}

/** A soft note under the phrase when the radio's on: the lowest note of the phrase, an octave down. */
export const drone = (notes: Note[]) => (notes.length ? Math.min(...notes.map((n) => n.hz)) / 2 : 0);
