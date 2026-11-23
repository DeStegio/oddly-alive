/**
 * The garden as a puzzle box (Phase 4). Pure data: no React, no DOM, no clock.
 * One tick is one day. Everything is deterministic: same state + same input,
 * same next state.
 */

export const BASE_SPECIES = ['sunflower', 'moonflower', 'mint', 'snapdragon', 'radish', 'creeper'] as const;
export type BaseSpecies = (typeof BASE_SPECIES)[number];
/** A cross made by the bees: `hybrid:a:b`, parents in alphabetical order (the vase keepsake format). */
export type HybridId = `hybrid:${string}:${string}`;
export type Species = BaseSpecies | HybridId;

/** Where the sun was let go for a day. Night = behind the fence. */
export const SUN_POSITIONS = ['morning', 'noon', 'evening', 'night'] as const;
export type SunPos = (typeof SUN_POSITIONS)[number];

export type Terrain = 'soil' | 'rock' | 'shed';
export type Facing = 'east' | 'south' | 'west';
export type Stage = 0 | 1 | 2 | 3;

export interface Plant {
  kind: Species;
  /** 0 seed, 1 sprout, 2 grown (tall plants cast shade from here), 3 bloom / ripe. */
  stage: Stage;
  facing: Facing | null;
  /** Lit days in a row (moonflowers wilt at 2). */
  litStreak: number;
  /** Order of planting; creepers grow from their newest cell. */
  id: number;
  /** Which planting a creeper cell belongs to (its first cell's id). */
  root: number;
}

export interface Cell {
  terrain: Terrain;
  /** Soil moisture 0..3. */
  water: number;
  plant: Plant | null;
  /** A cell the asker pointed at (some commissions are about a particular spot). */
  mark: boolean;
}

export type RuleId =
  | 'grow'
  | 'sun-face'
  | 'tall-shade'
  | 'dry-sun'
  | 'damp-shade'
  | 'thirsty'
  | 'moon-shade'
  | 'moon-night'
  | 'moon-wilt'
  | 'mint-spread'
  | 'mint-smother'
  | 'mint-dry'
  | 'snap-eat'
  | 'snap-bite'
  | 'radish-company'
  | 'radish-lonely'
  | 'creeper-climb'
  | 'creeper-water'
  | 'bee-cross'
  | 'crumb'
  | 'barrel'
  | 'rock-stop';

/** Something that happened during a day, for the animation and the Herbarium. */
export interface SimEvent {
  rule: RuleId;
  x: number;
  y: number;
  kind?: Species;
  /** Extra: for a cross, the hybrid made; for a spread, where from. */
  detail?: string;
}

export interface GardenState {
  w: number;
  h: number;
  cells: Cell[];
  /** Days that have passed. */
  day: number;
  /** The light of the last day (null before the first). */
  sun: SunPos | null;
  /** The last day was a night. */
  night: boolean;
  /** Which cells were in shade on the last day (empty before the first). */
  shade: boolean[];
  /** Seeds left in the tin. */
  tin: Record<string, number>;
  /** Barrel tips left (bonus rain from the Weather Workshop adds to it). */
  barrel: number;
  /** Already tipped the barrel today. */
  wateredToday: boolean;
  /** What has been picked so far, by kind. */
  picked: Record<string, number>;
  nextId: number;
  /** Crumb the sparrow raids lone seeds on day 1. */
  crumb: boolean;
  /** What happened on the last day. */
  events: SimEvent[];
  /** Planted today (can be dug up again for free). */
  fresh: number[];
}

export type Action =
  | { type: 'plant'; x: number; y: number; kind: Species }
  | { type: 'dig'; x: number; y: number }
  | { type: 'water'; x: number }
  | { type: 'pick'; x: number; y: number };
