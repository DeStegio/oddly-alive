import { ThoughtBubble } from './ThoughtBubble';
import styles from './Inch.module.css';

interface Props {
  thought: string | null;
  rootRef: React.RefObject<HTMLDivElement>;
  onActivate?: () => void;
  label?: string;
}

/** Inch, a mint inchworm who turns up in odd places. */
export function Inch({ thought, rootRef, onActivate, label = 'Inch the inchworm' }: Props) {
  const body = (
    <svg viewBox="0 0 120 60" className={styles.svg} aria-hidden="true">
      <g className={styles.body}>
        <path
          d="M10 50 C 10 38 22 38 26 46 C 32 20 58 20 64 46 C 68 36 80 36 84 44"
          fill="none"
          stroke="var(--char-ink)"
          strokeWidth="17"
          strokeLinecap="round"
        />
        <path
          d="M10 50 C 10 38 22 38 26 46 C 32 20 58 20 64 46 C 68 36 80 36 84 44"
          fill="none"
          stroke="var(--mint)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <circle cx="94" cy="36" r="13" fill="var(--mint)" stroke="var(--char-ink)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <circle cx="98" cy="33" r="3" fill="var(--char-ink)" />
        <path d="M95 41 q 4 3 8 0" fill="none" stroke="var(--char-ink)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d="M92 24 q -2 -8 -8 -10 M100 23 q 2 -8 8 -9" fill="none" stroke="var(--char-ink)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
  return (
    <div ref={rootRef} className={styles.root}>
      <ThoughtBubble text={thought} side="right" />
      {onActivate ? (
        <button type="button" className={`prop-btn ${styles.hit}`} aria-label={label} onClick={onActivate}>
          {body}
        </button>
      ) : (
        body
      )}
    </div>
  );
}
