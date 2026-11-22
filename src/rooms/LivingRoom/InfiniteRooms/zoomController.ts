/**
 * The recursive zoom, as plain maths. Every room is drawn in the same
 * W×H box. Each has a portal: a rectangle (same aspect as the room) where
 * the next room sits, shrunk by r = portal.w / W.
 *
 * Zooming in by p (0..1) is a similarity about the portal's fixed point, so
 * at p = 1 the portal exactly fills the screen. Then we rebase: the next
 * room becomes the current one at p = 0. Scale never accumulates.
 */
export const W = 1000;
export const H = 625;
export const ASPECT = H / W;

export type PortalShape = 'rect' | 'circle' | 'keyhole' | 'arch' | 'diamond';
export interface Portal {
  x: number;
  y: number;
  w: number;
  shape: PortalShape;
}
export const portalH = (p: Portal) => p.w * ASPECT;
export const ratio = (p: Portal) => p.w / W;

/** The part of the current room the camera sees at zoom p. */
export function viewRect(portal: Portal, p: number): { x: number; y: number; w: number; h: number } {
  const r = ratio(portal);
  const k = Math.pow(r, p);
  const cx = portal.x / (1 - r);
  const cy = portal.y / (1 - r);
  return { x: cx * (1 - k), y: cy * (1 - k), w: W * k, h: H * k };
}

/** CSS transform (origin 0 0) that shows viewRect(p) in a box of screen width `screenW`. */
export function cameraTransform(portal: Portal, p: number, screenW: number): string {
  const v = viewRect(portal, p);
  const s = screenW / v.w;
  return `scale(${s.toFixed(6)}) translate(${(-v.x).toFixed(4)}px, ${(-v.y).toFixed(4)}px)`;
}

export interface Camera {
  /** Which room we're in (1 = the first room through the frame). */
  depth: number;
  /** How far into its portal we are (0..1). */
  p: number;
  /** Below zero at depth 1: on the way back out to the Living Room. */
  out: number;
}

export type ZoomEvent = { type: 'entered'; depth: number } | { type: 'left'; depth: number } | { type: 'exit' };

/** How far past the first room you have to zoom out before you're home. */
export const EXIT_AT = 0.35;
/** Largest single step (keeps a wild trackpad from skipping rooms). */
export const MAX_STEP = 0.6;

/**
 * Move the camera by dp (+ in, − out). Crossing p = 1 enters the next room,
 * crossing 0 goes back to the previous one; zooming out of room 1 far
 * enough asks to exit. Pure; returns the new camera and what happened.
 */
export function zoomBy(cam: Camera, dp: number): { cam: Camera; events: ZoomEvent[] } {
  const events: ZoomEvent[] = [];
  let { depth, p, out } = cam;
  let rest = Math.max(-MAX_STEP, Math.min(MAX_STEP, dp));
  if (out > 0) {
    // already backing out of room 1: zooming in again cancels it
    const back = Math.min(out, Math.max(0, rest));
    out -= back;
    rest -= back;
    if (rest < 0) out += -rest;
    if (out >= EXIT_AT) events.push({ type: 'exit' });
    return { cam: { depth, p, out: Math.min(out, EXIT_AT) }, events };
  }
  p += rest;
  while (p >= 1) {
    p -= 1;
    depth += 1;
    events.push({ type: 'entered', depth });
  }
  while (p < 0) {
    if (depth <= 1) {
      out = Math.min(EXIT_AT, -p);
      p = 0;
      if (out >= EXIT_AT) events.push({ type: 'exit' });
      break;
    }
    events.push({ type: 'left', depth });
    depth -= 1;
    p += 1;
  }
  return { cam: { depth, p, out }, events };
}

export const startCamera = (): Camera => ({ depth: 1, p: 0, out: 0 });

/** Zoom amount for a wheel delta (pixels): one room per ~700px of scrolling. */
export const wheelToZoom = (deltaY: number, deltaMode = 0) => (-(deltaMode === 1 ? deltaY * 16 : deltaY) / 700);

/** Zoom amount for a pinch (distance ratio now / before) in a portal of ratio r. */
export const pinchToZoom = (scale: number, r: number) => (scale > 0 ? Math.log(scale) / Math.log(1 / r) : 0);
