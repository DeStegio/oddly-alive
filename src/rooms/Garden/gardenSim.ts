/**
 * Things in the air in the Garden: thrown seeds, water from the can, pulled
 * crops being thrown. Scene-local pixels and ms; no DOM, so it can be tested.
 */

export interface Bed {
  /** Plot index (0..5). */
  plot: number;
  x0: number;
  x1: number;
  /** Top of the soil. */
  soilY: number;
}

export interface Scene {
  width: number;
  height: number;
  /** Where loose things come to rest on the lawn. */
  grassY: number;
  beds: Bed[];
  /** px/ms² */
  g: number;
  /** Sideways wind, px/ms². */
  wind?: number;
}

export type Body = 'seed' | 'drop' | 'crop';

export interface Thing {
  body: Body;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Spin, for drawing (rad). */
  angle: number;
  /** On the lawn, not moving. */
  resting: boolean;
}

/** What happened to a thing this step. */
export type Landing =
  | { type: 'soil'; plot: number }
  | { type: 'grass' }
  | { type: 'house' }
  | { type: 'fence' }
  | null;

const STEP = 8;

/** Advance one thing; returns where it ended up, if anywhere new. */
export function step(t: Thing, dt: number, s: Scene): Landing {
  if (t.resting) return null;
  for (let left = dt; left > 0; left -= STEP) {
    const h = Math.min(STEP, left);
    const prevY = t.y;
    t.vy += s.g * h;
    if (s.wind && t.body !== 'crop') t.vx += s.wind * h * (t.body === 'seed' ? 1.5 : 1);
    t.x += t.vx * h;
    t.y += t.vy * h;
    t.angle += t.vx * h * 0.02;

    // through the back door of the house (left) or over the fence to Bip (right)
    if (t.x < -t.r) return { type: 'house' };
    if (t.x > s.width + t.r) return { type: 'fence' };

    // falling onto a bed's soil
    if (t.vy > 0) {
      for (const b of s.beds) {
        if (t.x >= b.x0 && t.x <= b.x1 && prevY + t.r <= b.soilY && t.y + t.r >= b.soilY) {
          if (t.body === 'crop') {
            // crops bounce off soil like anything else heavy
            t.y = b.soilY - t.r;
            t.vy = -t.vy * 0.35;
            t.vx *= 0.7;
            if (Math.abs(t.vy) < 0.05 && Math.abs(t.vx) < 0.03) {
              t.vx = 0;
              t.vy = 0;
              t.resting = true;
              return { type: 'grass' };
            }
            break;
          }
          return { type: 'soil', plot: b.plot };
        }
      }
    }

    // the lawn
    if (t.y + t.r >= s.grassY && t.vy > 0) {
      if (t.body === 'drop') return { type: 'grass' };
      t.y = s.grassY - t.r;
      t.vy = -t.vy * (t.body === 'crop' ? 0.35 : 0.2);
      t.vx *= 0.6;
      if (Math.abs(t.vy) < 0.05 && Math.abs(t.vx) < 0.03) {
        t.vy = 0;
        t.vx = 0;
        t.resting = true;
        return { type: 'grass' };
      }
    }
  }
  return null;
}

/** Turn a hand's last movement into a throw, capped so things stay on screen. */
export function throwVelocity(vx: number, vy: number, max = 2.2): { vx: number; vy: number } {
  const m = Math.hypot(vx, vy);
  if (m <= max) return { vx, vy };
  return { vx: (vx / m) * max, vy: (vy / m) * max };
}

/** How hard a pull is (0..1) from how far it has been dragged up; 1 pops it out. */
export function pullTension(dy: number, threshold: number): number {
  return Math.max(0, Math.min(1, -dy / threshold));
}

/** A droplet leaving the watering can's spout. */
export function droplet(spoutX: number, spoutY: number, canVx: number, canVy: number, jitter: number): Thing {
  return { body: 'drop', x: spoutX, y: spoutY, vx: -0.12 + canVx * 0.45 + jitter * 0.04, vy: 0.05 + canVy * 0.3, r: 2, angle: 0, resting: false };
}
