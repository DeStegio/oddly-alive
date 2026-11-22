import { createRng, hashString } from '../../../engine/rng';
import { W, type Portal } from './zoomController';

/**
 * Rooms inside rooms. A room is never stored: it is worked out from the
 * journey's seed and how deep it is, so any depth can be rebuilt on demand
 * (zooming back out included) without keeping a list.
 */
export const ARCHETYPES = ['upside', 'paper', 'water', 'impossible', 'scale', 'float', 'clock'] as const;
export type Archetype = (typeof ARCHETYPES)[number] | 'false';

export interface SceneDef {
  seed: number;
  depth: number;
  archetype: Archetype;
  /** Mirror the room left-right (the portal moves with it). */
  flip: boolean;
  /** Which accent the room leans on (0..3). */
  accent: number;
  /** Small per-room nudge for props (-1..1). */
  wobble: number;
  /** Someone familiar, now and then. */
  cameo: 'dot' | 'pim' | 'inch' | 'bunny' | null;
  /** A picture on the wall of the room you just came from. */
  dejaVu: boolean;
  portal: Portal;
}

/** Where each kind of room keeps its way onward (unflipped). */
const PORTALS: Record<Archetype, Portal> = {
  upside: { x: 430, y: 58, w: 160, shape: 'circle' },
  paper: { x: 590, y: 210, w: 180, shape: 'diamond' },
  water: { x: 660, y: 120, w: 190, shape: 'circle' },
  impossible: { x: 130, y: 120, w: 170, shape: 'rect' },
  scale: { x: 690, y: 300, w: 150, shape: 'keyhole' },
  float: { x: 380, y: 150, w: 170, shape: 'circle' },
  clock: { x: 420, y: 100, w: 170, shape: 'circle' },
  false: { x: 560, y: 120, w: 130, shape: 'rect' },
};

/** Every so often the house tries to fool you: a room that's nearly home. */
export const FALSE_EVERY = 9;

/** The order of rooms in block b: a seeded shuffle, never starting with the room that ended the block before. */
function blockOrder(seed: number, b: number): Archetype[] {
  const order = [...ARCHETYPES] as Archetype[];
  const rng = createRng(hashString(`${seed}:block:${b}`));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  if (b > 0) {
    const prev = blockOrderRaw(seed, b - 1);
    if (order[0] === prev[prev.length - 1]) [order[0], order[1]] = [order[1]!, order[0]!];
  }
  return order;
}
/** The same shuffle without the look-back. The swap only touches the first two places, so its last room is the real one. */
function blockOrderRaw(seed: number, b: number): Archetype[] {
  const order = [...ARCHETYPES] as Archetype[];
  const rng = createRng(hashString(`${seed}:block:${b}`));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

export function archetypeAt(seed: number, depth: number): Archetype {
  if (depth > 0 && depth % FALSE_EVERY === 0) return 'false';
  const i = depth - 1;
  const n = ARCHETYPES.length;
  const b = Math.floor(i / n);
  const order = blockOrder(seed, b);
  return order[i % n]!;
}

export function sceneAt(seed: number, depth: number): SceneDef {
  const rng = createRng(hashString(`${seed}:room:${depth}`));
  const archetype = archetypeAt(seed, depth);
  const flip = archetype !== 'false' && rng() < 0.5;
  const base = PORTALS[archetype];
  const portal: Portal = { ...base, x: flip ? W - base.x - base.w : base.x };
  const cameoRoll = rng();
  const cameo = cameoRoll < 0.12 ? 'dot' : cameoRoll < 0.2 ? 'pim' : cameoRoll < 0.26 ? 'inch' : cameoRoll < 0.3 ? 'bunny' : null;
  return {
    seed,
    depth,
    archetype,
    flip,
    accent: Math.floor(rng() * 4),
    wobble: rng() * 2 - 1,
    cameo: depth === 1 ? null : cameo,
    dejaVu: depth > 1 && archetype !== 'false' && rng() < 0.22,
    portal,
  };
}
