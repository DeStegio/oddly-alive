import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { INFINITE } from '../../../content/infinite';
import { onFrame } from '../../../engine/frameLoop';
import type { World } from '../../../engine/world';
import { isReducedMotion } from '../../../state/settings';
import { hashString } from '../../../engine/rng';
import { sceneAt } from './sceneGenerator';
import { ART } from './scenes';
import { SceneView } from './SceneView';
import { ASPECT, EXIT_AT, W, cameraTransform, pinchToZoom, ratio, startCamera, wheelToZoom, zoomBy, type Camera } from './zoomController';
import styles from './InfiniteRooms.module.css';

interface Props {
  world: World;
  seed: number;
  /** Where the little frame is on screen: we grow out of it, and shrink back into it. */
  fromRect: () => DOMRect | null;
  onClose: () => void;
}

const ARRIVE_FROM = 0.72;
const STEP_MS = 1100;

/**
 * Infinite Rooms: through the little picture in the Living Room, a room; in
 * that room, a way into another; and so on, as far as you like. You set the
 * pace (wheel, pinch, + and −, the arrow keys); Home brings you back. Rooms
 * are generated from the seed and depth; only three are ever drawn.
 */
export function InfiniteRooms({ world, seed, fromRect, onClose }: Props) {
  const cam = useRef<Camera>(startCamera());
  const [depth, setDepth] = useState(1);
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing'>('opening');
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tween = useRef<{ from: number; to: number; t0: number; ms: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef(0);
  const deepest = useRef(1);
  const [fade, setFade] = useState(0);
  const def = sceneAt(seed, depth);
  // now and then, Dot is already here, ahead of you (rare, seeded, once per room)
  const surprise = def.archetype !== 'false' && depth > 1 && hashString(`${seed}:dot-ahead:${depth}`) % 6 === 0;
  const closing = useRef(false);

  /** Map the stage onto the little frame (k = 1: fully shrunk into it). */
  const shrinkTo = useCallback(
    (k: number) => {
      const stage = stageRef.current;
      const to = fromRect();
      if (!stage || !to) return;
      // the stage's natural box (its parent isn't transformed, so measure from there)
      const vp = stage.parentElement!.getBoundingClientRect();
      const natural = { left: vp.left + (vp.width - stage.offsetWidth) / 2, top: vp.top + (vp.height - stage.offsetHeight) / 2, width: stage.offsetWidth };
      const sc = 1 + (to.width / natural.width - 1) * k;
      const dx = (to.left - natural.left) * k;
      const dy = (to.top - natural.top) * k;
      stage.style.transform = k === 0 ? '' : `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${sc.toFixed(4)})`;
      if (rootRef.current) rootRef.current.style.setProperty('--veil', (1 - k).toFixed(3));
    },
    [fromRect],
  );

  const apply = useCallback(() => {
    const stage = stageRef.current;
    const w = worldRef.current;
    if (!stage || !w) return;
    const c = cam.current;
    const d = sceneAt(seed, c.depth);
    const sw = stage.clientWidth || 1;
    w.style.transform = cameraTransform(d.portal, c.p, sw);
    stage.style.setProperty('--arrive', Math.max(0, Math.min(1, (c.p - ARRIVE_FROM) / (0.96 - ARRIVE_FROM))).toFixed(3));
    if (phase === 'open' && !closing.current) shrinkTo(c.out / EXIT_AT * 0.85);
  }, [phase, seed, shrinkTo]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setPhase('closing');
    world.emit('OBJECT_STATE_CHANGED', { target: 'infinite', key: 'exit', value: deepest.current });
  }, [world]);

  /** Move by dp rooms; handles crossing into the next/previous room. */
  const move = useCallback(
    (dp: number) => {
      if (closing.current) return;
      const r = zoomBy(cam.current, dp);
      cam.current = r.cam;
      for (const e of r.events) {
        if (e.type === 'exit') close();
        else if (e.type === 'entered') {
          if (e.depth > deepest.current) deepest.current = e.depth;
          const d = sceneAt(seed, e.depth);
          world.emit('OBJECT_STATE_CHANGED', { target: 'infinite', key: 'room', value: d.archetype });
          if (e.depth >= 10) world.effects.discover('deep-end');
          if (d.archetype === 'false') world.effects.discover('false-return');
        }
      }
      if (r.cam.depth !== depth) setDepth(r.cam.depth);
      else apply();
    },
    [apply, close, depth, seed, world],
  );

  /** + / −: glide a whole room (or jump, with reduced motion). */
  const step = useCallback(
    (dir: 1 | -1) => {
      if (isReducedMotion()) {
        setFade((f) => f + 1);
        const c = cam.current;
        if (dir < 0 && c.depth <= 1) return close();
        cam.current = { depth: Math.max(1, c.depth + dir), p: 0, out: 0 };
        setDepth(cam.current.depth);
        if (dir > 0) {
          const d = sceneAt(seed, cam.current.depth);
          world.emit('OBJECT_STATE_CHANGED', { target: 'infinite', key: 'room', value: d.archetype });
          if (cam.current.depth > deepest.current) deepest.current = cam.current.depth;
          if (cam.current.depth >= 10) world.effects.discover('deep-end');
          if (d.archetype === 'false') world.effects.discover('false-return');
        }
        return;
      }
      const c = cam.current;
      const from = c.depth + c.p - c.out;
      const to = dir > 0 ? Math.floor(from + 1e-6) + 1 : Math.ceil(from - 1e-6) - 1;
      tween.current = { from, to: dir < 0 && to < 1 ? 1 - EXIT_AT - 0.01 : to, t0: performance.now(), ms: STEP_MS };
    },
    [close, seed, world],
  );

  // the tween, and keeping the transform right
  useEffect(
    () =>
      onFrame(() => {
        const t = tween.current;
        if (!t) return;
        const k = Math.min(1, (performance.now() - t.t0) / t.ms);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        const target = t.from + (t.to - t.from) * e;
        const c = cam.current;
        const now = c.depth + c.p - c.out;
        move(target - now);
        if (k >= 1) tween.current = null;
      }),
    [move],
  );

  useLayoutEffect(() => {
    apply();
  }, [apply, depth]);

  useEffect(() => {
    if (!surprise) return;
    const t = window.setTimeout(() => world.emit('OBJECT_STATE_CHANGED', { target: 'infinite', key: 'surprise', value: 'dot-ahead' }), 5200);
    return () => window.clearTimeout(t);
  }, [surprise, world, depth]);

  // opening: grow out of the little frame
  useLayoutEffect(() => {
    if (phase !== 'opening') return;
    world.emit('OBJECT_STATE_CHANGED', { target: 'infinite', key: 'enter', value: true });
    world.effects.discover('infinite-rooms');
    shrinkTo(1);
    const stage = stageRef.current;
    if (!stage) return;
    void stage.offsetWidth;
    stage.classList.add(styles.animating ?? 'animating');
    shrinkTo(0);
    const t = window.setTimeout(() => {
      stage.classList.remove(styles.animating ?? 'animating');
      setPhase('open');
    }, isReducedMotion() ? 10 : 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // closing: shrink back into it, then go
  useEffect(() => {
    if (phase !== 'closing') return;
    const stage = stageRef.current;
    stage?.classList.add(styles.animating ?? 'animating');
    // first walk the camera back to room 1 (instantly), then shrink
    cam.current = { depth: 1, p: 0, out: 0 };
    setDepth(1);
    requestAnimationFrame(() => shrinkTo(1));
    const t = window.setTimeout(onClose, isReducedMotion() ? 10 : 800);
    return () => window.clearTimeout(t);
  }, [onClose, phase, shrinkTo]);

  // input: wheel and pinch only here, keys, and no scrolling the page behind
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      tween.current = null;
      move(wheelToZoom(e.deltaY, e.deltaMode));
    };
    root.addEventListener('wheel', onWheel, { passive: false });
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      root.removeEventListener('wheel', onWheel);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [move]);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Home') {
      e.preventDefault();
      close();
    } else if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp' || e.key === 'PageDown') {
      e.preventDefault();
      step(1);
    } else if (e.key === '-' || e.key === '_' || e.key === 'ArrowDown' || e.key === 'PageUp') {
      e.preventDefault();
      step(-1);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchDist.current = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      tween.current = null;
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size !== 2 || !pinchDist.current) return;
    const [a, b] = Array.from(pointers.current.values());
    const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    move(pinchToZoom(dist / pinchDist.current, ratio(sceneAt(seed, cam.current.depth).portal)));
    pinchDist.current = dist;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = 0;
  };

  const p = def.portal;
  const portalLabel = INFINITE.portal[def.archetype];

  return createPortal(
    <div
      ref={rootRef}
      className={styles.root}
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-label={INFINITE.title}
      tabIndex={-1}
      onKeyDown={onKey}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-depth={depth}
      data-archetype={def.archetype}
    >
      <div className={styles.veil} aria-hidden="true" />
      <div className={styles.viewport}>
        <div ref={stageRef} className={styles.stage} style={{ aspectRatio: `${1 / ASPECT}` }}>
          <div key={fade} className={styles.fadeIn}>
            <div ref={worldRef} className={styles.world} style={{ width: W }}>
              <SceneView def={def} level={0} />
              {surprise ? (
                <svg key={depth} className={styles.zip} viewBox="-30 -40 60 70" aria-hidden="true">
                  <circle r="26" fill="var(--blue)" stroke="var(--char-ink)" strokeWidth="3" />
                  <circle cx="10" cy="-4" r="10" fill="#fffaf1" stroke="var(--char-ink)" strokeWidth="2" />
                  <circle cx="14" cy="-4" r="4.5" fill="var(--char-ink)" />
                </svg>
              ) : null}
              {/* the portal, as something you can press */}
              <button
                type="button"
                className={styles.portalHit}
                style={{ left: p.x, top: p.y, width: p.w, height: p.w * ASPECT }}
                aria-label={portalLabel}
                onClick={() => {
                  step(1);
                  // focus rides with the room, not the (soon enormous) portal
                  rootRef.current?.focus();
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <p className={styles.caption} aria-live="polite">
        {ART[def.archetype].label} <span className={styles.depth}>{INFINITE.depth(depth)}</span>
      </p>
      <div className={styles.controls} role="group" aria-label={INFINITE.controls}>
        <button type="button" className="paper-btn" onClick={() => step(-1)} aria-label={INFINITE.zoomOut}>
          −
        </button>
        <button type="button" className="paper-btn" onClick={() => step(1)} aria-label={INFINITE.zoomIn}>
          +
        </button>
        <button type="button" className="paper-btn" onClick={close}>
          {INFINITE.home}
        </button>
      </div>
    </div>,
    document.body,
  );
}
