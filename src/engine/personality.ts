import type { WorldEvent } from './events';
import { MOODS, VAR_KEYS, type Mood, type PersonalityVars } from './types';

/**
 * The personality is a set of bounded numbers and explicit rules. It does not
 * feel anything; it gives the house consistent, explainable behavior.
 */
export interface PersonalityState {
  vars: PersonalityVars;
  /** Fast-decaying signal: the same thing is being poked repeatedly. */
  repetition: number;
  /** Fast-decaying signal: contradictory/odd input (circles, rapid room hopping). */
  confusion: number;
  mood: Mood;
  moodSince: number;
  lastInputAt: number;
  lastRoomEnterAt: number;
  recentTargets: ReadonlyArray<{ target: string; at: number }>;
}

export const BASELINE: PersonalityVars = {
  curiosity: 0.45,
  energy: 0.5,
  trust: 0.22,
  mischief: 0.2,
  stimulation: 0,
  fatigue: 0.08,
};

export const MIN_MOOD_DWELL_MS = 4000;
export const MOOD_SWITCH_MARGIN = 0.06;
const REACTIVE_MOODS: ReadonlySet<Mood> = new Set(['annoyed', 'excited', 'confused']);

/** Objects in the Mood Room push the variables in specific directions. */
export const MOOD_OBJECT_EFFECTS: Record<string, Partial<PersonalityVars> & { confusion?: number }> = {
  tea: { stimulation: -0.4, fatigue: 0.12, trust: 0.05, energy: -0.08 },
  horn: { energy: 0.3, stimulation: 0.32, fatigue: -0.2 },
  blanket: { fatigue: 0.42, energy: -0.2, stimulation: -0.2 },
  mirror: { curiosity: 0.18, confusion: 0.45 },
  feather: { mischief: 0.32, energy: 0.12, stimulation: 0.08 },
  letter: { trust: 0.18, stimulation: -0.1 },
};

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export function createPersonality(now: number, restoredTrust?: number): PersonalityState {
  const vars = { ...BASELINE };
  if (restoredTrust !== undefined && Number.isFinite(restoredTrust)) vars.trust = clamp01(Math.max(vars.trust, restoredTrust));
  return {
    vars,
    repetition: 0,
    confusion: 0,
    mood: 'neutral',
    moodSince: now,
    lastInputAt: now,
    lastRoomEnterAt: 0,
    recentTargets: [],
  };
}

type Delta = Partial<PersonalityVars> & { repetition?: number; confusion?: number };

function apply(state: PersonalityState, d: Delta): PersonalityState {
  const vars = { ...state.vars };
  for (const k of VAR_KEYS) {
    const v = d[k];
    if (v !== undefined) vars[k] = clamp01(vars[k] + v);
  }
  return {
    ...state,
    vars,
    repetition: clamp01(state.repetition + (d.repetition ?? 0)),
    confusion: clamp01(state.confusion + (d.confusion ?? 0)),
  };
}

const INPUT_EVENTS: ReadonlySet<WorldEvent['type']> = new Set([
  'POINTER_MOVED',
  'POINTER_ENTERED',
  'POINTER_STARE',
  'POINTER_FRENZY',
  'POINTER_CIRCLED',
  'OBJECT_CLICKED',
  'OBJECT_DRAGGED',
  'SCROLL_CHANGED',
  'KEY_PRESSED',
  'KEY_SEQUENCE_DETECTED',
  'USER_ACTIVE',
]);

/** Pure: returns the next personality state after an event. */
export function applyEvent(state: PersonalityState, ev: WorldEvent): PersonalityState {
  const now = ev.timestamp;
  let s = INPUT_EVENTS.has(ev.type) && ev.depth === 0 ? { ...state, lastInputAt: now } : state;

  switch (ev.type) {
    case 'OBJECT_CLICKED': {
      const target = ev.payload.target;
      const recentTargets = [...s.recentTargets, { target, at: now }].filter((r) => now - r.at < 20_000).slice(-16);
      const sameRecent = recentTargets.filter((r) => r.target === target && now - r.at < 3000).length;
      const distinct = new Set(recentTargets.map((r) => r.target)).size;
      s = { ...s, recentTargets };
      s = apply(s, {
        stimulation: 0.07,
        energy: 0.03,
        fatigue: -0.03,
        trust: sameRecent >= 3 ? -0.01 : 0.008,
        repetition: sameRecent >= 3 ? 0.22 : -0.05,
        curiosity: distinct >= 3 ? 0.05 : 0.01,
        mischief: distinct >= 4 ? 0.02 : 0,
      });
      break;
    }
    case 'POINTER_ENTERED':
      s = apply(s, {
        curiosity: 0.02,
        stimulation: ev.payload.speed > 1.6 ? 0.05 : 0,
        trust: ev.payload.speed < 0.45 ? 0.01 : 0,
      });
      break;
    case 'POINTER_STARE':
      s = apply(s, { stimulation: 0.03, curiosity: 0.02 });
      break;
    case 'POINTER_FRENZY':
      s = apply(s, { stimulation: 0.2, energy: 0.06, confusion: 0.12 });
      break;
    case 'POINTER_CIRCLED':
      s = apply(s, { confusion: 0.3, mischief: 0.06 });
      break;
    case 'OBJECT_DRAGGED':
      if (ev.payload.phase === 'end') {
        s = apply(s, {
          energy: 0.04,
          mischief: 0.03,
          stimulation: ev.payload.speed > 1.5 ? 0.12 : 0.02,
          trust: ev.payload.speed < 0.6 ? 0.01 : 0,
        });
      }
      break;
    case 'OBJECT_COLLIDED':
      s = apply(s, { stimulation: Math.min(0.05, ev.payload.force * 0.008) });
      break;
    case 'OBJECT_STATE_CHANGED': {
      const { target, key, value } = ev.payload;
      if (target === 'lumen' && key === 'on') {
        s = apply(s, value ? { energy: 0.05, fatigue: -0.05 } : { fatigue: 0.14, energy: -0.05 });
      }
      if (target.startsWith('mood:')) {
        const fx = MOOD_OBJECT_EFFECTS[target.slice(5)];
        if (fx) s = apply(s, fx);
      }
      break;
    }
    case 'SCROLL_CHANGED':
      s = apply(s, { curiosity: 0.01, stimulation: Math.abs(ev.payload.velocity) > 3 ? 0.03 : 0 });
      break;
    case 'KEY_PRESSED':
      s = apply(s, { energy: 0.01, stimulation: 0.015 });
      break;
    case 'KEY_SEQUENCE_DETECTED':
      s = apply(s, { mischief: 0.2, curiosity: 0.1 });
      break;
    case 'USER_IDLE':
      s = apply(s, ev.payload.level === 'long' ? { fatigue: 0.25, energy: -0.1 } : { fatigue: 0.1, energy: -0.05 });
      break;
    case 'USER_ACTIVE':
      s = apply(s, { fatigue: -0.12, curiosity: 0.04 });
      break;
    case 'TAB_VISIBILITY_CHANGED':
      if (ev.payload.visible && ev.payload.awayMs > 10_000) s = apply(s, { curiosity: 0.1, fatigue: -0.05 });
      break;
    case 'ROOM_ENTERED': {
      const hopping = s.lastRoomEnterAt > 0 && now - s.lastRoomEnterAt < 1800;
      s = apply({ ...s, lastRoomEnterAt: now }, { curiosity: 0.06, confusion: hopping ? 0.18 : 0 });
      break;
    }
    case 'SECRET_DISCOVERED':
      s = apply(s, { mischief: 0.15, curiosity: 0.12, trust: 0.05, energy: 0.1 });
      break;
    case 'RARE_EVENT':
      s = apply(s, { curiosity: 0.05 });
      break;
    case 'WORLD_RESET':
      if (ev.payload.scope !== 'world') s = { ...createPersonality(now, ev.payload.scope === 'session' ? s.vars.trust : undefined) };
      break;
    default:
      break;
  }
  return s;
}

const halfLife = (value: number, target: number, dtMs: number, hlMs: number) =>
  target + (value - target) * Math.pow(0.5, dtMs / hlMs);

/** Pure: time passes. */
export function decay(state: PersonalityState, dtMs: number, now: number): PersonalityState {
  const idleMs = now - state.lastInputAt;
  const v = state.vars;
  const active = idleMs < 10_000;
  const vars: PersonalityVars = {
    curiosity: halfLife(v.curiosity, 0.45, dtMs, 40_000),
    energy: halfLife(v.energy, idleMs > 20_000 ? 0.3 : 0.5, dtMs, 30_000),
    trust: clamp01(v.trust + (active ? 0.0015 * (dtMs / 1000) * (v.trust < 0.85 ? 1 : 0) : 0)),
    mischief: halfLife(v.mischief, 0.2, dtMs, 45_000),
    stimulation: halfLife(v.stimulation, 0, dtMs, 6000),
    fatigue: idleMs > 8000 ? clamp01(v.fatigue + 0.004 * (dtMs / 1000)) : halfLife(v.fatigue, 0.08, dtMs, 60_000),
  };
  return {
    ...state,
    vars,
    repetition: halfLife(state.repetition, 0, dtMs, 3000),
    confusion: halfLife(state.confusion, 0, dtMs, 4000),
  };
}

export interface MoodContext {
  now: number;
  afterHours: boolean;
}

export function moodScores(state: PersonalityState, ctx: MoodContext): Record<Mood, number> {
  const { curiosity, energy, trust, mischief, stimulation, fatigue } = state.vars;
  const idleMs = ctx.now - state.lastInputAt;
  return {
    neutral: 0.32,
    curious: curiosity * 0.8 - stimulation * 0.2,
    playful: energy * 0.45 + mischief * 0.25 + curiosity * 0.15 + stimulation * 0.15 - 0.05,
    shy: (1 - trust) * 0.5 - stimulation * 0.2 - curiosity * 0.1,
    annoyed: state.repetition * 0.95 + stimulation * 0.25 - trust * 0.15,
    excited: stimulation * 0.8 + energy * 0.3 - fatigue * 0.2 - 0.05,
    sleepy: fatigue * 0.95 - energy * 0.3 - stimulation * 0.3 + (idleMs > 20_000 ? 0.15 : 0),
    mischievous: mischief * 0.85 + (ctx.afterHours ? 0.12 : 0),
    confused: state.confusion,
    affectionate: trust * 0.7 + (1 - stimulation) * 0.1 - state.repetition * 0.4 - 0.1,
  };
}

/** Picks the mood with hysteresis: minimum dwell + switch margin. */
export function deriveMood(state: PersonalityState, ctx: MoodContext): PersonalityState {
  const scores = moodScores(state, ctx);
  let best: Mood = state.mood;
  for (const m of MOODS) if (scores[m] > scores[best]) best = m;
  if (best === state.mood) return state;
  const dwell = ctx.now - state.moodSince;
  const reactive = REACTIVE_MOODS.has(best) && scores[best] > 0.5;
  if (dwell < MIN_MOOD_DWELL_MS && !reactive) return state;
  if (scores[best] < scores[state.mood] + MOOD_SWITCH_MARGIN) return state;
  return { ...state, mood: best, moodSince: ctx.now };
}

/** Mood changes timing: sleepy is slow, excited is quick. */
export function moodTempo(mood: Mood): number {
  switch (mood) {
    case 'sleepy':
      return 1.7;
    case 'shy':
      return 1.3;
    case 'excited':
      return 0.6;
    case 'annoyed':
      return 0.8;
    case 'playful':
      return 0.85;
    default:
      return 1;
  }
}
