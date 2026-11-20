import { useEffect } from 'react';
import styles from './ClickRipple.module.css';

/** Anything the visitor can actually act on. */
const INTERACTIVE =
  'button:not(:disabled), a[href], [role="button"], [data-surface], input, select, textarea, label, summary';
const MAX_LIVE = 8;

/**
 * Pointer feedback: every press leaves a small ink ring under the cursor, so a
 * click always visibly "lands". Presses on something interactive get a firmer,
 * filled ring; presses on empty space get a faint one. Drawn straight into the
 * DOM (no React state) so a burst of clicks never re-renders the app.
 */
export function ClickRipple() {
  useEffect(() => {
    const layer = document.createElement('div');
    layer.className = styles.layer ?? '';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !e.isPrimary) return;
      if (document.documentElement.dataset.motion === 'reduced') return;
      const target = e.target instanceof Element ? e.target : null;
      const hit = Boolean(target?.closest(INTERACTIVE));
      const ring = document.createElement('span');
      ring.className = hit ? `${styles.ring} ${styles.hit}` : (styles.ring ?? '');
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      ring.addEventListener('animationend', () => ring.remove(), { once: true });
      // safety net if animationend never fires (e.g. tab hidden mid-animation)
      window.setTimeout(() => ring.remove(), 1000);
      while (layer.childElementCount >= MAX_LIVE) layer.firstElementChild?.remove();
      layer.appendChild(ring);
    };

    window.addEventListener('pointerdown', onDown, { capture: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', onDown, { capture: true });
      layer.remove();
    };
  }, []);
  return null;
}
