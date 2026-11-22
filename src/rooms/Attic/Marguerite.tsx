import type { HatId } from '../../content/attic';
import styles from './Attic.module.css';

const INK = { stroke: 'var(--char-ink)', strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const HAT_ART: Record<HatId, React.ReactNode> = {
  beret: <path d="M38 30 C 40 14 82 12 84 28 C 74 34 48 34 38 30 Z M60 13 v -5" fill="#3f7a52" {...INK} />,
  topper: (
    <g>
      <rect x="46" y="-6" width="30" height="32" rx="3" fill="#4a3f63" {...INK} />
      <path d="M46 18 H 76" stroke="var(--coral)" strokeWidth={5} />
      <path d="M36 28 H 86" {...INK} strokeWidth={5} />
      <path d="M36 28 H 86" stroke="#4a3f63" strokeWidth={2} />
    </g>
  ),
  sunhat: (
    <g>
      <ellipse cx="61" cy="28" rx="36" ry="7" fill="#e9cf86" {...INK} />
      <path d="M45 27 C 46 10 76 10 77 27" fill="#e9cf86" {...INK} />
      <path d="M46 22 H 76" {...INK} stroke="var(--coral)" strokeWidth={4} />
    </g>
  ),
  crown: <path d="M42 30 L 44 10 L 52 20 L 61 6 L 70 20 L 78 10 L 80 30 Z" fill="var(--yellow)" {...INK} />,
};

/** A hat on its own (in the pile, or in your hand). Drawn in Marguerite's head space. */
export function HatSvg({ hat }: { hat: HatId }) {
  return (
    <svg viewBox="30 -10 62 46" className={styles.hatSvg} aria-hidden="true">
      {HAT_ART[hat]}
    </svg>
  );
}

/** Marguerite: a dress form with opinions, and whatever hat you've handed her. */
export function MargueriteSvg({ hat }: { hat: HatId | null }) {
  return (
    <svg viewBox="0 -10 122 200" className={styles.margueriteSvg} aria-hidden="true">
      {/* stand */}
      <path d="M61 150 V 182 M40 190 L 61 178 L 82 190" fill="none" {...INK} strokeWidth={4} />
      {/* body */}
      <path d="M48 36 C 30 44 30 70 38 86 C 30 104 32 132 42 150 H 80 C 90 132 92 104 84 86 C 92 70 92 44 74 36 Z" fill="#e8d5c4" {...INK} />
      <path d="M38 86 C 52 92 70 92 84 86" fill="none" {...INK} strokeWidth={2} />
      <path d="M61 40 V 150" fill="none" {...INK} strokeWidth={1.5} strokeDasharray="4 5" opacity={0.6} />
      {/* neck knob, which is where the face would be */}
      <rect x="54" y="26" width="14" height="12" rx="4" fill="#cdb7a3" {...INK} />
      <circle cx="61" cy="22" r="6" fill="#cdb7a3" {...INK} />
      {/* pins */}
      <circle cx="46" cy="60" r="2.5" fill="var(--coral)" />
      <circle cx="76" cy="66" r="2.5" fill="var(--blue)" />
      {hat ? <g className={styles.hat}>{HAT_ART[hat]}</g> : null}
    </svg>
  );
}
