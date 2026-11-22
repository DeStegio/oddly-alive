/**
 * The shadow theatre, as geometry. A lamp in front of a hanging sheet; props
 * in between. Each prop's shadow is thrown away from the lamp, bigger (and
 * softer) the closer the prop is to the light. A few loose rules look at
 * how the props sit (types, positions, rotation, overlap) and decide when a
 * shape comes alive. No exact solutions: near enough is good enough.
 */
export const STAGE = { w: 800, h: 450 } as const;

export type PropKind = 'handL' | 'handR' | 'hat' | 'cup' | 'kettle' | 'fern' | 'bust';
export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  /** Degrees. */
  rot: number;
}
export interface Lamp {
  x: number;
  y: number;
}

export interface Shadow {
  kind: PropKind;
  x: number;
  y: number;
  scale: number;
  rot: number;
  blur: number;
}

/** Throw one prop's shadow onto the sheet. */
export function cast(p: Prop, lamp: Lamp): Shadow {
  const vx = p.x - lamp.x;
  const vy = p.y - lamp.y;
  const dist = Math.hypot(vx, vy);
  // closer to the light: bigger; far from it: nearly life size
  const scale = Math.max(1.12, Math.min(2.6, 1 + 150 / (dist + 70)));
  return { kind: p.kind, x: lamp.x + vx * scale, y: lamp.y + vy * scale, scale, rot: p.rot, blur: (scale - 1) * 1.6 };
}

export type Creature = 'bird' | 'rabbit' | 'cat' | 'dragon' | 'curtsy';

export interface Recognition {
  creature: Creature;
  /** Where on the sheet it appears (centre of the shapes that made it). */
  x: number;
  y: number;
  scale: number;
  /** The props it used (they get nudged apart after). */
  props: PropKind[];
}

const near = (a: Prop, b: Prop, d: number) => Math.hypot(a.x - b.x, a.y - b.y) < d;
const angleOff = (rot: number, target: number) => {
  const d = (((rot - target) % 360) + 540) % 360 - 180;
  return Math.abs(d);
};

/**
 * What, if anything, the shadows make right now. Loose rules:
 * - bird: both hands overlapping, roughly level
 * - rabbit: one hand on its own, turned upright (fingers up for ears)
 * - cat: the hat sitting just above the cup
 * - dragon: the kettle with the fern right behind it (steam and spines)
 * - curtsy: a hat on Marguerite's bust
 */
export function recognise(props: Prop[], lamp: Lamp): Recognition | null {
  const by = (k: PropKind) => props.find((p) => p.kind === k);
  const at = (ps: Prop[]) => {
    const sh = ps.map((p) => cast(p, lamp));
    return { x: sh.reduce((a, s) => a + s.x, 0) / sh.length, y: sh.reduce((a, s) => a + s.y, 0) / sh.length, scale: sh.reduce((a, s) => a + s.scale, 0) / sh.length };
  };
  const l = by('handL');
  const r = by('handR');
  if (l && r && near(l, r, 48) && angleOff(l.rot, 0) < 35 && angleOff(r.rot, 0) < 35) return { creature: 'bird', ...at([l, r]), props: ['handL', 'handR'] };
  const hat = by('hat');
  const bust = by('bust');
  if (hat && bust && Math.abs(hat.x - bust.x) < 40 && hat.y < bust.y && bust.y - hat.y < 80) return { creature: 'curtsy', ...at([hat, bust]), props: ['hat', 'bust'] };
  const cup = by('cup');
  if (hat && cup && Math.abs(hat.x - cup.x) < 36 && hat.y < cup.y && cup.y - hat.y < 70) return { creature: 'cat', ...at([hat, cup]), props: ['hat', 'cup'] };
  const kettle = by('kettle');
  const fern = by('fern');
  if (kettle && fern && near(kettle, fern, 56)) return { creature: 'dragon', ...at([kettle, fern]), props: ['kettle', 'fern'] };
  for (const hand of [l, r]) {
    if (!hand) continue;
    const other = hand === l ? r : l;
    const alone = !other || !near(hand, other, 110);
    if (alone && (angleOff(hand.rot, -90) < 30 || angleOff(hand.rot, 90) < 30)) return { creature: 'rabbit', ...at([hand]), props: [hand.kind] };
  }
  return null;
}

/** Where props start: spread along the bottom, clear of one another. */
export function startProps(): Prop[] {
  return [
    { kind: 'handL', x: 150, y: 330, rot: 0 },
    { kind: 'handR', x: 275, y: 345, rot: 0 },
    { kind: 'hat', x: 360, y: 320, rot: 0 },
    { kind: 'cup', x: 460, y: 350, rot: 0 },
    { kind: 'kettle', x: 560, y: 335, rot: 0 },
    { kind: 'fern', x: 650, y: 320, rot: 0 },
    { kind: 'bust', x: 720, y: 330, rot: 0 },
  ];
}

/** After a creature has had its moment, its props drift a little apart (so it doesn't fire again at once). */
export function nudgeApart(props: Prop[], used: PropKind[]): Prop[] {
  return props.map((p, i) => (used.includes(p.kind) ? { ...p, x: Math.max(40, Math.min(STAGE.w - 40, p.x + (i % 2 ? 60 : -60))), y: Math.min(STAGE.h - 40, p.y + 30), rot: p.kind.startsWith('hand') ? 0 : p.rot } : p));
}
