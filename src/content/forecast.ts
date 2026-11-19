import { MOODS, type Mood, type PersonalityVars } from '../engine/types';

const WORDS: Record<Mood, string> = {
  neutral: 'mostly unremarkable',
  curious: 'curious',
  playful: 'playful',
  shy: 'a little shy',
  annoyed: 'grumpy',
  excited: 'very excited',
  sleepy: 'drowsy',
  mischievous: 'mischievous',
  confused: 'confused',
  affectionate: 'warm and fond',
};

const CHANCE: Record<Mood, string> = {
  neutral: 'nothing in particular',
  curious: 'questions',
  playful: 'games',
  shy: 'blushing',
  annoyed: 'grumbling',
  excited: 'confetti',
  sleepy: 'naps',
  mischievous: 'mischief',
  confused: 'upside-down rainbows',
  affectionate: 'hugs',
};

/** Rough secondary-mood ranking from the long-lived variables only. */
function secondary(mood: Mood, v: PersonalityVars): Mood {
  const s: Record<Mood, number> = {
    neutral: 0.3,
    curious: v.curiosity * 0.8,
    playful: v.energy * 0.45 + v.mischief * 0.25 + v.curiosity * 0.15,
    shy: (1 - v.trust) * 0.5,
    annoyed: v.stimulation * 0.3 - v.trust * 0.15,
    excited: v.stimulation * 0.8 + v.energy * 0.3 - 0.05,
    sleepy: v.fatigue * 0.95 - v.energy * 0.3,
    mischievous: v.mischief * 0.85,
    confused: 0,
    affectionate: v.trust * 0.7 - 0.05,
  };
  let best: Mood = 'neutral';
  for (const m of MOODS) if (m !== mood && s[m] > s[best]) best = m;
  return best === mood ? 'neutral' : best;
}

/** A weather-report sentence describing the house's mood. Words, not numbers. */
export function forecast(mood: Mood, vars: PersonalityVars): string {
  const next = secondary(mood, vars);
  return `Forecast: ${WORDS[mood]}, with a chance of ${CHANCE[next]}.`;
}
