import { act, makeState, step, type LevelLayout } from './core';
import { isSpecies } from './species';
import type { Action, GardenState, Species, SunPos } from './types';
import { SUN_POSITIONS } from './types';

/**
 * Moves written as text, so commissions can store their reference solution
 * as data and tests can replay it:
 *   'plant sunflower 3 1' · 'dig 3 1' · 'water 2' · 'pick 3 1' · 'day noon'
 */
export type Move = string;

export type Parsed = { kind: 'act'; action: Action } | { kind: 'day'; sun: SunPos };

export function parseMove(m: Move): Parsed {
  const [verb, a, b, c] = m.trim().split(/\s+/);
  if (verb === 'day' && (SUN_POSITIONS as readonly string[]).includes(a ?? '')) return { kind: 'day', sun: a as SunPos };
  if (verb === 'plant' && isSpecies(a)) return { kind: 'act', action: { type: 'plant', kind: a as Species, x: Number(b), y: Number(c) } };
  if (verb === 'dig') return { kind: 'act', action: { type: 'dig', x: Number(a), y: Number(b) } };
  if (verb === 'pick') return { kind: 'act', action: { type: 'pick', x: Number(a), y: Number(b) } };
  if (verb === 'water') return { kind: 'act', action: { type: 'water', x: Number(a) } };
  throw new Error(`bad move: ${m}`);
}

export interface GoalSpec {
  layout: LevelLayout;
  days: number;
  /** 'any': solved the first day the goal holds. 'end': it must hold after the last day. */
  check: 'any' | 'end';
  goal: (s: GardenState) => boolean;
}

export interface ReplayResult {
  solved: boolean;
  /** The day it was solved on (or the last day played). */
  day: number;
  /** A move the bed refused (a bug in the stored solution). */
  refused: string | null;
  final: GardenState;
}

/** Is it solved right after this day? */
export function judge(spec: GoalSpec, s: GardenState): 'solved' | 'failed' | 'open' {
  if (spec.check === 'any') {
    if (spec.goal(s)) return 'solved';
    return s.day >= spec.days ? 'failed' : 'open';
  }
  if (s.day < spec.days) return 'open';
  return spec.goal(s) ? 'solved' : 'failed';
}

export function replay(spec: GoalSpec, moves: Move[]): ReplayResult {
  let s = makeState(spec.layout);
  for (const m of moves) {
    const p = parseMove(m);
    if (p.kind === 'act') {
      const r = act(s, p.action);
      if (!r.ok) return { solved: false, day: s.day, refused: `${m} (${r.why})`, final: s };
      s = r.state;
      continue;
    }
    if (s.day >= spec.days) return { solved: false, day: s.day, refused: `${m} (past the day limit)`, final: s };
    s = step(s, p.sun);
    const v = judge(spec, s);
    if (v === 'solved') return { solved: true, day: s.day, refused: null, final: s };
    if (v === 'failed') return { solved: false, day: s.day, refused: null, final: s };
  }
  return { solved: false, day: s.day, refused: null, final: s };
}

/** "Doing nothing": let every day pass with the same light, for each light. */
export function idleRuns(spec: GoalSpec): Array<{ sun: SunPos; solved: boolean }> {
  return SUN_POSITIONS.map((sun) => ({ sun, solved: replay(spec, Array.from({ length: spec.days }, () => `day ${sun}`)).solved }));
}

/**
 * A blind player: plants random seeds in random places, waters at random,
 * lets random days pass. The share of blind runs that succeed says how much
 * a commission can be solved without understanding it.
 */
export function randomRuns(spec: GoalSpec, runs: number, seed = 1): number {
  let state = seed >>> 0 || 1;
  const rnd = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let wins = 0;
  for (let r = 0; r < runs; r++) {
    let s = makeState(spec.layout);
    let solved = false;
    while (s.day < spec.days && !solved) {
      // plant some of what's left, somewhere
      const seeds = Object.entries(s.tin).filter(([, n]) => n > 0);
      for (const [kind] of seeds) {
        if (rnd() < 0.6) {
          const x = Math.floor(rnd() * s.w);
          const y = Math.floor(rnd() * s.h);
          const res = act(s, { type: 'plant', kind: kind as Species, x, y });
          if (res.ok) s = res.state;
        }
      }
      if (rnd() < 0.35) {
        const res = act(s, { type: 'water', x: Math.floor(rnd() * s.w) });
        if (res.ok) s = res.state;
      }
      s = step(s, SUN_POSITIONS[Math.floor(rnd() * 4)]!);
      const v = judge(spec, s);
      if (v === 'solved') solved = true;
      if (v === 'failed') break;
    }
    if (solved) wins++;
  }
  return wins / runs;
}
