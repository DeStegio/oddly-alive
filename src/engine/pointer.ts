/**
 * Pointer state lives here, never in React state. Readers poll it inside the
 * shared frame loop. Only events inside the page are observed.
 */
export interface PointerState {
  x: number;
  y: number;
  /** Smoothed speed in px/ms. */
  speed: number;
  vx: number;
  vy: number;
  lastMove: number;
  /** True once the visitor has moved a mouse/pen at least once. */
  active: boolean;
  /** Pointer type of the last movement. */
  kind: 'mouse' | 'touch' | 'pen';
  inside: boolean;
}

export const pointer: PointerState = {
  x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
  y: typeof window !== 'undefined' ? window.innerHeight / 3 : 0,
  speed: 0,
  vx: 0,
  vy: 0,
  lastMove: 0,
  active: false,
  kind: 'mouse',
  inside: false,
};

type MoveListener = (p: PointerState) => void;
const moveListeners = new Set<MoveListener>();

export function onPointerMove(cb: MoveListener): () => void {
  moveListeners.add(cb);
  return () => moveListeners.delete(cb);
}

let installed = false;

export function installPointerTracking(): () => void {
  if (installed || typeof window === 'undefined') return () => {};
  installed = true;

  const move = (e: PointerEvent) => {
    const now = performance.now();
    const dt = Math.max(1, now - (pointer.lastMove || now - 16));
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    const inst = Math.hypot(dx, dy) / dt;
    pointer.vx = dx / dt;
    pointer.vy = dy / dt;
    pointer.speed = pointer.active ? pointer.speed * 0.8 + Math.min(inst, 8) * 0.2 : 0;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.lastMove = now;
    pointer.active = true;
    pointer.inside = true;
    pointer.kind = e.pointerType === 'touch' ? 'touch' : e.pointerType === 'pen' ? 'pen' : 'mouse';
    for (const cb of moveListeners) cb(pointer);
  };
  const leave = () => {
    pointer.inside = false;
  };

  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerdown', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);

  return () => {
    installed = false;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerdown', move);
    document.documentElement.removeEventListener('pointerleave', leave);
  };
}

/** Speed decays when the pointer stops; call from the frame loop. */
export function decayPointerSpeed(now: number) {
  if (now - pointer.lastMove > 60) pointer.speed *= 0.85;
}

/**
 * Increments whenever layout may have moved (scroll/resize). Frame readers cache
 * getBoundingClientRect results and refresh only when this changes, avoiding
 * layout thrash inside the frame loop.
 */
let epoch = 0;
export function layoutEpoch() {
  return epoch;
}
export function bumpLayoutEpoch() {
  epoch++;
}
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', bumpLayoutEpoch, { passive: true, capture: true });
  window.addEventListener('resize', bumpLayoutEpoch, { passive: true });
}
