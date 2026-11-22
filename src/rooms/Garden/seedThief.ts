/**
 * The seed thief: Crumb, a sparrow, has seen you plant something. It lands
 * on the fence, hops down to the fresh seed and starts pecking. Shoo it and
 * the seed is safe. Leave it and it flies off with the seed, and perches on
 * the fence a moment: tap it then and it drops the seed into a free plot
 * (not where you put it). Otherwise, over the fence it goes, to Bip.
 */
export type ThiefPhase = 'away' | 'perched' | 'hopping' | 'pecking' | 'carrying' | 'leaving' | 'startled';

export interface Thief {
  phase: ThiefPhase;
  /** Which plot it's after. */
  plot: number;
  since: number;
  /** Did it get the seed? */
  hasSeed: boolean;
}

export type ThiefOutcome = 'none' | 'arrived' | 'took' | 'shooed' | 'dropped' | 'gone';

export const PERCH_MS = 1800;
export const HOP_MS = 900;
export const PECK_MS = 2600;
export const CARRY_PERCH_MS = 3200;
export const LEAVE_MS = 1400;

export const thiefAway = (): Thief => ({ phase: 'away', plot: -1, since: 0, hasSeed: false });

/** Crumb turns up for a freshly planted plot. */
export function arrive(plot: number, now: number): Thief {
  return { phase: 'perched', plot, since: now, hasSeed: false };
}

/** Time passes. */
export function tickThief(t: Thief, now: number): { thief: Thief; outcome: ThiefOutcome } {
  const age = now - t.since;
  switch (t.phase) {
    case 'perched':
      return age >= PERCH_MS ? { thief: { ...t, phase: 'hopping', since: now }, outcome: 'arrived' } : { thief: t, outcome: 'none' };
    case 'hopping':
      return age >= HOP_MS ? { thief: { ...t, phase: 'pecking', since: now }, outcome: 'none' } : { thief: t, outcome: 'none' };
    case 'pecking':
      return age >= PECK_MS ? { thief: { ...t, phase: 'carrying', since: now, hasSeed: true }, outcome: 'took' } : { thief: t, outcome: 'none' };
    case 'carrying':
      return age >= CARRY_PERCH_MS ? { thief: { ...t, phase: 'leaving', since: now }, outcome: 'none' } : { thief: t, outcome: 'none' };
    case 'leaving':
    case 'startled':
      return age >= LEAVE_MS ? { thief: thiefAway(), outcome: t.phase === 'leaving' && t.hasSeed ? 'gone' : 'none' } : { thief: t, outcome: 'none' };
    default:
      return { thief: t, outcome: 'none' };
  }
}

/** The visitor taps the bird (or rushes the sun at it). */
export function poke(t: Thief, now: number): { thief: Thief; outcome: ThiefOutcome } {
  if (t.phase === 'hopping' || t.phase === 'pecking' || t.phase === 'perched') return { thief: { ...t, phase: 'startled', since: now, hasSeed: false }, outcome: 'shooed' };
  if (t.phase === 'carrying') return { thief: { ...t, phase: 'leaving', since: now, hasSeed: false }, outcome: 'dropped' };
  return { thief: t, outcome: 'none' };
}
