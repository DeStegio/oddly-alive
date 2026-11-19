import { useEffect, useRef } from 'react';
import { onFrame } from '../engine/frameLoop';
import { layoutEpoch, pointer } from '../engine/pointer';

export interface ProximityCallbacks {
  /** Pointer entered the radius. `speed` is px/ms at the moment of entry. */
  onEnter?: (speed: number) => void;
  onLeave?: () => void;
  /** Pointer has hovered nearly still inside the radius for `stareMs`. */
  onStare?: () => void;
  /** Pointer is moving very fast inside the radius. */
  onFrenzy?: () => void;
}

interface Options extends ProximityCallbacks {
  radius: number;
  stareMs?: number;
  enabled?: boolean;
}

/**
 * Watches the pointer's distance to an element in the shared frame loop and
 * reports enter/leave/stare/frenzy edges. Callbacks are read through a ref so
 * consumers don't need to memoize them.
 */
export function useProximity(ref: React.RefObject<Element>, options: Options) {
  const cbs = useRef(options);
  cbs.current = options;
  const { radius, stareMs = 2200, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;
    let inside = false;
    let stillSince = 0;
    let stared = false;
    let fastFrames = 0;
    let rect: DOMRect | null = null;
    let seen = -1;
    let frames = 0;
    let lastMove = -1;
    return onFrame((_dt, now) => {
      const el = ref.current;
      if (!el || !pointer.active) return;
      frames++;
      if (!rect || seen !== layoutEpoch() || frames % 45 === 0) {
        rect = el.getBoundingClientRect();
        seen = layoutEpoch();
      }
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const d = Math.hypot(pointer.x - cx, pointer.y - cy);
      const isIn = pointer.inside && d < radius;
      if (isIn && !inside) {
        inside = true;
        stillSince = now;
        stared = false;
        cbs.current.onEnter?.(pointer.speed);
      } else if (!isIn && inside) {
        inside = false;
        fastFrames = 0;
        cbs.current.onLeave?.();
      }
      if (!inside) return;
      if (pointer.lastMove !== lastMove && pointer.speed > 0.12) {
        stillSince = now;
        stared = false;
      }
      lastMove = pointer.lastMove;
      if (!stared && now - stillSince > stareMs) {
        stared = true;
        cbs.current.onStare?.();
      }
      fastFrames = pointer.speed > 2.2 ? fastFrames + 1 : Math.max(0, fastFrames - 2);
      if (fastFrames > 24) {
        fastFrames = 0;
        cbs.current.onFrenzy?.();
      }
    });
  }, [ref, radius, stareMs, enabled]);
}
