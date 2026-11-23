import type { Asker } from '../../content/garden';

const INK = 'var(--char-ink)';

/**
 * The house's characters as small cut-out heads, for whoever is asking for
 * something in the garden (and, later, the Weather Workshop's postcards).
 * `mood` follows how the job is going.
 */
export function Portrait({ who, mood = 'open' }: { who: Asker | 'nimbus' | 'fox'; mood?: 'open' | 'solved' | 'failed' }) {
  const happy = mood === 'solved';
  const sad = mood === 'failed';
  const mouth = happy ? 'M-6 4 q 6 6 12 0' : sad ? 'M-6 7 q 6 -5 12 0' : 'M-5 5 q 5 2 10 0';
  const eyes = (y = 0, gap = 7, r = 2.4) => (
    <g>
      {happy ? (
        <path d={`M${-gap - 3} ${y} q 3 -3 6 0 M${gap - 3} ${y} q 3 -3 6 0`} stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <circle cx={-gap} cy={y} r={r} fill={INK} />
          <circle cx={gap} cy={y} r={r} fill={INK} />
        </>
      )}
      {sad ? <path d={`M${-gap - 4} ${y - 6} l 6 2 M${gap + 4} ${y - 6} l -6 2`} stroke={INK} strokeWidth="1.8" strokeLinecap="round" /> : null}
    </g>
  );
  const body = (() => {
    switch (who) {
      case 'pim':
        return (
          <g>
            <path d="M-26 18 C -30 -10 -14 -26 0 -26 C 16 -26 30 -10 26 18 C 18 26 -18 26 -26 18 Z" fill="var(--lavender)" stroke={INK} strokeWidth="2.5" />
            <path d="M14 -18 C 22 -10 24 4 22 14" stroke="var(--lavender-d2)" strokeWidth="3" fill="none" strokeLinecap="round" />
            {eyes(-2, 8, 3)}
            <path d={mouth} transform="translate(0 6)" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        );
      case 'lumen':
        return (
          <g>
            <path d="M-20 -6 L -12 -28 L 12 -28 L 20 -6 Z" fill="var(--coral)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M0 -6 V 24 M-10 26 H 10" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            {eyes(-16, 6, 2)}
            <path d={mouth} transform="translate(0 -12) scale(0.7)" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M-24 0 L -30 14 M24 0 L 30 14" stroke="var(--yellow)" strokeWidth="3" strokeLinecap="round" opacity={happy ? 1 : 0.4} />
          </g>
        );
      case 'tick':
        return (
          <g>
            <circle r="25" fill="var(--paper)" stroke={INK} strokeWidth="2.5" />
            <circle r="20" fill="none" stroke="var(--yellow-d1)" strokeWidth="2" />
            <path d="M0 0 V -14 M0 0 L 9 5" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
            {eyes(-4, 9, 2)}
            <path d={mouth} transform="translate(0 8) scale(0.7)" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        );
      case 'dot':
        return (
          <g>
            <circle r="22" fill="var(--blue)" stroke={INK} strokeWidth="2.5" />
            <circle cx="0" cy="-4" r="8" fill="var(--paper)" stroke={INK} strokeWidth="2" />
            <circle cx="1" cy="-3" r="3.5" fill={INK} />
            <path d={mouth} transform="translate(0 9) scale(0.8)" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        );
      case 'ferdinand':
        return (
          <g>
            <path d="M-16 6 L -12 26 L 12 26 L 16 6 Z" fill="var(--yellow)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
            {[-40, -15, 15, 40].map((a) => (
              <path key={a} d="M0 6 C -4 -8 -2 -20 0 -28 C 4 -18 4 -8 0 6 Z" fill="var(--mint-d1)" stroke={INK} strokeWidth="2" transform={`rotate(${sad ? a * 1.6 : a})`} />
            ))}
            {eyes(14, 5, 1.8)}
          </g>
        );
      case 'bip':
        return (
          <g>
            <rect x="-26" y="-18" width="52" height="36" rx="10" fill="var(--blue)" stroke={INK} strokeWidth="2.5" />
            <rect x="-19" y="-11" width="38" height="22" rx="6" fill="#24232b" />
            <rect x="-11" y="-7" width="5" height="8" rx="2.5" fill="#a6f0c6" />
            <rect x="6" y="-7" width="5" height="8" rx="2.5" fill="#a6f0c6" />
            <path d={happy ? 'M-6 4 q 6 5 12 0' : sad ? 'M-6 7 q 6 -4 12 0' : 'M-6 5 h 12'} stroke="#a6f0c6" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        );
      case 'inch':
        return (
          <g>
            <path d="M-26 18 C -26 4 -16 4 -12 12 C -6 -10 10 -10 14 12" stroke={INK} strokeWidth="13" fill="none" strokeLinecap="round" />
            <path d="M-26 18 C -26 4 -16 4 -12 12 C -6 -10 10 -10 14 12" stroke="var(--mint)" strokeWidth="9" fill="none" strokeLinecap="round" />
            <circle cx="20" cy="2" r="10" fill="var(--mint)" stroke={INK} strokeWidth="2.5" />
            <circle cx="23" cy="0" r="2" fill={INK} />
          </g>
        );
      case 'aunt':
        return (
          <g>
            <rect x="-24" y="-28" width="48" height="56" rx="4" fill="var(--yellow-d1)" stroke={INK} strokeWidth="2.5" />
            <rect x="-18" y="-22" width="36" height="44" fill="var(--lavender-l2)" stroke={INK} strokeWidth="1.8" />
            <circle cy="-4" r="11" fill="var(--coral-l2)" stroke={INK} strokeWidth="1.8" />
            <path d="M-12 -10 C -10 -20 10 -20 12 -10" fill="var(--paper)" stroke={INK} strokeWidth="1.6" />
            <path d="M-14 22 C -12 10 12 10 14 22" fill="var(--lavender-d1)" stroke={INK} strokeWidth="1.6" />
            {eyes(-4, 4, 1.4)}
          </g>
        );
      case 'nimbus':
        return (
          <g>
            <path d="M-26 12 C -34 12 -32 -4 -22 -4 C -22 -18 -2 -22 2 -10 C 8 -20 26 -14 22 -2 C 32 -2 32 12 24 12 Z" fill="var(--paper)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
            {eyes(0, 7, 2.4)}
            <path d={mouth} transform="translate(0 4) scale(0.7)" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        );
      case 'fox':
        return (
          <g>
            <path d="M-22 -20 L -10 -6 L 10 -6 L 22 -20 L 20 4 C 14 20 -14 20 -20 4 Z" fill="var(--coral-d1)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M-10 8 C -4 18 4 18 10 8 C 4 4 -4 4 -10 8 Z" fill="var(--paper)" stroke={INK} strokeWidth="1.8" />
            <circle cx="0" cy="10" r="2" fill={INK} />
            {eyes(-2, 8, 2)}
          </g>
        );
    }
  })();
  return (
    <svg className="portrait" viewBox="-36 -36 72 72" width="72" height="72" aria-hidden="true" data-mood={mood}>
      <circle r="34" fill="var(--paper-d1)" stroke={INK} strokeWidth="2.5" />
      {body}
    </svg>
  );
}
