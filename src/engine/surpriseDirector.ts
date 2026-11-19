import type { RoomId } from '../app/rooms';
import { weightedPick, type Rng } from './rng';
import type { World, WorldPlugin } from './world';

export interface RareEventDef {
  id: string;
  rooms: readonly RoomId[] | 'any';
  weight: number;
  /** Maximum times per session (undefined = unlimited). */
  perSession?: number;
}

export const RARE_EVENTS: RareEventDef[] = [
  { id: 'inch-crawl', rooms: ['living', 'playground', 'mood', 'memory'], weight: 3 },
  { id: 'fake-error', rooms: 'any', weight: 1, perSession: 1 },
  { id: 'everyone-looks', rooms: ['living'], weight: 2 },
  { id: 'picture-swing', rooms: ['living'], weight: 2 },
  { id: 'gravity-hiccup', rooms: ['playground'], weight: 3 },
  { id: 'nimbus-sneeze', rooms: ['mood'], weight: 3 },
  { id: 'shooting-star', rooms: ['after-hours'], weight: 4 },
  { id: 'candle-flicker', rooms: ['secret'], weight: 2 },
];

export interface DirectorOptions {
  /** Minimum time between rare events. */
  minIntervalMs?: number;
  /** Only while the visitor is active (input within this window). */
  activeWindowMs?: number;
  /** Probability per tick once eligible. */
  chancePerTick?: number;
  /** Grace period after arriving before the first surprise. */
  warmupMs?: number;
  events?: RareEventDef[];
}

/**
 * Decides when something rare happens. Rules: never while the visitor is
 * idle, never twice within the minimum interval, per-session limits, room
 * filtering, and novelty — events not yet seen this session are 3× likelier.
 * It only emits RARE_EVENT; behaviors decide what it looks like.
 */
export class SurpriseDirector implements WorldPlugin {
  private lastAt: number;
  private seen = new Map<string, number>();
  private readonly o: Required<Omit<DirectorOptions, 'events'>> & { events: RareEventDef[] };

  constructor(
    private rng: Rng,
    now: number,
    opts: DirectorOptions = {},
  ) {
    this.o = {
      minIntervalMs: opts.minIntervalMs ?? 50_000,
      activeWindowMs: opts.activeWindowMs ?? 8000,
      chancePerTick: opts.chancePerTick ?? 0.015,
      warmupMs: opts.warmupMs ?? 25_000,
      events: opts.events ?? RARE_EVENTS,
    };
    // the warm-up acts as an initial interval
    this.lastAt = now - this.o.minIntervalMs + this.o.warmupMs;
  }

  eligible(room: RoomId): RareEventDef[] {
    return this.o.events.filter((e) => {
      if (e.rooms !== 'any' && !e.rooms.includes(room)) return false;
      if (e.perSession !== undefined && (this.seen.get(e.id) ?? 0) >= e.perSession) return false;
      return true;
    });
  }

  /** Returns the event id fired, or null. */
  maybeFire(now: number, room: RoomId, idleMs: number, emit: (id: string) => void): string | null {
    if (idleMs > this.o.activeWindowMs) return null;
    if (now - this.lastAt < this.o.minIntervalMs) return null;
    if (!(this.rng() < this.o.chancePerTick)) return null;
    const pick = weightedPick(
      this.eligible(room).map((e) => ({ item: e, weight: e.weight * (this.seen.has(e.id) ? 1 : 3) })),
      this.rng,
    );
    if (!pick) return null;
    this.lastAt = now;
    this.seen.set(pick.id, (this.seen.get(pick.id) ?? 0) + 1);
    emit(pick.id);
    return pick.id;
  }

  onTick = (now: number, world: World) => {
    this.maybeFire(now, world.view().room, world.idleFor(now), (id) => world.emit('RARE_EVENT', { event: id }));
  };

  /** Force an event (used by tests and the debug hook). */
  force(id: string, now: number, world: World) {
    this.lastAt = now;
    this.seen.set(id, (this.seen.get(id) ?? 0) + 1);
    world.emit('RARE_EVENT', { event: id });
  }

  timesSeen(id: string) {
    return this.seen.get(id) ?? 0;
  }
}
