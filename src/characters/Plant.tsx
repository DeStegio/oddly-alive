import { useMemo } from 'react';
import { createRng } from '../engine/rng';
import { ThoughtBubble } from './ThoughtBubble';
import styles from './Plant.module.css';

interface PlantProps {
  leaves: number;
  drooping: boolean;
  bloom: boolean;
  thought: string | null;
  rootRef: React.RefObject<HTMLDivElement>;
  onActivate: () => void;
  seed?: number;
}

const MAX_LEAVES = 14;

/** Ferdinand the fern. Grows a leaf per discovery, droops when ignored. */
export function Plant({
  leaves,
  drooping,
  bloom,
  thought,
  rootRef,
  onActivate,
  seed = 7,
}: PlantProps) {
  const shapes = useMemo(() => {
    const rng = createRng(seed);
    return Array.from({ length: MAX_LEAVES }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const spread = 8 + Math.floor(i / 2) * 11 + rng() * 6;
      return {
        angle: side * spread,
        length: 58 + rng() * 34 - i * 1.2,
        width: 15 + rng() * 6,
        delay: (rng() * 1.6).toFixed(2),
      };
    });
  }, [seed]);
  const count = Math.max(3, Math.min(MAX_LEAVES, leaves));

  return (
    <div ref={rootRef} className={styles.root} data-droop={drooping} data-bloom={bloom}>
      <ThoughtBubble text={thought} side="left" />
      <button
        type="button"
        className={`prop-btn ${styles.hit}`}
        aria-label={`Ferdinand the fern, ${count} leaves`}
        onClick={onActivate}
      >
        <svg viewBox="0 0 140 220" className={styles.svg} aria-hidden="true">
          <g className={styles.leaves}>
            {shapes.slice(0, count).map((leaf, i) => (
              <g
                key={i}
                className={styles.leaf}
                style={
                  {
                    '--a': `${leaf.angle}deg`,
                    animationDelay: `${leaf.delay}s`,
                  } as React.CSSProperties
                }
              >
                <path
                  d={`M70 138 C ${70 - leaf.width} ${138 - leaf.length * 0.45}, ${70 - leaf.width * 0.6} ${138 - leaf.length * 0.9}, 70 ${138 - leaf.length} C ${70 + leaf.width * 0.6} ${138 - leaf.length * 0.9}, ${70 + leaf.width} ${138 - leaf.length * 0.45}, 70 138 Z`}
                  fill={
                    i % 3 === 0 ? 'var(--mint)' : 'color-mix(in srgb, var(--mint) 82%, #2f6b48)'
                  }
                  stroke="var(--char-ink)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={`M70 136 L 70 ${142 - leaf.length}`}
                  stroke="var(--char-ink)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.5"
                />
              </g>
            ))}
          </g>
          {bloom ? (
            <g className={styles.flower}>
              <circle
                cx="70"
                cy="62"
                r="9"
                fill="var(--yellow)"
                stroke="var(--char-ink)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse
                  key={a}
                  cx="70"
                  cy="46"
                  rx="7"
                  ry="11"
                  transform={`rotate(${a} 70 62)`}
                  fill="var(--coral)"
                  stroke="var(--char-ink)"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <circle cx="70" cy="62" r="8" fill="var(--yellow)" />
            </g>
          ) : null}
          <path
            d="M34 140 L 106 140 L 98 214 L 42 214 Z"
            fill="var(--paper)"
            stroke="var(--char-ink)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M28 132 L 112 132 L 110 148 L 30 148 Z"
            fill="var(--blue)"
            stroke="var(--char-ink)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <g
            fill="none"
            stroke="var(--char-ink)"
            strokeWidth="2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          >
            {drooping ? (
              <>
                <path d="M56 176 q 5 3 10 0" />
                <path d="M76 176 q 5 3 10 0" />
                <path d="M64 192 q 6 -4 12 0" />
              </>
            ) : (
              <>
                <circle cx="60" cy="176" r="2.6" fill="var(--char-ink)" />
                <circle cx="82" cy="176" r="2.6" fill="var(--char-ink)" />
                <path d="M65 189 q 6 5 12 0" />
              </>
            )}
          </g>
        </svg>
      </button>
    </div>
  );
}
