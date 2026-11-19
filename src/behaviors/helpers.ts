import type { Reaction, WorldView } from '../engine/behaviorEngine';
import type { ActorChannel, ActorCommand } from '../engine/actors';
import { moodTempo } from '../engine/personality';
import { pickOne, type Rng } from '../engine/rng';
import type { ReactionControl } from '../engine/scheduler';
import type { ActorAnim, ActorId, Expression } from '../engine/types';

/** The parts of a behavior context helpers need (structural, any event type). */
export interface Ctx {
  actors: ActorChannel;
  rng: Rng;
  view: WorldView;
  event: { payload: unknown };
}

/** Mood-scaled duration (sleepy is slow, excited is quick). */
export const tempo = (ctx: Ctx, ms: number) => Math.round(ms * moodTempo(ctx.view.mood));

export const send = (ctx: Ctx, id: ActorId, cmd: ActorCommand) => ctx.actors.send(id, cmd);

export const face = (ctx: Ctx, id: ActorId, value: Expression, durationMs: number) =>
  send(ctx, id, { type: 'expression', value, durationMs });

export const anim = (ctx: Ctx, id: ActorId, name: ActorAnim, durationMs?: number) =>
  send(ctx, id, durationMs === undefined ? { type: 'anim', name } : { type: 'anim', name, durationMs });

/** Recently spoken lines per actor; a line isn't repeated while fresher ones exist. */
const spoken = new Map<string, string[]>();
const MEMORY_PER_ACTOR = 4;

export function pickLine(id: string, lines: readonly string[], rng: Rng): string {
  const recent = spoken.get(id) ?? [];
  const fresh = lines.filter((l) => !recent.includes(l));
  const line = pickOne(fresh.length ? fresh : lines, rng);
  spoken.set(id, [...recent, line].slice(-MEMORY_PER_ACTOR));
  return line;
}

export const say = (ctx: Ctx, id: ActorId, lines: readonly string[], durationMs = 2600) =>
  send(ctx, id, { type: 'say', text: pickLine(id, lines, ctx.rng), durationMs: tempo(ctx, durationMs) });

/** Build a reaction; the actor is reset on cancel so nothing is left half-done. */
export function act(
  channel: ActorId | string,
  durationMs: number,
  run: (ctl: ReactionControl) => void | (() => void),
  opts: { ambient?: boolean } = {},
): Reaction {
  return { channel, durationMs, run, ...(opts.ambient ? { ambient: true } : {}) };
}

/** Target of a click/hover event, or null. */
export function targetOf(ctx: Ctx): string | null {
  const p = ctx.event.payload as { target?: unknown };
  return typeof p.target === 'string' ? p.target : null;
}

export const isTarget = (ctx: Ctx, ...ids: string[]) => {
  const t = targetOf(ctx);
  return t !== null && ids.includes(t);
};
