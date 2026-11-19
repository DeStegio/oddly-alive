import { MAX_BODIES, SHAPE_KINDS, type Layout, type PlacedShape, type ShapeKind } from './physics';

/**
 * Compact, validated encoding of a Playground arrangement for share links
 * (INT-109). Only shape kinds and positions are encoded — never any memory.
 * Format: "<orientation>.<kindIndex>,<x>,<y>,<angle*100>;…" base64url-encoded.
 */
export function encodeArrangement(shapes: PlacedShape[], portrait: boolean): string {
  const body = shapes
    .filter((s) => s.kind !== 'key')
    .slice(0, MAX_BODIES)
    .map((s) => [SHAPE_KINDS.indexOf(s.kind), Math.round(s.x), Math.round(s.y), Math.round((s.angle ?? 0) * 100)].join(','))
    .join(';');
  return toBase64Url(`${portrait ? 'p' : 'l'}.${body}`);
}

export function decodeArrangement(code: string, layout: Pick<Layout, 'width' | 'height' | 'portrait'>): PlacedShape[] | null {
  let raw: string;
  try {
    raw = fromBase64Url(code);
  } catch {
    return null;
  }
  const [orient, body] = raw.split('.', 2);
  if ((orient !== 'p' && orient !== 'l') || body === undefined) return null;
  const sourcePortrait = orient === 'p';
  // map between orientations proportionally so a desktop link works on mobile
  const src = sourcePortrait ? { w: 600, h: 900 } : { w: 1000, h: 600 };
  const sx = layout.width / src.w;
  const sy = layout.height / src.h;
  const out: PlacedShape[] = [];
  for (const part of body.split(';')) {
    if (!part) continue;
    const nums = part.split(',').map(Number);
    if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n))) return null;
    const [k, x, y, a] = nums as [number, number, number, number];
    const kind = SHAPE_KINDS[k] as ShapeKind | undefined;
    if (!kind || kind === 'key') return null;
    out.push({
      kind,
      x: clamp(x * sx, 20, layout.width - 20),
      y: clamp(y * sy, 20, layout.height - 40),
      angle: clamp(a / 100, -Math.PI * 4, Math.PI * 4),
    });
    if (out.length >= MAX_BODIES) break;
  }
  return out.length ? out : null;
}

/** Reads ?a=… from the hash route (e.g. #/playground?a=…). */
export function readSharedArrangement(layout: Layout): PlacedShape[] | null {
  if (typeof window === 'undefined') return null;
  const q = window.location.hash.split('?')[1];
  if (!q) return null;
  const code = new URLSearchParams(q).get('a');
  return code ? decodeArrangement(code, layout) : null;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function toBase64Url(s: string) {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(input: string) {
  const s = input.replace(/=+$/, '');
  if (!/^[A-Za-z0-9_-]{1,4000}$/.test(s)) throw new Error('bad code');
  return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
}
