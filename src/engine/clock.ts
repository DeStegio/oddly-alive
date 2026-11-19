/** Injectable time source so the scheduler and personality are testable. */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(handle: number): void;
}

export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (h) => window.clearTimeout(h),
};

/** Deterministic manual clock for tests. */
export class ManualClock implements Clock {
  private t: number;
  private seq = 1;
  private timers = new Map<number, { at: number; fn: () => void; order: number }>();

  constructor(start = 1_000_000) {
    this.t = start;
  }

  now() {
    return this.t;
  }

  setTimeout(fn: () => void, ms: number) {
    const id = this.seq++;
    this.timers.set(id, { at: this.t + Math.max(0, ms), fn, order: id });
    return id;
  }

  clearTimeout(handle: number) {
    this.timers.delete(handle);
  }

  /** Advance time, firing due timers in chronological order. */
  advance(ms: number) {
    const target = this.t + ms;
    for (;;) {
      let next: [number, { at: number; fn: () => void; order: number }] | null = null;
      for (const entry of this.timers) {
        if (entry[1].at > target) continue;
        if (!next || entry[1].at < next[1].at || (entry[1].at === next[1].at && entry[1].order < next[1].order)) next = entry;
      }
      if (!next) break;
      this.timers.delete(next[0]);
      this.t = next[1].at;
      next[1].fn();
    }
    this.t = target;
  }

  pending() {
    return this.timers.size;
  }
}
