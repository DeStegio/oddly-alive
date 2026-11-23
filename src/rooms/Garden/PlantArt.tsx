import { parents } from './sim/species';
import type { BaseSpecies, Facing, Species } from './sim/types';

/**
 * The plants, as paper cut-outs (viewBox 60×100, ground line at y=88). Tall
 * plants reach above their cell. Grown flowers have small faces: these are
 * plants with opinions. Hybrids take their first parent's shape and their
 * second parent's colours.
 */
const INK = 'var(--char-ink)';

interface Palette {
  petal: string;
  petalShade: string;
  heart: string;
  leaf: string;
  leafShade: string;
}

const COLOURS: Record<BaseSpecies, Palette> = {
  sunflower: { petal: 'var(--yellow)', petalShade: 'var(--yellow-d2)', heart: '#7a4a2a', leaf: 'var(--mint-d1)', leafShade: 'var(--mint-d2)' },
  moonflower: { petal: '#f4f1ff', petalShade: 'var(--lavender-l1)', heart: 'var(--lavender-d1)', leaf: 'var(--mint-d1)', leafShade: 'var(--mint-d2)' },
  mint: { petal: 'var(--lavender-l1)', petalShade: 'var(--lavender)', heart: 'var(--lavender-d2)', leaf: 'var(--mint)', leafShade: 'var(--mint-d1)' },
  snapdragon: { petal: 'var(--coral)', petalShade: 'var(--coral-d2)', heart: 'var(--coral-l2)', leaf: 'var(--mint-d1)', leafShade: 'var(--mint-d2)' },
  radish: { petal: '#e0466a', petalShade: '#b02f50', heart: '#fff', leaf: 'var(--mint-d1)', leafShade: 'var(--mint-d2)' },
  creeper: { petal: 'var(--blue-l1)', petalShade: 'var(--blue)', heart: 'var(--yellow)', leaf: 'var(--mint-d1)', leafShade: 'var(--mint-d2)' },
};

function paletteOf(kind: Species): { shape: BaseSpecies; c: Palette } {
  const [a, b] = parents(kind);
  if (!b) return { shape: a!, c: COLOURS[a!] };
  return { shape: a!, c: { ...COLOURS[a!], petal: COLOURS[b].petal, petalShade: COLOURS[b].petalShade, heart: COLOURS[b].heart } };
}

function Face({ x, y, s = 1, mood = 'calm', look = 0 }: { x: number; y: number; s?: number; mood?: 'calm' | 'grumpy' | 'sleepy' | 'happy'; look?: number }) {
  const ex = 3.2 * s;
  return (
    <g transform={`translate(${x + look * 2.2} ${y})`}>
      {mood === 'sleepy' ? (
        <>
          <path d={`M${-ex - 1.5 * s} 0 q ${1.5 * s} ${1.4 * s} ${3 * s} 0 M${ex - 1.5 * s} 0 q ${1.5 * s} ${1.4 * s} ${3 * s} 0`} stroke={INK} strokeWidth={1.3} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx={-ex} cy={0} r={1.4 * s} fill={INK} />
          <circle cx={ex} cy={0} r={1.4 * s} fill={INK} />
        </>
      )}
      {mood === 'grumpy' ? <path d={`M${-ex - 1.8} ${-2.6 * s} l 3 1.2 M${ex + 1.8} ${-2.6 * s} l -3 1.2`} stroke={INK} strokeWidth={1.2} strokeLinecap="round" /> : null}
      <path d={mood === 'grumpy' ? `M${-2 * s} ${4 * s} q ${2 * s} ${-1.6 * s} ${4 * s} 0` : `M${-2 * s} ${3 * s} q ${2 * s} ${1.8 * s} ${4 * s} 0`} stroke={INK} strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </g>
  );
}

function Seed() {
  return (
    <g>
      <ellipse cx="30" cy="88" rx="11" ry="4" fill="var(--earth-d1)" stroke={INK} strokeWidth="2" />
      <ellipse cx="30" cy="85.5" rx="3.6" ry="2.6" fill="var(--paper)" stroke={INK} strokeWidth="1.5" />
    </g>
  );
}

function Sprout({ c }: { c: Palette }) {
  return (
    <g>
      <path d="M30 88 V 74" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 76 C 22 70 18 74 19 79 C 25 80 29 79 30 76 Z" fill={c.leaf} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M30 74 C 38 67 43 71 42 76 C 36 78 32 77 30 74 Z" fill={c.leaf} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M30 74 C 36 72 38 73 41 75" stroke={c.leafShade} strokeWidth="1.4" fill="none" />
    </g>
  );
}

function Leaf({ x, y, flip = false, c, w = 1 }: { x: number; y: number; flip?: boolean; c: Palette; w?: number }) {
  const d = flip ? `M${x} ${y} C ${x - 12 * w} ${y - 8} ${x - 16 * w} ${y - 2} ${x - 15 * w} ${y + 3} C ${x - 8 * w} ${y + 4} ${x - 3} ${y + 3} ${x} ${y} Z` : `M${x} ${y} C ${x + 12 * w} ${y - 8} ${x + 16 * w} ${y - 2} ${x + 15 * w} ${y + 3} C ${x + 8 * w} ${y + 4} ${x + 3} ${y + 3} ${x} ${y} Z`;
  return <path d={d} fill={c.leaf} stroke={INK} strokeWidth="2" strokeLinejoin="round" />;
}

function Sunflower({ stage, facing, c, open }: { stage: 2 | 3; facing: Facing | null; c: Palette; open: boolean }) {
  const top = stage === 2 ? 30 : 16;
  const look = facing === 'east' ? 1 : facing === 'west' ? -1 : 0;
  const hx = 30 + look * 6;
  return (
    <g>
      <path d={`M30 88 C 30 70 ${30 + look * 2} 50 ${hx} ${top + 8}`} stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d={`M30 88 C 30 70 ${30 + look * 2} 50 ${hx} ${top + 8}`} stroke={c.leaf} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Leaf x={30} y={70} c={c} />
      <Leaf x={30} y={58} c={c} flip />
      {stage === 2 || !open ? (
        <g>
          <ellipse cx={hx} cy={top + 4} rx="6" ry="8" fill={c.leaf} stroke={INK} strokeWidth="2" />
          <path d={`M${hx - 3} ${top - 2} l 3 -4 l 3 4`} fill={c.petal} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      ) : (
        <g transform={`translate(${hx} ${top}) scale(${look ? 0.72 : 1} 1)`}>
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx="0" cy="-12.5" rx="4.2" ry="7.5" fill={i % 2 ? c.petal : c.petalShade} stroke={INK} strokeWidth="1.6" transform={`rotate(${i * 30})`} />
          ))}
          <circle r="9.5" fill={c.heart} stroke={INK} strokeWidth="2" />
          <Face x={0} y={-1} s={0.9} look={look} mood="happy" />
        </g>
      )}
    </g>
  );
}

function Moonflower({ stage, c, open }: { stage: 2 | 3; c: Palette; open: boolean }) {
  return (
    <g>
      <path d="M30 88 C 28 78 33 66 30 54" stroke={INK} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <Leaf x={30} y={76} c={c} flip w={0.8} />
      <Leaf x={30} y={68} c={c} w={0.8} />
      {stage === 3 && open ? (
        <g transform="translate(30 48)">
          {Array.from({ length: 5 }, (_, i) => (
            <path key={i} d="M0 0 C -9 -6 -8 -18 0 -19 C 8 -18 9 -6 0 0 Z" fill={c.petal} stroke={INK} strokeWidth="1.6" transform={`rotate(${i * 72})`} />
          ))}
          <circle r="5.5" fill={c.heart} stroke={INK} strokeWidth="1.6" />
          <Face x={0} y={0} s={0.6} mood="sleepy" />
        </g>
      ) : (
        <g transform="translate(30 50)">
          <path d="M0 6 C -7 0 -6 -12 0 -16 C 6 -12 7 0 0 6 Z" fill={c.petalShade} stroke={INK} strokeWidth="1.8" />
          <path d="M0 6 C -2 -2 -1 -10 0 -16" stroke={INK} strokeWidth="1.1" fill="none" />
        </g>
      )}
    </g>
  );
}

function Mint({ stage, c }: { stage: 2 | 3; c: Palette }) {
  return (
    <g>
      {[
        [20, 80, true],
        [40, 80, false],
        [26, 70, true],
        [34, 68, false],
        [30, 60, true],
      ].map(([x, y, f], i) => (
        <Leaf key={i} x={x as number} y={y as number} c={c} flip={f as boolean} w={0.75} />
      ))}
      <path d="M30 88 V 58" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      {stage === 3 ? (
        <g>
          {[
            [22, 58],
            [30, 50],
            [38, 57],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill={c.petal} stroke={INK} strokeWidth="1.5" />
              <circle cx={x} cy={y} r="1.4" fill={c.heart} />
            </g>
          ))}
        </g>
      ) : null}
    </g>
  );
}

function Snapdragon({ stage, c }: { stage: 2 | 3; c: Palette }) {
  return (
    <g>
      <path d="M30 88 V 40" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
      <Leaf x={30} y={78} c={c} w={0.8} />
      <Leaf x={30} y={70} c={c} flip w={0.8} />
      {(stage === 3 ? [62, 52, 42] : [52]).map((y, i) => (
        <g key={y} transform={`translate(${30 + (i % 2 ? -5 : 5)} ${y})`}>
          <path d="M-7 0 C -8 -9 7 -10 8 -2 L 2 1 L 8 4 C 6 9 -6 9 -7 0 Z" fill={stage === 3 ? c.petal : c.leaf} stroke={INK} strokeWidth="1.7" strokeLinejoin="round" />
          {stage === 3 && i === 2 ? <Face x={-1.5} y={-3} s={0.55} mood="grumpy" /> : null}
        </g>
      ))}
    </g>
  );
}

function Radish({ stage, c }: { stage: 2 | 3; c: Palette }) {
  const up = stage === 3 ? 8 : 0;
  return (
    <g>
      <g transform={`translate(0 ${-up})`}>
        <path d={`M30 ${86} C 20 86 20 72 30 70 C 40 72 40 86 30 86 Z`} fill={c.petal} stroke={INK} strokeWidth="2" opacity={stage === 3 ? 1 : 0.0} />
        {stage === 3 ? (
          <>
            <path d="M26 74 C 28 72 31 72 33 74" stroke={c.petalShade} strokeWidth="2" fill="none" />
            <Face x={30} y={79} s={0.6} mood="happy" />
            <path d="M30 86 v 5" stroke={INK} strokeWidth="1.6" />
          </>
        ) : null}
        <path d="M30 70 C 24 58 18 58 18 50 C 26 52 29 60 30 70 Z" fill={c.leaf} stroke={INK} strokeWidth="2" />
        <path d="M30 70 C 36 56 42 56 42 48 C 34 50 31 60 30 70 Z" fill={c.leaf} stroke={INK} strokeWidth="2" />
        <path d="M30 70 C 30 58 31 52 30 44" stroke={INK} strokeWidth="2" fill="none" />
      </g>
      {stage === 2 ? <ellipse cx="30" cy="88" rx="10" ry="3" fill="var(--earth-d1)" stroke={INK} strokeWidth="1.6" /> : null}
    </g>
  );
}

function Creeper({ stage, c, onRock }: { stage: 1 | 2 | 3; c: Palette; onRock: boolean }) {
  const y0 = onRock ? 70 : 86;
  return (
    <g>
      <path d={`M2 ${y0} C 14 ${y0 - 10} 24 ${y0 + 6} 34 ${y0 - 4} S 52 ${y0 - 8} 58 ${y0}`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d={`M2 ${y0} C 14 ${y0 - 10} 24 ${y0 + 6} 34 ${y0 - 4} S 52 ${y0 - 8} 58 ${y0}`} stroke={c.leaf} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Leaf x={16} y={y0 - 6} c={c} flip w={0.6} />
      <Leaf x={44} y={y0 - 7} c={c} w={0.6} />
      {stage === 3 ? <circle cx="30" cy={y0 - 9} r="4" fill={c.petal} stroke={INK} strokeWidth="1.5" /> : null}
    </g>
  );
}

export interface PlantArtProps {
  kind: Species;
  stage: 0 | 1 | 2 | 3;
  facing: Facing | null;
  night: boolean;
  onRock?: boolean;
  vine?: boolean;
}

export function PlantArt({ kind, stage, facing, night, onRock = false, vine = false }: PlantArtProps) {
  const { shape, c } = paletteOf(kind);
  if (shape === 'creeper' || vine) return <Creeper stage={Math.max(1, stage) as 1 | 2 | 3} c={c} onRock={onRock} />;
  if (stage === 0) return <Seed />;
  if (stage === 1) return <Sprout c={c} />;
  const s = stage as 2 | 3;
  switch (shape) {
    case 'sunflower':
      return <Sunflower stage={s} facing={facing} c={c} open />;
    case 'moonflower':
      return <Moonflower stage={s} c={c} open={night} />;
    case 'mint':
      return <Mint stage={s} c={c} />;
    case 'snapdragon':
      return <Snapdragon stage={s} c={c} />;
    case 'radish':
      return <Radish stage={s} c={c} />;
    default:
      return <Seed />;
  }
}

/** The seed packet's little face (each species looks like itself). */
export function PacketArt({ kind }: { kind: Species }) {
  const { shape, c } = paletteOf(kind);
  return (
    <svg viewBox="0 0 44 56" aria-hidden="true">
      <path d="M4 8 L 40 8 L 38 52 L 6 52 Z" fill="var(--paper)" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M4 8 L 40 8 L 39 16 L 5 16 Z" fill={c.petalShade} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 8 l 2 -4 l 3 4 l 3 -4 l 3 4 l 3 -4 l 3 4 l 3 -4 l 3 4 l 3 -4 l 2 4" fill="var(--paper)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="22" cy="33" r="11" fill={shape === 'radish' ? c.petal : c.petal} stroke={INK} strokeWidth="2" />
      <Face x={22} y={32} s={0.9} mood={shape === 'snapdragon' ? 'grumpy' : shape === 'moonflower' ? 'sleepy' : 'happy'} />
      {parents(kind).length === 2 ? <path d="M30 44 l 4 -4 l 4 4 l -4 4 Z" fill="var(--yellow)" stroke={INK} strokeWidth="1.4" /> : null}
    </svg>
  );
}
