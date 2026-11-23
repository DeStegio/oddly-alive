import type { Rect } from './dust';

/**
 * Where everything is in the attic (world units: 1000 × 560, floor at 430).
 * The attic opens in three parts, one per act: the near end, the middle
 * under the skylight, and the far end behind the trunk.
 */
export const WORLD = { w: 1000, h: 560, floor: 430, cell: 10 } as const;
export const ACT_X: Record<1 | 2 | 3, [number, number]> = { 1: [0, 450], 2: [450, 735], 3: [735, 1000] };

export const SPOTS: Record<string, Rect> = {
  // act 1: the near end
  'shop-sign': { x: 30, y: 70, w: 170, h: 50 },
  'photo-shop': { x: 238, y: 470, w: 78, h: 58 },
  'hat-block': { x: 60, y: 190, w: 70, h: 70 },
  'feather-tin': { x: 140, y: 360, w: 80, h: 58 },
  'feather-receipt': { x: 150, y: 430, w: 58, h: 36 },
  'pin-cushion': { x: 270, y: 370, w: 48, h: 40 },
  'diary-1928': { x: 40, y: 476, w: 70, h: 48 },
  'radio-card': { x: 220, y: 40, w: 92, h: 40 },
  'radio-valve': { x: 40, y: 290, w: 56, h: 64 },
  'valve-box': { x: 104, y: 300, w: 70, h: 40 },
  'photo-bench': { x: 230, y: 130, w: 86, h: 78 },
  headphones: { x: 150, y: 190, w: 70, h: 60 },
  'diary-1953': { x: 130, y: 490, w: 70, h: 46 },
  'record-waltz': { x: 360, y: 470, w: 60, h: 60 },
  diary: { x: 26, y: 380, w: 62, h: 40 },
  letter: { x: 424, y: 520, w: 46, h: 30 },
  // act 2: the middle, under the skylight
  'soldering-iron': { x: 462, y: 380, w: 92, h: 40 },
  'iron-tag': { x: 560, y: 388, w: 50, h: 30 },
  'diary-1948': { x: 470, y: 486, w: 70, h: 46 },
  'wall-name': { x: 580, y: 100, w: 110, h: 90 },
  drawing: { x: 650, y: 214, w: 70, h: 66 },
  'diary-1949': { x: 560, y: 498, w: 70, h: 46 },
  whistle: { x: 640, y: 430, w: 64, h: 30 },
  'bee-letter': { x: 652, y: 300, w: 70, h: 50 },
  'photo-bees': { x: 470, y: 210, w: 82, h: 72 },
  smoker: { x: 562, y: 296, w: 60, h: 62 },
  'honey-jar': { x: 470, y: 300, w: 46, h: 56 },
  'honey-label': { x: 520, y: 330, w: 40, h: 28 },
  'record-foxtrot': { x: 650, y: 486, w: 60, h: 60 },
  'pressed-flower': { x: 600, y: 440, w: 36, h: 36 },
  // act 3: the far end
  'skipping-rope': { x: 752, y: 476, w: 92, h: 40 },
  'diary-1957': { x: 870, y: 498, w: 70, h: 46 },
  veil: { x: 752, y: 200, w: 82, h: 62 },
  rota: { x: 880, y: 60, w: 84, h: 62 },
  'diary-moon': { x: 760, y: 300, w: 70, h: 46 },
  'fob-watch': { x: 846, y: 310, w: 40, h: 44 },
  'diary-1974': { x: 900, y: 386, w: 70, h: 46 },
  'sleep-mask': { x: 760, y: 410, w: 66, h: 30 },
  'diary-dawn': { x: 800, y: 130, w: 70, h: 46 },
  trunk: { x: 850, y: 190, w: 130, h: 92 },
};

/** Marguerite, the gramophone and the shadow sheet (not dusty evidence). */
export const FIXTURES = {
  marguerite: { x: 330, y: 150, w: 110, h: 280 },
  gramophone: { x: 236, y: 250, w: 80, h: 90 },
  sheet: { x: 330, y: 30, w: 100, h: 74 },
} as const;
