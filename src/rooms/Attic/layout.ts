import type { HatId } from '../../content/attic';
import type { Rect } from './dust';

/** Places in the attic that can be dusted clean (and remembered as clean). */
export type Spot = 'photo:sea' | 'photo:dance' | 'photo:garden' | 'marguerite' | 'gramophone' | 'trunk' | 'diary' | `hat:${HatId}` | 'letter';

export interface AtticLayout {
  w: number;
  h: number;
  floor: number;
  cell: number;
  window: Rect;
  shelf: Rect;
  stool: Rect;
  crate: Rect;
  spots: Record<Spot, Rect>;
  /** Where cornered dust bunnies sit in a row. */
  bunnyRow: { x: number; y: number; gap: number };
}

/** Desktop: a long, low attic. */
export const WIDE: AtticLayout = {
  w: 1000,
  h: 560,
  floor: 470,
  cell: 20,
  window: { x: 700, y: 40, w: 110, h: 110 },
  shelf: { x: 60, y: 250, w: 200, h: 14 },
  stool: { x: 64, y: 420, w: 120, h: 52 },
  crate: { x: 640, y: 420, w: 160, h: 52 },
  spots: {
    'photo:sea': { x: 70, y: 70, w: 120, h: 92 },
    'photo:dance': { x: 214, y: 50, w: 100, h: 124 },
    'photo:garden': { x: 340, y: 78, w: 120, h: 92 },
    marguerite: { x: 470, y: 226, w: 150, h: 246 },
    gramophone: { x: 620, y: 270, w: 200, h: 150 },
    trunk: { x: 828, y: 378, w: 156, h: 96 },
    diary: { x: 84, y: 388, w: 82, h: 34 },
    'hat:beret': { x: 300, y: 432, w: 64, h: 42 },
    'hat:topper': { x: 876, y: 338, w: 64, h: 42 },
    'hat:sunhat': { x: 870, y: 168, w: 72, h: 46 },
    'hat:crown': { x: 170, y: 210, w: 62, h: 42 },
    letter: { x: 390, y: 494, w: 64, h: 40 },
  },
  bunnyRow: { x: 200, y: 520, gap: 26 },
};

/** Phones: the same attic, stacked taller. */
export const TALL: AtticLayout = {
  w: 600,
  h: 900,
  floor: 760,
  cell: 20,
  window: { x: 440, y: 210, w: 104, h: 104 },
  shelf: { x: 30, y: 262, w: 220, h: 14 },
  stool: { x: 36, y: 836, w: 130, h: 56 },
  crate: { x: 334, y: 640, w: 200, h: 120 },
  spots: {
    'photo:sea': { x: 26, y: 60, w: 168, h: 124 },
    'photo:dance': { x: 216, y: 40, w: 150, h: 170 },
    'photo:garden': { x: 392, y: 70, w: 176, h: 124 },
    marguerite: { x: 40, y: 410, w: 200, h: 330 },
    gramophone: { x: 334, y: 490, w: 200, h: 150 },
    trunk: { x: 346, y: 766, w: 240, h: 124 },
    diary: { x: 58, y: 800, w: 90, h: 36 },
    'hat:beret': { x: 240, y: 846, w: 64, h: 42 },
    'hat:topper': { x: 434, y: 722, w: 64, h: 42 },
    'hat:sunhat': { x: 456, y: 340, w: 72, h: 46 },
    'hat:crown': { x: 150, y: 222, w: 62, h: 42 },
    letter: { x: 230, y: 772, w: 70, h: 42 },
  },
  bunnyRow: { x: 60, y: 760, gap: 26 },
};

export const SPOTS = Object.keys(WIDE.spots) as Spot[];

export const inside = (r: Rect, x: number, y: number, pad = 0) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
