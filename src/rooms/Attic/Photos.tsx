import { memo } from 'react';
import type { Memory } from '../../content/attic';
import styles from './Attic.module.css';

const INK = { stroke: '#3a2c22', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/**
 * Pim's photographs. Each is a small scene that develops (blank, then sepia,
 * then colour) while you keep still, and moves a little while it's remembered.
 */
export const PhotoArt = memo(function PhotoArt({ id }: { id: Memory['id'] }) {
  return (
    <svg viewBox="0 0 120 92" preserveAspectRatio="xMidYMid slice" className={styles.photoSvg} aria-hidden="true">
      <rect width="120" height="92" fill="#f4ecdc" />
      <g className={styles.picture}>{SCENES[id]}</g>
    </svg>
  );
});

const SCENES: Record<Memory['id'], React.ReactNode> = {
  sea: (
    <>
      <rect width="120" height="50" fill="#a9c8e8" />
      <circle cx="94" cy="18" r="9" fill="#f5d873" className={styles.photoSun} />
      <g className={styles.waves}>
        <path d="M-20 52 q 10 -5 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 V 64 H -20 Z" fill="#5f8fc4" />
        <path d="M-20 60 q 10 -4 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 V 70 H -20 Z" fill="#7aa6d6" />
      </g>
      <rect y="68" width="120" height="24" fill="#e9d29c" />
      {/* four on one towel */}
      <rect x="30" y="74" width="54" height="9" rx="2" fill="#e5735e" {...INK} />
      {[38, 50, 62, 74].map((x, i) => (
        <g key={x} className={styles.bob} style={{ animationDelay: `${i * -0.3}s` }}>
          <circle cx={x} cy="66" r="4.5" fill="#f1d3b5" {...INK} />
          <path d={`M${x - 5} 76 q 5 -9 10 0`} fill={['#4a3f63', '#3f7a52', '#c9a24a', '#5f8fc4'][i]} {...INK} />
        </g>
      ))}
    </>
  ),
  dance: (
    <>
      <rect width="120" height="92" fill="#2e2a3a" />
      <path d="M60 0 V 14" stroke="#c9a24a" strokeWidth="1.5" />
      <circle cx="60" cy="18" r="5" fill="#f5d873" className={styles.flicker} />
      <path d="M60 18 L 20 92 H 100 Z" fill="#f5d873" opacity="0.14" className={styles.flicker} />
      <rect y="80" width="120" height="12" fill="#4a3a30" />
      <g className={styles.sway}>
        <circle cx="52" cy="40" r="6" fill="#f1d3b5" {...INK} />
        <path d="M44 82 L 47 50 C 48 46 56 46 57 50 L 60 82 Z" fill="#c94f5e" {...INK} />
        <circle cx="68" cy="37" r="6" fill="#f1d3b5" {...INK} />
        <path d="M62 82 L 63 48 C 64 44 72 44 73 48 L 74 82 Z" fill="#2a2a38" {...INK} />
        <path d="M57 54 Q 61 50 64 54" fill="none" {...INK} />
      </g>
      {[16, 30, 92, 104].map((x, i) => (
        <path key={x} className={styles.noteFloat} style={{ animationDelay: `${i * -0.6}s` }} d={`M${x} ${30 + (i % 2) * 12} v -8 l 5 -2 v 8`} fill="none" stroke="#f5d873" strokeWidth="1.4" />
      ))}
    </>
  ),
  garden: (
    <>
      <rect width="120" height="56" fill="#cfe0ff" />
      <path d="M0 40 H 120 M0 46 H 120" stroke="#fffaf1" strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 10 + 2} y="34" width="5" height="22" fill="#fffaf1" {...INK} strokeWidth={1} />
      ))}
      <rect x="86" y="18" width="30" height="38" fill="#b98a5e" {...INK} />
      <rect y="56" width="120" height="36" fill="#8fc49b" />
      <path d="M40 92 V 22" stroke="#3f7a52" strokeWidth="2.5" />
      <g className={styles.turnHead}>
        {Array.from({ length: 10 }, (_, i) => (
          <ellipse key={i} cx="40" cy="12" rx="2.6" ry="5" fill="#f5d873" {...INK} strokeWidth={1} transform={`rotate(${i * 36} 40 18)`} />
        ))}
        <circle cx="40" cy="18" r="5" fill="#8a5a3c" {...INK} />
      </g>
      {[10, 22, 64, 76].map((x) => (
        <g key={x}>
          <circle cx={x} cy="78" r="4" fill="#e5735e" {...INK} />
          <path d={`M${x} 74 q -3 -6 -5 -6 M${x} 74 q 3 -6 5 -6`} stroke="#3f7a52" strokeWidth="1.6" fill="none" />
        </g>
      ))}
    </>
  ),
};
