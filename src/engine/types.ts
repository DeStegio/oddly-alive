export const MOODS = [
  'neutral',
  'curious',
  'playful',
  'shy',
  'annoyed',
  'excited',
  'sleepy',
  'mischievous',
  'confused',
  'affectionate',
] as const;
export type Mood = (typeof MOODS)[number];

export const EXPRESSIONS = [
  'neutral',
  'happy',
  'shy',
  'annoyed',
  'sleepy',
  'asleep',
  'surprised',
  'mischievous',
  'confused',
  'affectionate',
  'dizzy',
  'excited',
  'curious',
  'suspicious',
] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** Default face for each mood; reactions can override temporarily. */
export const MOOD_EXPRESSION: Record<Mood, Expression> = {
  neutral: 'neutral',
  curious: 'curious',
  playful: 'happy',
  shy: 'shy',
  annoyed: 'annoyed',
  excited: 'excited',
  sleepy: 'sleepy',
  mischievous: 'mischievous',
  confused: 'confused',
  affectionate: 'affectionate',
};

export const ACTOR_IDS = [
  'pim',
  'dot',
  'lumen',
  'ferdinand',
  'tick',
  'title',
  'button',
  'picture',
  'inch',
  'nimbus',
  'moth',
  'room',
] as const;
export type ActorId = (typeof ACTOR_IDS)[number];

export type ActorAnim =
  | 'jump'
  | 'wiggle'
  | 'shake'
  | 'squish'
  | 'spin'
  | 'dizzy'
  | 'hide'
  | 'peek'
  | 'droop'
  | 'grow'
  | 'dim'
  | 'tilt'
  | 'bounce'
  | 'lookAway'
  | 'catch'
  | 'enter'
  | 'wave';

export const VAR_KEYS = ['curiosity', 'energy', 'trust', 'mischief', 'stimulation', 'fatigue'] as const;
export type VarKey = (typeof VAR_KEYS)[number];

/** Bounded (0..1) long-lived personality variables. */
export type PersonalityVars = Record<VarKey, number>;
