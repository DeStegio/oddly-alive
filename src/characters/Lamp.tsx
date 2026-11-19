import type { Expression } from '../engine/types';
import { ThoughtBubble } from './ThoughtBubble';
import styles from './Lamp.module.css';

interface LampProps {
  on: boolean;
  expression: Expression;
  thought: string | null;
  rootRef: React.RefObject<HTMLDivElement>;
  onToggle: () => void;
}

/** Lumen, a proud floor lamp. Its face only shows when it has opinions. */
export function Lamp({ on, expression, thought, rootRef, onToggle }: LampProps) {
  const eyesOpen = on && expression !== 'sleepy' && expression !== 'asleep';
  const cross = expression === 'annoyed' || expression === 'suspicious';
  return (
    <div ref={rootRef} className={styles.root} data-on={on} data-expression={expression}>
      <ThoughtBubble text={thought} side="right" className={styles.bubble} />
      <button
        type="button"
        className={`prop-btn ${styles.hit}`}
        aria-pressed={on}
        aria-label={`Lumen the floor lamp (${on ? 'on' : 'off'})`}
        onClick={onToggle}
      >
        <svg viewBox="0 0 120 300" className={styles.svg} aria-hidden="true">
          <path
            className={styles.cone}
            d="M30 86 L 90 86 L 168 300 L -48 300 Z"
            fill="var(--yellow)"
          />
          <ellipse cx="60" cy="291" rx="36" ry="8" fill="var(--char-ink)" />
          <line
            x1="60"
            y1="84"
            x2="60"
            y2="288"
            stroke="var(--char-ink)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M60 210 q 14 4 18 18"
            fill="none"
            stroke="var(--char-ink)"
            strokeWidth="2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <g className={styles.shade}>
            <path
              d="M24 86 L 42 20 Q 60 14 78 20 L 96 86 Q 60 94 24 86 Z"
              fill="var(--yellow)"
              stroke="var(--char-ink)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M30 76 Q 60 82 90 76"
              fill="none"
              stroke="var(--coral)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {eyesOpen ? (
              <g>
                <circle cx="50" cy="54" r="3.6" fill="var(--char-ink)" />
                <circle cx="70" cy="54" r="3.6" fill="var(--char-ink)" />
                {cross ? (
                  <>
                    <path
                      d="M43 44 L 55 48"
                      stroke="var(--char-ink)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    <path
                      d="M77 44 L 65 48"
                      stroke="var(--char-ink)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                ) : null}
                <path
                  d={cross ? 'M54 66 L 66 65' : 'M54 64 Q 60 69 66 64'}
                  fill="none"
                  stroke="var(--char-ink)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ) : (
              <g
                fill="none"
                stroke="var(--char-ink)"
                strokeWidth="2.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              >
                <path d="M45 54 q 5 4 10 0" />
                <path d="M65 54 q 5 4 10 0" />
              </g>
            )}
          </g>
          <path
            d="M70 92 L 70 118"
            stroke="var(--char-ink)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx="70"
            cy="121"
            r="4"
            fill="var(--coral)"
            stroke="var(--char-ink)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            className={styles.pull}
          />
        </svg>
      </button>
    </div>
  );
}
