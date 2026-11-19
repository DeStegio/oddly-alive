import { useEffect, useRef } from 'react';
import type { Expression } from '../engine/types';
import { Eye, type GazeControl } from './Eye';
import { FACES } from './faces';
import { ThoughtBubble } from './ThoughtBubble';
import styles from './Pim.module.css';

const BLINK = styles.blink ?? 'blink';

interface PimProps {
  expression: Expression;
  thought: string | null;
  rootRef: React.RefObject<HTMLDivElement>;
  gaze: React.MutableRefObject<GazeControl>;
  onActivate?: () => void;
  label?: string;
  className?: string;
  /** Pajamas for After Hours. */
  nightcap?: boolean;
}

/**
 * Pim: a shy lavender pebble. Presentation only — what Pim *does* is decided
 * by behaviors that send commands through the actor channel.
 */
export function Pim({
  expression,
  thought,
  rootRef,
  gaze,
  onActivate,
  label = 'Pim, a shy blob on the sofa',
  className,
  nightcap,
}: PimProps) {
  const face = FACES[expression];
  const svgRef = useRef<SVGSVGElement>(null);

  // Ambient blinking; skipped when eyes are already shut.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(
        () => {
          const el = svgRef.current;
          if (el && document.visibilityState === 'visible') {
            el.classList.add(BLINK);
            setTimeout(() => el.classList.remove(BLINK), 150);
          }
          loop();
        },
        2400 + Math.random() * 3800,
      );
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={rootRef} className={`${styles.root} ${className ?? ''}`} data-expression={expression}>
      <ThoughtBubble text={thought} side="center" />
      <button
        type="button"
        className={`prop-btn ${styles.hit}`}
        aria-label={label}
        onClick={onActivate}
      >
        <svg ref={svgRef} viewBox="0 0 200 170" className={styles.svg} aria-hidden="true">
          <ellipse cx="102" cy="162" rx="78" ry="7" fill="var(--shadow-ink)" opacity="0.18" />
          <g className={styles.body}>
            <path
              d="M18 122 C 14 70, 58 20, 108 20 C 160 20, 188 60, 186 106 C 184 146, 152 160, 102 160 C 52 160, 22 154, 18 122 Z"
              fill="var(--lavender)"
              stroke="var(--char-ink)"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
            {/* highlight */}
            <path
              d="M52 52 C 64 38, 82 31, 98 30"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.55"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {nightcap ? (
              <g>
                <path
                  d="M70 34 C 90 4, 140 0, 170 20 C 160 34, 150 40, 146 50 C 124 30, 96 26, 70 34 Z"
                  fill="var(--blue)"
                  stroke="var(--char-ink)"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                />
                <circle
                  cx="172"
                  cy="20"
                  r="9"
                  fill="var(--yellow)"
                  stroke="var(--char-ink)"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ) : null}
            <g className={styles.face}>
              <ellipse
                cx="60"
                cy="116"
                rx="13"
                ry="7"
                fill="var(--coral)"
                style={{ opacity: face.blush * 0.75 }}
                className={styles.cheek}
              />
              <ellipse
                cx="144"
                cy="114"
                rx="13"
                ry="7"
                fill="var(--coral)"
                style={{ opacity: face.blush * 0.75 }}
                className={styles.cheek}
              />
              <Eye
                cx={78}
                cy={88}
                r={17}
                pupil={7.5}
                lid={face.lid}
                gaze={gaze}
                pupilScale={face.pupil}
                className={styles.eye}
              />
              <Eye
                cx={124}
                cy={86}
                r={18}
                pupil={7.8}
                lid={face.lid}
                gaze={gaze}
                pupilScale={face.pupil}
                className={styles.eye}
              />
              <path d={face.browL} className={styles.brow} />
              <path d={face.browR} className={styles.brow} />
              <path
                d={face.mouth}
                className={styles.mouth}
                fill={face.mouthFilled ? 'var(--char-ink)' : 'none'}
              />
            </g>
          </g>
        </svg>
      </button>
    </div>
  );
}
