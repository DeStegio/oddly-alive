import { clueById } from '../../content/attic';

const INK = { stroke: 'var(--char-ink)', strokeWidth: 2.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** The fifteen things, drawn small (viewBox 60×60). */
const THING_ART: Record<string, JSX.Element> = {
  'hat-block': (
    <g>
      <path d="M18 50 C 14 30 18 12 30 12 C 42 12 46 30 42 50 Z" fill="#c9a06a" {...INK} />
      <path d="M14 50 H 46" {...INK} />
      <text x="30" y="44" textAnchor="middle" fontSize="8" fontWeight="700" fill="#5e4332">
        O.M.
      </text>
    </g>
  ),
  'feather-tin': (
    <g>
      <rect x="10" y="28" width="40" height="24" rx="3" fill="var(--blue-l1)" {...INK} />
      <path d="M20 28 C 14 14 18 6 22 4 C 22 14 24 20 24 28 M34 28 C 36 16 42 8 46 8 C 44 18 40 24 38 28" fill="#fff" {...INK} strokeWidth={1.6} />
    </g>
  ),
  'pin-cushion': (
    <g>
      <ellipse cx="30" cy="38" rx="18" ry="8" fill="var(--lavender-d1)" {...INK} />
      <path d="M14 36 C 14 22 46 22 46 36" fill="var(--coral)" {...INK} />
      <path d="M24 26 l -3 -8 M30 24 v -9 M36 26 l 3 -8" {...INK} strokeWidth={1.4} />
      <circle cx="21" cy="18" r="2" fill="var(--yellow)" />
      <circle cx="30" cy="15" r="2" fill="var(--blue)" />
      <circle cx="39" cy="18" r="2" fill="var(--mint)" />
    </g>
  ),
  'radio-valve': (
    <g>
      <path d="M22 44 V 22 C 22 10 38 10 38 22 V 44 Z" fill="#e6f2ff" {...INK} />
      <path d="M26 26 h 8 M26 32 h 8" stroke="#c49a3a" strokeWidth="2" />
      <rect x="20" y="44" width="20" height="8" fill="#2f2a24" {...INK} />
    </g>
  ),
  headphones: (
    <g>
      <path d="M14 36 C 12 14 48 14 46 36" fill="none" {...INK} strokeWidth={3} />
      <rect x="8" y="32" width="12" height="16" rx="5" fill="#5a3e2b" {...INK} />
      <rect x="40" y="32" width="12" height="16" rx="5" fill="#5a3e2b" {...INK} />
    </g>
  ),
  'soldering-iron': (
    <g>
      <rect x="6" y="26" width="26" height="10" rx="4" fill="#8a5a3a" {...INK} />
      <path d="M32 31 H 52 L 56 31" {...INK} strokeWidth={3} />
      <rect x="14" y="36" width="10" height="8" fill="var(--paper)" {...INK} strokeWidth={1.4} />
    </g>
  ),
  drawing: (
    <g>
      <rect x="8" y="8" width="44" height="44" fill="var(--paper)" {...INK} />
      <path d="M18 42 C 14 24 46 24 42 42 Z" fill="var(--lavender)" stroke="var(--lavender-d2)" strokeWidth="2" />
      <circle cx="26" cy="32" r="3.5" fill="#fff" stroke="var(--char-ink)" strokeWidth="1.2" />
      <circle cx="34" cy="32" r="3.5" fill="#fff" stroke="var(--char-ink)" strokeWidth="1.2" />
    </g>
  ),
  whistle: (
    <g>
      <path d="M8 26 H 46 C 52 26 54 34 48 36 H 8 Z" fill="#c9ccd6" {...INK} />
      <circle cx="16" cy="31" r="2" fill="var(--char-ink)" />
      <circle cx="24" cy="31" r="2" fill="var(--char-ink)" />
    </g>
  ),
  smoker: (
    <g>
      <rect x="20" y="20" width="22" height="30" rx="3" fill="#b9bcc4" {...INK} />
      <path d="M20 22 L 30 10 L 42 22" fill="#9a9ea8" {...INK} />
      <path d="M10 30 L 20 26 V 44 L 10 40 Z" fill="#8a5a3a" {...INK} />
      <path d="M30 8 q -4 -4 0 -6" fill="none" {...INK} strokeWidth={1.4} />
    </g>
  ),
  'honey-jar': (
    <g>
      <path d="M18 18 H 42 V 50 C 42 54 18 54 18 50 Z" fill="var(--yellow-l1)" {...INK} />
      <rect x="16" y="12" width="28" height="7" rx="2" fill="var(--coral-l1)" {...INK} />
      <rect x="22" y="28" width="16" height="12" fill="var(--paper)" {...INK} strokeWidth={1.4} />
    </g>
  ),
  'skipping-rope': (
    <g>
      <path d="M12 40 C 20 10 40 10 48 40" fill="none" {...INK} />
      <rect x="6" y="38" width="10" height="16" rx="3" fill="var(--coral)" {...INK} />
      <rect x="44" y="38" width="10" height="16" rx="3" fill="#c9a06a" {...INK} />
    </g>
  ),
  veil: (
    <g>
      <ellipse cx="30" cy="24" rx="26" ry="7" fill="#e2c98a" {...INK} />
      <path d="M20 22 C 20 10 40 10 40 22" fill="#e2c98a" {...INK} />
      <path d="M8 26 L 10 50 M52 26 L 50 50 M10 50 H 50" stroke="#555" strokeWidth="1.2" strokeDasharray="2 2" fill="none" />
    </g>
  ),
  'fob-watch': (
    <g>
      <circle cx="30" cy="34" r="14" fill="var(--paper)" {...INK} />
      <path d="M30 34 V 42 M30 34 L 25 30" {...INK} strokeWidth={1.6} />
      <path d="M30 20 V 12 M24 8 H 36" {...INK} />
    </g>
  ),
  'sleep-mask': (
    <g>
      <path d="M6 30 C 10 18 26 22 30 28 C 34 22 50 18 54 30 C 50 42 34 40 30 34 C 26 40 10 42 6 30 Z" fill="#3e3a63" {...INK} />
      <path d="M16 28 l 1 2 2 0 -1.5 1.4 .6 2 -2 -1 -2 1 .6 -2 -1.5 -1.4 2 0 Z M42 28 l 1 2 2 0 -1.5 1.4 .6 2 -2 -1 -2 1 .6 -2 -1.5 -1.4 2 0 Z" fill="var(--yellow)" />
    </g>
  ),
  'cap-badge': (
    <g>
      <rect x="12" y="20" width="36" height="28" rx="3" fill="#2f2a3c" {...INK} />
      <path d="M30 24 L 40 32 L 30 42 L 20 32 Z" fill="var(--blue-l1)" {...INK} strokeWidth={1.6} />
    </g>
  ),
};

/** A clue, drawn by where it came from. */
function ClueArt({ id }: { id: string }) {
  const c = clueById(id);
  if (!c) return null;
  if (c.source === 'photo')
    return (
      <g>
        <rect x="6" y="8" width="48" height="44" fill="#f4ecdc" {...INK} />
        <rect x="11" y="13" width="38" height="30" fill={id === 'photo-bees' ? '#cbb98a' : id.includes('bench') ? '#a9a2b8' : '#b9a58c'} />
        <circle cx="26" cy="26" r="5" fill="#5e4a3a" />
        <path d="M20 43 C 22 32 30 32 32 43 Z" fill="#5e4a3a" />
      </g>
    );
  if (c.source === 'diary')
    return (
      <g>
        <path d="M8 10 H 50 V 52 H 8 Z" fill="#fbf4e2" {...INK} />
        <path d="M14 20 H 44 M14 28 H 44 M14 36 H 38 M14 44 H 30" stroke="#8a8494" strokeWidth="1.6" />
        <path d="M8 10 l 6 4 l -6 4 l 6 4 l -6 4" fill="none" stroke="var(--char-ink)" strokeWidth="1.4" />
      </g>
    );
  if (c.source === 'record')
    return (
      <g>
        <rect x="6" y="6" width="48" height="48" fill={id === 'record-waltz' ? 'var(--coral-l1)' : 'var(--yellow-l1)'} {...INK} />
        <circle cx="30" cy="30" r="18" fill="#24232b" />
        <circle cx="30" cy="30" r="5" fill="var(--paper)" />
      </g>
    );
  if (id === 'shop-sign')
    return (
      <g>
        <rect x="2" y="16" width="56" height="28" fill="var(--coral-d1)" {...INK} />
        <text x="30" y="35" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--paper)" fontFamily="var(--font-display)">
          MODES
        </text>
      </g>
    );
  if (id === 'wall-name')
    return (
      <g>
        <path d="M14 48 C 8 22 52 22 46 48 Z" fill="none" stroke="var(--lavender-d1)" strokeWidth="3" />
        <circle cx="24" cy="36" r="4" fill="none" stroke="var(--lavender-d1)" strokeWidth="2" />
        <circle cx="36" cy="36" r="4" fill="none" stroke="var(--lavender-d1)" strokeWidth="2" />
        <text x="30" y="16" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--coral-d1)">
          BEA 6
        </text>
      </g>
    );
  return (
    <g>
      <path d="M8 14 H 52 V 46 H 8 Z" fill="var(--paper)" {...INK} />
      <path d="M14 24 H 44 M14 32 H 40 M14 40 H 32" stroke="#8a8494" strokeWidth="1.6" />
    </g>
  );
}

export function EvidenceArt({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {THING_ART[id] ?? <ClueArt id={id} />}
    </svg>
  );
}
