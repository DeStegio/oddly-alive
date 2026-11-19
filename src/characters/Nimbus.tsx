import type { Expression } from '../engine/types';
import { Eye, type GazeControl } from './Eye';
import { FACES } from './faces';
import { ThoughtBubble } from './ThoughtBubble';
import styles from './Nimbus.module.css';

interface Props {
  expression: Expression;
  thought: string | null;
  rootRef: React.RefObject<HTMLDivElement>;
  gaze: React.MutableRefObject<GazeControl>;
  onActivate: () => void;
  blanket?: boolean;
}

/** Nimbus: a small cloud who *is* the weather in the Mood Room. Shares Pim's face grammar. */
export function Nimbus({ expression, thought, rootRef, gaze, onActivate, blanket }: Props) {
  const face = FACES[expression];
  return (
    <div ref={rootRef} className={styles.root} data-expression={expression}>
      <ThoughtBubble text={thought} />
      <button type="button" className={`prop-btn ${styles.hit}`} aria-label={`Nimbus the cloud, looking ${expression}`} onClick={onActivate}>
        <svg viewBox="0 0 200 170" className={styles.svg} aria-hidden="true">
          <g className={styles.body}>
            <path
              d="M40 140 C 10 140 8 100 34 92 C 28 60 62 42 86 56 C 96 26 146 24 156 60 C 186 58 196 96 176 110 C 192 130 176 146 154 142 Z"
              fill="#fffaf1"
              stroke="var(--char-ink)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path d="M58 70 C 66 62 78 60 86 64" fill="none" stroke="var(--blue)" strokeOpacity="0.25" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="60" cy="116" rx="12" ry="6" fill="var(--coral)" style={{ opacity: face.blush * 0.7, transition: 'opacity var(--dur-char)' }} />
            <ellipse cx="144" cy="114" rx="12" ry="6" fill="var(--coral)" style={{ opacity: face.blush * 0.7, transition: 'opacity var(--dur-char)' }} />
            <Eye cx={78} cy={92} r={15} pupil={6.5} lid={face.lid} gaze={gaze} pupilScale={face.pupil} lidColor="#fffaf1" />
            <Eye cx={124} cy={90} r={16} pupil={6.8} lid={face.lid} gaze={gaze} pupilScale={face.pupil} lidColor="#fffaf1" />
            <path d={face.browL} transform="translate(0 6)" className={styles.line} />
            <path d={face.browR} transform="translate(0 6)" className={styles.line} />
            <path d={face.mouth} transform="translate(0 4)" className={styles.line} fill={face.mouthFilled ? 'var(--char-ink)' : 'none'} />
            {blanket ? (
              <path
                d="M22 128 C 50 112 150 108 184 124 L 178 150 C 140 160 60 160 26 152 Z"
                fill="var(--lavender)"
                stroke="var(--char-ink)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className={styles.blanket}
              />
            ) : null}
          </g>
        </svg>
      </button>
    </div>
  );
}
