import type { EventOf, EventType, WorldEvent } from './events';

type Handler<T extends EventType> = (event: EventOf<T>) => void;
type AnyHandler = (event: WorldEvent) => void;

/**
 * Typed synchronous event bus. Handler errors are isolated so one broken
 * behavior can't stop the world. Every subscription returns its unsubscribe.
 */
export class EventBus {
  private byType = new Map<EventType, Set<(e: WorldEvent) => void>>();
  private any = new Set<AnyHandler>();
  private onError: (err: unknown, event: WorldEvent) => void;

  constructor(onError?: (err: unknown, event: WorldEvent) => void) {
    this.onError =
      onError ??
      ((err) => {
        if (import.meta.env.DEV) console.error('[bus] handler failed', err);
      });
  }

  on<T extends EventType>(type: T, handler: Handler<T>): () => void {
    let set = this.byType.get(type);
    if (!set) {
      set = new Set();
      this.byType.set(type, set);
    }
    const wrapped = handler as (e: WorldEvent) => void;
    set.add(wrapped);
    return () => {
      set.delete(wrapped);
    };
  }

  onAny(handler: AnyHandler): () => void {
    this.any.add(handler);
    return () => {
      this.any.delete(handler);
    };
  }

  emit(event: WorldEvent): void {
    const set = this.byType.get(event.type);
    if (set) {
      for (const h of Array.from(set)) {
        try {
          h(event);
        } catch (err) {
          this.onError(err, event);
        }
      }
    }
    for (const h of Array.from(this.any)) {
      try {
        h(event);
      } catch (err) {
        this.onError(err, event);
      }
    }
  }

  listenerCount(): number {
    let n = this.any.size;
    for (const s of this.byType.values()) n += s.size;
    return n;
  }

  clear(): void {
    this.byType.clear();
    this.any.clear();
  }
}
