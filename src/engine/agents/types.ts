import type { RoomId } from '../../app/rooms';
import type { ActorChannel } from '../actors';
import type { WorldEffects } from '../behaviorEngine';
import type { EventPayloads, EventType } from '../events';
import type { Rng } from '../rng';
import type { ActorId } from '../types';
import type { Weather } from '../weather';

/**
 * Agents: characters with a few bounded needs that pick short goals and act
 * on them without being clicked. Built on the existing scheduler (channels,
 * priorities, cleanup) and actor channel (expressions, anims, lines).
 */
export const NEED_KEYS = ['attention', 'rest', 'curiosity', 'order', 'play'] as const;
export type NeedKey = (typeof NEED_KEYS)[number];
/** 0 = fully satisfied … 1 = can't stand it any longer. */
export type Needs = Record<NeedKey, number>;

export interface AgentDef {
  id: ActorId;
  /** Where each need starts. */
  start?: Partial<Needs>;
  /** How fast each need grows, per minute. */
  growth: Partial<Record<NeedKey, number>>;
  /** How this character feels about others (-1 dislike … 1 fond). */
  regard?: Partial<Record<ActorId, number>>;
}

/** What an agent can know when it decides. Discrete facts only, never per-frame positions. */
export interface Perception {
  now: number;
  room: RoomId;
  weather: Weather;
  reducedMotion: boolean;
  /** Time since the visitor last did anything. */
  idleMs: number;
  /** Is this character on stage right now? */
  present(id: ActorId): boolean;
  /** Is this character already doing something? */
  busy(id: ActorId): boolean;
  /** Who holds a prop (null = free). */
  owner(prop: string): string | null;
  /** Object state (e.g. 'living.pictureTilt'). */
  flag(key: string): boolean | number | string | undefined;
  needs(id: ActorId): Needs;
  regard(from: ActorId, to: ActorId): number;
  /** Did this happen recently (agent memory)? */
  remembers(key: string, withinMs?: number): boolean;
  /** Is a room stage registered (props an incident can move)? */
  stage<T = unknown>(name: string): T | null;
}

export interface GoalControl {
  /** Timer that's cleared if the goal is cancelled. */
  after(ms: number, fn: () => void): void;
  readonly cancelled: boolean;
  /** Finish early (successfully) and run cleanup. */
  done(outcome?: string): void;
  rng: Rng;
  actors: ActorChannel;
  effects: WorldEffects;
  emit<K extends EventType>(type: K, payload: EventPayloads[K]): void;
  /** Note something worth remembering (bounded, session-only). */
  remember(key: string, detail?: string): void;
  /** Change a need (negative = satisfied). */
  satisfy(id: ActorId, need: NeedKey, delta: number): void;
  /** The registered room stage, if any. */
  stage<T = unknown>(name: string): T | null;
  /** Learn about visitor interventions while the goal runs. */
  onEvent(fn: (type: EventType, payload: unknown) => void): void;
  /** The outcome so far (set by done, or by the goal). */
  outcome: string;
}

export interface GoalDef {
  id: string;
  /** The character who wants this. */
  actor: ActorId;
  /** Others who take part (their channels are held for the duration). */
  cast?: ActorId[];
  rooms: readonly RoomId[];
  /** Incidents are multi-step scenes: at most one at a time, quiet periods after. */
  kind: 'ambient' | 'incident';
  /** Props held exclusively while the goal runs. */
  props?: string[];
  /** Hard time limit; cleanup always runs. */
  durationMs: number;
  cooldownMs: number;
  /** Which needs this answers (drives the score). */
  answers: NeedKey[];
  when?(p: Perception): boolean;
  /** Base appeal (0..1). */
  utility?(p: Perception): number;
  /** Start acting. Return a cleanup that puts things right however it ended. */
  start(ctl: GoalControl): void | (() => void);
}

export interface Memory {
  key: string;
  at: number;
  detail?: string;
}
