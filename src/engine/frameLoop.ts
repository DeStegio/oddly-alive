/**
 * One shared requestAnimationFrame loop for every follower, eye and letter.
 * It runs only while something is subscribed and the tab is visible, so idle
 * pages burn no frames.
 */
export type FrameCallback = (dtMs: number, now: number) => void;

const subscribers = new Set<FrameCallback>();
let rafId: number | null = null;
let last = 0;
let paused = false;

function tick(now: number) {
  rafId = null;
  const dt = last ? Math.min(64, now - last) : 16;
  last = now;
  for (const cb of Array.from(subscribers)) {
    try {
      cb(dt, now);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[frameLoop]', err);
    }
  }
  schedule();
}

function schedule() {
  if (rafId !== null || paused || subscribers.size === 0) return;
  if (typeof requestAnimationFrame === 'undefined') return;
  rafId = requestAnimationFrame(tick);
}

function stop() {
  if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(rafId);
  rafId = null;
  last = 0;
}

export function onFrame(cb: FrameCallback): () => void {
  subscribers.add(cb);
  schedule();
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0) stop();
  };
}

export function setFrameLoopPaused(value: boolean) {
  paused = value;
  if (paused) stop();
  else schedule();
}

export function frameSubscriberCount() {
  return subscribers.size;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => setFrameLoopPaused(document.hidden));
}
