import { memo } from 'react';
import { SHAPES, type ShapeKind } from './physics';
import styles from './Playground.module.css';

const INK = { stroke: 'var(--char-ink)', strokeWidth: 2.5, vectorEffect: 'non-scaling-stroke' as const };

/** The face every shape wears. Expression is driven by data-face via CSS. */
function Face({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const s = scale;
  return (
    <g className={styles.face}>
      <g className={styles.eyesOpen}>
        <circle cx={cx - 9 * s} cy={cy} r={3.4 * s} fill="var(--char-ink)" />
        <circle cx={cx + 9 * s} cy={cy} r={3.4 * s} fill="var(--char-ink)" />
      </g>
      <g className={styles.eyesShut} fill="none" stroke="var(--char-ink)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke">
        <path d={`M${cx - 13 * s} ${cy} q ${4 * s} ${3 * s} ${8 * s} 0`} />
        <path d={`M${cx + 5 * s} ${cy} q ${4 * s} ${3 * s} ${8 * s} 0`} />
      </g>
      <g className={styles.eyesDizzy} fill="none" stroke="var(--char-ink)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke">
        <path d={`M${cx - 12 * s} ${cy - 3 * s} l ${6 * s} ${6 * s} m 0 ${-6 * s} l ${-6 * s} ${6 * s}`} />
        <path d={`M${cx + 6 * s} ${cy - 3 * s} l ${6 * s} ${6 * s} m 0 ${-6 * s} l ${-6 * s} ${6 * s}`} />
      </g>
      <path className={styles.mouthCalm} d={`M${cx - 5 * s} ${cy + 9 * s} q ${5 * s} ${4 * s} ${10 * s} 0`} fill="none" stroke="var(--char-ink)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <ellipse className={styles.mouthHit} cx={cx} cy={cy + 10 * s} rx={3.5 * s} ry={4.5 * s} fill="var(--char-ink)" />
      <path className={styles.mouthProud} d={`M${cx - 8 * s} ${cy + 7 * s} q ${8 * s} ${10 * s} ${16 * s} 0 Z`} fill="var(--char-ink)" />
    </g>
  );
}

/** Static SVG for a shape; position/rotation are written imperatively by the room. */
export const ShapeView = memo(function ShapeView({ kind }: { kind: ShapeKind }) {
  const s = SHAPES[kind];
  const w = s.w;
  const h = s.h;
  if (kind === 'key') {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className={styles.shapeSvg} aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill={s.color} {...INK} />
        <circle cx="18" cy="18" r="6" fill="var(--canvas)" {...INK} />
        <path d="M33 14 H 80 V 22 H 72 V 30 H 64 V 22 H 56 V 28 H 50 V 22 H 33 Z" fill={s.color} {...INK} strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === 'balloon') {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className={styles.shapeSvg} aria-hidden="true">
        <path d={`M${w / 2} ${h - 6} q -6 10 4 22`} fill="none" stroke="var(--char-ink)" strokeWidth="1.5" />
        <circle cx={w / 2} cy={w / 2} r={w / 2 - 2} fill={s.color} {...INK} />
        <path d={`M${w / 2 - 5} ${w - 2} l 5 6 l 5 -6 z`} fill={s.color} {...INK} />
        <path d={`M${w * 0.28} ${w * 0.3} q 4 -8 12 -10`} stroke="#fff" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" fill="none" />
        <Face cx={w / 2} cy={w / 2} />
      </svg>
    );
  }
  const r = s.circle ? w / 2 : (s.chamfer ?? 6);
  const faceY = kind === 'domino' ? 30 : h / 2 - 3;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.shapeSvg} aria-hidden="true">
      <rect x="1.5" y="1.5" width={w - 3} height={h - 3} rx={r} fill={s.color} {...INK} />
      {kind === 'domino' ? (
        <>
          <line x1="4" y1={h / 2 + 8} x2={w - 4} y2={h / 2 + 8} stroke="var(--char-ink)" strokeWidth="2" />
          <circle cx={w / 2} cy={h * 0.72} r="3" fill="var(--char-ink)" />
          <circle cx={w / 2} cy={h * 0.86} r="3" fill="var(--char-ink)" />
        </>
      ) : null}
      {kind === 'block' ? <path d={`M10 ${h - 14} H ${w - 10}`} stroke="#fff" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" /> : null}
      <Face cx={w / 2} cy={faceY} scale={kind === 'domino' ? 0.55 : kind === 'pebble' ? 0.75 : 1} />
    </svg>
  );
});
