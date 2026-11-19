/** Seeded, deterministic randomness (Mulberry32). */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash → 32-bit seed. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Weighted<T> {
  item: T;
  weight: number;
}

/**
 * Picks an item proportionally to weight. Items with weight ≤ 0 (or NaN) are
 * never chosen. Returns null when nothing is eligible.
 */
export function weightedPick<T>(items: ReadonlyArray<Weighted<T>>, rng: Rng): T | null {
  let total = 0;
  for (const it of items) if (it.weight > 0 && Number.isFinite(it.weight)) total += it.weight;
  if (total <= 0) return null;
  let roll = rng() * total;
  for (const it of items) {
    if (!(it.weight > 0) || !Number.isFinite(it.weight)) continue;
    roll -= it.weight;
    if (roll < 0) return it.item;
  }
  // floating point edge: return the last eligible item
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it && it.weight > 0 && Number.isFinite(it.weight)) return it.item;
  }
  return null;
}

export function pickOne<T>(items: ReadonlyArray<T>, rng: Rng): T {
  if (items.length === 0) throw new Error('pickOne: empty list');
  return items[Math.floor(rng() * items.length) % items.length] as T;
}

export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
  }
  return Math.floor(Math.random() * 2 ** 32);
}
