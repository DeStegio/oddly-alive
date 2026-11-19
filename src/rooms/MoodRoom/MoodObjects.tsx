/* eslint-disable react-refresh/only-export-components -- data module with inline SVG icons */
import type { ReactNode } from 'react';

const INK = { stroke: 'var(--char-ink)', strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const, vectorEffect: 'non-scaling-stroke' as const };

export interface MoodObject {
  id: 'tea' | 'horn' | 'blanket' | 'mirror' | 'feather' | 'letter';
  label: string;
  /** What the object does, in plain words (shown as a caption). */
  hint: string;
  icon: ReactNode;
}

/** Six objects on the windowsill; each nudges the house's mood a different way. */
export const MOOD_OBJECTS: MoodObject[] = [
  {
    id: 'tea',
    label: 'Pour some tea',
    hint: 'calming',
    icon: (
      <svg viewBox="0 0 80 70" aria-hidden="true">
        <path d="M16 30 H 56 V 46 C 56 58 46 64 36 64 C 26 64 16 58 16 46 Z" fill="var(--mint)" {...INK} />
        <path d="M56 36 C 70 34 70 52 56 50" fill="none" {...INK} />
        <path d="M16 34 L 6 28" {...INK} />
        <rect x="30" y="22" width="12" height="8" rx="3" fill="var(--paper)" {...INK} />
        <path className="steam" d="M28 16 q -4 -6 0 -12 M38 16 q -4 -6 0 -12" fill="none" {...INK} strokeWidth={2} />
      </svg>
    ),
  },
  {
    id: 'horn',
    label: 'Toot the party horn',
    hint: 'exciting',
    icon: (
      <svg viewBox="0 0 80 70" aria-hidden="true">
        <path d="M10 36 L 52 18 L 52 54 Z" fill="var(--coral)" {...INK} />
        <path d="M22 31 L 26 45 M34 26 L 38 48" {...INK} strokeWidth={2} />
        <path d="M52 18 C 64 22 64 50 52 54" fill="var(--yellow)" {...INK} />
        <path d="M66 24 l 8 -6 M68 36 h 9 M66 48 l 8 6" {...INK} strokeWidth={2} />
      </svg>
    ),
  },
  {
    id: 'blanket',
    label: 'Unfold the blanket',
    hint: 'sleepy',
    icon: (
      <svg viewBox="0 0 80 70" aria-hidden="true">
        <rect x="10" y="24" width="60" height="34" rx="6" fill="var(--lavender)" {...INK} />
        <path d="M10 36 H 70 M10 46 H 70" {...INK} strokeWidth={2} />
        <path d="M24 24 V 58 M44 24 V 58" {...INK} strokeWidth={1.5} opacity={0.5} />
      </svg>
    ),
  },
  {
    id: 'mirror',
    label: 'Hold up the mirror',
    hint: 'confusing',
    icon: (
      <svg viewBox="0 0 80 70" aria-hidden="true">
        <ellipse cx="40" cy="28" rx="20" ry="22" fill="var(--yellow)" {...INK} />
        <ellipse cx="40" cy="28" rx="13" ry="15" fill="#d9e6ff" {...INK} />
        <path d="M34 20 l 6 -4" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
        <rect x="35" y="50" width="10" height="16" rx="4" fill="var(--coral)" {...INK} />
      </svg>
    ),
  },
  {
    id: 'feather',
    label: 'Tickle with a feather',
    hint: 'mischievous',
    icon: (
      <svg viewBox="0 0 80 70" aria-hidden="true">
        <path d="M14 62 C 30 40 46 14 66 8 C 66 30 50 52 22 58 Z" fill="var(--paper)" {...INK} />
        <path d="M14 62 L 60 14" {...INK} strokeWidth={2} />
        <path d="M30 46 l -6 -4 M38 38 l -6 -5 M46 30 l -5 -5" {...INK} strokeWidth={1.5} />
      </svg>
    ),
  },
  {
    id: 'letter',
    label: 'Open the kind letter',
    hint: 'affectionate',
    icon: (
      <svg viewBox="0 0 80 70" aria-hidden="true">
        <rect x="10" y="18" width="60" height="40" rx="4" fill="var(--paper)" {...INK} />
        <path d="M10 20 L 40 42 L 70 20" fill="none" {...INK} />
        <circle cx="40" cy="42" r="7" fill="var(--coral)" {...INK} />
      </svg>
    ),
  },
];
