import type { StoredPlot } from '../../engine/memory';
import type { Weather } from '../../engine/weather';

/**
 * Garden growth: pure and deterministic, so it can be tested with a fake
 * clock. A plot's `growth` goes from 0 (just planted) to 1 (in bloom).
 */
export const PLANT_KINDS = ['sunflower', 'radish', 'moonflower', 'snapdragon', 'mint'] as const;
export type PlantKind = (typeof PLANT_KINDS)[number];

export interface PlantSpec {
  /** Time to bloom, in ms, at normal speed (watered, clear weather). */
  growMs: number;
  /** Where a harvest goes. */
  harvest: 'vase' | 'playground';
}

const MIN = 60_000;
export const PLANTS: Record<PlantKind, PlantSpec> = {
  sunflower: { growMs: 6 * MIN, harvest: 'vase' },
  radish: { growMs: 3 * MIN, harvest: 'playground' },
  moonflower: { growMs: 4 * MIN, harvest: 'vase' },
  snapdragon: { growMs: 5 * MIN, harvest: 'vase' },
  mint: { growMs: 2.5 * MIN, harvest: 'vase' },
};

/** Water lasts this long; after that a plant grows at half speed. */
export const WATER_MS = 8 * MIN;
/** Away from the page, plants grow at this fraction of normal speed. */
export const AWAY_RATE = 0.5;

export const isPlantKind = (v: unknown): v is PlantKind => typeof v === 'string' && (PLANT_KINDS as readonly string[]).includes(v);

export interface GrowContext {
  weather: Weather;
  /** After Hours counts as night for the moonflower. */
  night: boolean;
  /** False while catching up on time spent away from the page. */
  present: boolean;
}

/** Speed multiplier for a plant right now (0 = not growing). */
export function rate(kind: PlantKind, watered: boolean, ctx: GrowContext): number {
  const nightNow = ctx.night || ctx.weather === 'night';
  if (kind === 'moonflower') return nightNow ? (watered ? 1.6 : 0.8) : 0;
  if (!ctx.present) return AWAY_RATE;
  let r = watered ? 1 : 0.5;
  switch (ctx.weather) {
    case 'sunny':
      r *= 1.5;
      break;
    case 'storm':
      return 0;
    case 'snow':
      r *= 0.4;
      break;
    case 'night':
      r *= 0.5;
      break;
    default:
      break;
  }
  return r;
}

/** Rain waters everything; otherwise water wears off after WATER_MS. */
export function isWatered(plot: StoredPlot, now: number, weather: Weather): boolean {
  return weather === 'rain' || weather === 'storm' || (plot.wateredAt > 0 && now - plot.wateredAt < WATER_MS);
}

/** Bring a plot's growth up to `now`. Returns the same object if nothing changed. */
export function advance(plot: StoredPlot, now: number, ctx: GrowContext): StoredPlot {
  if (!isPlantKind(plot.kind) || plot.growth >= 1 || now <= plot.updatedAt) return plot.updatedAt >= now ? plot : { ...plot, updatedAt: now };
  const dt = now - plot.updatedAt;
  const watered = isWatered(plot, now, ctx.weather);
  const gain = (dt / PLANTS[plot.kind].growMs) * rate(plot.kind, watered, ctx);
  const wateredAt = ctx.weather === 'rain' || ctx.weather === 'storm' ? now : plot.wateredAt;
  return { ...plot, growth: Math.min(1, plot.growth + gain), updatedAt: now, wateredAt };
}

export type Stage = 0 | 1 | 2 | 3 | 4;

/** 0 seed · 1 sprout · 2 leaves · 3 bud · 4 bloom */
export function stage(growth: number): Stage {
  if (growth >= 1) return 4;
  if (growth >= 0.7) return 3;
  if (growth >= 0.4) return 2;
  if (growth >= 0.12) return 1;
  return 0;
}

export function plant(kind: PlantKind, now: number): StoredPlot {
  return { kind, plantedAt: now, updatedAt: now, wateredAt: 0, growth: 0 };
}

export function water(plot: StoredPlot, now: number): StoredPlot {
  return { ...plot, wateredAt: now };
}

/** Under full sun, a plant grows this many times faster than its packet says. */
export const SUN_SPEED = 8;

const SKY: Partial<Record<Weather, number>> = { sunny: 1.25, fog: 0.6, snow: 0.4, storm: 0.3 };

/**
 * Growth while you're here and the sun is yours: plants grow from the light
 * that falls on them (0..1); the moonflower only grows in the dark, faster
 * when the fireflies (passed in as `light` at night) are close.
 */
export function sunGrow(plot: StoredPlot, dtMs: number, light: number, night: boolean, weather: Weather): StoredPlot {
  if (!isPlantKind(plot.kind) || plot.growth >= 1 || dtMs <= 0) return plot;
  const r = plot.kind === 'moonflower' ? (night ? 0.6 + light : 0) : light * (SKY[weather] ?? 1);
  if (r <= 0) return plot;
  return { ...plot, growth: Math.min(1, plot.growth + (dtMs / PLANTS[plot.kind].growMs) * r * SUN_SPEED) };
}
