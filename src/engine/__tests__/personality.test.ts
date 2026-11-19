import { makeEvent, type EventPayloads, type EventType } from '../events';
import {
  BASELINE,
  MIN_MOOD_DWELL_MS,
  applyEvent,
  createPersonality,
  decay,
  deriveMood,
  moodScores,
  type PersonalityState,
} from '../personality';

const T0 = 1_000_000;

function ev<T extends EventType>(type: T, payload: EventPayloads[T], t: number) {
  return makeEvent(type, payload, { room: 'living', timestamp: t });
}

/** Advance the personality by ms with 500 ms ticks, deriving mood each tick. */
function run(s: PersonalityState, from: number, ms: number, afterHours = false) {
  let state = s;
  for (let t = 500; t <= ms; t += 500) {
    state = decay(state, 500, from + t);
    state = deriveMood(state, { now: from + t, afterHours });
  }
  return state;
}

describe('personality', () => {
  it('starts at the baseline, neutral', () => {
    const s = createPersonality(T0);
    expect(s.vars).toEqual(BASELINE);
    expect(s.mood).toBe('neutral');
  });

  it('keeps variables bounded in [0, 1]', () => {
    let s = createPersonality(T0);
    for (let i = 0; i < 200; i++) s = applyEvent(s, ev('POINTER_FRENZY', { target: 'pim' }, T0 + i));
    for (let i = 0; i < 200; i++) s = applyEvent(s, ev('USER_IDLE', { ms: 1, level: 'long' }, T0 + i));
    for (const v of Object.values(s.vars)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('repeated clicks on the same object make it annoyed, then it recovers', () => {
    let s = createPersonality(T0);
    s = run(s, T0, MIN_MOOD_DWELL_MS);
    let t = T0 + MIN_MOOD_DWELL_MS;
    for (let i = 0; i < 8; i++) {
      t += 250;
      s = applyEvent(s, ev('OBJECT_CLICKED', { target: 'lumen', repeat: i + 1, via: 'pointer' }, t));
    }
    s = deriveMood(s, { now: t, afterHours: false });
    expect(s.mood).toBe('annoyed');
    // leave it alone for a while: annoyance fades
    s = run(s, t, 20_000);
    expect(s.mood).not.toBe('annoyed');
    expect(s.repetition).toBeLessThan(0.05);
  });

  it('gentle, varied clicks raise curiosity without annoyance', () => {
    let s = createPersonality(T0);
    const targets = ['pim', 'lumen', 'tick', 'ferdinand', 'picture', 'dot'];
    let t = T0;
    for (let i = 0; i < 6; i++) {
      t += 2500;
      s = applyEvent(s, ev('OBJECT_CLICKED', { target: targets[i]!, repeat: 1, via: 'pointer' }, t));
      s = decay(s, 2500, t);
    }
    expect(s.repetition).toBeLessThan(0.1);
    expect(s.vars.curiosity).toBeGreaterThan(BASELINE.curiosity);
    const scores = moodScores(s, { now: t, afterHours: false });
    expect(scores.annoyed).toBeLessThan(scores.curious);
  });

  it('a frenzy produces a temporary excited mood that wears off', () => {
    let s = createPersonality(T0);
    for (let i = 0; i < 4; i++) s = applyEvent(s, ev('POINTER_FRENZY', { target: 'title' }, T0 + i * 100));
    s = deriveMood(s, { now: T0 + 500, afterHours: false });
    expect(s.mood).toBe('excited');
    s = run(s, T0 + 500, 30_000);
    expect(s.mood).not.toBe('excited');
  });

  it('becomes sleepy when ignored', () => {
    let s = createPersonality(T0);
    s = applyEvent(s, ev('USER_IDLE', { ms: 12_000, level: 'short' }, T0 + 12_000));
    s = applyEvent(s, ev('USER_IDLE', { ms: 45_000, level: 'long' }, T0 + 45_000));
    s = run(s, T0, 90_000);
    expect(s.mood).toBe('sleepy');
    // waking up
    s = applyEvent(s, ev('USER_ACTIVE', { idleMs: 90_000 }, T0 + 90_000));
    expect(s.vars.fatigue).toBeLessThan(1);
  });

  it('trust grows with active time (shy opens up), leading to affection', () => {
    let s = createPersonality(T0);
    const shyEarly = moodScores(s, { now: T0, afterHours: false }).shy;
    let t = T0;
    for (let i = 0; i < 400; i++) {
      t += 1000;
      if (i % 5 === 0) s = applyEvent(s, ev('POINTER_MOVED', { speed: 0.2 }, t));
      s = decay(s, 1000, t);
      s = deriveMood(s, { now: t, afterHours: false });
    }
    expect(s.vars.trust).toBeGreaterThan(0.6);
    expect(moodScores(s, { now: t, afterHours: false }).shy).toBeLessThan(shyEarly);
    expect(s.mood).toBe('affectionate');
  });

  it('respects minimum dwell time for non-reactive moods', () => {
    let s = createPersonality(T0);
    s = { ...s, vars: { ...s.vars, mischief: 0.95 } };
    s = deriveMood(s, { now: T0 + 1000, afterHours: false });
    expect(s.mood).toBe('neutral'); // too early to switch
    s = deriveMood(s, { now: T0 + MIN_MOOD_DWELL_MS + 1, afterHours: false });
    expect(s.mood).toBe('mischievous');
  });

  it('after hours nudges toward mischief', () => {
    const s = createPersonality(T0);
    const day = moodScores(s, { now: T0, afterHours: false }).mischievous;
    const night = moodScores(s, { now: T0, afterHours: true }).mischievous;
    expect(night).toBeGreaterThan(day);
  });

  it('mood room objects push in their direction', () => {
    let s = createPersonality(T0);
    s = applyEvent(s, ev('OBJECT_STATE_CHANGED', { target: 'mood:horn', key: 'use', value: true }, T0));
    expect(s.vars.stimulation).toBeGreaterThan(0.25);
    s = applyEvent(s, ev('OBJECT_STATE_CHANGED', { target: 'mood:tea', key: 'use', value: true }, T0));
    expect(s.vars.stimulation).toBeLessThan(0.05);
  });

  it('rapid room hopping is confusing', () => {
    let s = createPersonality(T0);
    s = applyEvent(s, ev('ROOM_ENTERED', { room: 'mood', from: 'living', visits: 1 }, T0));
    s = applyEvent(s, ev('ROOM_ENTERED', { room: 'memory', from: 'mood', visits: 1 }, T0 + 800));
    s = applyEvent(s, ev('ROOM_ENTERED', { room: 'secret', from: 'memory', visits: 1 }, T0 + 1500));
    expect(s.confusion).toBeGreaterThan(0.3);
  });

  it('session reset keeps earned trust; memory reset does not', () => {
    let s = createPersonality(T0);
    s = { ...s, vars: { ...s.vars, trust: 0.8, mischief: 0.9 } };
    const session = applyEvent(s, ev('WORLD_RESET', { scope: 'session' }, T0));
    expect(session.vars.trust).toBe(0.8);
    expect(session.vars.mischief).toBe(BASELINE.mischief);
    const memory = applyEvent(s, ev('WORLD_RESET', { scope: 'memory' }, T0));
    expect(memory.vars.trust).toBe(BASELINE.trust);
  });
});
