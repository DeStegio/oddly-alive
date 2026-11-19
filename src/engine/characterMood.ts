import { MOOD_EXPRESSION, type ActorId, type Expression, type Mood } from './types';

/**
 * Each character expresses the shared mood through its own temperament:
 * Pim is shy until trusted, Dot is never shy, Tick would rather be asleep.
 */
export function baseExpression(actor: ActorId, mood: Mood, trust: number): Expression {
  switch (actor) {
    case 'pim':
      if (mood === 'neutral' || mood === 'curious') return trust < 0.32 ? 'shy' : MOOD_EXPRESSION[mood];
      return MOOD_EXPRESSION[mood];
    case 'dot':
      if (mood === 'shy' || mood === 'neutral') return 'happy';
      if (mood === 'annoyed') return 'mischievous';
      if (mood === 'affectionate') return 'happy';
      return MOOD_EXPRESSION[mood];
    case 'tick':
      if (mood === 'excited') return 'surprised';
      if (mood === 'annoyed') return 'annoyed';
      if (mood === 'curious' || mood === 'playful') return 'neutral';
      if (mood === 'confused') return 'confused';
      return 'sleepy';
    case 'lumen':
      return mood === 'shy' ? 'neutral' : MOOD_EXPRESSION[mood];
    case 'nimbus':
      return MOOD_EXPRESSION[mood];
    default:
      return MOOD_EXPRESSION[mood];
  }
}

export interface MoodAtmosphere {
  tint: string;
  soft: number;
  wonk: number;
  weight: number;
}

/** Mood shows in the room's air and the typography, not in a meter. */
export const MOOD_ATMOSPHERE: Record<Mood, MoodAtmosphere> = {
  neutral: { tint: 'transparent', soft: 0, wonk: 0, weight: 760 },
  curious: { tint: 'rgba(101, 123, 232, 0.05)', soft: 30, wonk: 0, weight: 740 },
  playful: { tint: 'rgba(245, 216, 115, 0.09)', soft: 50, wonk: 1, weight: 780 },
  shy: { tint: 'rgba(185, 165, 219, 0.09)', soft: 100, wonk: 0, weight: 620 },
  annoyed: { tint: 'rgba(245, 121, 99, 0.08)', soft: 0, wonk: 0, weight: 900 },
  excited: { tint: 'rgba(245, 216, 115, 0.13)', soft: 20, wonk: 1, weight: 860 },
  sleepy: { tint: 'rgba(36, 35, 43, 0.07)', soft: 100, wonk: 0, weight: 520 },
  mischievous: { tint: 'rgba(166, 215, 179, 0.1)', soft: 0, wonk: 1, weight: 800 },
  confused: { tint: 'rgba(185, 165, 219, 0.07)', soft: 60, wonk: 1, weight: 700 },
  affectionate: { tint: 'rgba(245, 121, 99, 0.06)', soft: 100, wonk: 0, weight: 720 },
};
