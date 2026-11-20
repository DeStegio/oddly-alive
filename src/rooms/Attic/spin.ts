/**
 * The hand-spun gramophone: turn a circular drag into record speed, and record
 * speed into a melody's tempo and direction. Pure, so it can be tested.
 */

/** Great-Aunt Pim's waltz, one note per beat (the same tune the synth plays). */
export const WALTZ = [523, 659, 784, 659, 784, 1046, 988, 784, 659, 587, 698, 880, 784, 659, 523, 587, 494, 523];

/** Smallest signed difference between two angles (radians), in (-π, π]. */
export function angleDelta(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/** One full turn of the record per this many ms is "proper speed". */
export const PROPER_TURN_MS = 1800;
/** Beat length at proper speed. */
export const PROPER_BEAT_MS = 420;

/**
 * How fast the record is going relative to proper speed (1 = right, 2 =
 * chipmunks, negative = backwards). `radPerMs` is the record's spin.
 */
export function playSpeed(radPerMs: number): number {
  return (radPerMs * PROPER_TURN_MS) / (2 * Math.PI);
}

/** Time to the next note at this speed, or null when it's too slow to play. */
export function beatMs(speed: number): number | null {
  const s = Math.abs(speed);
  if (s < 0.25) return null;
  return PROPER_BEAT_MS / Math.min(3, s);
}

/** Next note index: forwards normally, backwards when spun the other way. */
export function nextNote(index: number, speed: number, length = WALTZ.length): number {
  return (index + (speed < 0 ? -1 : 1) + length) % length;
}

/** A spinning record slows down by itself (friction), per ms. */
export function windDown(radPerMs: number, dt: number): number {
  const k = Math.pow(0.9985, dt);
  const v = radPerMs * k;
  return Math.abs(v) < 0.0004 ? 0 : v;
}
