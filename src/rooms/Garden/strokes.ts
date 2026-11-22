/**
 * Planting by drawing: a stroke drawn in the soil is read as a shape, and the
 * shape decides what grows. A quick straight swipe across a ripe plant cuts
 * it. Pure geometry, no DOM.
 */
export type Shape = 'line' | 'loop' | 'zigzag' | 'crescent' | 'spiral' | 'slash';

export interface Pt {
  x: number;
  y: number;
}

export function pathLength(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  return l;
}

/** Evenly spaced points along the stroke, so speed doesn't change the reading. */
export function resample(pts: Pt[], n = 32): Pt[] {
  if (pts.length < 2) return pts.slice();
  const step = pathLength(pts) / (n - 1);
  if (step === 0) return [pts[0]!];
  const out: Pt[] = [pts[0]!];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1]!;
    const b = pts[i]!;
    let seg = Math.hypot(b.x - a.x, b.y - a.y);
    while (carry + seg >= step && out.length < n) {
      const t = (step - carry) / seg;
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      out.push(p);
      seg -= step - carry;
      a = p;
      carry = 0;
    }
    carry += seg;
  }
  while (out.length < n) out.push(pts[pts.length - 1]!);
  return out;
}

export interface Features {
  length: number;
  width: number;
  height: number;
  /** Sum of signed turning (radians). */
  turning: number;
  /** Sum of absolute turning (radians). */
  wiggle: number;
  /** Changes of horizontal direction. */
  reversals: number;
  /** End-to-start distance over length (0 = closed). */
  openness: number;
  rising: boolean;
}

export function features(raw: Pt[]): Features {
  const pts = resample(raw);
  let turning = 0;
  let wiggle = 0;
  let reversals = 0;
  let lastDir = 0;
  for (let i = 2; i < pts.length; i++) {
    const a = Math.atan2(pts[i - 1]!.y - pts[i - 2]!.y, pts[i - 1]!.x - pts[i - 2]!.x);
    const b = Math.atan2(pts[i]!.y - pts[i - 1]!.y, pts[i]!.x - pts[i - 1]!.x);
    let d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    turning += d;
    wiggle += Math.abs(d);
  }
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i]!.x - pts[i - 1]!.x;
    const dir = Math.abs(dx) > 0.5 ? Math.sign(dx) : 0;
    if (dir && lastDir && dir !== lastDir) reversals++;
    if (dir) lastDir = dir;
  }
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const length = pathLength(raw);
  const first = raw[0]!;
  const last = raw[raw.length - 1]!;
  return {
    length,
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    turning,
    wiggle,
    reversals,
    openness: length ? Math.hypot(last.x - first.x, last.y - first.y) / length : 1,
    rising: last.y < first.y,
  };
}

const TAU = Math.PI * 2;

/** Read a stroke. Too short or too scribbly to tell: null. */
export function classify(raw: Pt[]): Shape | null {
  if (raw.length < 4) return null;
  const f = features(raw);
  if (f.length < 30) return null;
  const turn = Math.abs(f.turning);
  if (turn > TAU * 1.5) return 'spiral';
  if (turn > TAU * 0.75 && f.openness < 0.3) return 'loop';
  if (f.reversals >= 3 && f.width > f.height * 0.8) return 'zigzag';
  if (turn > Math.PI * 0.55 && turn <= TAU * 0.75 && f.openness >= 0.3) return 'crescent';
  if (turn < Math.PI * 0.35 && f.width > f.height * 2.2) return 'slash';
  if (turn < Math.PI * 0.45 && f.height > f.width * 1.8 && f.rising) return 'line';
  return null;
}
