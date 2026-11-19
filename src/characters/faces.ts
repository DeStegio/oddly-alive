import type { Expression } from '../engine/types';

/**
 * Face geometry for blob-like characters, authored in a 200×170 box with the
 * mouth centred near (101, 122). Paths are swapped per expression; lids and
 * pupil size transition in CSS.
 */
export interface FaceSpec {
  lid: number;
  pupil: number;
  browL: string;
  browR: string;
  mouth: string;
  mouthFilled?: boolean;
  blush: number;
}

const BROW_L = 'M62 62 Q 78 55 92 60';
const BROW_R = 'M110 58 Q 125 52 140 58';

export const FACES: Record<Expression, FaceSpec> = {
  neutral: {
    lid: 0.08,
    pupil: 1,
    browL: BROW_L,
    browR: BROW_R,
    mouth: 'M90 122 Q 101 128 112 122',
    blush: 0,
  },
  happy: {
    lid: 0.18,
    pupil: 1.05,
    browL: 'M62 58 Q 78 50 92 56',
    browR: 'M110 54 Q 125 47 140 54',
    mouth: 'M86 117 Q 101 140 116 117 Z',
    mouthFilled: true,
    blush: 0.5,
  },
  shy: {
    lid: 0.32,
    pupil: 0.9,
    browL: 'M64 63 Q 78 60 90 55',
    browR: 'M112 55 Q 124 59 138 62',
    mouth: 'M95 124 Q 101 127 107 124',
    blush: 1,
  },
  annoyed: {
    lid: 0.46,
    pupil: 0.85,
    browL: 'M62 57 L 92 67',
    browR: 'M110 67 L 140 56',
    mouth: 'M88 126 L 114 123',
    blush: 0,
  },
  sleepy: {
    lid: 0.62,
    pupil: 0.95,
    browL: 'M62 66 Q 78 62 92 65',
    browR: 'M110 64 Q 125 61 140 65',
    mouth: 'M95 124 Q 101 128 107 124',
    blush: 0,
  },
  asleep: {
    lid: 1,
    pupil: 1,
    browL: 'M62 68 Q 78 64 92 67',
    browR: 'M110 66 Q 125 63 140 67',
    mouth: 'M97 124 a 4 3 0 1 0 8 0 a 4 3 0 1 0 -8 0',
    blush: 0.2,
  },
  surprised: {
    lid: 0,
    pupil: 0.7,
    browL: 'M62 50 Q 78 42 92 48',
    browR: 'M110 46 Q 125 39 140 46',
    mouth: 'M95 124 a 6 8 0 1 0 12 0 a 6 8 0 1 0 -12 0',
    mouthFilled: true,
    blush: 0,
  },
  mischievous: {
    lid: 0.36,
    pupil: 0.95,
    browL: 'M62 64 L 92 63',
    browR: 'M110 56 Q 126 44 140 53',
    mouth: 'M88 124 Q 104 129 116 115',
    blush: 0,
  },
  confused: {
    lid: 0.14,
    pupil: 0.9,
    browL: 'M62 54 Q 78 46 92 54',
    browR: 'M110 62 L 140 62',
    mouth: 'M86 124 q 6 -6 12 0 t 12 0 t 6 -2',
    blush: 0,
  },
  affectionate: {
    lid: 0.38,
    pupil: 1.22,
    browL: 'M62 60 Q 78 53 92 59',
    browR: 'M110 57 Q 125 51 140 57',
    mouth: 'M88 119 Q 101 133 114 119',
    blush: 1,
  },
  dizzy: {
    lid: 0.2,
    pupil: 0.6,
    browL: 'M62 56 Q 78 64 92 56',
    browR: 'M110 56 Q 125 64 140 56',
    mouth: 'M84 124 q 5 -5 10 0 t 10 0 t 10 0',
    blush: 0,
  },
  excited: {
    lid: 0,
    pupil: 1.28,
    browL: 'M62 50 Q 78 42 92 48',
    browR: 'M110 46 Q 125 39 140 46',
    mouth: 'M84 115 Q 101 145 118 115 Z',
    mouthFilled: true,
    blush: 0.7,
  },
  curious: {
    lid: 0,
    pupil: 1.15,
    browL: 'M62 58 Q 78 50 92 56',
    browR: 'M110 50 Q 125 42 140 50',
    mouth: 'M98 124 a 3.5 4 0 1 0 7 0 a 3.5 4 0 1 0 -7 0',
    mouthFilled: true,
    blush: 0,
  },
  suspicious: {
    lid: 0.55,
    pupil: 0.8,
    browL: 'M62 64 L 92 66',
    browR: 'M110 66 L 140 63',
    mouth: 'M90 125 L 112 125',
    blush: 0,
  },
};
