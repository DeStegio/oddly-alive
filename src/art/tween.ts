import { onFrame } from '../engine/frameLoop';

/**
 * The one tween helper (Phase 4 motion kit). Runs on the shared frame loop,
 * so it pauses with hidden tabs and costs nothing when idle.
 *
 *   tween({ from: 0, to: 1, ms: 480, ease: 'spring', onUpdate: (v) => … })
 *
 * Returns a cancel function. Reduced motion: pass `ms: 0` (jumps to the end).
 */
export type Ease = 'linear' | 'out' | 'inOut' | 'spring' | 'squash';

export const EASES: Record<Ease, (t: number) => number> = {
  linear: (t) => t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  // overshoot once, settle (matches --ease-spring)
  spring: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
  // 0 → 1 → 0 bump, for squash/stretch pulses
  squash: (t) => Math.sin(Math.PI * t) * (1 - t * 0.35),
};

export interface TweenOpts {
  from: number;
  to: number;
  ms: number;
  ease?: Ease;
  delay?: number;
  onUpdate: (v: number) => void;
  onDone?: () => void;
}

export function tween({ from, to, ms, ease = 'out', delay = 0, onUpdate, onDone }: TweenOpts): () => void {
  if (ms <= 0) {
    onUpdate(to);
    onDone?.();
    return () => {};
  }
  let t = -delay;
  let done = false;
  const f = EASES[ease];
  const stop = onFrame((dt) => {
    if (done) return;
    t += dt;
    if (t < 0) return;
    const k = Math.min(1, t / ms);
    onUpdate(from + (to - from) * f(k));
    if (k >= 1) {
      done = true;
      stop();
      onDone?.();
    }
  });
  return () => {
    done = true;
    stop();
  };
}

/** Squash-and-stretch pulse on an element (pickups and drops). */
export function squash(el: HTMLElement | SVGElement, amount = 0.14, ms = 320): () => void {
  return tween({
    from: 0,
    to: 1,
    ms,
    ease: 'linear',
    onUpdate: (k) => {
      const s = EASES.squash(k) * amount;
      el.style.scale = `${(1 + s).toFixed(3)} ${(1 - s).toFixed(3)}`;
    },
    onDone: () => (el.style.scale = ''),
  });
}
