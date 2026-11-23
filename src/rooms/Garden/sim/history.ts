import { act, step } from './core';
import type { Action, GardenState, SunPos } from './types';

/**
 * Time in the garden. `days[k]` is the bed just before day k+1 was let go
 * (with that morning's plantings in it); `now` is the bed as it stands. A day
 * pushes `now` and steps; rewinding pops and restores exactly, so rewind is
 * the same thing as never having done it.
 */
export interface Timeline {
  now: GardenState;
  days: GardenState[];
  /** The light each past day had (for the day markers). */
  suns: SunPos[];
}

export const startTimeline = (s: GardenState): Timeline => ({ now: s, days: [], suns: [] });

export function advance(t: Timeline, sun: SunPos): Timeline {
  return { now: step(t.now, sun), days: [...t.days, t.now], suns: [...t.suns, sun] };
}

export function rewind(t: Timeline, n = 1): Timeline {
  if (!t.days.length || n <= 0) return t;
  const k = Math.max(0, t.days.length - n);
  return { now: t.days[k]!, days: t.days.slice(0, k), suns: t.suns.slice(0, k) };
}

/** Go to the start of day `day` (0 = the first morning). */
export function rewindTo(t: Timeline, day: number): Timeline {
  return rewind(t, t.days.length - Math.max(0, day));
}

export function apply(t: Timeline, a: Action): { ok: boolean; t: Timeline; why?: string } {
  const r = act(t.now, a);
  return r.ok ? { ok: true, t: { ...t, now: r.state } } : { ok: false, t, why: r.why };
}
