import { useEffect, useRef } from 'react';
import { INFINITE } from '../../../content/infinite';
import styles from './LittleFrame.module.css';

const K = 'var(--char-ink)';

/**
 * A very small painting on the Living Room wall: it's of this room. Zoom
 * into it (wheel up over it, pinch, or just press it) and you go in.
 */
export function LittleFrame({ frameRef, onEnter }: { frameRef: React.RefObject<HTMLButtonElement>; onEnter: () => void }) {
  const acc = useRef(0);
  // a scroll-up (zoom in) over the picture takes you in; anywhere else the page scrolls as usual
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY >= 0) return;
      e.preventDefault();
      acc.current += -e.deltaY;
      if (acc.current > 120) {
        acc.current = 0;
        onEnter();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [frameRef, onEnter]);

  return (
    <button ref={frameRef} type="button" className={styles.frame} aria-label={INFINITE.entry} onClick={onEnter}>
      <svg viewBox="0 0 100 62.5" className={styles.svg} aria-hidden="true">
        <rect x="1.5" y="1.5" width="97" height="59.5" fill="var(--yellow)" stroke={K} strokeWidth="3" />
        <rect x="7" y="7" width="86" height="48.5" fill="var(--canvas)" stroke={K} strokeWidth="1.5" />
        {/* the room, in miniature: floor, sofa, lamp, a picture with a picture in it */}
        <rect x="7" y="40" width="86" height="15.5" fill="var(--canvas-deep)" />
        <rect x="30" y="31" width="34" height="10" rx="3" fill="var(--coral)" stroke={K} strokeWidth="1.2" />
        <rect x="27" y="36" width="40" height="7" rx="2" fill="var(--coral)" stroke={K} strokeWidth="1.2" />
        <path d="M17 44 V 26 M13 26 L 15 20 H 19 L 21 26 Z" fill="var(--yellow)" stroke={K} strokeWidth="1.2" />
        <rect x="70" y="14" width="12" height="9" fill="var(--yellow)" stroke={K} strokeWidth="1" />
        <rect x="73.5" y="16.5" width="5" height="4" fill="var(--canvas)" stroke={K} strokeWidth="0.6" />
        <circle cx="48" cy="28" r="4" fill="var(--lavender)" stroke={K} strokeWidth="1" />
      </svg>
    </button>
  );
}
