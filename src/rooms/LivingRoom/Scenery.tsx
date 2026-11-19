import { Link } from 'react-router-dom';
import { ThoughtBubble } from '../../characters/ThoughtBubble';
import styles from './Scenery.module.css';

const INK = {
  stroke: 'var(--char-ink)',
  strokeWidth: 2.5,
  vectorEffect: 'non-scaling-stroke' as const,
  strokeLinejoin: 'round' as const,
};

export function Sofa() {
  return (
    <svg viewBox="0 0 420 190" className={styles.fill} aria-hidden="true">
      <rect x="40" y="168" width="10" height="20" rx="3" fill="var(--char-ink)" />
      <rect x="370" y="168" width="10" height="20" rx="3" fill="var(--char-ink)" />
      <path
        d="M44 34 Q 44 8 74 8 L 346 8 Q 376 8 376 34 L 376 120 L 44 120 Z"
        fill="var(--coral)"
        {...INK}
      />
      <path d="M210 14 L 210 112" stroke="var(--char-ink)" strokeWidth="2" opacity="0.35" />
      <path
        d="M36 112 L 384 112 Q 396 112 396 126 L 396 166 Q 396 172 388 172 L 32 172 Q 24 172 24 166 L 24 126 Q 24 112 36 112 Z"
        fill="var(--coral)"
        {...INK}
      />
      <path
        d="M60 120 Q 135 110 206 120 M 214 120 Q 290 110 360 120"
        fill="none"
        stroke="var(--char-ink)"
        strokeWidth="2"
        opacity="0.35"
      />
      <path
        d="M6 74 Q 6 58 22 58 L 46 58 Q 60 58 60 74 L 60 172 L 6 172 Z"
        fill="color-mix(in srgb, var(--coral) 80%, #a8402d)"
        {...INK}
      />
      <path
        d="M360 74 Q 360 58 374 58 L 398 58 Q 414 58 414 74 L 414 172 L 360 172 Z"
        fill="color-mix(in srgb, var(--coral) 80%, #a8402d)"
        {...INK}
      />
      <path
        d="M300 64 Q 296 44 316 40 L 350 36 Q 362 36 362 50 L 360 104 L 304 106 Z"
        fill="var(--yellow)"
        {...INK}
      />
      <path
        d="M318 58 l 22 -3 M316 72 l 24 -2 M316 86 l 24 -2"
        stroke="var(--char-ink)"
        strokeWidth="2"
        opacity="0.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Rug({ ring = 'var(--coral)' }: { ring?: string }) {
  return (
    <svg viewBox="0 0 600 90" className={styles.fill} aria-hidden="true">
      <ellipse cx="300" cy="45" rx="292" ry="40" fill="var(--paper)" {...INK} />
      <ellipse
        cx="300"
        cy="45"
        rx="250"
        ry="30"
        fill="none"
        stroke="var(--blue)"
        strokeWidth="3"
        strokeDasharray="14 10"
      />
      <ellipse
        cx="300"
        cy="45"
        rx="180"
        ry="18"
        fill="none"
        stroke={ring}
        strokeWidth="3"
      />
    </svg>
  );
}

interface DoorProps {
  to: string;
  label: string;
  sign: string;
}

/** A real link styled as a door — the discoverable way to the next room. */
export function Door({ to, label, sign }: DoorProps) {
  return (
    <Link to={to} className={styles.door} aria-label={label}>
      <svg viewBox="0 0 120 240" className={styles.fill} aria-hidden="true">
        <path
          d="M6 238 L 6 50 Q 6 6 60 6 Q 114 6 114 50 L 114 238"
          fill="var(--canvas-deep)"
          {...INK}
        />
        <path
          d="M14 238 L 14 52 Q 14 14 60 14 Q 106 14 106 52 L 106 238 Z"
          fill="var(--char-ink)"
        />
        <g className={styles.doorLeaf}>
          <path
            d="M14 238 L 14 52 Q 14 14 60 14 Q 106 14 106 52 L 106 238 Z"
            fill="var(--mint)"
            {...INK}
          />
          <path
            d="M28 120 L 28 62 Q 28 30 60 30 Q 92 30 92 62 L 92 120 Z"
            fill="none"
            stroke="var(--char-ink)"
            strokeWidth="2"
            opacity="0.4"
          />
          <rect
            x="28"
            y="140"
            width="64"
            height="76"
            rx="6"
            fill="none"
            stroke="var(--char-ink)"
            strokeWidth="2"
            opacity="0.4"
          />
          <circle cx="90" cy="134" r="6" fill="var(--yellow)" {...INK} />
        </g>
      </svg>
      <span className={styles.sign}>{sign}</span>
    </Link>
  );
}

interface PictureProps {
  tilt: number;
  revealed: boolean;
  onActivate: () => void;
  rootRef?: React.RefObject<HTMLDivElement>;
  thought?: string | null;
  /** Great-Aunt Pim's expression changes with each nudge (INT-018): 0 stern, 1 smile, 2 wink. */
  face?: number;
  /** Backdrop colour (varies with the scene seed). */
  sky?: string;
}

/**
 * "Great-Aunt Pim", an oil portrait. Nudging it enough times reveals what was
 * behind it the whole time.
 */
export function Picture({ tilt, revealed, onActivate, rootRef, thought = null, face = 0, sky = "var(--blue)" }: PictureProps) {
  const f = ((face % 3) + 3) % 3;
  return (
    <div ref={rootRef} className={styles.picture}>
      <ThoughtBubble text={thought} />
      <svg
        viewBox="0 0 160 140"
        className={styles.keyhole}
        aria-hidden="true"
        data-revealed={revealed}
      >
        <rect
          x="50"
          y="30"
          width="60"
          height="80"
          rx="6"
          fill="var(--canvas-deep)"
          stroke="var(--char-ink)"
          strokeWidth="2"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx="80" cy="60" r="9" fill="var(--char-ink)" />
        <path d="M74 64 L 70 90 L 90 90 L 86 64 Z" fill="var(--char-ink)" />
      </svg>
      <button
        type="button"
        className={`prop-btn ${styles.frame}`}
        style={{ transform: `rotate(${tilt}deg)` }}
        aria-label="A portrait of Great-Aunt Pim, hanging slightly crooked"
        onClick={onActivate}
      >
        <svg viewBox="0 0 160 140" className={styles.fill} aria-hidden="true">
          <path
            d="M80 2 L 40 22 M80 2 L 120 22"
            stroke="var(--char-ink)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="80" cy="3" r="3" fill="var(--char-ink)" />
          <rect x="14" y="24" width="138" height="112" fill="var(--shadow-ink)" />
          <rect x="8" y="18" width="138" height="112" fill="var(--yellow)" {...INK} />
          <rect x="20" y="30" width="114" height="88" fill={sky} {...INK} />
          <path d="M20 96 Q 60 80 134 92 L 134 118 L 20 118 Z" fill="var(--mint)" opacity="0.9" />
          <path
            d="M42 112 C 38 82 56 58 78 58 C 100 58 114 78 112 104 C 111 116 100 118 78 118 C 56 118 43 120 42 112 Z"
            fill="var(--lavender)"
            {...INK}
          />
          <path d="M56 60 L 66 40 L 96 40 L 102 62 Z" fill="var(--char-ink)" />
          <path
            d="M50 62 L 108 62"
            stroke="var(--char-ink)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="68" cy="84" r="4" fill="var(--char-ink)" />
          {f === 2 ? (
            <path d="M85 85 q 5 -4 10 0" fill="none" stroke="var(--char-ink)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ) : (
            <circle cx="90" cy="84" r="4" fill="var(--char-ink)" />
          )}
          <path
            d={f === 0 ? 'M72 98 Q 79 95 86 98' : 'M70 95 Q 79 104 88 95'}
            fill="none"
            stroke="var(--char-ink)"
            strokeWidth="2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={f === 0 ? 'M60 76 L 74 78 M84 78 L 98 76' : 'M60 74 L 74 72 M84 72 L 98 74'}
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

interface ButtonProps {
  label: string;
  pressed: number;
  cooperative: boolean;
  onPress: () => void;
  rootRef?: React.RefObject<HTMLDivElement>;
  thought?: string | null;
}

/** A small side table carrying a button that would prefer not to be pressed. */
export function DoNotPress({
  label,
  pressed,
  cooperative,
  onPress,
  rootRef,
  thought = null,
}: ButtonProps) {
  return (
    <div ref={rootRef} className={styles.buttonTable} data-cooperative={cooperative}>
      <ThoughtBubble text={thought} side="left" />
      <svg viewBox="0 0 120 150" className={styles.fill} aria-hidden="true">
        <path
          d="M30 70 L 22 148 M90 70 L 98 148 M60 74 L 60 148"
          stroke="var(--char-ink)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <ellipse cx="60" cy="68" rx="52" ry="12" fill="var(--paper)" {...INK} />
      </svg>
      <button
        type="button"
        className={styles.bigButton}
        onClick={onPress}
        aria-label={`${label} (pressed ${pressed} times)`}
      >
        <span className={styles.cap} aria-hidden="true" />
      </button>
      <span className={styles.plate} aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
