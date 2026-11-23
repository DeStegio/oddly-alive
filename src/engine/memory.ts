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
export const SCHEMA_VERSION = 3;

const MAX_COUNTS = 40;
const ID_PATTERN = /^[a-z][a-z0-9:-]{0,40}$/;
/** Record names are camelCase (bestRally, tallestTower). */
const RECORD_KEY = /^[a-z][a-zA-Z0-9]{0,30}$/;
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
  /** Phase 4: characters may nudge you when you seem stuck (opt-out). */
  hints: boolean;
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

/** A garden plot as stored: what was planted, and how far it has grown. */
export interface StoredPlot {
  kind: string;
  plantedAt: number;
  /** Last time growth was brought up to date. */
  updatedAt: number;
  /** Last watering (0 = never). */
  wateredAt: number;
  /** Growth so far, 0..1 (1 = in bloom). */
  growth: number;
}

export interface DiaryEntry {
  at: number;
  kind: string;
  detail: string;
}

/**
 * Things the house keeps between visits (v3). Everything here is about what
 * happened on this page; nothing about the visitor.
 */
export interface WorldMemory {
  garden: { plots: Array<StoredPlot | null>; vase: string[] };
  letters: string[];
  /** Weather kinds seen, with the first time each was seen. */
  almanac: Record<string, number>;
  diary: DiaryEntry[];
  /** Personal bests (best rally, tallest tower, …). */
  records: Record<string, number>;
  attic: { unlocked: boolean; hats: string[] };
  /**
   * Phase 3 (additive, still v3): when notable things last happened (an
   * incident, a shadow creature, a long rally), so characters can bring
   * them up later. Keys only, no detail; at most MAX_STORY of them.
   */
  story: Record<string, number>;
  /** How the Living Room button feels about you, between visits. */
  button: { trust: number; suspicion: number };
  /**
   * Phase 4 (additive, still v3). The garden's jobs done, the Herbarium pages
   * found, and bonus barrel water from the valley's rain.
   */
  garden2: { solved: string[]; herbarium: string[]; barrel: number };
  /** The Weather Workshop: postcards answered, and the sandbox valley (a compact string, '' for none). */
  workshop: { solved: string[]; sandbox: string };
  /** The attic Memory Board: evidence found, pins (object → 'owner:decade'), locked objects, shadow scenes, act. */
  board: { found: string[]; pins: Record<string, string>; locked: string[]; scenes: string[]; act: number };
}

export const GARDEN_PLOTS = 6;
export const MAX_STORY = 24;
export const MAX_DIARY = 40;

export function emptyWorldMemory(): WorldMemory {
  return {
    garden: { plots: Array.from({ length: GARDEN_PLOTS }, () => null), vase: [] },
    letters: [],
    almanac: {},
    diary: [],
    records: {},
    attic: { unlocked: false, hats: [] },
    story: {},
    button: { trust: 0.35, suspicion: 0 },
    garden2: { solved: [], herbarium: [], barrel: 0 },
    workshop: { solved: [], sandbox: '' },
    board: { found: [], pins: {}, locked: [], scenes: [], act: 1 },
  };
}

/** Garden and valley bonus water is capped: it is a bonus, never needed. */
export const MAX_BONUS_BARREL = 3;
const SANDBOX_MAX = 6000;
const PIN_VALUE = /^[a-z][a-z0-9-]{0,24}:[0-9]{4}$/;

export interface MemoryV3 extends Omit<MemoryV2, 'version'> {
  version: 3;
  world: WorldMemory;
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

export const DEFAULT_SETTINGS: MemorySettings = { sound: false, motion: 'full', motionExplicit: false, afterHours: false, hints: true };

export function emptyMemory(now: number): MemoryV3 {
  return {
    version: 3,
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
    world: emptyWorldMemory(),
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
    hints: v.hints !== false,
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

const cleanId = (v: unknown): v is string => typeof v === 'string' && ID_PATTERN.test(v);
const cleanIds = (v: unknown, max: number): string[] => (Array.isArray(v) ? [...new Set(v.filter(cleanId))].slice(0, max) : []);
/** Plain text only: control characters become spaces, and it stays short. */
const cleanText = (v: unknown, max = 120): string =>
  typeof v === 'string' ? Array.from(v, (ch) => (ch.charCodeAt(0) < 32 ? ' ' : ch)).join('').slice(0, max) : '';

function cleanPlot(v: unknown): StoredPlot | null {
  if (!isObj(v) || !cleanId(v.kind) || !isNat(v.plantedAt) || !isNat(v.updatedAt)) return null;
  const growth = typeof v.growth === 'number' && Number.isFinite(v.growth) ? clamp01(v.growth) : 0;
  return { kind: v.kind, plantedAt: v.plantedAt, updatedAt: v.updatedAt, wateredAt: isNat(v.wateredAt) ? v.wateredAt : 0, growth };
}

/** Validate the v3 keepsakes; anything odd falls back to its default. */
export function cleanWorld(v: unknown): WorldMemory {
  const w = emptyWorldMemory();
  if (!isObj(v)) return w;
  if (isObj(v.garden)) {
    const plots = Array.isArray(v.garden.plots) ? v.garden.plots : [];
    w.garden.plots = w.garden.plots.map((_, i) => cleanPlot(plots[i]));
    w.garden.vase = (Array.isArray(v.garden.vase) ? v.garden.vase.filter(cleanId) : []).slice(-12);
  }
  w.letters = cleanIds(v.letters, 16);
  w.almanac = cleanCounts(v.almanac, 16);
  if (Array.isArray(v.diary)) {
    w.diary = v.diary
      .filter((e): e is Record<string, unknown> => isObj(e) && isNat(e.at) && cleanId(e.kind))
      .map((e) => ({ at: e.at as number, kind: e.kind as string, detail: cleanText(e.detail) }))
      .slice(-MAX_DIARY);
  }
  if (isObj(v.records)) {
    w.records = Object.fromEntries(
      Object.entries(v.records)
        .filter(([k, n]) => RECORD_KEY.test(k) && isNat(n) && (n as number) < 1e6)
        .slice(0, 20)
        .map(([k, n]) => [k, Math.floor(n as number)]),
    );
  }
  if (isObj(v.attic)) w.attic = { unlocked: v.attic.unlocked === true, hats: cleanIds(v.attic.hats, 8) };
  // Phase 3 additions: missing in older saves, so they simply start empty
  if (isObj(v.story)) {
    w.story = Object.fromEntries(
      Object.entries(v.story)
        .filter(([k, t]) => ID_PATTERN.test(k) && isNat(t))
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, MAX_STORY),
    ) as Record<string, number>;
  }
  if (isObj(v.button)) {
    const unit = (n: unknown, d: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : d);
    w.button = { trust: unit(v.button.trust, 0.35), suspicion: unit(v.button.suspicion, 0) };
  }
  // Phase 4 additions: missing in older saves, so they start empty
  if (isObj(v.garden2)) {
    w.garden2 = {
      solved: cleanIds(v.garden2.solved, 32),
      herbarium: cleanIds(v.garden2.herbarium, 48),
      barrel: isNat(v.garden2.barrel) ? Math.min(MAX_BONUS_BARREL, Math.floor(v.garden2.barrel)) : 0,
    };
  }
  if (isObj(v.workshop)) {
    const sb = v.workshop.sandbox;
    w.workshop = { solved: cleanIds(v.workshop.solved, 24), sandbox: typeof sb === 'string' && sb.length <= SANDBOX_MAX && /^[A-Za-z0-9+/=,.:;|-]*$/.test(sb) ? sb : '' };
  }
  if (isObj(v.board)) {
    const pins: Record<string, string> = {};
    if (isObj(v.board.pins)) for (const [k, val] of Object.entries(v.board.pins).slice(0, 24)) if (ID_PATTERN.test(k) && typeof val === 'string' && PIN_VALUE.test(val)) pins[k] = val;
    const act = v.board.act;
    w.board = {
      found: cleanIds(v.board.found, 64),
      pins,
      locked: cleanIds(v.board.locked, 24),
      scenes: cleanIds(v.board.scenes, 8),
      act: act === 2 || act === 3 ? act : 1,
    };
  }
  return w;
}

/** Strictly validate a v3 object; returns null if it isn't one. */
export function validateV3(raw: unknown): MemoryV3 | null {
  if (!isObj(raw) || raw.version !== 3) return null;
  const base = validateV2({ ...raw, version: 2 });
  if (!base) return null;
  return { ...base, version: 3, world: cleanWorld(raw.world) };
}

/** v2 → v3: everything carries over; the keepsakes start empty. */
export function migrateV2(raw: unknown): MemoryV3 | null {
  const v2 = validateV2(raw);
  return v2 ? { ...v2, version: 3, world: emptyWorldMemory() } : null;
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
  data: MemoryV3;
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
    const v3 = validateV3(parsed);
    if (v3) return { data: v3, status: 'restored' };
    const fromV1 = migrateV1(parsed);
    const migrated = migrateV2(fromV1 ?? parsed);
    if (migrated) {
      this.save(migrated);
      return { data: migrated, status: 'migrated' };
    }
    this.safeRemove();
    return { data: emptyMemory(now), status: 'corrupt' };
  }

  save(data: MemoryV3): boolean {
    if (!this.storage || this.isDisabled()) return false;
    try {
      const clean = validateV3(data);
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
