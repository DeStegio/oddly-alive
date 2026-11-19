import { useRef } from 'react';
import { useWorld } from '../app/worldInstance';
import { useCharacter } from './useCharacter';
import { useSense } from './useSense';
import styles from './DustBunny.module.css';

function Fluff({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 44" className={className} aria-hidden="true">
      <path
        d="M8 36 C 2 30 6 20 12 20 C 12 10 24 6 30 12 C 36 4 50 8 50 18 C 58 20 58 34 50 37 C 40 42 18 42 8 36 Z"
        fill="#cfc8bb"
        stroke="var(--char-ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="24" cy="26" r="2.6" fill="var(--char-ink)" />
      <circle cx="36" cy="26" r="2.6" fill="var(--char-ink)" />
      <path d="M27 32 q 3 2 6 0" fill="none" stroke="var(--char-ink)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A dust bunny under the sofa. Hides from the pointer; splits when poked. */
export function DustBunny() {
  const world = useWorld();
  const { rootRef } = useCharacter('bunny', 'neutral');
  const hitRef = useRef<HTMLButtonElement>(null);
  useSense('bunny', hitRef, 90);
  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={hitRef}
        type="button"
        className={`prop-btn ${styles.hit}`}
        aria-label="A dust bunny hiding under the sofa"
        onClick={(e) => world.emit('OBJECT_CLICKED', { target: 'bunny', repeat: 1, via: e.detail === 0 ? 'keyboard' : 'pointer' })}
      >
        <Fluff className={styles.main} />
        <Fluff className={`${styles.baby} ${styles.b1}`} />
        <Fluff className={`${styles.baby} ${styles.b2}`} />
        <Fluff className={`${styles.baby} ${styles.b3}`} />
      </button>
    </div>
  );
}
