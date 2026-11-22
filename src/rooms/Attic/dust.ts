/**
 * The attic's dust, as a coarse grid of levels (1 = thick, 0 = clean). You
 * rub it off; dust bunnies hide in whatever's left. Pure, so it can be tested.
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class DustGrid {
  readonly lv: Float32Array;

  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly cell: number,
    fill = 1,
  ) {
    this.lv = new Float32Array(cols * rows).fill(fill);
  }

  /** Rub at (x, y): takes off up to `amount` at the centre, less towards the edge. Returns how much came off. */
  scrub(x: number, y: number, amount: number, radius: number): number {
    let removed = 0;
    const c0 = Math.max(0, Math.floor((x - radius) / this.cell));
    const c1 = Math.min(this.cols - 1, Math.floor((x + radius) / this.cell));
    const r0 = Math.max(0, Math.floor((y - radius) / this.cell));
    const r1 = Math.min(this.rows - 1, Math.floor((y + radius) / this.cell));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const d = Math.hypot((c + 0.5) * this.cell - x, (r + 0.5) * this.cell - y);
        if (d > radius) continue;
        const i = r * this.cols + c;
        const take = Math.min(this.lv[i]!, amount * (1 - (d / radius) * 0.7));
        this.lv[i]! -= take;
        removed += take;
      }
    }
    return removed;
  }

  private cells(rect: Rect): number[] {
    const out: number[] = [];
    const c0 = Math.max(0, Math.floor(rect.x / this.cell));
    const c1 = Math.min(this.cols - 1, Math.floor((rect.x + rect.w - 1) / this.cell));
    const r0 = Math.max(0, Math.floor(rect.y / this.cell));
    const r1 = Math.min(this.rows - 1, Math.floor((rect.y + rect.h - 1) / this.cell));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(r * this.cols + c);
    return out;
  }

  /** Mean dust over a rectangle (0 clean … 1 thick). */
  coverage(rect: Rect): number {
    const cs = this.cells(rect);
    return cs.length ? cs.reduce((a, i) => a + this.lv[i]!, 0) / cs.length : 0;
  }

  clear(rect: Rect) {
    for (const i of this.cells(rect)) this.lv[i] = 0;
  }

  /** Mean dust over the whole attic. */
  total(): number {
    let s = 0;
    for (const v of this.lv) s += v;
    return s / this.lv.length;
  }

  levelAt(x: number, y: number): number {
    const c = Math.floor(x / this.cell);
    const r = Math.floor(y / this.cell);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return 0;
    return this.lv[r * this.cols + c]!;
  }

  /**
   * Where a frightened dust bunny runs: the thickest dust within `reach`,
   * preferring places away from the hand. Null when there's nowhere left.
   */
  hideout(from: { x: number; y: number }, hand: { x: number; y: number }, reach: number, avoid: Rect[] = []): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bestScore = -Infinity;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const v = this.lv[r * this.cols + c]!;
        if (v < 0.45) continue;
        const x = (c + 0.5) * this.cell;
        const y = (r + 0.5) * this.cell;
        if (Math.hypot(x - from.x, y - from.y) > reach) continue;
        if (avoid.some((a) => x > a.x && x < a.x + a.w && y > a.y && y < a.y + a.h)) continue;
        const score = v + Math.min(1, Math.hypot(x - hand.x, y - hand.y) / 250);
        if (score > bestScore) {
          bestScore = score;
          best = { x, y };
        }
      }
    }
    return best;
  }
}

/** Remembering takes stillness: a photo develops while you hold still over it. */
export const DEVELOP_MS = 1600;
export const LINE_MS = 2200;

export function dwell(progress: number, dt: number, still: boolean): number {
  return still ? progress + dt : Math.max(0, progress - dt * 0.5);
}

/** How developed a photo is (0..1), and how many lines of its memory have been told. */
export function told(progress: number, lines: number): { develop: number; lines: number } {
  const develop = Math.min(1, progress / DEVELOP_MS);
  return { develop, lines: Math.max(0, Math.min(lines, Math.floor((progress - DEVELOP_MS) / LINE_MS) + 1)) };
}

/** Wheel through a list (with "nothing" at the start). */
export function cycle<T>(list: readonly T[], current: T | null, dir: 1 | -1): T | null {
  const all: Array<T | null> = [null, ...list];
  const i = Math.max(0, all.indexOf(current));
  return all[(i + dir + all.length) % all.length]!;
}

/** A combination-lock dial. */
export const turn = (digit: number, dir: 1 | -1) => (digit + dir + 10) % 10;
