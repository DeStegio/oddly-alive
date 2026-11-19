import { ROOMS, isRoomId, type RoomId } from './rooms';

/**
 * Shareable scenes. A link carries ONLY: room, scene seed, an optional
 * Playground arrangement, and the night flag. Never memory, counts,
 * discoveries, nicknames or anything else from local storage.
 */
export interface SharedScene {
  room: RoomId;
  seed: number;
  night?: boolean;
  arrangement?: string;
}

export const SHARE_KEYS = ['seed', 'night', 'a'] as const;

const SEED_RE = /^[0-9a-z]{1,8}$/;

export const seedToCode = (seed: number) => (seed >>> 0).toString(36);
export function codeToSeed(code: string): number | null {
  if (!SEED_RE.test(code)) return null;
  const n = parseInt(code, 36);
  return Number.isFinite(n) && n >= 0 && n <= 0xffffffff ? n : null;
}

export function buildShareUrl(scene: SharedScene, base: string): string {
  const q = new URLSearchParams();
  q.set('seed', seedToCode(scene.seed));
  if (scene.night) q.set('night', '1');
  if (scene.arrangement && scene.room === 'playground' && /^[A-Za-z0-9_-]{1,4000}$/.test(scene.arrangement)) q.set('a', scene.arrangement);
  const path = ROOMS[scene.room].path;
  return `${base.split('#')[0]}#${path}?${q.toString()}`;
}

/** Parse the query part of a hash route; unknown keys are ignored. */
export function parseShareHash(hash: string): Partial<SharedScene> {
  const [route = '', query = ''] = hash.replace(/^#/, '').split('?');
  const out: Partial<SharedScene> = {};
  const room = Object.values(ROOMS).find((r) => r.path === (route || '/'))?.id;
  if (room && isRoomId(room)) out.room = room;
  const q = new URLSearchParams(query);
  const seed = q.get('seed');
  if (seed) {
    const n = codeToSeed(seed);
    if (n !== null) out.seed = n;
  }
  if (q.get('night') === '1') out.night = true;
  const a = q.get('a');
  if (a && /^[A-Za-z0-9_-]{1,4000}$/.test(a)) out.arrangement = a;
  return out;
}

/** Seed for this session: from the link if present, otherwise random. */
export function readInitialSeed(): number {
  if (typeof window === 'undefined') return 1;
  const fromLink = parseShareHash(window.location.hash).seed;
  if (fromLink !== undefined) return fromLink;
  const buf = typeof crypto !== 'undefined' && 'getRandomValues' in crypto ? crypto.getRandomValues(new Uint32Array(1)) : null;
  return (buf?.[0] ?? Math.floor(Math.random() * 2 ** 32)) >>> 0;
}

/** Small, reproducible decorative choices derived from the seed. */
export function sceneVariant(seed: number) {
  const pick = <T,>(arr: readonly T[], salt: number) => arr[((seed >>> 0) ^ salt) % arr.length] as T;
  return {
    pictureSky: pick(['var(--blue)', 'var(--mint)', 'var(--lavender)', 'var(--coral)'] as const, 0x11),
    rugRing: pick(['var(--coral)', 'var(--blue)', 'var(--yellow)', 'var(--mint)'] as const, 0x2f),
    plantSeed: (seed % 997) + 1,
  };
}

/** The Playground registers a provider for its current arrangement while mounted. */
let arrangementProvider: (() => string | null) | null = null;
export function setArrangementProvider(fn: (() => string | null) | null) {
  arrangementProvider = fn;
}
export function currentArrangement(): string | null {
  return arrangementProvider?.() ?? null;
}
