import { createSequenceDetector, isTypingTarget } from './keyboard';
import { installPointerTracking, onPointerMove } from './pointer';
import type { World } from './world';

/** Keys we react to. Everything else is left alone. */
const HARMLESS_KEYS = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']);

/**
 * Translates DOM input into world events. Only events inside this page are
 * observed. Keyboard handling never prevents default, never fires while the
 * visitor is typing in a field, and ignores modifier chords.
 */
export function installSensors(world: World): () => void {
  const cleanups: Array<() => void> = [];
  cleanups.push(installPointerTracking());

  // throttled pointer heartbeat (activity/idle), never per-frame
  let lastBeat = 0;
  cleanups.push(
    onPointerMove((p) => {
      const now = performance.now();
      if (now - lastBeat < 1000) return;
      lastBeat = now;
      world.emit('POINTER_MOVED', { speed: Number(p.speed.toFixed(2)) });
    }),
  );

  // keyboard
  const detector = createSequenceDetector();
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      world.calm();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (isTypingTarget(e.target)) return;
    const key = e.key.toLowerCase();
    if (!HARMLESS_KEYS.has(key)) return;
    world.emit('KEY_PRESSED', { key });
    const seq = detector.feed(key);
    if (seq) world.emit('KEY_SEQUENCE_DETECTED', { sequence: seq });
  };
  window.addEventListener('keydown', onKey);
  cleanups.push(() => window.removeEventListener('keydown', onKey));

  // scroll: velocity + direction, throttled
  let lastY = window.scrollY;
  let lastT = performance.now();
  let pending = false;
  let endFired = false;
  const onScroll = () => {
    if (pending) return;
    pending = true;
    window.setTimeout(() => {
      pending = false;
      const y = window.scrollY;
      const t = performance.now();
      const dy = y - lastY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const depth = Math.min(1, Math.max(0, y / max));
      if (dy !== 0) {
        world.emit('SCROLL_CHANGED', {
          depth: Number(depth.toFixed(3)),
          velocity: Number((dy / Math.max(1, t - lastT)).toFixed(2)),
          direction: dy > 0 ? 'down' : 'up',
        });
      }
      if (depth > 0.985 && !endFired) {
        endFired = true;
        world.emit('SCROLL_END_REACHED', { depth });
      } else if (depth < 0.9) endFired = false;
      lastY = y;
      lastT = t;
    }, 200);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  cleanups.push(() => window.removeEventListener('scroll', onScroll));

  // tab visibility
  let hiddenAt = 0;
  const onVis = () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      world.emit('TAB_VISIBILITY_CHANGED', { visible: false, awayMs: 0 });
    } else {
      world.emit('TAB_VISIBILITY_CHANGED', { visible: true, awayMs: hiddenAt ? Date.now() - hiddenAt : 0 });
    }
  };
  document.addEventListener('visibilitychange', onVis);
  cleanups.push(() => document.removeEventListener('visibilitychange', onVis));

  return () => {
    for (const c of cleanups.reverse()) c();
  };
}
