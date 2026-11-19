import type { RoomId } from '../app/rooms';
import type { ActorChannel } from './actors';
import type { EventOf, EventPayloads, EventType, WorldEvent } from './events';
import { weightedPick, type Rng } from './rng';
import type { PriorityLevel, ReactionScheduler, ReactionSpec, ScheduleResult } from './scheduler';
import type { Mood, PersonalityVars } from './types';

/** Read-only view of the world that behaviors may consult. */
export interface WorldView {
  room: RoomId;
  mood: Mood;
  vars: PersonalityVars;
  afterHours: boolean;
  reducedMotion: boolean;
  visits: number;
  sessionMs: number;
  /** Session interaction count per object id. */
  count(target: string): number;
  /** Interactions with target in the last windowMs. */
  recent(target: string, windowMs: number): number;
  discovered(secret: string): boolean;
  discoveredCount(): number;
  roomVisits(room: RoomId): number;
  /** Generic object-state lookup (e.g. 'living.lampOn'). */
  flag(key: string): boolean | number | string | undefined;
}

/** Side effects behaviors are allowed to cause besides actor commands. */
export interface WorldEffects {
  setFlag(key: string, value: boolean | number | string): void;
  discover(secret: string): void;
  nudge(delta: Partial<PersonalityVars>): void;
  /** A short announcement for screen readers / the caption strip. */
  announce(text: string): void;
  sound(name: string): void;
}

export interface BehaviorContext<T extends EventType = EventType> {
  event: EventOf<T>;
  now: number;
  rng: Rng;
  view: WorldView;
  actors: ActorChannel;
  effects: WorldEffects;
  /** Emit a follow-up event (chain reactions). Depth is bounded. */
  emit: <K extends EventType>(type: K, payload: EventPayloads[K]) => void;
}

export interface Reaction {
  channel: string;
  durationMs: number;
  ambient?: boolean;
  run: ReactionSpec['run'];
}

export interface Behavior<T extends EventType = EventType> {
  id: string;
  /** Interaction catalog ids this behavior implements (documentation + tests). */
  implements?: readonly string[];
  on: readonly T[];
  rooms?: readonly RoomId[];
  priority: PriorityLevel;
  /** Behaviors sharing a group compete; one is picked by weight per event. */
  group?: string;
  weight?: number | ((ctx: BehaviorContext<T>) => number);
  /** Independent probability gate (0..1) applied before selection. */
  chance?: number | ((ctx: BehaviorContext<T>) => number);
  cooldownMs?: number;
  cooldownKey?: string;
  when?: (ctx: BehaviorContext<T>) => boolean;
  react: (ctx: BehaviorContext<T>) => Reaction | null;
}

/** Erases the event generic so differently-typed behaviors can share a registry. */
export type AnyBehavior = Behavior<EventType>;

export function defineBehavior<T extends EventType>(b: Behavior<T>): AnyBehavior {
  return b as unknown as AnyBehavior;
}

export class BehaviorRegistry {
  private byEvent = new Map<EventType, AnyBehavior[]>();
  private ids = new Set<string>();

  register(...behaviors: AnyBehavior[]) {
    for (const b of behaviors) {
      if (this.ids.has(b.id)) throw new Error(`Duplicate behavior id: ${b.id}`);
      this.ids.add(b.id);
      for (const type of b.on) {
        const list = this.byEvent.get(type) ?? [];
        list.push(b);
        this.byEvent.set(type, list);
      }
    }
  }

  unregister(id: string) {
    if (!this.ids.delete(id)) return;
    for (const [type, list] of this.byEvent) {
      this.byEvent.set(
        type,
        list.filter((b) => b.id !== id),
      );
    }
  }

  forEvent(type: EventType): readonly AnyBehavior[] {
    return this.byEvent.get(type) ?? [];
  }

  all(): AnyBehavior[] {
    const seen = new Map<string, AnyBehavior>();
    for (const list of this.byEvent.values()) for (const b of list) seen.set(b.id, b);
    return Array.from(seen.values());
  }

  get size() {
    return this.ids.size;
  }
}

export interface FiredReaction {
  behavior: string;
  result: ScheduleResult;
}

export interface BehaviorEngineDeps {
  registry: BehaviorRegistry;
  scheduler: ReactionScheduler;
  rng: Rng;
  actors: ActorChannel;
  effects: WorldEffects;
  view: () => WorldView;
  now: () => number;
  emit: (type: EventType, payload: EventPayloads[EventType], parent: WorldEvent) => void;
  /** How many recent picks are down-weighted. */
  recentSize?: number;
  /** Weight multiplier for recently picked behaviors. */
  recentPenalty?: number;
}

/**
 * Event → eligible behaviors → (cooldown, predicate, chance) → per-group
 * weighted pick with recent-repeat suppression → scheduler.
 */
export class BehaviorEngine {
  private recentPicks: string[] = [];
  private readonly recentSize: number;
  private readonly recentPenalty: number;

  constructor(private deps: BehaviorEngineDeps) {
    this.recentSize = deps.recentSize ?? 8;
    this.recentPenalty = deps.recentPenalty ?? 0.2;
  }

  get recent(): readonly string[] {
    return this.recentPicks;
  }

  resetHistory() {
    this.recentPicks = [];
  }

  handle(event: WorldEvent): FiredReaction[] {
    const { registry, scheduler, rng } = this.deps;
    const view = this.deps.view();
    const ctx: BehaviorContext = {
      event,
      now: this.deps.now(),
      rng,
      view,
      actors: this.deps.actors,
      effects: this.deps.effects,
      emit: (type, payload) => this.deps.emit(type, payload as EventPayloads[EventType], event),
    };

    const groups = new Map<string, AnyBehavior[]>();
    for (const b of registry.forEvent(event.type)) {
      if (b.rooms && !b.rooms.includes(view.room)) continue;
      if (b.cooldownMs && scheduler.isCooling(b.cooldownKey ?? b.id)) continue;
      if (b.when && !b.when(ctx)) continue;
      if (b.chance !== undefined) {
        const p = typeof b.chance === 'function' ? b.chance(ctx) : b.chance;
        if (!(rng() < p)) continue;
      }
      const key = b.group ?? b.id;
      const list = groups.get(key) ?? [];
      list.push(b);
      groups.set(key, list);
    }

    const ordered = Array.from(groups.values()).sort(
      (a, b) => Math.max(...b.map((x) => x.priority)) - Math.max(...a.map((x) => x.priority)),
    );

    const fired: FiredReaction[] = [];
    for (const group of ordered) {
      const pick = weightedPick(
        group.map((b) => {
          const base = typeof b.weight === 'function' ? b.weight(ctx) : (b.weight ?? 1);
          const penalty = this.recentPicks.includes(b.id) ? this.recentPenalty : 1;
          return { item: b, weight: base * penalty };
        }),
        rng,
      );
      if (!pick) continue;
      const reaction = pick.react(ctx);
      if (!reaction) continue;
      const spec: ReactionSpec = {
        id: pick.id,
        channel: reaction.channel,
        priority: pick.priority,
        durationMs: reaction.durationMs,
        run: reaction.run,
      };
      if (pick.cooldownKey) spec.cooldownKey = pick.cooldownKey;
      if (pick.cooldownMs) spec.cooldownMs = pick.cooldownMs;
      if (reaction.ambient) spec.ambient = true;
      const result = scheduler.schedule(spec);
      if (result === 'started' || result === 'preempted') {
        this.recentPicks.push(pick.id);
        if (this.recentPicks.length > this.recentSize) this.recentPicks.shift();
      }
      fired.push({ behavior: pick.id, result });
    }
    return fired;
  }
}
