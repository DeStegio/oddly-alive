import type { World } from '../engine/world';
import { useKeepsakes } from '../state/keepsakes';
import { getWorldState } from '../state/worldStore';
import { ROOM_IDS, type RoomId } from './rooms';

/** Every room you know, within this long. */
export const TOURIST_MS = 90_000;
/** One room, this long, without leaving. */
export const HOMEBODY_MS = 5 * 60_000;

/** Night Owl: midnight to four, by the visitor's own clock. */
export const isSmallHours = (d: Date) => d.getHours() < 4;

/** Rooms the visitor knows about (the Attic only once its ladder is down). */
export function knownRooms(): RoomId[] {
  const atticKnown = useKeepsakes.getState().attic.unlocked;
  return ROOM_IDS.filter((r) => r !== 'attic' || atticKnown);
}

/** Tourist: every known room entered within the window. */
export function isTour(entered: Partial<Record<RoomId, number>>, now: number, rooms = knownRooms()): boolean {
  return rooms.every((r) => entered[r] !== undefined && now - entered[r]! <= TOURIST_MS);
}

/**
 * Discoveries about how and when the house is visited, rather than about any
 * one object: Night Owl, Tourist and Homebody.
 */
export function startWatchers(world: World, now: () => number = Date.now): () => void {
  const entered: Partial<Record<RoomId, number>> = {};
  let current: { room: RoomId; since: number } = { room: getWorldState().room, since: now() };
  entered[current.room] = current.since;

  const check = () => {
    const t = now();
    if (isSmallHours(new Date(t))) world.discover('night-owl');
    if (t - current.since >= HOMEBODY_MS) world.discover('homebody');
  };
  check();

  const off = world.bus.on('ROOM_ENTERED', (ev) => {
    const t = now();
    current = { room: ev.payload.room, since: t };
    entered[ev.payload.room] = t;
    if (isTour(entered, t)) world.discover('tourist');
  });
  const timer = window.setInterval(check, 10_000);
  return () => {
    off();
    window.clearInterval(timer);
  };
}
