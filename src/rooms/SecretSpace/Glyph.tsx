import type { SecretDef } from '../../content/secrets';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const GLYPHS: Record<SecretDef['glyph'], React.ReactNode> = {
  key: <path {...P} d="M10 24 a6 6 0 1 1 0.1 0 M16 24 H 38 V 30 M32 24 V 29" />,
  eye: <path {...P} d="M6 24 Q 24 8 42 24 Q 24 40 6 24 Z M24 24 m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0" />,
  spiral: <path {...P} d="M24 24 m 0 -2 a 2 2 0 1 1 -2 2 a 5 5 0 1 1 5 5 a 9 9 0 1 1 -9 -9 a 13 13 0 1 1 13 13" />,
  button: <path {...P} d="M10 30 Q 24 38 38 30 V 24 Q 24 32 10 24 Z M10 24 Q 24 12 38 24" />,
  clock: <path {...P} d="M24 24 m -14 0 a 14 14 0 1 0 28 0 a 14 14 0 1 0 -28 0 M24 16 V 24 L 30 28" />,
  wave: <path {...P} d="M14 30 V 16 M20 30 V 12 M26 30 V 13 M32 30 V 17 M14 30 Q 24 42 34 28 L 38 22" />,
  letter: <path {...P} d="M12 36 L 22 10 L 30 36 M15 28 H 28 M34 14 q 6 2 2 8" />,
  music: <path {...P} d="M18 34 V 12 L 34 9 V 30 M18 34 m -5 0 a 5 4 0 1 0 10 0 a 5 4 0 1 0 -10 0 M34 30 m -5 0 a 5 4 0 1 0 10 0 a 5 4 0 1 0 -10 0" />,
  board: <path {...P} d="M6 20 H 42 V 30 H 6 Z M14 20 V 30 M30 20 V 30 M38 16 l 4 -4" />,
  tower: <path {...P} d="M16 38 H 32 V 30 H 16 Z M18 30 H 30 V 22 H 18 Z M20 22 H 28 V 14 H 20 Z M22 14 H 26 V 8 H 22 Z" />,
  moon: <path {...P} d="M28 8 a 16 16 0 1 0 12 24 a 12 12 0 1 1 -12 -24 z" />,
  mirror: <path {...P} d="M24 6 a 11 13 0 1 0 0.1 0 M24 32 V 42 M20 14 l 4 -3" />,
  rainbow: <path {...P} d="M6 18 A 18 16 0 0 0 42 18 M12 18 A 12 10 0 0 0 36 18 M18 18 A 6 5 0 0 0 30 18" />,
  chest: <path {...P} d="M8 22 H 40 V 38 H 8 Z M8 22 Q 24 6 40 22 M22 26 H 26 V 31 H 22 Z" />,
  aunt: <path {...P} d="M10 38 C 8 24 16 16 24 16 C 32 16 40 24 38 38 Z M16 16 L 19 8 H 29 L 32 16 M13 16 H 35 M19 28 h 0.1 M29 28 h 0.1" />,
  candle: <path {...P} d="M18 40 V 20 H 30 V 40 M24 20 V 15 M24 15 Q 18 9 24 4 Q 30 9 24 15" />,
  worm: <path {...P} d="M6 34 Q 12 22 18 34 Q 24 22 30 34 M30 34 a 6 6 0 1 0 8 -8" />,
  glitch: <path {...P} d="M8 12 H 40 V 36 H 8 Z M14 20 l 6 6 m 0 -6 l -6 6 M26 30 H 34" />,
  star: <path {...P} d="M24 6 L 29 18 L 42 19 L 32 27 L 35 40 L 24 33 L 13 40 L 16 27 L 6 19 L 19 18 Z" />,
  moth: <path {...P} d="M24 14 V 36 M24 18 C 14 6 4 14 10 24 C 4 32 16 38 24 28 C 32 38 44 32 38 24 C 44 14 34 6 24 18 M22 12 l -4 -5 M26 12 l 4 -5" />,
  heart: <path {...P} d="M24 38 C 6 26 8 12 17 12 C 21 12 23 15 24 17 C 25 15 27 12 31 12 C 40 12 42 26 24 38 Z" />,
};

export function Glyph({ name }: { name: SecretDef['glyph'] }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" width="40" height="40">
      {GLYPHS[name]}
    </svg>
  );
}
