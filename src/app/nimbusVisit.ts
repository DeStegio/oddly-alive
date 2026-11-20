import type { RoomId } from './rooms';
import { getWorldState, setWorldState } from '../state/worldStore';

/** How long Nimbus stays when sent to another room. */
export const VISIT_MS = 60_000;

export function sendNimbus(room: RoomId, now = Date.now()) {
  setWorldState({ nimbusVisit: { room, until: now + VISIT_MS } });
}

export function nimbusAwayFrom(room: RoomId, now = Date.now()): boolean {
  const v = getWorldState().nimbusVisit;
  return v !== null && v.until > now && v.room !== room;
}

export function endNimbusVisit() {
  setWorldState({ nimbusVisit: null });
}
