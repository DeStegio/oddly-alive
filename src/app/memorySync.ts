import { MemoryManager, emptyMemory, isNewSession, persistableTotals, type MemoryV2 } from '../engine/memory';
import { mergeCounts, type World } from '../engine/world';
import { useSettings } from '../state/settings';
import { useObjects } from '../state/world';
import { getWorldState, initialWorldState, setWorldState, useWorldStore } from '../state/worldStore';

let manager: MemoryManager | null = null;
let base: MemoryV2 | null = null;
/** After "Forget me", nothing is written until something new is discovered. */
let forgotten = false;

export function getMemoryManager(): MemoryManager {
  if (!manager) manager = MemoryManager.fromWindow();
  return manager;
}

/** Compose what gets saved: previous visits + this session. Minimal by design. */
export function composeMemory(now: number): MemoryV2 {
  const s = getWorldState();
  const prev = base ?? emptyMemory(now);
  const sessionCounts = Object.fromEntries(Object.entries(s.counts).filter(([k]) => !k.startsWith('hover:')));
  const roomVisits = { ...prev.roomVisits };
  for (const [room, n] of Object.entries(s.roomVisits)) roomVisits[room as keyof typeof roomVisits] = (prev.roomVisits[room as keyof typeof roomVisits] ?? 0) + (n ?? 0);
  const settings = useSettings.getState();
  return {
    version: 2,
    visits: s.visits,
    firstVisit: prev.firstVisit,
    lastVisit: now,
    discoveries: s.discoveries,
    counts: mergeCounts(prev.counts, sessionCounts),
    roomVisits,
    eventTotals: persistableTotals(mergeCounts(prev.eventTotals as Record<string, number>, s.eventTotals)),
    lastRoom: s.room,
    trust: s.vars.trust,
    settings: { sound: settings.sound, motion: settings.motion, motionExplicit: settings.motionExplicit, afterHours: settings.afterHours },
  };
}

export function saveNow(): boolean {
  if (!useSettings.getState().memoryEnabled || forgotten) return false;
  return getMemoryManager().save(composeMemory(Date.now()));
}

/**
 * Restore memory into the stores, greet returning visitors, and keep saving.
 * Returns a cleanup that saves once more and removes listeners/timers.
 */
export function startMemory(world: World): () => void {
  const mm = getMemoryManager();
  const now = Date.now();
  const { data, status } = mm.load(now);
  const newSession = isNewSession();
  const visits = Math.max(1, data.visits + (newSession || data.visits === 0 ? 1 : 0));
  base = { ...data, visits };
  const returning = visits > 1 && (status === 'restored' || status === 'migrated');

  if (status === 'disabled') useSettings.getState().hydrate({ memoryEnabled: false });
  const st = data.settings;
  // sound is never restored: every visit starts silent until the visitor opts in
  useSettings.getState().hydrate({
    afterHours: st.afterHours,
    ...(st.motionExplicit ? { motion: st.motion, motionExplicit: true } : {}),
  });
  setWorldState({
    visits,
    returning,
    firstVisit: data.firstVisit,
    discoveries: data.discoveries,
    pastCounts: data.counts,
    pastRoomVisits: data.roomVisits,
    pastEventTotals: data.eventTotals as Record<string, number>,
    memoryStatus: status,
    lastVisitRoom: returning ? data.lastRoom : null,
  });
  // trust carries over between visits, a little diluted
  world.restore(Math.max(data.trust * 0.85, Math.min(0.5, (visits - 1) * 0.06)));

  const greet = window.setTimeout(() => {
    world.emit('MEMORY_RESTORED', { visits, returning, awayMs: returning ? now - data.lastVisit : 0 });
    if (visits >= 3) world.discover('returning');
  }, 1400);

  // save when discoveries change, every 15 s, and when the page hides
  forgotten = false;
  const unsub = useWorldStore.subscribe((s, prev) => {
    if (s.discoveries === prev.discoveries) return;
    // a new discovery after Forget me is the visitor choosing to be remembered again
    if (forgotten && Object.keys(s.discoveries).length > 0) forgotten = false;
    saveNow();
  });
  const interval = window.setInterval(() => document.visibilityState === 'visible' && saveNow(), 15_000);
  const onHide = () => document.visibilityState === 'hidden' && saveNow();
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', saveNow);
  if (newSession) saveNow();

  return () => {
    saveNow();
    window.clearTimeout(greet);
    window.clearInterval(interval);
    unsub();
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', saveNow);
  };
}

// --------------------------------------------------------------- resets

/** Reset Session: personality and transient reactions. Keeps memory and the rooms. */
export function resetSession(world: World) {
  world.resetSession();
}

/** Reset World: rooms back to their tidy state. Keeps memory and the session mood. */
export function resetWorld(world: World) {
  useObjects.getState().resetObjects();
  useSettings.getState().setAfterHours(false);
  world.calm();
  world.emit('WORLD_RESET', { scope: 'world' });
}

/** Clear Local Memory: forget everything stored, and start over as a stranger. */
export function clearMemory(world: World) {
  forgotten = true;
  getMemoryManager().clear();
  base = emptyMemory(Date.now());
  const keepRoom = getWorldState().room;
  setWorldState({ ...initialWorldState(), room: keepRoom, roomVisits: { [keepRoom]: 1 }, memoryStatus: 'fresh' });
  useObjects.getState().resetObjects();
  useSettings.getState().hydrate({ sound: false, afterHours: false });
  world.calm();
  world.emit('WORLD_RESET', { scope: 'memory' });
}

/** Memory on/off. Off deletes what's stored and stops saving. */
export function setMemoryEnabled(on: boolean) {
  useSettings.getState().setMemoryEnabled(on);
  getMemoryManager().setDisabled(!on);
  if (on) {
    forgotten = false;
    saveNow();
  }
}
