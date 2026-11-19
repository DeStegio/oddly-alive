import { useEffect, useRef } from 'react';
import { onFrame } from '../engine/frameLoop';
import { isReducedMotion } from '../state/settings';
import styles from './ScrollThread.module.css';

/**
 * A playful progress indicator (INT-039): a bead on a thread that descends
 * as you scroll and smiles at the bottom. Also publishes --depth and --skew
 * CSS variables so the headline can lean with scroll velocity (INT-031) and
 * the basement can darken with depth (INT-036). Never blocks native scroll.
 */
export function ScrollThread() {
  const beadRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    let lastY = window.scrollY;
    let skew = 0;
    let lastDepth = -1;
    const unsub = onFrame((dt) => {
      const y = window.scrollY;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      const depth = Math.min(1, Math.max(0, y / max));
      const v = (y - lastY) / Math.max(1, dt);
      lastY = y;
      const target = isReducedMotion() ? 0 : Math.max(-9, Math.min(9, v * -2.4));
      skew += (target - skew) * 0.12;
      if (Math.abs(skew) < 0.01) skew = 0;
      root.style.setProperty('--skew', `${skew.toFixed(2)}deg`);
      if (Math.abs(depth - lastDepth) > 0.002) {
        lastDepth = depth;
        root.style.setProperty('--depth', depth.toFixed(3));
        const bead = beadRef.current;
        if (bead) bead.style.transform = `translateY(${(depth * 100).toFixed(2)}cqh)`;
        rootRef.current?.setAttribute('data-end', depth > 0.98 ? 'true' : 'false');
      }
    });
    return () => {
      unsub();
      root.style.removeProperty('--skew');
      root.style.removeProperty('--depth');
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.thread} aria-hidden="true">
      <div className={styles.track}>
        <div ref={beadRef} className={styles.bead}>
          <svg viewBox="0 0 24 24" className={styles.face}>
            <circle cx="12" cy="12" r="10" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="2" />
            <circle cx="9" cy="10.5" r="1.4" fill="var(--char-ink)" />
            <circle cx="15" cy="10.5" r="1.4" fill="var(--char-ink)" />
            <path className={styles.mouth} d="M9 15 q 3 0 6 0" fill="none" stroke="var(--char-ink)" strokeWidth="1.6" strokeLinecap="round" />
            <path className={styles.smile} d="M8.5 14 q 3.5 3.5 7 0" fill="none" stroke="var(--char-ink)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
