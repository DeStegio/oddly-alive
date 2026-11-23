import type { BaseSpecies, HybridId, Species } from './types';
import { BASE_SPECIES } from './types';

/**
 * What each plant wants. Every species is a handful of switches; hybrids mix
 * their parents' switches (that is the whole point of crossing them).
 */
export interface Traits {
  /** Casts shade from stage 2 (like the shed). */
  tall: boolean;
  /** Grows only lit, only shaded, or either. */
  light: 'lit' | 'shade' | 'any';
  /** Planted orthogonal neighbours needed to grow. */
  company: number;
  /** Spreads into an empty neighbour each day (if its soil is wet). */
  spreads: false | 'any' | 'lit';
  /** Eats one neighbouring mint a day. */
  eatsMint: boolean;
  /** Two of these side by side bite each other and stop growing. */
  bites: boolean;
  /** Stops at stage 2 by day and opens (stage 3) only on a night. */
  nightBloom: boolean;
  /** Wilts after this many lit days in a row (0 = never). */
  wiltsAfterLit: number;
  /** Climbs: extends one cell a day, over rock too, and carries water. */
  climbs: boolean;
  /** Turns its face to the sun. */
  facesSun: boolean;
}

const BASE: Record<BaseSpecies, Traits> = {
  sunflower: { tall: true, light: 'lit', company: 0, spreads: false, eatsMint: false, bites: false, nightBloom: false, wiltsAfterLit: 0, climbs: false, facesSun: true },
  moonflower: { tall: false, light: 'shade', company: 0, spreads: false, eatsMint: false, bites: false, nightBloom: true, wiltsAfterLit: 2, climbs: false, facesSun: false },
  mint: { tall: false, light: 'any', company: 0, spreads: 'any', eatsMint: false, bites: false, nightBloom: false, wiltsAfterLit: 0, climbs: false, facesSun: false },
  snapdragon: { tall: false, light: 'lit', company: 0, spreads: false, eatsMint: true, bites: true, nightBloom: false, wiltsAfterLit: 0, climbs: false, facesSun: false },
  radish: { tall: false, light: 'any', company: 2, spreads: false, eatsMint: false, bites: false, nightBloom: false, wiltsAfterLit: 0, climbs: false, facesSun: false },
  creeper: { tall: false, light: 'any', company: 0, spreads: false, eatsMint: false, bites: false, nightBloom: false, wiltsAfterLit: 0, climbs: true, facesSun: false },
};

/** The named crosses, with rules of their own. */
const NAMED: Record<string, Traits> = {
  // spreads like mint, but only into the light
  'hybrid:mint:sunflower': { ...BASE.mint, light: 'lit', spreads: 'lit' },
  // tall like a sunflower, and eats mint like a snapdragon (no biting)
  'hybrid:snapdragon:sunflower': { ...BASE.sunflower, eatsMint: true },
  // a radish that doesn't need company, as long as it's lit
  'hybrid:radish:sunflower': { ...BASE.radish, light: 'lit', company: 0 },
};

export const HYBRID_NAMES: Record<string, string> = {
  'hybrid:mint:sunflower': 'Sunmint',
  'hybrid:snapdragon:sunflower': 'Sunsnap',
  'hybrid:radish:sunflower': 'Sunradish',
};

export function isBase(k: string): k is BaseSpecies {
  return (BASE_SPECIES as readonly string[]).includes(k);
}

export function isHybrid(k: string): k is HybridId {
  const p = k.split(':');
  return p.length === 3 && p[0] === 'hybrid' && isBase(p[1]!) && isBase(p[2]!);
}

export function isSpecies(k: unknown): k is Species {
  return typeof k === 'string' && (isBase(k) || isHybrid(k));
}

export function hybridOf(a: BaseSpecies, b: BaseSpecies): HybridId {
  const [x, y] = [a, b].sort();
  return `hybrid:${x}:${y}`;
}

export function parents(k: Species): BaseSpecies[] {
  if (isBase(k)) return [k];
  const p = k.split(':');
  return [p[1] as BaseSpecies, p[2] as BaseSpecies];
}

/** Hybrids without a rule of their own behave like their first parent (new colours, same habits). */
export function traits(k: Species): Traits {
  if (isBase(k)) return BASE[k];
  return NAMED[k] ?? BASE[parents(k)[0]!];
}

export function speciesName(k: Species): string {
  if (isBase(k)) return k;
  return HYBRID_NAMES[k] ?? parents(k).join('-');
}
