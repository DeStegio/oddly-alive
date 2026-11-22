/**
 * Back-Fence Volley: Dot (you) against Bip, over the garden fence. Pure
 * simulation so it can be tested: a court, a ball made of something, Dot's
 * timed hits, and Bip, who predicts where the ball will come down, takes a
 * moment to react, and now and then gets it wrong.
 *
 * Units: court pixels (800 × 360), seconds.
 */
export const COURT = { w: 800, h: 360, ground: 320, net: 400, netTop: 196 } as const;
export const DOT_R = 26;
export const BIP_R = 34;
export const REACH = 64;

export type MaterialId = 'ball' | 'balloon' | 'radish' | 'cube' | 'slipper';

export interface Material {
  id: MaterialId;
  label: string;
  r: number;
  /** px/s² */
  gravity: number;
  /** Air drag (1/s): balloons drift, radishes drop. */
  drag: number;
  /** Bounce off the net and walls. */
  bounce: number;
  /** How hard a hit sends it (px/s). */
  power: number;
  /** Wobble in flight (slippers flutter). */
  flutter: number;
}

export const MATERIALS: Record<MaterialId, Material> = {
  ball: { id: 'ball', label: 'a ball', r: 14, gravity: 760, drag: 0.05, bounce: 0.55, power: 640, flutter: 0 },
  balloon: { id: 'balloon', label: 'a balloon', r: 20, gravity: 170, drag: 1.1, bounce: 0.7, power: 520, flutter: 0.15 },
  radish: { id: 'radish', label: 'a radish', r: 12, gravity: 1050, drag: 0.02, bounce: 0.3, power: 720, flutter: 0 },
  cube: { id: 'cube', label: 'a soft cube', r: 15, gravity: 820, drag: 0.12, bounce: 0.1, power: 600, flutter: 0 },
  slipper: { id: 'slipper', label: 'a slipper from the attic', r: 16, gravity: 640, drag: 0.5, bounce: 0.25, power: 580, flutter: 0.9 },
};

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  /** Who touched it last. */
  last: 'dot' | 'bip' | null;
}

export type Side = 'dot' | 'bip';
export const sideOf = (x: number): Side => (x < COURT.net ? 'dot' : 'bip');

export interface StepResult {
  ball: BallState;
  /** The ball came down: on whose side (they lose the point), or out. */
  landed?: { side: Side; out: boolean };
  hitNet?: boolean;
}

/** Move the ball by dt (s). Wind is px/s² sideways. Flutter depends on where the ball is, so a flight is repeatable. */
export function stepBall(b: BallState, m: Material, dt: number, wind = 0, _t = 0): StepResult {
  const ax = wind - b.vx * m.drag + (m.flutter ? Math.sin(b.x * 0.045 + b.y * 0.02) * 220 * m.flutter : 0);
  const ay = m.gravity - b.vy * m.drag;
  let vx = b.vx + ax * dt;
  let vy = b.vy + ay * dt;
  let x = b.x + vx * dt;
  let y = b.y + vy * dt;
  let hitNet = false;
  // the fence: a thin wall from the ground up to netTop
  const crossed = (b.x - COURT.net) * (x - COURT.net) <= 0 && b.x !== x;
  if (crossed && y + m.r > COURT.netTop) {
    x = b.x < COURT.net ? COURT.net - m.r : COURT.net + m.r;
    vx = -vx * m.bounce;
    hitNet = true;
  }
  const ball = { ...b, x, y, vx, vy, angle: b.angle + b.spin * dt };
  // off the sides: out, and the point goes against whoever hit it last
  if (x < -m.r * 2 || x > COURT.w + m.r * 2) return { ball, landed: { side: b.last ?? sideOf(b.x), out: true }, hitNet };
  if (y + m.r >= COURT.ground) {
    ball.y = COURT.ground - m.r;
    return { ball, landed: { side: sideOf(x), out: false }, hitNet };
  }
  return { ball, hitNet };
}

/** Where (x) the ball will come down if nobody touches it. */
export function predictLanding(b: BallState, m: Material, wind = 0, maxS = 6): { x: number; t: number } {
  let s = b;
  const dt = 1 / 120;
  for (let t = 0; t < maxS; t += dt) {
    const r = stepBall(s, m, dt, wind, 0);
    s = r.ball;
    if (r.landed) return { x: s.x, t };
  }
  return { x: s.x, t: maxS };
}

/**
 * Dot's hit. Contact timing matters: `timing` is how far into the swing
 * the ball met Dot (0 = right at the start: flat and quick; 1 = at the end:
 * a high lob). `offset` is where the ball is relative to Dot (−1 behind …
 * +1 in front). A shot that would clip the fence gets a little more lift.
 */
export function dotHit(b: BallState, m: Material, dot: { x: number; y: number }, timing: number, aimUp = 0): BallState {
  const offset = Math.max(-1, Math.min(1, (b.x - dot.x) / REACH));
  const angle = (38 + timing * 34 - offset * 12 + aimUp * 10) * (Math.PI / 180);
  const speed = m.power * (1.08 - timing * 0.22);
  const vx = Math.cos(angle) * speed;
  const vy = -Math.sin(angle) * speed;
  const shot = { ...b, vx, vy, spin: 6 - timing * 10, last: 'dot' as const };
  // forgiving: a shot that would hit the fence or drop on Dot's own side is
  // sent over instead (still shaped by the timing: early is long, late is short)
  const land = landingOf(shot, m);
  if (land.net || land.x < COURT.net + 30) return { ...lobTo(b, m, 520 + (1 - timing) * 180, 0.8 + timing * 0.5, 'dot'), spin: shot.spin };
  return shot;
}

/**
 * A return aimed to come down at tx after about T seconds. Starts from the
 * drag-free arc, then corrects against the real flight (drag, flutter,
 * the fence) a few times, so balloons and slippers land where they're sent.
 */
export function lobTo(b: BallState, m: Material, tx: number, T: number, who: Side): BallState {
  const ty = COURT.ground - m.r - 10;
  let vx = (tx - b.x) / T;
  let vy = (ty - b.y - 0.5 * m.gravity * T * T) / T;
  for (let i = 0; i < 14; i++) {
    const trial = { ...b, vx, vy };
    const { x, net } = landingOf(trial, m);
    if (net) {
      vy -= 70;
      continue;
    }
    const miss = tx - x;
    if (Math.abs(miss) < 8) break;
    vx += (miss / T) * 0.9;
  }
  return { ...b, vx, vy, spin: who === 'bip' ? -4 : 4, last: who };
}

function landingOf(b: BallState, m: Material): { x: number; net: boolean } {
  let s = b;
  let net = false;
  for (let i = 0; i < 720; i++) {
    const r = stepBall(s, m, 1 / 120);
    net ||= !!r.hitNet;
    s = r.ball;
    if (r.landed) break;
  }
  return { x: s.x, net };
}

/** A serve from the server's side. */
export function serve(by: Side, m: Material): BallState {
  const x = by === 'dot' ? 150 : 650;
  const base: BallState = { x, y: 150, vx: 0, vy: 0, spin: 0, angle: 0, last: by };
  return lobTo(base, m, by === 'dot' ? 560 : 240, 1.25, by);
}

// ------------------------------------------------------------- Bip

export interface BipState {
  x: number;
  /** Where Bip thinks the ball will be playable. */
  target: number | null;
  /** When he'll start moving (reaction time). */
  moveAt: number;
  /** He's on a streak and getting cocky (bigger mistakes). */
  streak: number;
  /** Diving for a long one. */
  diving: boolean;
  cooldown: number;
}

export const BIP_SPEED = 380;
export const initialBip = (): BipState => ({ x: 640, target: null, moveAt: 0, streak: 0, diving: false, cooldown: 0 });

/**
 * When the ball heads his way, Bip works out where it'll come down, with an
 * error that grows with the ball's speed and his confidence, then sets off
 * after a short, human delay. rng gives 0..1.
 */
export function bipPlan(bip: BipState, b: BallState, m: Material, now: number, rng: () => number, wind = 0): BipState {
  const land = predictLanding(b, m, wind);
  const speed = Math.hypot(b.vx, b.vy);
  const cocky = Math.min(1, bip.streak / 6);
  let err = (rng() - 0.5) * 2 * (12 + speed * 0.03) * (1 + cocky);
  // and sometimes he just misreads it
  if (rng() < 0.07 + cocky * 0.06) err += (rng() < 0.5 ? -1 : 1) * (60 + rng() * 40);
  // he wants to meet it a little before it lands, around head height
  const target = Math.max(COURT.net + BIP_R, Math.min(COURT.w - BIP_R, land.x + err - Math.sign(b.vx) * 18));
  const reaction = 0.16 + rng() * 0.16;
  const far = Math.abs(target - bip.x) > BIP_SPEED * Math.max(0.2, land.t - reaction) * 0.85;
  return { ...bip, target, moveAt: now + reaction, diving: far };
}

/** Move Bip towards his target. */
export function bipMove(bip: BipState, now: number, dt: number): BipState {
  if (bip.target === null || now < bip.moveAt) return bip;
  const d = bip.target - bip.x;
  const step = Math.min(Math.abs(d), BIP_SPEED * (bip.diving ? 1.35 : 1) * dt);
  return { ...bip, x: bip.x + Math.sign(d) * step };
}

/** Can Bip get to it? (head height, reach; a dive stretches it) */
export function bipCanHit(bip: BipState, b: BallState): boolean {
  if (b.x < COURT.net || b.vy < -40) return false;
  const headY = COURT.ground - BIP_R * 2.4;
  const reach = REACH * (bip.diving ? 1.35 : 1);
  return Math.hypot(b.x - bip.x, b.y - headY) < reach;
}

/** Can Dot reach it right now? */
export function dotCanHit(dot: { x: number; y: number }, b: BallState, m: Material): boolean {
  if (b.x > COURT.net) return false;
  return Math.hypot(b.x - dot.x, b.y - (dot.y - DOT_R)) < REACH + m.r;
}
