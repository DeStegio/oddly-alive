import { useEffect, useRef } from 'react';
import { onFrame } from '../engine/frameLoop';
import { pointer } from '../engine/pointer';
import { isReducedMotion } from '../state/settings';
import styles from './StarTrail.module.css';

const POOL = 14;

/**
 * An optional stardust trail behind the pointer, only in select scenes
 * (INT-011). A fixed pool of DOM sparks is recycled — no unbounded growth —
 * and nothing is drawn for touch, reduced motion, or a resting pointer.
 */
export function StarTrail() {
  const els = useRef<HTMLSpanElement[]>([]);
  useEffect(() => {
    let idx = 0;
    let lastX = 0;
    let lastY = 0;
    return onFrame(() => {
      if (isReducedMotion() || !pointer.active || pointer.kind === 'touch' || !pointer.inside) return;
      const d = Math.hypot(pointer.x - lastX, pointer.y - lastY);
      if (d < 18) return;
      lastX = pointer.x;
      lastY = pointer.y;
      const el = els.current[idx++ % POOL];
      if (!el) return;
      el.style.left = `${pointer.x}px`;
      el.style.top = `${pointer.y}px`;
      el.classList.remove(styles.on ?? 'on');
      void el.offsetWidth;
      el.classList.add(styles.on ?? 'on');
    });
  }, []);
  return (
    <div className={styles.layer} aria-hidden="true">
      {Array.from({ length: POOL }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            if (el) els.current[i] = el;
          }}
          className={styles.spark}
        />
      ))}
    </div>
  );
}
