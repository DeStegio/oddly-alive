import type { PlantKind } from './growth';

/**
 * The garden's insects: two bees and a butterfly. They want open flowers,
 * prefer the ones in the sun, carry a little pollen from one to the next,
 * shelter from rain, go home at night, and get blown about by the wind.
 * Pure steering; the room draws them.
 */
export interface Bug {
  kind: 'bee' | 'butterfly';
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Which plot it's heading for. */
  target: number | null;
  /** Pollen from the last flower it sat on. */
  carrying: PlantKind | null;
  /** Sitting on a flower until then (ms of game time). */
  restUntil: number;
  /** Personal wobble phase. */
  phase: number;
}

export interface Flower {
  plot: number;
  x: number;
  y: number;
  kind: PlantKind;
}

export interface Env {
  w: number;
  h: number;
  /** Sideways push (px/s²). */
  wind: number;
  raining: boolean;
  night: boolean;
  /** Where the sun is (bees like flowers near it). */
  sunX: number;
}

export interface Visit {
  bug: number;
  plot: number;
  kind: PlantKind;
  /** Pollen it brought from a different kind of flower: a cross. */
  crossWith: PlantKind | null;
}

export function makeBugs(w: number, h: number): Bug[] {
  return [
    { kind: 'bee', x: w * 0.3, y: h * 0.35, vx: 0, vy: 0, target: null, carrying: null, restUntil: 0, phase: 0 },
    { kind: 'bee', x: w * 0.6, y: h * 0.3, vx: 0, vy: 0, target: null, carrying: null, restUntil: 0, phase: 2 },
    { kind: 'butterfly', x: w * 0.8, y: h * 0.4, vx: 0, vy: 0, target: null, carrying: null, restUntil: 0, phase: 4 },
  ];
}

/** Flowers that are open now: in bloom, not radishes, moonflowers only by night (and the rest only by day). */
export const isOpen = (kind: PlantKind, night: boolean) => kind !== 'radish' && (kind === 'moonflower' ? night : !night);

const SPEED = { bee: 140, butterfly: 90 } as const;
const REST_MS = 1300;

/** Pick a flower: closer is better, sunnier is better for bees, and not the one it just left. */
function choose(b: Bug, flowers: Flower[], env: Env, rng: () => number, last: number | null): number | null {
  const options = flowers.filter((f) => f.plot !== last);
  if (!options.length) return flowers[0]?.plot ?? null;
  const weights = options.map((f) => {
    const d = Math.hypot(f.x - b.x, f.y - b.y) + 40;
    const sun = b.kind === 'bee' ? 1 + Math.max(0, 1 - Math.abs(f.x - env.sunX) / (env.w * 0.5)) : 1;
    return (1 / d) * sun;
  });
  const total = weights.reduce((a, c) => a + c, 0);
  let roll = rng() * total;
  for (let i = 0; i < options.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return options[i]!.plot;
  }
  return options[options.length - 1]!.plot;
}

/**
 * Move every bug by dt (ms). `now` is game time (ms). Returns the new bugs
 * and any flower visits that happened (with crosses).
 */
export function stepBugs(bugs: Bug[], flowers: Flower[], env: Env, now: number, dt: number, rng: () => number): { bugs: Bug[]; visits: Visit[] } {
  const visits: Visit[] = [];
  const s = dt / 1000;
  const next = bugs.map((b, i) => {
    let { x, y, vx, vy, target, carrying, restUntil } = b;
    const phase = b.phase + s * (b.kind === 'bee' ? 9 : 5);
    let goal: { x: number; y: number };
    if (env.night) goal = { x: env.w * 0.04, y: env.h * 0.3 }; // home to the hive by the house
    else if (env.raining) goal = { x: env.w * (0.15 + i * 0.1), y: env.h * 0.42 }; // under the fence rail
    else {
      if (now < restUntil) return { ...b, phase, vx: 0, vy: 0 };
      const open = flowers;
      if (target === null || !open.some((f) => f.plot === target)) target = choose(b, open, env, rng, target);
      const f = open.find((o) => o.plot === target);
      goal = f ? { x: f.x, y: f.y } : { x: env.w * 0.5 + Math.sin(phase * 0.3) * env.w * 0.3, y: env.h * 0.3 };
      if (f && Math.hypot(f.x - x, f.y - y) < 12) {
        visits.push({ bug: i, plot: f.plot, kind: f.kind, crossWith: carrying && carrying !== f.kind ? carrying : null });
        return { ...b, phase, x: f.x, y: f.y, vx: 0, vy: 0, carrying: f.kind, restUntil: now + REST_MS, target: choose(b, open, env, rng, f.plot) };
      }
    }
    // steer towards the goal, with a wobble (bees buzz, butterflies loop)
    const dx = goal.x - x;
    const dy = goal.y - y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = SPEED[b.kind];
    const wob = b.kind === 'bee' ? 40 : 70;
    const ax = (dx / d) * sp * 2.2 - vx * 1.6 + Math.cos(phase) * wob + env.wind;
    const ay = (dy / d) * sp * 2.2 - vy * 1.6 + Math.sin(phase * 1.3) * wob;
    vx += ax * s;
    vy += ay * s;
    const v = Math.hypot(vx, vy);
    if (v > sp * 1.4) {
      vx = (vx / v) * sp * 1.4;
      vy = (vy / v) * sp * 1.4;
    }
    x = Math.max(4, Math.min(env.w - 4, x + vx * s));
    y = Math.max(4, Math.min(env.h * 0.9, y + vy * s));
    return { ...b, x, y, vx, vy, target, carrying, restUntil, phase };
  });
  return { bugs: next, visits };
}

/** What a cross of two flowers is called in the vase (order-independent, so a×b = b×a). */
export const hybridId = (a: PlantKind, b: PlantKind) => `hybrid:${[a, b].sort().join(':')}`;
