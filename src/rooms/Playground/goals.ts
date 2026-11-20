/** Little goals for the Playground. Add a goal here and detect it in Playground.tsx. */
export const GOALS = [
  { id: 'tower', label: 'Stack five things into a tower' },
  { id: 'dominoes', label: 'Knock over every domino' },
  { id: 'throw', label: 'Throw something really hard' },
  { id: 'balloon', label: 'Drag a balloon all the way down to the floor' },
  { id: 'bin', label: 'Toss something into the lost & found' },
  { id: 'catch', label: 'Get Bip to volley something back' },
  { id: 'rally5', label: 'Keep a rally of 5 going with Bip' },
  { id: 'shake', label: 'Shake the room three times' },
  { id: 'full', label: 'Fill the floor to the brim' },
] as const;
export type GoalId = (typeof GOALS)[number]['id'];

export interface PileStats {
  count: number;
  tallest: number;
  /** Fastest throw this visit, in logical px per ms. */
  bestThrow: number;
  /** Longest volleyball rally with Bip this visit. */
  bestRally: number;
}

/** Goals are stored as a comma-separated string in the objects store. */
export function goalsDone(raw: string): Set<string> {
  return new Set(raw.split(',').filter(Boolean));
}
