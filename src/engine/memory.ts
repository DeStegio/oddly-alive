import { ROOM_IDS, isRoomId, type RoomId } from '../app/rooms';
import type { EventType } from './events';

/**
 * Local-only, versioned, validated persistence. Stores the minimum needed for
 * continuity: visit counts, discoveries, per-object interaction counts, a few
 * settings. Nothing is ever transmitted. Corrupt or unknown data is discarded
 * safely; storage failures never break the page.
 */
export const MEMORY_KEY = 'oddly-alive:memory';
export const MEMORY_OFF_KEY = 'oddly-alive:memory-off';
export const SESSION_KEY = 'oddly-alive:session';
export const SCHEMA_VERSION = 2;

const MAX_COUNTS = 40;
const ID_PATTERN = /^[a-z][a-z0-9:-]{0,40}$/;
const PERSISTED_EVENTS: readonly EventType[] = [
  'OBJECT_CLICKED',
  'OBJECT_DRAGGED',
  'OBJECT_COLLIDED',
  'POINTER_ENTERED',
  'SCROLL_CHANGED',
  'KEY_PRESSED',
  'KEY_SEQUENCE_DETECTED',
  'USER_IDLE',
  'ROOM_ENTERED',
  'SECRET_DISCOVERED',
  'RARE_EVENT',
];

export interface MemorySettings {
  sound: boolean;
  motion: 'full' | 'reduced';
  motionExplicit: boolean;
  afterHours: boolean;
}

export interface MemoryV2 {
  version: 2;
  visits: number;
  firstVisit: number;
  lastVisit: number;
  discoveries: Record<string, number>;
  counts: Record<string, number>;
  roomVisits: Partial<Record<RoomId, number>>;
  eventTotals: Partial<Record<EventType, number>>;
  lastRoom: RoomId | null;
  trust: number;
  settings: MemorySettings;
}

/** Legacy shape kept for migration tests and old visitors. */
export interface MemoryV1 {
  version: 1;
  visits: number;
  firstVisit: number;
  lastVisit: number;
  discoveries: string[];
  counts: Record<string, number>;
  lastRoom: string | null;
  settings: { sound: boolean; motion: 'full' | 'reduced' };
}

export type LoadStatus = 'fresh' | 'restored' | 'migrated' | 'corrupt' | 'unavailable' | 'disabled';

export const DEFAULT_SETTINGS: MemorySettings = { sound: false, motion: 'full', motionExplicit: false, afterHours: false };

export function emptyMemory(now: number): MemoryV2 {
  return {
    version: 2,
    visits: 0,
    firstVisit: now,
    lastVisit: now,
    discoveries: {},
    counts: {},
    roomVisits: {},
    eventTotals: {},
    lastRoom: null,
    trust: 0,
    settings: { ...DEFAULT_SETTINGS },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNat = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e13;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function cleanCounts(v: unknown, max = MAX_COUNTS): Record<string, number> {
  if (!isObj(v)) return {};
  const entries = Object.entries(v)
    .filter(([k, n]) => ID_PATTERN.test(k) && isNat(n))
    .map(([k, n]) => [k, Math.floor(n as number)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max);
  return Object.fromEntries(entries);
}

function cleanSettings(v: unknown): MemorySettings {
  if (!isObj(v)) return { ...DEFAULT_SETTINGS };
  return {
    sound: v.sound === true,
    motion: v.motion === 'reduced' ? 'reduced' : 'full',
    motionExplicit: v.motionExplicit === true,
    afterHours: v.afterHours === true,
  };
}

/** Strictly validate a v2 object; returns null if it isn't one. */
export function validateV2(raw: unknown): MemoryV2 | null {
  if (!isObj(raw) || raw.version !== 2) return null;
  if (!isNat(raw.visits) || !isNat(raw.firstVisit) || !isNat(raw.lastVisit)) return null;
  const roomVisits: Partial<Record<RoomId, number>> = {};
  if (isObj(raw.roomVisits)) for (const id of ROOM_IDS) if (isNat(raw.roomVisits[id])) roomVisits[id] = Math.floor(raw.roomVisits[id] as number);
  const eventTotals: Partial<Record<EventType, number>> = {};
  if (isObj(raw.eventTotals)) for (const t of PERSISTED_EVENTS) if (isNat(raw.eventTotals[t])) eventTotals[t] = Math.floor(raw.eventTotals[t] as number);
  return {
    version: 2,
    visits: Math.floor(raw.visits),
    firstVisit: raw.firstVisit,
    lastVisit: raw.lastVisit,
    discoveries: cleanCounts(raw.discoveries, 64),
    counts: cleanCounts(raw.counts),
    roomVisits,
    eventTotals,
    lastRoom: isRoomId(raw.lastRoom) ? raw.lastRoom : null,
    trust: typeof raw.trust === 'number' && Number.isFinite(raw.trust) ? clamp01(raw.trust) : 0,
    settings: cleanSettings(raw.settings),
  };
}

/** v1 → v2: discoveries become a timestamped map; room visits/totals start empty. */
export function migrateV1(raw: unknown): MemoryV2 | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  if (!isNat(raw.visits) || !isNat(raw.firstVisit) || !isNat(raw.lastVisit)) return null;
  const discoveries: Record<string, number> = {};
  if (Array.isArray(raw.discoveries)) for (const d of raw.discoveries) if (typeof d === 'string' && ID_PATTERN.test(d)) discoveries[d] = raw.lastVisit;
  return validateV2({
    version: 2,
    visits: raw.visits,
    firstVisit: raw.firstVisit,
    lastVisit: raw.lastVisit,
    discoveries,
    counts: raw.counts,
    roomVisits: {},
    eventTotals: {},
    lastRoom: raw.lastRoom,
    trust: Math.min(0.5, 0.05 * Number(raw.visits)),
    settings: cleanSettings(raw.settings),
  });
}

export interface LoadResult {
  data: MemoryV2;
  status: LoadStatus;
}

export class MemoryManager {
  lastError: string | null = null;

  constructor(private storage: Storage | null) {}

  static fromWindow(): MemoryManager {
    try {
      return new MemoryManager(typeof window !== 'undefined' ? window.localStorage : null);
    } catch {
      return new MemoryManager(null);
    }
  }

  get available() {
    return this.storage !== null;
  }

  isDisabled(): boolean {
    try {
      return this.storage?.getItem(MEMORY_OFF_KEY) === '1';
    } catch {
      return false;
    }
  }

  load(now: number): LoadResult {
    if (!this.storage) return { data: emptyMemory(now), status: 'unavailable' };
    if (this.isDisabled()) return { data: emptyMemory(now), status: 'disabled' };
    let text: string | null;
    try {
      text = this.storage.getItem(MEMORY_KEY);
    } catch (err) {
      this.lastError = String(err);
      return { data: emptyMemory(now), status: 'unavailable' };
    }
    if (text === null) return { data: emptyMemory(now), status: 'fresh' };
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      this.safeRemove();
      return { data: emptyMemory(now), status: 'corrupt' };
    }
    const v2 = validateV2(parsed);
    if (v2) return { data: v2, status: 'restored' };
    const migrated = migrateV1(parsed);
    if (migrated) {
      this.save(migrated);
      return { data: migrated, status: 'migrated' };
    }
    this.safeRemove();
    return { data: emptyMemory(now), status: 'corrupt' };
  }

  save(data: MemoryV2): boolean {
    if (!this.storage || this.isDisabled()) return false;
    try {
      const clean = validateV2(data);
      if (!clean) return false;
      this.storage.setItem(MEMORY_KEY, JSON.stringify(clean));
      return true;
    } catch (err) {
      this.lastError = String(err);
      return false;
    }
  }

  /** Forget everything stored by this site. */
  clear() {
    this.safeRemove();
    try {
      this.storage?.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }

  /** Turning memory off deletes stored data and leaves only the off switch. */
  setDisabled(off: boolean) {
    if (!this.storage) return;
    try {
      if (off) {
        this.safeRemove();
        this.storage.setItem(MEMORY_OFF_KEY, '1');
      } else this.storage.removeItem(MEMORY_OFF_KEY);
    } catch (err) {
      this.lastError = String(err);
    }
  }

  raw(): string | null {
    try {
      return this.storage?.getItem(MEMORY_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private safeRemove() {
    try {
      this.storage?.removeItem(MEMORY_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Keep only the event totals worth remembering. */
export function persistableTotals(totals: Record<string, number>): Partial<Record<EventType, number>> {
  const out: Partial<Record<EventType, number>> = {};
  for (const t of PERSISTED_EVENTS) if (isNat(totals[t])) out[t] = totals[t];
  return out;
}

/** Was this tab already counted as a visit? (sessionStorage, per tab) */
export function isNewSession(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    sessionStorage.setItem(SESSION_KEY, '1');
    return true;
  } catch {
    return true;
  }
}
