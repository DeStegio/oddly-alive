/** Star positions (percent of the sky box) and constellation logic. */
export const STARS: Array<{ x: number; y: number; r: number }> = [
  { x: 8, y: 22, r: 5 },
  { x: 18, y: 10, r: 4 },
  { x: 27, y: 30, r: 6 },
  { x: 38, y: 16, r: 4 },
  { x: 47, y: 34, r: 5 },
  { x: 56, y: 12, r: 6 },
  { x: 63, y: 40, r: 4 },
  { x: 72, y: 20, r: 5 },
  { x: 83, y: 32, r: 4 },
  { x: 91, y: 14, r: 6 },
  { x: 33, y: 48, r: 4 },
  { x: 78, y: 50, r: 5 },
];

export const MAX_LINKS = 20;
export const CONSTELLATION_SIZE = 5;

export type Link = readonly [number, number];

export const linkKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** Size of the largest connected group of stars. */
export function largestGroup(links: readonly Link[]): number {
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    if (!parent.has(x)) parent.set(x, x);
    const p = parent.get(x)!;
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  for (const [a, b] of links) parent.set(find(a), find(b));
  const sizes = new Map<number, number>();
  for (const x of parent.keys()) {
    const r = find(x);
    sizes.set(r, (sizes.get(r) ?? 0) + 1);
  }
  return Math.max(0, ...sizes.values());
}

const NAMES = ['The Great Sofa', 'The Lesser Lamp', 'Pim Major', 'The Dust Bunny', 'The Wobbly Button', 'Ferdinand’s Leaf'];

/** A deterministic, silly name for a set of links. */
export function constellationName(links: readonly Link[]): string {
  let h = 0;
  for (const [a, b] of links) h = (h * 31 + a * 7 + b) >>> 0;
  return NAMES[h % NAMES.length] as string;
}
