import { useEffect, useRef } from 'react';
import { useWorld } from '../app/worldInstance';
import { onFrame } from '../engine/frameLoop';
import { layoutEpoch, pointer } from '../engine/pointer';
import { useProximity } from './useProximity';

/**
 * Turns pointer proximity around an element into world events
 * (POINTER_ENTERED / POINTER_LEFT / POINTER_STARE / POINTER_FRENZY).
 * What happens next is up to the behaviors.
 */
export function useSense(target: string, ref: React.RefObject<Element>, radius: number, opts: { stare?: boolean; frenzy?: boolean } = {}) {
  const world = useWorld();
  useProximity(ref, {
    radius,
    onEnter: (speed) => world.emit('POINTER_ENTERED', { target, speed: Number(speed.toFixed(2)) }),
    onLeave: () => world.emit('POINTER_LEFT', { target }),
    ...(opts.stare ? { onStare: () => world.emit('POINTER_STARE', { target }) } : {}),
    ...(opts.frenzy ? { onFrenzy: () => world.emit('POINTER_FRENZY', { target }) } : {}),
  });
}

/**
 * Detects the pointer circling around an element. Accumulates the signed
 * angle swept around the element's centre; N full turns within the time
 * window → POINTER_CIRCLED.
 */
export function useCircleDetector(target: string, ref: React.RefObject<Element>, { radius = 260, turns = 3, windowMs = 7000 } = {}) {
  const world = useWorld();
  const emitRef = useRef(world);
  emitRef.current = world;
  useEffect(() => {
    let total = 0;
    let lastAngle: number | null = null;
    let startedAt = 0;
    let lastMove = -1;
    let rect: DOMRect | null = null;
    let seen = -1;
    return onFrame((_dt, now) => {
      const el = ref.current;
      if (!el || !pointer.active) return;
      if (pointer.lastMove === lastMove) {
        if (now - pointer.lastMove > 1500) {
          total = 0;
          lastAngle = null;
        }
        return;
      }
      lastMove = pointer.lastMove;
      if (!rect || seen !== layoutEpoch()) {
        rect = el.getBoundingClientRect();
        seen = layoutEpoch();
      }
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = pointer.x - cx;
      const dy = pointer.y - cy;
      const d = Math.hypot(dx, dy);
      if (d > radius || d < 20) {
        total = 0;
        lastAngle = null;
        return;
      }
      const a = Math.atan2(dy, dx);
      if (lastAngle === null) {
        lastAngle = a;
        startedAt = now;
        return;
      }
      let delta = a - lastAngle;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      lastAngle = a;
      total += delta;
      if (now - startedAt > windowMs) {
        total = 0;
        startedAt = now;
      }
      if (Math.abs(total) >= Math.PI * 2 * turns) {
        total = 0;
        startedAt = now;
        emitRef.current.emit('POINTER_CIRCLED', { target, turns });
      }
    });
  }, [target, ref, radius, turns, windowMs]);
}
