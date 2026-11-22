/**
 * The button that fights back: a small, typed state machine with bounded
 * feelings that fade over time. No click counting: how fast you press, how
 * long you wait and what you did last time decide what it does.
 *
 *   calm ──impatience──▶ wary ──more──▶ bracing ──▶ shielded
 *    ▲                                              │  │  │  │
 *    │       lowering ◀── waited it out ────────────┘  │  │  │
 *    │       open ◀────── lifted gently / Dot pried ───┘  │  │
 *    │       hiding ◀──── bolts loosened, glass fell ─────┘  │
 *    │        └─▶ repairing ──▶ shielded                      │
 *    └──────────────── (open/lowering settle back to calm) ◀──┘
 */
export type ButtonMode = 'calm' | 'wary' | 'bracing' | 'shielded' | 'open' | 'lowering' | 'hiding' | 'repairing';

export interface ButtonState {
  mode: ButtonMode;
  /** 0..1, how cross it is. Fades. */
  irritation: number;
  /** 0..1, how much it trusts you. Slow both ways. */
  trust: number;
  /** 0..1, how hard you've been going at it just now. Fades fast. */
  intensity: number;
  /** 0..1, after a dirty trick. Makes it quicker to defend. Fades slowly. */
  suspicion: number;
  /** When the current mode started. */
  since: number;
  /** Last time anything happened (for decay). */
  at: number;
  /** Last press (for gentle vs impatient). */
  lastPress: number;
  /** How far the glass is lifted (0 shut … 1 off). */
  lift: number;
  /** Turns left on each bolt before it comes loose. */
  bolts: [number, number];
  /** Successful presses (feeds the old 'button' discovery chain). */
  presses: number;
  /** Who last got the glass off, for the story. */
  helper: '' | 'dot' | 'visitor';
}

/** What happened, for the room to act out. */
export type ButtonOutcome =
  | 'pressed'
  | 'dodged'
  | 'blocked'
  | 'bracing'
  | 'shielded'
  | 'lifting'
  | 'snapped'
  | 'opened'
  | 'loosened'
  | 'fell'
  | 'caught'
  | 'repaired'
  | 'lowered'
  | 'calmed'
  | 'pried'
  | 'none';

export type ButtonInput =
  | { type: 'press'; now: number; rng: number }
  | { type: 'lift'; now: number; amount: number }
  | { type: 'letGo'; now: number }
  | { type: 'turnBolt'; now: number; bolt: 0 | 1 }
  | { type: 'pry'; now: number }
  | { type: 'putBack'; now: number }
  | { type: 'tick'; now: number; idleMs: number };

export const TURNS = 3;
const BRACE_MS = 1300;
const LOWER_MS = 1100;
const HIDE_MS = 3200;
const REPAIR_MS = 1900;
const OPEN_MS = 7000;

const clamp = (v: number) => Math.max(0, Math.min(1, v));

export function initialButton(now: number, trust = 0.35): ButtonState {
  return { mode: 'calm', irritation: 0, trust, intensity: 0, suspicion: 0, since: now, at: now, lastPress: 0, lift: 0, bolts: [TURNS, TURNS], presses: 0, helper: '' };
}

/** Feelings fade with time. Calm faster when the glass is up (it feels safe). */
export function decay(s: ButtonState, now: number): ButtonState {
  const dt = Math.max(0, now - s.at);
  if (!dt) return s;
  const safe = s.mode === 'shielded' || s.mode === 'repairing';
  return {
    ...s,
    at: now,
    intensity: s.intensity * Math.exp(-dt / 2500),
    irritation: s.irritation * Math.exp(-dt / (safe ? 14_000 : 10_000)),
    suspicion: s.suspicion * Math.exp(-dt / 60_000),
  };
}

/** How cross it has to be before the brackets come out (trust raises it, suspicion lowers it). */
export const braceAt = (s: ButtonState) => 0.55 + 0.3 * s.trust - 0.25 * s.suspicion;
export const waryAt = (s: ButtonState) => 0.3 + 0.1 * s.trust - 0.15 * s.suspicion;
/** The glass comes up gently only if it's calmed down enough (or trusts you). */
export const liftOkAt = (s: ButtonState) => 0.45 + 0.2 * s.trust - 0.2 * s.suspicion;

const to = (s: ButtonState, mode: ButtonMode, now: number): ButtonState => ({ ...s, mode, since: now });

export function step(prev: ButtonState, input: ButtonInput): { state: ButtonState; outcome: ButtonOutcome } {
  let s = decay(prev, input.now);
  const now = input.now;
  switch (input.type) {
    case 'press': {
      if (s.mode === 'shielded' || s.mode === 'bracing' || s.mode === 'repairing' || s.mode === 'lowering') {
        // knuckles on glass
        s = { ...s, irritation: clamp(s.irritation + 0.05), trust: clamp(s.trust - 0.02), intensity: clamp(s.intensity + 0.2) };
        return { state: s, outcome: 'blocked' };
      }
      if (s.mode === 'hiding') {
        // pressed while it scrambles: it works, and it's not pleased
        s = to({ ...s, presses: s.presses + 1, suspicion: 1, trust: clamp(s.trust - 0.15), irritation: 0.2, lift: 0, bolts: [TURNS, TURNS] }, 'calm', now);
        return { state: s, outcome: 'caught' };
      }
      const gentle = now - s.lastPress > 3000;
      const intensity = clamp(s.intensity + 0.3);
      s = { ...s, intensity, lastPress: now, irritation: clamp(s.irritation + 0.1 + 0.25 * intensity), trust: clamp(s.trust + (gentle ? 0.05 : -0.02)) };
      // a wary button sometimes ducks
      if (s.mode === 'wary' && input.rng < 0.3 + 0.3 * s.suspicion) return { state: s, outcome: 'dodged' };
      s = { ...s, presses: s.presses + 1 };
      if (s.irritation >= braceAt(s)) return { state: to(s, 'bracing', now), outcome: 'bracing' };
      if (s.mode === 'calm' && s.irritation >= waryAt(s)) s = to(s, 'wary', now);
      if (s.mode === 'open') s = to(s, 'calm', now);
      return { state: s, outcome: 'pressed' };
    }
    case 'lift': {
      if (s.mode !== 'shielded') return { state: s, outcome: 'none' };
      return { state: { ...s, lift: clamp(input.amount) }, outcome: 'lifting' };
    }
    case 'letGo': {
      if (s.mode !== 'shielded') return { state: s, outcome: 'none' };
      if (s.lift < 0.6) return { state: { ...s, lift: 0 }, outcome: 'none' };
      if (s.irritation <= liftOkAt(s)) {
        // you asked nicely: it lets you
        s = to({ ...s, lift: 1, helper: 'visitor', trust: clamp(s.trust + 0.12) }, 'open', now);
        return { state: s, outcome: 'opened' };
      }
      // too soon: it slaps the glass back down
      s = { ...s, lift: 0, irritation: clamp(s.irritation + 0.06) };
      return { state: s, outcome: 'snapped' };
    }
    case 'turnBolt': {
      if (s.mode !== 'shielded') return { state: s, outcome: 'none' };
      const bolts: [number, number] = [...s.bolts];
      bolts[input.bolt] = Math.max(0, bolts[input.bolt] - 1);
      s = { ...s, bolts };
      if (bolts[0] === 0 && bolts[1] === 0) {
        // the glass falls off; it panics and hides
        s = to({ ...s, lift: 1, suspicion: clamp(s.suspicion + 0.6), irritation: clamp(s.irritation + 0.1) }, 'hiding', now);
        return { state: s, outcome: 'fell' };
      }
      return { state: s, outcome: 'loosened' };
    }
    case 'pry': {
      if (s.mode !== 'shielded') return { state: s, outcome: 'none' };
      return { state: to({ ...s, lift: 1, helper: 'dot', suspicion: clamp(s.suspicion + 0.2) }, 'open', now), outcome: 'pried' };
    }
    case 'putBack': {
      if (s.mode !== 'open' || s.helper !== 'dot') return { state: s, outcome: 'none' };
      return { state: to({ ...s, lift: 0, bolts: [TURNS, TURNS] }, 'shielded', now), outcome: 'repaired' };
    }
    case 'tick': {
      const age = now - s.since;
      switch (s.mode) {
        case 'bracing':
          return age >= BRACE_MS ? { state: to({ ...s, lift: 0, bolts: [TURNS, TURNS] }, 'shielded', now), outcome: 'shielded' } : { state: s, outcome: 'none' };
        case 'shielded':
          if (input.idleMs > 6000 && s.irritation < 0.2 && s.lift === 0) return { state: to(s, 'lowering', now), outcome: 'lowered' };
          return { state: s, outcome: 'none' };
        case 'lowering':
          return age >= LOWER_MS ? { state: to({ ...s, lift: 0, trust: clamp(s.trust + 0.04) }, 'calm', now), outcome: 'calmed' } : { state: s, outcome: 'none' };
        case 'hiding':
          return age >= HIDE_MS ? { state: to(s, 'repairing', now), outcome: 'none' } : { state: s, outcome: 'none' };
        case 'repairing':
          return age >= REPAIR_MS ? { state: to({ ...s, lift: 0, bolts: [TURNS, TURNS] }, 'shielded', now), outcome: 'repaired' } : { state: s, outcome: 'none' };
        case 'open':
          // left open for a while and nobody pressed: it settles (or, if Dot did it, puts the glass back)
          if (age >= OPEN_MS) return s.helper === 'dot' ? { state: to(s, 'repairing', now), outcome: 'none' } : { state: to({ ...s, lift: 0 }, 'calm', now), outcome: 'calmed' };
          return { state: s, outcome: 'none' };
        case 'wary':
          return s.irritation < waryAt(s) * 0.6 ? { state: to(s, 'calm', now), outcome: 'calmed' } : { state: s, outcome: 'none' };
        default:
          return { state: s, outcome: 'none' };
      }
    }
  }
}

/** Is the glass physically over the button (so presses must not get through)? */
export const glassClosed = (s: ButtonState) => s.mode === 'shielded' || s.mode === 'bracing' || s.mode === 'repairing' || s.mode === 'lowering';
/** Are the brackets out? */
export const bracketsOut = (s: ButtonState) => s.mode !== 'calm' && s.mode !== 'wary';
