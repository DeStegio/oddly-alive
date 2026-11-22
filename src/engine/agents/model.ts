import type { ActorId } from '../types';
import { NEED_KEYS, type AgentDef, type GoalDef, type Memory, type NeedKey, type Needs, type Perception } from './types';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function freshNeeds(def: AgentDef): Needs {
  const n = { attention: 0.2, rest: 0.2, curiosity: 0.2, order: 0.2, play: 0.2 };
  return { ...n, ...def.start };
}

/** Needs grow with time (per minute rates). Pure. */
export function growNeeds(needs: Needs, def: AgentDef, dtMs: number): Needs {
  const out = { ...needs };
  for (const k of NEED_KEYS) out[k] = clamp01(out[k] + ((def.growth[k] ?? 0) * dtMs) / 60_000);
  return out;
}

export function satisfy(needs: Needs, key: NeedKey, delta: number): Needs {
  return { ...needs, [key]: clamp01(needs[key] + delta) };
}

/**
 * How much an agent wants a goal right now. 0 = not at all (infeasible goals
 * should be filtered before this). Strongest need it answers × base appeal ×
 * a novelty factor so the same thing doesn't happen twice in a row.
 */
export function score(goal: GoalDef, p: Perception, recent: readonly string[]): number {
  const needs = p.needs(goal.actor);
  const pull = goal.answers.length ? Math.max(...goal.answers.map((k) => needs[k])) : 0.3;
  const base = goal.utility ? goal.utility(p) : 0.5;
  const idx = recent.lastIndexOf(goal.id);
  const novelty = idx < 0 ? 1 : 0.25 + 0.75 * ((recent.length - 1 - idx) / Math.max(1, recent.length));
  return Math.max(0, pull * base * novelty);
}

/** Exclusive ownership of props (the cushion, the teacup, the glass). */
export class PropLocks {
  private held = new Map<string, string>();

  owner(prop: string): string | null {
    return this.held.get(prop) ?? null;
  }

  /** All-or-nothing. */
  acquire(owner: string, props: readonly string[]): boolean {
    if (props.some((p) => this.held.has(p) && this.held.get(p) !== owner)) return false;
    for (const p of props) this.held.set(p, owner);
    return true;
  }

  release(owner: string, props?: readonly string[]) {
    for (const [p, o] of Array.from(this.held)) if (o === owner && (!props || props.includes(p))) this.held.delete(p);
  }

  clear() {
    this.held.clear();
  }

  size() {
    return this.held.size;
  }
}

/** A few things worth remembering this session. Bounded; never positions or input traces. */
export class AgentMemory {
  private items: Memory[] = [];
  constructor(private readonly max = 24) {}

  add(key: string, at: number, detail?: string) {
    this.items.push({ key, at, detail });
    if (this.items.length > this.max) this.items.shift();
  }

  has(key: string, now: number, withinMs = Infinity): boolean {
    return this.items.some((m) => m.key === key && now - m.at <= withinMs);
  }

  last(key: string): Memory | null {
    for (let i = this.items.length - 1; i >= 0; i--) if (this.items[i]!.key === key) return this.items[i]!;
    return null;
  }

  all(): readonly Memory[] {
    return this.items;
  }

  clear() {
    this.items = [];
  }
}

export const regardOf = (agents: Map<ActorId, AgentDef>, from: ActorId, to: ActorId) => agents.get(from)?.regard?.[to] ?? 0;
