import type { MaterialId } from '../rooms/Playground/volley/model';

/** Back-Fence Volley copy (VOICE.md: short, dry, Bip a bit cocky). */
export const VOLLEY = {
  title: 'Back-Fence Volley',
  courtLabel: 'Back-Fence Volley: you are Dot. Left and right arrows move, Space or Enter swings (and serves). With a mouse, move and click; on a phone, touch where to go and tap to swing.',
  start: 'You’re Dot. Click (or tap, or press Space) to serve.',
  tapToServe: 'click to serve',
  served: 'served.',
  yourServe: 'your serve.',
  bipServes: 'Bip to serve.',
  dotPoint: 'it landed on his side. point to Dot.',
  bipPoint: 'it landed on ours. Bip does a little dance.',
  dotOut: 'out. Bip graciously accepts the point.',
  bipOut: 'Bip hit it out. point to Dot.',
  best: (n: number) => `a rally of ${n}. that’s your best yet.`,
  bestSoFar: (n: number) => `best rally ${n}`,
  rally: (n: number) => (n ? `rally ${n}` : ''),
  swapped: (what: string) => `playing with ${what} now.`,
  materialsLabel: 'What to play with',
  materialName: {
    ball: 'Ball',
    balloon: 'Balloon',
    radish: 'Radish',
    cube: 'Soft cube',
    slipper: 'Slipper',
  } satisfies Record<MaterialId, string>,
};
