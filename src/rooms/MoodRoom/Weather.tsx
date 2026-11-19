import { memo } from 'react';
import type { Mood } from '../../engine/types';
import styles from './MoodRoom.module.css';

const DROPS = Array.from({ length: 14 }, (_, i) => ({ x: 20 + ((i * 53) % 360), d: (i * 0.17) % 1.2 }));
const CONFETTI = Array.from({ length: 16 }, (_, i) => ({ x: 14 + ((i * 47) % 370), d: (i * 0.23) % 2.4, c: ['var(--coral)', 'var(--blue)', 'var(--mint)', 'var(--lavender)'][i % 4] }));
const STARS = Array.from({ length: 18 }, (_, i) => ({ x: 20 + ((i * 71) % 360), y: 30 + ((i * 37) % 220), r: 1.4 + (i % 3) * 0.7 }));

/**
 * The window's sky. Every mood has its own weather; layers cross-fade so a
 * mood change reads as the weather turning, not a UI state switch. Particle
 * counts are fixed and small.
 */
export const Weather = memo(function Weather({ mood, starry }: { mood: Mood; starry: boolean }) {
  return (
    <svg viewBox="0 0 400 520" className={styles.weather} data-mood={starry ? 'sleepy' : mood} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="520" className={styles.sky} />
      {/* sun */}
      <g className={`${styles.layer} ${styles.sun}`}>
        <circle cx="300" cy="110" r="46" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="2.5" />
        {Array.from({ length: 10 }, (_, i) => (
          <line key={i} x1="300" y1="44" x2="300" y2="56" stroke="var(--char-ink)" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${i * 36} 300 110)`} />
        ))}
      </g>
      {/* moon + stars */}
      <g className={`${styles.layer} ${styles.night}`}>
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fffaf1" className={styles.star} style={{ animationDelay: `${(i % 6) * 0.4}s` }} />
        ))}
        <path d="M290 70 a 46 46 0 1 0 40 70 a 36 36 0 1 1 -40 -70 z" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="2.5" />
        <text x="96" y="120" className={styles.zzz}>z z z</text>
      </g>
      {/* soft clouds (neutral / curious / shy) */}
      <g className={`${styles.layer} ${styles.clouds}`}>
        <path className={styles.drift} d="M40 150 q 0 -26 30 -24 q 10 -24 40 -12 q 30 -6 32 22 q 20 4 14 18 Z" fill="#fffaf1" stroke="var(--char-ink)" strokeWidth="2" />
        <path className={styles.driftSlow} d="M230 230 q 0 -20 24 -18 q 8 -20 32 -10 q 24 -4 26 18 q 16 4 10 14 Z" fill="#fffaf1" stroke="var(--char-ink)" strokeWidth="2" />
      </g>
      {/* curious: a hot air balloon */}
      <g className={`${styles.layer} ${styles.balloon}`}>
        <g className={styles.driftSlow}>
          <path d="M90 60 C 60 60 54 100 76 122 L 84 134 L 96 134 L 104 122 C 126 100 120 60 90 60 Z" fill="var(--coral)" stroke="var(--char-ink)" strokeWidth="2.5" />
          <path d="M90 60 C 82 80 82 110 88 134 M90 60 C 98 80 98 110 92 134" fill="none" stroke="var(--char-ink)" strokeWidth="1.5" />
          <rect x="83" y="140" width="14" height="10" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="2" />
          <path d="M84 134 L 84 140 M96 134 L 96 140" stroke="var(--char-ink)" strokeWidth="1.5" />
        </g>
      </g>
      {/* playful: a kite */}
      <g className={`${styles.layer} ${styles.kite}`}>
        <g className={styles.sway}>
          <path d="M110 70 L 140 110 L 110 160 L 80 110 Z" fill="var(--mint)" stroke="var(--char-ink)" strokeWidth="2.5" />
          <path d="M110 70 L 110 160 M80 110 L 140 110" stroke="var(--char-ink)" strokeWidth="1.5" />
          <path d="M110 160 q 20 40 -10 80 q -20 40 20 120" fill="none" stroke="var(--char-ink)" strokeWidth="1.5" />
        </g>
      </g>
      {/* annoyed: storm cloud + rain */}
      <g className={`${styles.layer} ${styles.storm}`}>
        <path className={styles.grumble} d="M70 140 q -4 -40 40 -38 q 14 -34 60 -20 q 44 -10 50 30 q 34 6 26 34 Z" fill="#8d8899" stroke="var(--char-ink)" strokeWidth="2.5" />
        {DROPS.map((d, i) => (
          <line key={i} x1={d.x} y1="170" x2={d.x - 6} y2="190" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" className={styles.drop} style={{ animationDelay: `${d.d}s` }} />
        ))}
      </g>
      {/* excited: confetti */}
      <g className={`${styles.layer} ${styles.confetti}`}>
        {CONFETTI.map((c, i) => (
          <rect key={i} x={c.x} y="-20" width="9" height="14" fill={c.c} stroke="var(--char-ink)" strokeWidth="1.2" className={styles.bit} style={{ animationDelay: `${c.d}s` }} />
        ))}
      </g>
      {/* mischievous: winking crescent + sparkles */}
      <g className={`${styles.layer} ${styles.mischief}`}>
        <path d="M110 60 a 40 40 0 1 0 30 70 a 30 30 0 1 1 -30 -70 z" fill="var(--mint)" stroke="var(--char-ink)" strokeWidth="2.5" />
        {[
          [260, 90],
          [320, 180],
          [230, 220],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${(y as number) - 12} L ${(x as number) + 4} ${(y as number) - 3} L ${(x as number) + 13} ${y} L ${(x as number) + 4} ${(y as number) + 3} L ${x} ${(y as number) + 12} L ${(x as number) - 4} ${(y as number) + 3} L ${(x as number) - 13} ${y} L ${(x as number) - 4} ${(y as number) - 3} Z`} fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="1.5" className={styles.star} style={{ animationDelay: `${i * 0.5}s` }} />
        ))}
      </g>
      {/* confused: an upside-down rainbow */}
      <g className={`${styles.layer} ${styles.rainbow}`}>
        {['var(--coral)', 'var(--yellow)', 'var(--mint)', 'var(--blue)', 'var(--lavender)'].map((c, i) => (
          <path key={c} d={`M${60 + i * 12} 80 A ${140 - i * 12} ${120 - i * 12} 0 0 0 ${340 - i * 12} 80`} fill="none" stroke={c} strokeWidth="11" />
        ))}
      </g>
      {/* affectionate: two birds */}
      <g className={`${styles.layer} ${styles.birds}`}>
        <g className={styles.driftSlow}>
          <path d="M80 120 q 12 -14 24 0 q 12 -14 24 0" fill="none" stroke="var(--char-ink)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M140 100 q 10 -12 20 0 q 10 -12 20 0" fill="none" stroke="var(--char-ink)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </g>
      {/* hills */}
      <path d="M0 430 Q 120 380 220 420 T 400 400 L 400 520 L 0 520 Z" className={styles.hill} stroke="var(--char-ink)" strokeWidth="2.5" />
    </svg>
  );
});
