import type { ActorAnim, ActorId, Expression } from './types';

/**
 * Imperative command channel from the behavior engine to characters/props.
 * Characters subscribe by id; commands never go through the global store, so
 * a reaction re-renders at most the one character it targets.
 */
export type ActorCommand =
  | { type: 'expression'; value: Expression; durationMs?: number }
  | { type: 'anim'; name: ActorAnim; durationMs?: number }
  | { type: 'say'; text: string; durationMs?: number }
  | { type: 'gaze'; target: { x: number; y: number } | null; avert?: boolean; durationMs?: number }
  /** Prop-specific nudge with a small string argument (e.g. which title letter). */
  | { type: 'poke'; key: string }
  | { type: 'reset' };

type Handler = (cmd: ActorCommand) => void;

export class ActorChannel {
  private handlers = new Map<ActorId, Set<Handler>>();
  private observers = new Set<(id: ActorId, cmd: ActorCommand) => void>();

  /** Observe every command (used by the audio layer for character voices). */
  observe(cb: (id: ActorId, cmd: ActorCommand) => void): () => void {
    this.observers.add(cb);
    return () => {
      this.observers.delete(cb);
    };
  }
  /** Commands sent in this session, for tests and debugging. Bounded. */
  readonly history: Array<{ id: ActorId; cmd: ActorCommand }> = [];

  subscribe(id: ActorId, handler: Handler): () => void {
    let set = this.handlers.get(id);
    if (!set) {
      set = new Set();
      this.handlers.set(id, set);
    }
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  send(id: ActorId, cmd: ActorCommand): boolean {
    this.history.push({ id, cmd });
    if (this.history.length > 50) this.history.shift();
    const set = this.handlers.get(id);
    if (!set || set.size === 0) return false;
    for (const o of this.observers) o(id, cmd);
    for (const h of set) h(cmd);
    return true;
  }

  isPresent(id: ActorId): boolean {
    return (this.handlers.get(id)?.size ?? 0) > 0;
  }

  presentActors(): ActorId[] {
    return Array.from(this.handlers.entries())
      .filter(([, s]) => s.size > 0)
      .map(([id]) => id);
  }
}

export const actors = new ActorChannel();
