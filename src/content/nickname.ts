/**
 * A playful nickname generated locally from interaction counts (INT-098).
 * Deterministic: the same memory always yields the same name.
 */
const TITLES: Array<[RegExp, string]> = [
  [/^pim$/, 'Pim’s Favourite Human'],
  [/^dot$/, 'Dot’s Racing Partner'],
  [/^lumen$/, 'Lamp Botherer'],
  [/^button$/, 'Presser of Forbidden Buttons'],
  [/^tick$/, 'Keeper of Every O’Clock'],
  [/^ferdinand$/, 'Friend of Ferns'],
  [/^picture$/, 'Admirer of Great-Aunts'],
  [/^shape:/, 'Professor of Gravity'],
  [/^playground:/, 'Professor of Gravity'],
  [/^mood:/, 'Amateur Meteorologist'],
  [/^nimbus$/, 'Cloud Whisperer'],
  [/^wall$/, 'Poker of Walls'],
  [/^bunny$/, 'Dust Bunny Wrangler'],
  [/^(chest|candle|token:)/, 'Keeper of Secrets'],
  [/^(star|radio|moth|neon)/, 'Night Owl'],
];

export function favoriteOf(counts: Record<string, number>): string | null {
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (k.startsWith('hover:')) continue;
    if (v > n || (v === n && best !== null && k < best)) {
      best = k;
      n = v;
    }
  }
  return n >= 3 ? best : null;
}

export function nickname(input: { counts: Record<string, number>; visits: number; discoveries: number }): string {
  const fav = favoriteOf(input.counts);
  const title = (fav && TITLES.find(([re]) => re.test(fav))?.[1]) ?? 'Polite Stranger';
  const prefix = input.discoveries >= 12 ? 'Legendary' : input.visits >= 6 ? 'Regular' : input.visits >= 2 ? 'Returning' : '';
  return prefix ? `${prefix} ${title}` : title;
}
