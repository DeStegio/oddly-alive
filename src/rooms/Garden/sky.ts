/**
 * The garden's weather, by hand: clouds you draw in the sky, the soil drying
 * out under a strong sun, rainbows, and the fireflies that follow you at
 * night. Pure functions; the room just draws what they say.
 */

export interface Cloud {
  id: number;
  /** Centre, in scene pixels. */
  x: number;
  y: number;
  w: number;
  /** ms of life left; it rains for the first part, then thins out. */
  life: number;
}

export const CLOUD_LIFE = 14_000;
export const RAIN_FOR = 10_000;
export const MAX_CLOUDS = 2;
/** Full sun dries a bed out in this long. */
export const THIRST_MS = 30_000;
/** Rain soaks a dry bed in this long. */
export const SOAK_MS = 1_500;

export function newCloud(id: number, x: number, y: number, w: number): Cloud {
  return { id, x, y, w: Math.max(70, Math.min(220, w)), life: CLOUD_LIFE };
}

export const isRaining = (c: Cloud) => c.life > CLOUD_LIFE - RAIN_FOR;

/** Clouds drift downwind and thin out. Returns null when one has gone. */
export function stepCloud(c: Cloud, dt: number, wind: number, width: number): Cloud | null {
  const life = c.life - dt;
  if (life <= 0) return null;
  const x = Math.max(c.w / 2, Math.min(width - c.w / 2, c.x + wind * dt));
  return { ...c, x, life };
}

/** Is `x` under the cloud (and so in its shade, or its rain)? */
export const under = (c: Cloud, x: number) => Math.abs(x - c.x) < c.w * 0.55;

/** How a bed's soil changes: drying with the light on it, soaking up rain. 0 wet … 1 parched. */
export function dryness(d: number, light: number, dtMs: number, rained: boolean): number {
  if (rained) return Math.max(0, d - dtMs / SOAK_MS);
  return Math.min(1, d + (light * dtMs) / THIRST_MS);
}

/** Parched plants stop growing; the droop starts a little before that. */
export const wilt = (d: number) => Math.max(0, Math.min(1, (d - 0.6) / 0.4));

/** A rainbow shows when the sun is up and the rain is well off to one side of it. */
export function rainbow(c: Cloud, sunX: number, elevation: number, width: number): boolean {
  return isRaining(c) && elevation > 0.25 && Math.abs(c.x - sunX) > width * 0.25;
}

/** Firefly light on a plant: bright inside the swarm, nothing far off. */
export function fireflyLight(px: number, py: number, sx: number, sy: number, reach = 160): number {
  return Math.max(0, 1 - Math.hypot(px - sx, py - sy) / reach);
}

/** One firefly's place around the swarm's centre at time `t` (ms). */
export function orbit(i: number, t: number, sx: number, sy: number): { x: number; y: number } {
  const a = t / (900 + i * 130) + i * 2.4;
  const r = 18 + ((i * 17) % 34);
  return { x: sx + Math.cos(a) * r, y: sy + Math.sin(a * 1.3) * r * 0.7 };
}
