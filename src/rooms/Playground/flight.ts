/**
 * Ball flight outside the trays (between the Playground and Bip's yard).
 * Everything here is in room-local pixels and ms; no DOM, so it can be tested.
 */

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  /** rad/ms */
  spin: number;
  /** collision radius */
  r: number;
}

export interface World {
  /** px/ms² */
  g: number;
  /** Bip's yard, or null if there isn't one. */
  yard: Box | null;
  /** Thickness of the yard's floor strip. */
  floor: number;
  /** The room's right edge acts as a wall. */
  roomRight: number;
}

const BOUNCE = 0.45;

/** Advance a ball by dt. Returns true if it touched the yard floor this step. */
export function stepBall(b: Ball, dt: number, w: World): boolean {
  // small fixed substeps: no tunnelling through the net, and the real flight
  // matches what predictHit() expects
  if (dt > 8) {
    let floored = false;
    for (let left = dt; left > 0; left -= 8) floored = stepBall(b, Math.min(8, left), w) || floored;
    return floored;
  }
  const prevX = b.x;
  b.vy += w.g * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.angle += b.spin * dt;
  let floored = false;
  // the room has a ceiling: a throw that goes too high bounces back down
  if (b.y - b.r < 0 && b.vy < 0) {
    b.y = b.r;
    b.vy = -b.vy * 0.3;
  }
  const y = w.yard;
  if (y) {
    const floorY = y.bottom - w.floor;
    // the yard's far side is a tall, soft net: nothing sails past it, and it
    // soaks up most of the speed so the ball drops into the yard
    if (b.vx > 0 && prevX < y.right && b.x + b.r > y.right) {
      b.x = y.right - b.r;
      b.vx = -b.vx * 0.2;
      b.spin *= 0.3;
    }
    if (b.x > y.left && b.x < y.right && b.y > y.top) {
      if (b.y + b.r > floorY && b.vy > 0) {
        b.y = floorY - b.r;
        b.vy = -b.vy * BOUNCE;
        if (Math.abs(b.vy) < 0.06) b.vy = 0;
        b.vx *= 0.75;
        b.spin = b.vx / Math.max(4, b.r);
        floored = true;
      }
      if (b.x - b.r < y.left && b.vx < 0 && b.y + b.r > floorY - 4) {
        b.x = y.left + b.r;
        b.vx = -b.vx * 0.55;
      }
    }
  }
  if (b.x + b.r > w.roomRight && b.vx > 0) {
    b.x = w.roomRight - b.r;
    b.vx = -b.vx * 0.6;
  }
  return floored;
}

export function isResting(b: Ball, w: World): boolean {
  const y = w.yard;
  return !!y && Math.abs(b.vx) < 0.04 && b.vy === 0 && b.y + b.r >= y.bottom - w.floor - 1;
}

/**
 * Where (x) the ball will first come down through height `hitY` while falling,
 * inside the yard, and how long until then. Null if it never does (it falls
 * short, or lands on the floor first).
 */
export function predictHit(b0: Ball, hitY: number, w: World, horizonMs = 3000): { x: number; t: number } | null {
  const b = { ...b0 };
  const dt = 8;
  for (let t = 0; t < horizonMs; t += dt) {
    const floored = stepBall(b, dt, w);
    if (floored) return null;
    const y = w.yard;
    if (y && b.vy > 0 && b.y >= hitY && b.x > y.left && b.x < y.right) return { x: b.x, t };
    if (y && b.y > y.bottom + 200) return null;
  }
  return null;
}

/**
 * Launch velocity for a throw towards the yard. Keeps the throw's own feel
 * (its upward speed, and its sideways speed when that already works), but
 * makes sure it comes down inside the yard: a throw straight up still arcs
 * over to Bip, and nothing goes so high it hits the ceiling.
 */
export function throwToYard(
  from: { x: number; y: number },
  natural: { vx: number; vy: number },
  yard: Box,
  g: number,
  r: number,
): { vx: number; vy: number } {
  // no higher than the ceiling allows
  const maxUp = Math.sqrt(2 * g * Math.max(40, from.y - r - 12));
  const vy = Math.max(-maxUp, Math.min(natural.vy, -0.25));
  // when will it come down to roughly Bip's height in the yard?
  const landY = yard.bottom - (yard.bottom - yard.top) * 0.35;
  const disc = vy * vy + 2 * g * (landY - from.y);
  const t = disc > 0 ? (-vy + Math.sqrt(disc)) / g : 900;
  const w = yard.right - yard.left;
  const minX = yard.left + w * 0.4;
  const maxX = yard.right - w * 0.12;
  const vx = Math.min(Math.max(natural.vx, (minX - from.x) / t), (maxX - from.x) / t);
  return { vx, vy };
}

/**
 * A high, unhurried lob from `from` that arrives at `to` after T ms, already
 * dropping gently (a volleyball return you can actually get under). Returns
 * the launch velocity and the flight time.
 */
export function lob(from: { x: number; y: number }, to: { x: number; y: number }, g: number): { vx: number; vy: number; T: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // never slower to cross than to rise and fall back to the target height
  const rise = dy < -40 ? Math.sqrt((-2 * dy) / g) : 0;
  const T = Math.max(rise, Math.min(1400, Math.max(700, Math.abs(dx) / 0.85)));
  return { vx: dx / T, vy: (dy - 0.5 * g * T * T) / T, T };
}
