import type { RoomId } from '../app/rooms';
import type { ActorId, Mood } from './types';
import type { Weather } from './weather';

/** Identifier of anything that can be interacted with: 'pim', 'lamp', 'shape:3'… */
export type ObjectId = string;

export const SEQUENCE_IDS = ['hello', 'wonk', 'night', 'shh', 'dance'] as const;
export type SequenceId = (typeof SEQUENCE_IDS)[number];

export type ResetScope = 'session' | 'world' | 'memory';

/**
 * Payload for every event type. Adding an event type here makes it available
 * (typed) everywhere: emit(), bus.on(), behavior definitions.
 */
export interface EventPayloads {
  /** Throttled heartbeat (≤ 1/s); per-frame pointer data never goes on the bus. */
  POINTER_MOVED: { speed: number };
  POINTER_ENTERED: { target: ObjectId; speed: number };
  POINTER_LEFT: { target: ObjectId };
  POINTER_STARE: { target: ObjectId };
  POINTER_FRENZY: { target: ObjectId };
  POINTER_CIRCLED: { target: ObjectId | null; turns: number };
  OBJECT_CLICKED: { target: ObjectId; repeat: number; via: 'pointer' | 'keyboard' };
  OBJECT_DRAGGED: {
    target: ObjectId;
    phase: 'start' | 'end';
    speed: number;
    distance: number;
  };
  OBJECT_COLLIDED: { a: ObjectId; b: ObjectId; force: number };
  OBJECT_STATE_CHANGED: { target: ObjectId; key: string; value: string | number | boolean };
  SCROLL_CHANGED: { depth: number; velocity: number; direction: 'up' | 'down' };
  SCROLL_END_REACHED: { depth: number };
  KEY_PRESSED: { key: string };
  KEY_SEQUENCE_DETECTED: { sequence: SequenceId };
  USER_IDLE: { ms: number; level: 'short' | 'long' };
  USER_ACTIVE: { idleMs: number };
  TAB_VISIBILITY_CHANGED: { visible: boolean; awayMs: number };
  ROOM_ENTERED: { room: RoomId; from: RoomId | null; visits: number };
  ROOM_EXITED: { room: RoomId; dwellMs: number };
  MOOD_CHANGED: { from: Mood; to: Mood };
  WEATHER_CHANGED: { from: Weather; to: Weather; pinned: boolean };
  SECRET_DISCOVERED: { secret: string; firstTime: boolean };
  CHARACTER_INTERACTED: { a: ActorId; b: ActorId; kind: string };
  MEMORY_RESTORED: { visits: number; returning: boolean; awayMs: number };
  WORLD_RESET: { scope: ResetScope };
  RARE_EVENT: { event: string };
}

export type EventType = keyof EventPayloads;

interface EventBase<T extends EventType> {
  id: number;
  type: T;
  timestamp: number;
  room: RoomId;
  /** Chain depth: events emitted by reactions to other events. Bounded. */
  depth: number;
  payload: EventPayloads[T];
}

/** Discriminated union of every world event. */
export type WorldEvent = { [K in EventType]: EventBase<K> }[EventType];

/** The event narrowed to one type. */
export type EventOf<T extends EventType> = Extract<WorldEvent, { type: T }>;

export const MAX_EVENT_DEPTH = 4;

let nextId = 1;

export function makeEvent<T extends EventType>(
  type: T,
  payload: EventPayloads[T],
  meta: { room: RoomId; timestamp: number; depth?: number },
): EventOf<T> {
  return {
    id: nextId++,
    type,
    payload,
    room: meta.room,
    timestamp: meta.timestamp,
    depth: meta.depth ?? 0,
  } as EventOf<T>;
}

/** Narrowing helper usable in plain functions. */
export function isEvent<T extends EventType>(ev: WorldEvent, type: T): ev is EventOf<T> {
  return ev.type === type;
}
