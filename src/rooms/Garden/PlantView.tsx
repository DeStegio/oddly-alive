import { memo } from 'react';
import type { PlantKind, Stage } from './growth';
import styles from './Garden.module.css';

const INK = { stroke: 'var(--char-ink)', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const LEAF = 'M0 0 C 8 -8 18 -6 22 0 C 16 6 6 6 0 0 Z';

/** Stem height per stage (viewBox units; the soil line is y = 92). */
const STEM = [0, 18, 36, 52, 60];

function Leaves({ y, n }: { y: number; n: number }) {
  return (
    <g fill="var(--mint)" {...INK} strokeWidth={2}>
      {Array.from({ length: n }, (_, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        const yy = 92 - y * ((i + 1) / (n + 1));
        return <path key={i} d={LEAF} transform={`translate(40 ${yy}) scale(${side} 1) rotate(-20)`} />;
      })}
    </g>
  );
}

function Bloom({ kind, y }: { kind: PlantKind; y: number }) {
  const cy = 92 - y;
  switch (kind) {
    case 'sunflower':
      return (
        <g className={styles.head}>
          {Array.from({ length: 10 }, (_, i) => (
            <ellipse key={i} cx="40" cy={cy - 11} rx="4.5" ry="9" fill="var(--yellow)" {...INK} strokeWidth={1.8} transform={`rotate(${i * 36} 40 ${cy})`} />
          ))}
          <circle cx="40" cy={cy} r="8.5" fill="#8a5a3c" {...INK} />
        </g>
      );
    case 'moonflower':
      return (
        <g className={`${styles.head} ${styles.moon}`}>
          <circle cx="40" cy={cy} r="15" fill="#fffaf1" {...INK} />
          <path d={`M40 ${cy - 15} V ${cy + 15} M25 ${cy} H 55`} {...INK} strokeWidth={1.5} opacity={0.4} />
          <circle cx="40" cy={cy} r="4" fill="var(--yellow)" {...INK} strokeWidth={1.5} />
        </g>
      );
    case 'snapdragon':
      return (
        <g className={`${styles.head} ${styles.snap}`}>
          <path d={`M30 ${cy + 6} C 26 ${cy - 10} 54 ${cy - 10} 50 ${cy + 6} Z`} fill="var(--coral)" {...INK} />
          <path className={styles.jaw} d={`M31 ${cy + 4} C 36 ${cy + 14} 44 ${cy + 14} 49 ${cy + 4}`} fill="var(--coral)" {...INK} />
          <circle cx="36" cy={cy - 2} r="1.8" fill="var(--char-ink)" />
          <circle cx="44" cy={cy - 2} r="1.8" fill="var(--char-ink)" />
        </g>
      );
    case 'mint':
      return (
        <g fill="var(--mint)" {...INK} strokeWidth={2}>
          {[-18, -6, 6, 18].map((dx, i) => (
            <circle key={dx} cx={40 + dx} cy={cy + 6 + (i % 2) * 6} r="9" />
          ))}
        </g>
      );
    case 'radish':
    default:
      return null;
  }
}

/** A plant in a plot, drawn for its kind and growth stage. */
export const PlantView = memo(function PlantView({ kind, stage }: { kind: PlantKind; stage: Stage }) {
  const y = STEM[stage]!;
  if (stage === 0) {
    return (
      <svg viewBox="0 0 80 100" className={styles.plantSvg} aria-hidden="true">
        <ellipse cx="40" cy="91" rx="10" ry="4" fill="#6b4f3a" {...INK} strokeWidth={2} />
        <path d="M40 88 v -3" {...INK} />
      </svg>
    );
  }
  if (kind === 'radish') {
    // radishes grow down: leaves on top, the root shows when it's ready
    const leaves = Math.min(6, stage * 2);
    return (
      <svg viewBox="0 0 80 100" className={styles.plantSvg} aria-hidden="true">
        {stage === 4 ? <ellipse cx="40" cy="88" rx="12" ry="10" fill="var(--coral)" {...INK} /> : null}
        <g fill="var(--mint)" {...INK} strokeWidth={2}>
          {Array.from({ length: leaves }, (_, i) => (
            <path key={i} d={LEAF} transform={`translate(40 ${stage === 4 ? 79 : 90}) rotate(${-150 + i * (120 / Math.max(1, leaves - 1))}) scale(${0.7 + stage * 0.12})`} />
          ))}
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 100" className={styles.plantSvg} aria-hidden="true">
      <path d={`M40 92 V ${92 - y}`} {...INK} stroke="#3f7a52" strokeWidth={3} />
      <Leaves y={y} n={stage >= 2 ? 4 : 2} />
      {stage === 3 ? <ellipse cx="40" cy={92 - y - 4} rx="5" ry="7" fill={kind === 'moonflower' ? '#fffaf1' : kind === 'mint' ? 'var(--mint)' : 'var(--coral)'} {...INK} strokeWidth={2} /> : null}
      {stage === 4 ? <Bloom kind={kind} y={y} /> : null}
    </svg>
  );
});

/** A picked crop, small enough to hold and throw. */
export const CropIcon = memo(function CropIcon({ kind }: { kind: PlantKind }) {
  if (kind === 'radish') {
    return (
      <svg viewBox="0 0 40 48" className={styles.cropSvg} aria-hidden="true">
        <path d="M20 14 q -8 -10 -14 -8 M20 14 q 1 -12 9 -12 M20 14 q 9 -6 13 0" fill="none" stroke="#3f7a52" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M20 14 C 36 16 36 36 20 46 C 4 36 4 16 20 14 Z" fill="var(--coral)" {...INK} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 30 80 70" className={styles.cropSvg} aria-hidden="true">
      <path d="M40 92 V 60" {...INK} stroke="#3f7a52" strokeWidth={3} />
      <Bloom kind={kind} y={32} />
    </svg>
  );
});
