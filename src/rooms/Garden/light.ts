/**
 * "You are the sun": the pointer's height over the garden is the sun's
 * elevation (and so the time of day); plants grow where its light falls.
 * Pure functions, so the garden's day can be tested.
 */

/** -1 deep night … 0 on the horizon … 1 high noon. */
export function elevation(y: number, topY: number, horizonY: number): number {
  const e = (horizonY - y) / Math.max(1, horizonY - topY);
  return Math.max(-1, Math.min(1, e));
}

export type Phase = 'day' | 'dusk' | 'night';

export function phaseOf(e: number): Phase {
  if (e <= 0) return 'night';
  if (e < 0.3) return 'dusk';
  return 'day';
}

/** Light on a plant at `x` from a sun at `sunX` (0..1). Brightest right under the sun. */
export function lightAt(x: number, sunX: number, e: number, width: number): number {
  if (e <= 0) return 0;
  const reach = width * 0.55;
  const near = Math.max(0, 1 - Math.abs(x - sunX) / reach);
  return Math.sqrt(e) * (0.25 + 0.75 * near);
}

/** How far a plant should lean towards the sun (degrees). */
export function leanTowards(x: number, sunX: number, e: number, width: number): number {
  if (e <= 0) return 0;
  return Math.max(-18, Math.min(18, ((sunX - x) / width) * 40));
}

/** A shadow: offset away from the sun, longer when the sun is low. */
export function shadow(x: number, sunX: number, e: number): { dx: number; stretch: number; alpha: number } {
  if (e <= 0) return { dx: 0, stretch: 1, alpha: 0 };
  const low = 1 - e;
  return { dx: Math.max(-60, Math.min(60, (x - sunX) * 0.12 * (0.5 + low))), stretch: 1 + low * 1.6, alpha: 0.15 + 0.2 * e };
}

/** The sky's colour for an elevation: noon blue, dusk apricot, night ink. */
export function skyColour(e: number): string {
  const noon = [207, 224, 255];
  const dusk = [246, 185, 138];
  const rose = [178, 120, 158];
  const night = [42, 40, 64];
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i]! - v) * Math.max(0, Math.min(1, t))));
  let c = night;
  if (e >= 0.3) c = mix(dusk, noon, (e - 0.3) / 0.3);
  else if (e >= 0.12) c = mix(rose, dusk, (e - 0.12) / 0.18);
  else if (e >= 0) c = mix(night, rose, e / 0.12);
  return `rgb(${c.join(', ')})`;
}
