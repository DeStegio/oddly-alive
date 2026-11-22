import type { ReactNode } from 'react';
import type { Archetype, SceneDef } from './sceneGenerator';
import { portalH, type Portal } from './zoomController';
import styles from './InfiniteRooms.module.css';

/**
 * The rooms. Each is drawn in the same 1000×625 box, in the house's style
 * (ink outlines, flat cut-paper colour, hard shadows), in two layers: the
 * back (walls, furniture) and the front (whatever surrounds the portal, plus
 * anything that should sit over the room beyond). The room beyond goes in
 * between, so the front layer frames it.
 */
const K = 'var(--char-ink)';
const ink = (w = 3) => ({ stroke: K, strokeWidth: w, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const });
export const ACCENTS = ['var(--coral)', 'var(--blue)', 'var(--mint)', 'var(--yellow)'];

export interface Art {
  back: (d: SceneDef) => ReactNode;
  /** What surrounds the portal (opaque, with a hole). Fades away as you arrive. */
  frame: (d: SceneDef) => ReactNode;
  /** Decoration in front of everything (doesn't fade). */
  front?: (d: SceneDef) => ReactNode;
  /** The colour behind it all (also shown in a portal not yet filled). */
  ground: string;
  label: string;
}

// ------------------------------------------------------------- shared bits

/** A path for a portal-shaped hole inside a padded box (for even-odd fills). */
export function holePath(p: Portal, pad: number): string {
  const h = portalH(p);
  const outer = `M${p.x - pad} ${p.y - pad} H ${p.x + p.w + pad} V ${p.y + h + pad} H ${p.x - pad} Z`;
  const cx = p.x + p.w / 2;
  const cy = p.y + h / 2;
  switch (p.shape) {
    case 'circle': {
      const r = h / 2;
      return `${outer} M${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
    }
    case 'diamond':
      return `${outer} M${cx} ${p.y} L ${p.x + p.w} ${cy} L ${cx} ${p.y + h} L ${p.x} ${cy} Z`;
    case 'keyhole': {
      const r = h * 0.3;
      return `${outer} M${cx - r} ${p.y + r + 6} a ${r} ${r} 0 1 1 ${2 * r} 0 L ${cx + r * 0.75} ${p.y + h - 4} H ${cx - r * 0.75} Z`;
    }
    case 'arch':
      return `${outer} M${p.x} ${p.y + h} V ${p.y + h * 0.45} A ${p.w / 2} ${h * 0.45} 0 0 1 ${p.x + p.w} ${p.y + h * 0.45} V ${p.y + h} Z`;
    default:
      return `${outer} M${p.x} ${p.y} H ${p.x + p.w} V ${p.y + h} H ${p.x} Z`;
  }
}

function Sofa({ x, y, s = 1, fill = 'var(--coral)', flip = false }: { x: number; y: number; s?: number; fill?: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}${flip ? ` ${-s}` : ''})`}>
      <rect x="-150" y="-70" width="300" height="56" rx="18" fill={fill} {...ink()} />
      <rect x="-170" y="-24" width="340" height="44" rx="10" fill={fill} {...ink()} />
      <rect x="-186" y="-44" width="40" height="66" rx="12" fill={fill} {...ink()} />
      <rect x="146" y="-44" width="40" height="66" rx="12" fill={fill} {...ink()} />
      <path d="M-150 20 v 12 M150 20 v 12" {...ink(6)} />
      <path d="M92 -64 l 40 -4 l -2 46 l -44 2 Z" fill="var(--yellow)" {...ink()} />
    </g>
  );
}

function Lamp({ x, y, s = 1, on = true }: { x: number; y: number; s?: number; on?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {on ? <path d="M-24 -150 L 24 -150 L 70 0 L -70 0 Z" fill="var(--yellow)" opacity="0.3" /> : null}
      <path d="M0 -150 V 0 M-26 0 H 26" {...ink(5)} />
      <path d="M-30 -150 L -18 -200 Q 0 -206 18 -200 L 30 -150 Q 0 -144 -30 -150 Z" fill="var(--yellow)" {...ink()} />
    </g>
  );
}

function Frame({ x, y, w, h, children, tilt = 0 }: { x: number; y: number; w: number; h: number; children?: ReactNode; tilt?: number }) {
  return (
    <g transform={`rotate(${tilt} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} fill="var(--yellow)" {...ink()} />
      <rect x={x + 8} y={y + 8} width={w - 16} height={h - 16} fill="var(--lavender)" {...ink(2)} />
      {children}
    </g>
  );
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -40 C -30 -90 -50 -80 -40 -120 M0 -40 C 10 -100 30 -110 20 -140 M0 -40 C 30 -80 60 -70 56 -110" fill="none" stroke="#3f7a52" strokeWidth="5" strokeLinecap="round" />
      <path d="M-26 -40 H 26 L 20 0 H -20 Z" fill="var(--blue)" {...ink()} />
    </g>
  );
}

/** Familiar faces, now and then. */
export function Cameo({ who, x, y, s = 1, watching = false }: { who: SceneDef['cameo']; x: number; y: number; s?: number; watching?: boolean }) {
  if (!who) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className={styles.cameo} data-who={who} data-watching={watching}>
      {who === 'dot' ? (
        <g className={styles.bob}>
          <circle r="26" fill="var(--blue)" {...ink()} />
          <circle cx="4" cy="-4" r="11" fill="#fffaf1" {...ink(2)} />
          <circle className={styles.pupil} cx="6" cy="-4" r="5" fill={K} />
          <path d="M-8 -26 q -4 -12 4 -14" fill="none" {...ink(2.5)} />
        </g>
      ) : who === 'pim' ? (
        <g className={styles.peek}>
          <path d="M-46 30 C -50 -30 50 -30 46 30 Z" fill="var(--lavender)" {...ink()} />
          <circle className={styles.pupil} cx="-14" cy="0" r="5" fill={K} />
          <circle className={styles.pupil} cx="14" cy="0" r="5" fill={K} />
        </g>
      ) : who === 'inch' ? (
        <g className={styles.inch}>
          <path d="M-40 0 q 10 -30 20 0 q 10 -30 20 0 q 10 -30 20 0" fill="none" stroke="#3f7a52" strokeWidth="12" strokeLinecap="round" />
          <circle cx="24" cy="-6" r="3" fill={K} />
        </g>
      ) : (
        <g className={styles.bob}>
          <ellipse rx="22" ry="17" fill="#c8bdae" stroke="#a99c8a" strokeWidth="3" />
          <circle cx="-7" cy="-3" r="2.5" fill={K} />
          <circle cx="7" cy="-3" r="2.5" fill={K} />
        </g>
      )}
    </g>
  );
}

// ------------------------------------------------------------- the rooms

const upside: Art = {
  label: 'A room hanging upside down. The water in the glass rises.',
  ground: 'var(--canvas)',
  back: (d) => (
    <g>
      <rect width="1000" height="625" fill="var(--canvas)" />
      {/* the floor is up there now */}
      <rect width="1000" height="150" fill="var(--canvas-deep)" />
      <path d="M0 150 H 1000" {...ink()} />
      {Array.from({ length: 10 }, (_, i) => (
        <path key={i} d={`M${i * 100 + 40} 0 V 150`} stroke={K} strokeWidth="1.5" opacity="0.2" />
      ))}
      <ellipse cx="500" cy="118" rx="300" ry="24" fill="var(--paper)" {...ink()} />
      <Sofa x={310} y={168} s={0.85} flip fill={ACCENTS[d.accent]} />
      <g transform="translate(830 150) scale(1 -1)">
        <Lamp x={0} y={0} s={1.1} />
      </g>
      <Plant x={140} y={150} s={-1} />
      <Frame x={600} y={420} w={130} h={100} tilt={180 + d.wobble * 6} />
      {/* the light fitting points up from down here */}
      <path d="M500 625 V 560" {...ink(4)} />
      <path d="M470 560 Q 500 520 530 560 Z" fill="var(--yellow)" {...ink()} />
      {/* drops falling upwards */}
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} className={styles.rise} style={{ animationDelay: `${-i * 0.9}s` }} d={`M${120 + i * 120} 600 q 6 10 0 14 q -6 -4 0 -14 Z`} fill="var(--blue)" {...ink(1.5)} />
      ))}
    </g>
  ),
  frame: (d) => {
    const p = d.portal;
    const h = portalH(p);
    return (
      <g>
        {/* the glass, seen from below: its bottom is the way through */}
        <path d={`M${p.x - 8} ${p.y + h / 2} V ${p.y - 40} M${p.x + p.w + 8} ${p.y + h / 2} V ${p.y - 40}`} {...ink()} />
        <ellipse cx={p.x + p.w / 2} cy={p.y + h / 2} rx={h / 2 + 8} ry={h / 2 + 8} fill="none" stroke="rgba(101,123,232,0.5)" strokeWidth="14" />
        <ellipse cx={p.x + p.w / 2} cy={p.y + h / 2} rx={h / 2 + 2} ry={h / 2 + 2} fill="none" {...ink()} />
      </g>
    );
  },
};

const paper: Art = {
  label: 'A room folded out of paper.',
  ground: 'var(--paper)',
  back: (d) => (
    <g>
      <rect width="1000" height="625" fill="var(--paper)" />
      {/* folded walls */}
      <path d="M0 0 L 300 90 L 300 470 L 0 625 Z" fill="var(--canvas-deep)" {...ink()} />
      <path d="M1000 0 L 760 90 L 760 470 L 1000 625 Z" fill="var(--canvas-deep)" {...ink()} />
      <path d="M300 90 H 760 V 470 H 300 Z" fill="var(--paper)" {...ink()} />
      <path d="M300 470 L 0 625 H 1000 L 760 470 Z" fill="var(--canvas)" {...ink()} />
      {/* creases */}
      <path d="M150 45 V 548 M880 45 V 548 M530 90 V 470 M300 280 H 760" stroke={K} strokeWidth="1.5" strokeDasharray="8 8" opacity="0.35" />
      {/* an origami sofa */}
      <g className={styles.breathe}>
        <path d="M330 470 L 360 400 L 520 400 L 550 470 Z" fill={ACCENTS[d.accent]} {...ink()} />
        <path d="M360 400 L 380 360 L 500 360 L 520 400 Z" fill={ACCENTS[(d.accent + 1) % 4]} {...ink()} />
      </g>
      {/* a crane, flapping */}
      <g transform="translate(200 230)" className={styles.flap}>
        <path d="M0 0 L 40 -30 L 30 10 Z M30 10 L 80 -6 L 44 18 Z M0 0 L -30 -10 L -8 8 Z" fill="var(--coral)" {...ink(2.5)} />
      </g>
      {/* paper planes */}
      <g className={styles.glide}>
        <path d="M0 0 L 50 10 L 0 20 L 12 10 Z" transform="translate(-80 140)" fill="var(--paper)" {...ink(2.5)} />
      </g>
    </g>
  ),
  frame: (d) => {
    const p = d.portal;
    const h = portalH(p);
    const cx = p.x + p.w / 2;
    const cy = p.y + h / 2;
    return (
      <g>
        {/* the folded flaps around the opening */}
        <path d={`M${cx} ${p.y} L ${p.x - 18} ${p.y - 18} L ${p.x} ${cy} Z M${cx} ${p.y} L ${p.x + p.w + 18} ${p.y - 18} L ${p.x + p.w} ${cy} Z`} fill="var(--canvas-deep)" {...ink(2.5)} />
        <path d={`M${cx} ${p.y} L ${p.x + p.w} ${cy} L ${cx} ${p.y + h} L ${p.x} ${cy} Z`} fill="none" {...ink()} />
      </g>
    );
  },
};

const water: Art = {
  label: 'A room underwater. The sofa floats.',
  ground: '#7fb8c9',
  back: (d) => (
    <g>
      <defs>
        <linearGradient id={`sea${d.depth}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9d8e0" />
          <stop offset="1" stopColor="#4f8fa8" />
        </linearGradient>
      </defs>
      <rect width="1000" height="625" fill={`url(#sea${d.depth})`} />
      {/* light from above */}
      <path d="M200 0 L 260 0 L 420 625 L 300 625 Z M560 0 L 600 0 L 700 625 L 620 625 Z" fill="#fffaf1" opacity="0.18" />
      <path d="M0 520 Q 250 500 500 520 T 1000 520 V 625 H 0 Z" fill="#d9c79a" {...ink()} />
      {/* seaweed curtains */}
      {[40, 90, 920, 960].map((x, i) => (
        <path key={x} className={styles.sway} style={{ animationDelay: `${-i * 0.7}s` }} d={`M${x} 625 C ${x - 30} 480 ${x + 30} 380 ${x} 200 C ${x - 20} 120 ${x + 10} 60 ${x} 0`} fill="none" stroke="#3f7a52" strokeWidth="16" strokeLinecap="round" />
      ))}
      <g className={styles.bob}>
        <Sofa x={360} y={400} s={0.9} fill={ACCENTS[d.accent]} />
      </g>
      {/* jellyfish */}
      {[
        [200, 160],
        [800, 380],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} className={styles.pulse} style={{ animationDelay: `${-i * 1.1}s` }}>
          <path d="M-24 0 A 24 18 0 0 1 24 0 Z" fill="var(--lavender)" {...ink(2.5)} />
          <path d="M-14 0 q 4 16 -2 30 M0 0 q 4 16 -2 34 M14 0 q 4 16 -2 30" fill="none" {...ink(2)} />
        </g>
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} className={styles.bubble} style={{ animationDelay: `${-i * 0.8}s` }} cx={80 + i * 105} cy="610" r={5 + (i % 3) * 3} fill="none" stroke="#fffaf1" strokeWidth="2.5" />
      ))}
    </g>
  ),
  frame: (d) => {
    const p = d.portal;
    const h = portalH(p);
    return (
      <g>
        {/* a big bubble */}
        <ellipse cx={p.x + p.w / 2} cy={p.y + h / 2} rx={h / 2 + 3} ry={h / 2 + 3} fill="none" stroke="#fffaf1" strokeWidth="6" />
        <path d={`M${p.x + p.w / 2 - h * 0.3} ${p.y + h * 0.2} q 12 -14 30 -14`} fill="none" stroke="#fffaf1" strokeWidth="6" strokeLinecap="round" />
      </g>
    );
  },
};

const impossible: Art = {
  label: 'A room where the stairs go round forever.',
  ground: 'var(--canvas)',
  back: (d) => (
    <g>
      <rect width="1000" height="625" fill="var(--canvas)" />
      {/* a chequered floor that can't decide which way it slopes */}
      {Array.from({ length: 8 }, (_, i) =>
        Array.from({ length: 4 }, (__, j) => ((i + j) % 2 ? <path key={`${i}${j}`} d={`M${i * 125 + j * 20} ${470 + j * 39} h 125 l 20 39 h -125 Z`} fill={K} opacity="0.12" /> : null)),
      )}
      <path d="M0 470 H 1000" {...ink()} />
      {/* the stairs that go round */}
      <g transform="translate(560 140)">
        {[
          'M0 160 L 60 130 L 120 160 L 60 190 Z',
          'M60 130 L 120 100 L 180 130 L 120 160 Z',
          'M120 100 L 180 70 L 240 100 L 180 130 Z',
          'M180 130 L 240 100 L 240 160 L 180 190 Z',
          'M120 160 L 180 130 L 180 190 L 120 220 Z',
        ].map((dd, i) => (
          <path key={i} d={dd} fill={i % 2 ? ACCENTS[d.accent] : 'var(--paper)'} {...ink()} />
        ))}
        <circle className={styles.climb} r="9" fill="var(--blue)" {...ink(2)} cx="60" cy="140" />
      </g>
      {/* a door in the ceiling */}
      <rect x="380" y="0" width="90" height="40" fill="var(--coral)" {...ink()} />
      <circle cx="455" cy="22" r="4" fill={K} />
      {/* a window with a window in it */}
      <rect x="820" y="100" width="120" height="90" fill="var(--blue)" {...ink()} />
      <rect x="850" y="122" width="60" height="45" fill="var(--canvas)" {...ink(2)} />
      <rect x="866" y="134" width="28" height="21" fill="var(--blue)" {...ink(1.5)} />
      <Sofa x={300} y={455} s={0.6} fill={ACCENTS[(d.accent + 2) % 4]} />
    </g>
  ),
  frame: (d) => {
    const p = d.portal;
    const h = portalH(p);
    return (
      <g>
        <rect x={p.x - 6} y={p.y - 6} width={p.w + 12} height={h + 12} fill="none" {...ink(5)} />
        <path d={`M${p.x - 16} ${p.y + h + 10} H ${p.x + p.w + 16}`} {...ink(8)} />
      </g>
    );
  },
};

const scale: Art = {
  label: 'A room where everything is the wrong size.',
  ground: 'var(--canvas)',
  back: (d) => (
    <g>
      <rect width="1000" height="625" fill="var(--canvas)" />
      <rect y="470" width="1000" height="155" fill="var(--canvas-deep)" />
      <path d="M0 470 H 1000" {...ink()} />
      {/* a tiny sofa and a tiny lamp */}
      <Sofa x={160} y={462} s={0.22} fill={ACCENTS[d.accent]} />
      <Lamp x={230} y={470} s={0.25} />
      {/* an enormous teacup */}
      <g transform="translate(330 470)">
        <path d="M0 -190 H 230 V -60 Q 230 0 170 0 H 60 Q 0 0 0 -60 Z" fill="var(--paper)" {...ink(4)} />
        <path d="M230 -150 q 70 0 70 50 q 0 50 -70 50" fill="none" {...ink(4)} />
        <path d="M0 -150 H 230" stroke="var(--coral)" strokeWidth="12" />
        <path className={styles.steam} d="M80 -210 q 20 -30 0 -60 M150 -210 q 20 -30 0 -60" fill="none" {...ink(3)} opacity="0.4" />
      </g>
      {/* a cat's eye at the window */}
      <rect x="60" y="90" width="200" height="150" fill="#c8b3ff" {...ink()} />
      <g className={styles.blink} transform="translate(160 165)">
        <ellipse rx="70" ry="44" fill="var(--yellow)" {...ink(3)} />
        <ellipse rx="10" ry="38" fill={K} />
      </g>
      {/* the huge door the keyhole is in */}
      <rect x="640" y="20" width="330" height="450" fill="#a07050" {...ink(4)} />
      <rect x="670" y="50" width="270" height="180" fill="none" {...ink(2)} opacity="0.4" />
    </g>
  ),
  frame: (d) => {
    const p = d.portal;
    return (
      <g>
        <path d={holePath(p, 30)} fill="#a07050" fillRule="evenodd" />
        <path d={holePath(p, 0).split('Z').slice(1).join('Z')} fill="none" {...ink(4)} />
      </g>
    );
  },
};

const float: Art = {
  label: 'A room that forgot about gravity.',
  ground: 'var(--canvas)',
  back: (d) => (
    <g>
      <rect width="1000" height="625" fill="var(--canvas)" />
      <rect y="470" width="1000" height="155" fill="var(--canvas-deep)" />
      <path d="M0 470 H 1000" {...ink()} />
      {/* things drifting */}
      <g className={styles.drift}>
        <Sofa x={720} y={430} s={0.55} fill={ACCENTS[d.accent]} />
      </g>
      {[
        [160, 220, 'var(--coral)'],
        [260, 380, 'var(--blue)'],
        [860, 160, 'var(--mint)'],
      ].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g className={styles.spin} style={{ animationDelay: `${-i * 2}s` }}>
            <rect x="-30" y="-20" width="60" height="40" rx="4" fill={c as string} {...ink()} />
            <path d="M-30 -20 V 20" {...ink(5)} />
          </g>
        </g>
      ))}
      <g transform="translate(120 420)" className={styles.drift} style={{ animationDelay: '-3s' }}>
        <path d="M-20 -14 H 20 V 4 Q 20 14 10 14 H -10 Q -20 14 -20 4 Z" fill="var(--paper)" {...ink(2.5)} />
        {[0, 1, 2].map((i) => (
          <circle key={i} className={styles.rise} style={{ animationDelay: `${-i * 1.2}s` }} cx={-8 + i * 8} cy="-24" r="5" fill="#a0703c" opacity="0.8" />
        ))}
      </g>
      <Frame x={600} y={70} w={110} h={80} tilt={-18 + d.wobble * 10} />
    </g>
  ),
  frame: (d) => {
    const p = d.portal;
    const h = portalH(p);
    const cx = p.x + p.w / 2;
    const cy = p.y + h / 2;
    const r = h / 2 + 14;
    return (
      <g>
        {/* a floating clock: the face is the way in */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--yellow)" strokeWidth="20" />
        <circle cx={cx} cy={cy} r={r + 10} fill="none" {...ink()} />
        <circle cx={cx} cy={cy} r={r - 10} fill="none" {...ink(2)} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r="3" fill={K} />;
        })}
      </g>
    );
  },
};

const clock: Art = {
  label: 'A room full of clocks that disagree.',
  ground: 'var(--canvas)',
  back: (d) => (
    <g>
      <rect width="1000" height="625" fill="var(--canvas)" />
      <rect y="490" width="1000" height="135" fill="var(--canvas-deep)" />
      <path d="M0 490 H 1000" {...ink()} />
      {[
        [110, 120, 46, 1],
        [250, 300, 34, -1],
        [800, 140, 54, 1],
        [900, 330, 30, -1],
        [120, 380, 38, 1],
        [700, 360, 26, -1],
      ].map(([x, y, r = 30, dir = 1], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r={r} fill={i % 2 ? 'var(--paper)' : ACCENTS[(d.accent + i) % 4]} {...ink()} />
          <g className={dir > 0 ? styles.tick : styles.tickBack} style={{ animationDuration: `${4 + i}s` }}>
            <path d={`M0 0 V ${-r * 0.75}`} {...ink(3)} />
          </g>
          <path d={`M0 0 H ${r * 0.5}`} {...ink(3)} />
        </g>
      ))}
      {/* a pendulum */}
      <g transform="translate(560 0)">
        <g className={styles.pendulum}>
          <path d="M0 0 V 380" {...ink(3)} />
          <circle cy="400" r="26" fill="var(--yellow)" {...ink()} />
        </g>
      </g>
    </g>
  ),
  frame: (d) => {
    const p = d.portal;
    const h = portalH(p);
    const cx = p.x + p.w / 2;
    const cy = p.y + h / 2;
    const r = h / 2 + 12;
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--paper)" strokeWidth="22" />
        <circle cx={cx} cy={cy} r={r + 11} fill="none" {...ink()} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <path key={i} d={`M${cx + Math.cos(a) * (r - 6)} ${cy + Math.sin(a) * (r - 6)} L ${cx + Math.cos(a) * (r + 6)} ${cy + Math.sin(a) * (r + 6)}`} {...ink(3)} />;
        })}
      </g>
    );
  },
};

/** Nearly home. Look closer. */
const falseHome: Art = {
  label: 'The Living Room. Nearly.',
  ground: 'var(--canvas)',
  back: () => (
    <g>
      <rect width="1000" height="625" fill="var(--canvas)" />
      <rect y="440" width="1000" height="185" fill="var(--canvas-deep)" />
      <path d="M0 440 H 1000" {...ink()} />
      <ellipse cx="460" cy="560" rx="300" ry="40" fill="var(--paper)" {...ink()} />
      <Sofa x={440} y={500} s={0.95} />
      {/* the lamp's light goes up */}
      <g transform="translate(110 520)">
        <path d="M-24 -150 L 24 -150 L 60 -320 L -60 -320 Z" fill="var(--yellow)" opacity="0.3" />
        <path d="M0 -150 V 0 M-26 0 H 26" {...ink(5)} />
        <path d="M-30 -150 L -18 -200 Q 0 -206 18 -200 L 30 -150 Q 0 -144 -30 -150 Z" fill="var(--yellow)" {...ink()} />
      </g>
      {/* the clock has no hands */}
      <circle cx="420" cy="150" r="44" fill="var(--paper)" {...ink()} />
      {/* her portrait looks the other way */}
      <rect x="720" y="100" width="130" height="100" fill="var(--yellow)" {...ink()} />
      <rect x="730" y="110" width="110" height="80" fill="var(--blue)" {...ink(2)} />
      <path d="M760 190 C 756 150 814 150 810 190 Z" fill="var(--lavender)" {...ink(2)} />
      <circle cx="770" cy="170" r="3" fill={K} />
      <circle cx="782" cy="170" r="3" fill={K} />
      <Plant x={900} y={520} />
      {/* and Dot, on the sofa, watching the little frame */}
      <Cameo who="dot" x={520} y={420} s={1} watching />
    </g>
  ),
  frame: (d) => {
    const p = d.portal;
    const h = portalH(p);
    return (
      <g>
        <rect x={p.x - 7} y={p.y - 7} width={p.w + 14} height={h + 14} fill="none" stroke="var(--yellow)" strokeWidth="10" />
        <rect x={p.x - 12} y={p.y - 12} width={p.w + 24} height={h + 24} fill="none" {...ink()} />
      </g>
    );
  },
};

export const ART: Record<Archetype, Art> = { upside, paper, water, impossible, scale, float, clock, false: falseHome };

/** Somewhere free for a cameo in each kind of room. */
export const CAMEO_SPOT: Record<Archetype, { x: number; y: number; s: number }> = {
  upside: { x: 700, y: 190, s: -1 },
  paper: { x: 650, y: 440, s: 1 },
  water: { x: 160, y: 400, s: 1 },
  impossible: { x: 150, y: 440, s: 1 },
  scale: { x: 260, y: 445, s: 0.4 },
  float: { x: 520, y: 400, s: 1 },
  clock: { x: 330, y: 470, s: 1 },
  false: { x: 0, y: 0, s: 0 },
};

/** Where the picture of the last room hangs (déjà vu). */
export const DEJA_SPOT: Record<Archetype, { x: number; y: number }> = {
  upside: { x: 120, y: 420 },
  paper: { x: 360, y: 130 },
  water: { x: 420, y: 60 },
  impossible: { x: 360, y: 150 },
  scale: { x: 320, y: 60 },
  float: { x: 780, y: 230 },
  clock: { x: 330, y: 160 },
  false: { x: 0, y: 0 },
};
