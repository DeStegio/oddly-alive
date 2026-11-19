import { useEffect, useState } from 'react';
import type { Expression } from '../engine/types';
import { Eye, type GazeControl } from './Eye';
import { ThoughtBubble } from './ThoughtBubble';
import styles from './Clock.module.css';

interface ClockProps {
  expression: Expression;
  thought: string | null;
  rootRef: React.RefObject<HTMLDivElement>;
  gaze: React.MutableRefObject<GazeControl>;
  onActivate: () => void;
  /** Extra rotation added by visitors spinning the hands. */
  spins: number;
}

function handAngles(d: Date) {
  const m = d.getMinutes() + d.getSeconds() / 60;
  const h = (d.getHours() % 12) + m / 60;
  return { hour: h * 30, minute: m * 6 };
}

/** Tick, a wall clock that would rather be asleep. Shows local time. */
export function Clock({ expression, thought, rootRef, gaze, onActivate, spins }: ClockProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setNow(new Date());
    }, 15_000);
    return () => clearInterval(id);
  }, []);
  const { hour, minute } = handAngles(now);
  const lid =
    expression === 'asleep'
      ? 1
      : expression === 'sleepy'
        ? 0.62
        : expression === 'annoyed'
          ? 0.45
          : expression === 'surprised' || expression === 'excited'
            ? 0
            : 0.3;

  return (
    <div ref={rootRef} className={styles.root} data-expression={expression}>
      <ThoughtBubble text={thought} />
      <button
        type="button"
        className={`prop-btn ${styles.hit}`}
        aria-label="Tick the wall clock"
        onClick={onActivate}
      >
        <svg viewBox="0 0 120 120" className={styles.svg} aria-hidden="true">
          <circle cx="62" cy="63" r="52" fill="var(--shadow-ink)" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="var(--cut-paper)"
            stroke="var(--char-ink)"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="60" cy="60" r="44" fill="none" stroke="var(--coral)" strokeWidth="3" />
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1="60"
              y1="20"
              x2="60"
              y2={i % 3 === 0 ? 27 : 24}
              transform={`rotate(${i * 30} 60 60)`}
              stroke="var(--char-ink)"
              strokeWidth={i % 3 === 0 ? 3 : 1.6}
              strokeLinecap="round"
            />
          ))}
          <g className={styles.hands} style={{ transform: `rotate(${spins * 360}deg)` }}>
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="38"
              stroke="var(--char-ink)"
              strokeWidth="4"
              strokeLinecap="round"
              transform={`rotate(${hour} 60 60)`}
            />
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="26"
              stroke="var(--blue)"
              strokeWidth="2.5"
              strokeLinecap="round"
              transform={`rotate(${minute} 60 60)`}
            />
            <circle cx="60" cy="60" r="3.5" fill="var(--char-ink)" />
          </g>
          <Eye cx={46} cy={48} r={8} pupil={3.6} lid={lid} gaze={gaze} lidColor="var(--cut-paper)" />
          <Eye cx={74} cy={48} r={8} pupil={3.6} lid={lid} gaze={gaze} lidColor="var(--cut-paper)" />
          <path
            d={
              expression === 'asleep'
                ? 'M56 86 a 4 3 0 1 0 8 0 a 4 3 0 1 0 -8 0'
                : expression === 'annoyed'
                  ? 'M52 88 L 68 87'
                  : expression === 'happy' || expression === 'excited'
                    ? 'M50 84 Q 60 94 70 84'
                    : 'M53 87 Q 60 90 67 87'
            }
            fill="none"
            stroke="var(--char-ink)"
            strokeWidth="2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </button>
    </div>
  );
}
