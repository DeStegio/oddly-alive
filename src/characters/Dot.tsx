import { useEffect, useRef } from 'react';
import { onFrame } from '../engine/frameLoop';
import { layoutEpoch, pointer } from '../engine/pointer';
import { isReducedMotion } from '../state/settings';
import type { Expression } from '../engine/types';
import { Eye, type GazeControl } from './Eye';
import { ThoughtBubble } from './ThoughtBubble';
import styles from './Dot.module.css';

export interface DotMotion {
  /** Follow the pointer when it is inside the bounds element. */
  follow: boolean;
  /** Home position as a fraction of the bounds (0..1). */
  home: { x: number; y: number };
  /** Called with path samples while following (for mimicry/circle detection). */
  onFollowSample?: (x: number, y: number, speed: number) => void;
  /** Called when Dot has been very close to the pointer for a moment. */
  onCatch?: () => void;
  /** Called when the pointer has been moving wildly near Dot. */
  onFrenzy?: () => void;
  /** Called when Dot starts re-tracing the pointer's recent path (INT-010). */
  onMimic?: () => void;
  /**
   * Somewhere Dot has decided to go (an agent goal): a point in client
   * coordinates, read every frame so it can follow a moving prop. Beats
   * following the pointer. onArrive fires once, when Dot gets there.
   */
  errand?: { target: () => { x: number; y: number } | null; onArrive?: () => void; arrived?: boolean } | null;
}

interface DotProps {
  expression: Expression;
  thought: string | null;
  rootRef: React.RefObject<HTMLDivElement>;
  gaze: React.MutableRefObject<GazeControl>;
  boundsRef: React.RefObject<HTMLElement>;
  motion: React.MutableRefObject<DotMotion>;
  onActivate?: () => void;
}

const SIZE = 56;

/**
 * Dot: a small blue sphere that trails the pointer with a spring, keeps a
 * polite distance, and goes home when you stop moving. Position is written
 * imperatively every frame; React never re-renders for it.
 */
export function Dot({
  expression,
  thought,
  rootRef,
  gaze,
  boundsRef,
  motion,
  onActivate,
}: DotProps) {
  const moverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let x = -1;
    let y = -1;
    let vx = 0;
    let vy = 0;
    let closeFrames = 0;
    let angle = 0;
    let rect: DOMRect | null = null;
    let seen = -1;
    let frames = 0;
    let fastFrames = 0;
    let wasFollowing = false;
    let lungeUntil = 0;
    let nextLunge = 0;
    const path: Array<{ x: number; y: number }> = [];
    let lastSampleAt = -1;
    let mimic: { pts: Array<{ x: number; y: number }>; i: number; ox: number; oy: number } | null = null;
    return onFrame((dt, now) => {
      const bounds = boundsRef.current;
      const mover = moverRef.current;
      if (!bounds || !mover) return;
      frames++;
      if (!rect || seen !== layoutEpoch() || frames % 60 === 0) {
        rect = bounds.getBoundingClientRect();
        seen = layoutEpoch();
      }
      const m = motion.current;
      const homeX = rect.width * m.home.x;
      const homeY = rect.height * m.home.y;
      if (x < 0) {
        x = homeX;
        y = homeY;
      }
      let tx = homeX;
      let ty = homeY;
      const px = pointer.x - rect.left;
      const py = pointer.y - rect.top;
      const pointerInBounds = px >= 0 && py >= 0 && px <= rect.width && py <= rect.height;
      const recentlyMoved = now - pointer.lastMove < 3500;
      // touch pointers are not followed: on phones Dot stays put and tappable
      const errand = m.errand ?? null;
      const goal = errand ? errand.target() : null;
      const following =
        !goal && m.follow && pointer.active && pointer.inside && pointer.kind !== 'touch' && pointerInBounds && recentlyMoved;
      // while following, Dot must never intercept the clicks meant for what's under the pointer
      if (following !== wasFollowing) {
        wasFollowing = following;
        mover.dataset.following = String(following);
      }
      // record the pointer's path; when it stops after a long stroke, sometimes retrace it
      if (following && pointer.lastMove !== lastSampleAt) {
        lastSampleAt = pointer.lastMove;
        path.push({ x: px, y: py });
        if (path.length > 90) path.shift();
      }
      if (!following && mimic === null && path.length > 30 && now - pointer.lastMove > 900 && now - pointer.lastMove < 1400 && m.follow) {
        let len = 0;
        for (let i = 1; i < path.length; i++) len += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
        if (len > 400 && Math.random() < 0.35) {
          mimic = { pts: path.slice(), i: 0, ox: x - path[0]!.x, oy: y - path[0]!.y };
          m.onMimic?.();
        }
        path.length = 0;
      }
      if (mimic && (following || mimic.i >= mimic.pts.length)) mimic = null;
      if (mimic) {
        const p = mimic.pts[Math.floor(mimic.i)]!;
        tx = p.x + mimic.ox * 0.3;
        ty = p.y + mimic.oy * 0.3;
        mimic.i += dt / 16;
      }
      if (goal) {
        tx = goal.x - rect.left;
        ty = goal.y - rect.top;
        if (errand && !errand.arrived && Math.hypot(tx - x, ty - y) < 16) {
          errand.arrived = true;
          errand.onArrive?.();
        }
      }
      if (following) {
        // orbit politely: keep ~70px away, drifting around the pointer
        // ...and every so often, try to catch it (INT-014)
        if (now > nextLunge) {
          nextLunge = now + 6000 + Math.random() * 6000;
          if (Math.random() < 0.55) lungeUntil = now + 800;
        }
        const reach = now < lungeUntil ? 0.08 : 1;
        angle += dt * 0.0012;
        tx = px + Math.cos(angle) * 70 * reach;
        ty = py + (Math.sin(angle) * 40 - 30) * reach;
      }
      if (isReducedMotion()) {
        x = tx;
        y = ty;
      } else {
        const k = following ? 0.0009 : goal ? 0.0011 : 0.0005;
        const damping = 0.86;
        vx = (vx + (tx - x) * k * dt) * damping;
        vy = (vy + (ty - y) * k * dt) * damping;
        x += vx * (dt / 16);
        y += vy * (dt / 16);
      }
      x = Math.max(SIZE / 2, Math.min(rect.width - SIZE / 2, x));
      y = Math.max(SIZE / 2, Math.min(rect.height - SIZE / 2, y));
      const speed = Math.hypot(vx, vy);
      const stretch = Math.min(0.18, speed * 0.02);
      const tilt = Math.max(-20, Math.min(20, vx * 2));
      mover.style.transform = `translate3d(${(x - SIZE / 2).toFixed(1)}px, ${(y - SIZE / 2).toFixed(1)}px, 0) rotate(${tilt.toFixed(1)}deg) scale(${(1 + stretch).toFixed(3)}, ${(1 - stretch).toFixed(3)})`;
      if (following) {
        m.onFollowSample?.(px, py, pointer.speed);
        const d = Math.hypot(px - x, py - y);
        closeFrames = d < 40 ? closeFrames + 1 : 0;
        if (closeFrames === 20) m.onCatch?.();
        fastFrames = pointer.speed > 2.4 ? fastFrames + 1 : Math.max(0, fastFrames - 1);
        if (fastFrames > 40) {
          fastFrames = 0;
          m.onFrenzy?.();
        }
      }
    });
  }, [boundsRef, motion]);

  return (
    <div ref={moverRef} className={styles.mover} style={{ width: SIZE, height: SIZE }}>
      <div ref={rootRef} className={styles.root} data-expression={expression}>
        <ThoughtBubble text={thought} />
        <button
          type="button"
          className={`prop-btn ${styles.hit}`}
          aria-label="Dot, a small blue sphere who follows you around (arrow keys move him)"
          onClick={onActivate}
          onKeyDown={(e) => {
            // arrows nudge Dot's resting spot while Dot is focused (INT-044)
            const step = 0.04;
            const h = motion.current.home;
            const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            const mv = moves[e.key];
            if (!mv) return;
            e.preventDefault();
            h.x = Math.min(0.95, Math.max(0.05, h.x + mv[0]));
            h.y = Math.min(0.92, Math.max(0.2, h.y + mv[1]));
          }}
        >
          <svg viewBox="0 0 60 60" className={styles.svg} aria-hidden="true">
            <ellipse cx="30" cy="57" rx="14" ry="2.5" fill="var(--shadow-ink)" opacity="0.2" />
            <g className={styles.body}>
              <path
                d="M24 9 Q 22 2 27 1"
                fill="none"
                stroke="var(--char-ink)"
                strokeWidth="2.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx="30"
                cy="31"
                r="22"
                fill="var(--blue)"
                stroke="var(--char-ink)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M16 24 Q 19 15 27 12"
                fill="none"
                stroke="#fff"
                strokeOpacity="0.6"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <Eye
                cx={31}
                cy={29}
                r={10.5}
                pupil={4.6}
                lid={
                  expression === 'sleepy'
                    ? 0.55
                    : expression === 'asleep'
                      ? 1
                      : expression === 'mischievous' || expression === 'suspicious'
                        ? 0.4
                        : expression === 'annoyed'
                          ? 0.45
                          : 0.05
                }
                gaze={gaze}
                lidColor="var(--blue)"
                pupilScale={
                  expression === 'excited' || expression === 'curious'
                    ? 1.2
                    : expression === 'dizzy'
                      ? 0.6
                      : 1
                }
              />
              <path
                d={
                  expression === 'happy' || expression === 'excited' || expression === 'mischievous'
                    ? 'M25 42 Q 31 47 37 42'
                    : expression === 'annoyed'
                      ? 'M25 44 L 37 43'
                      : expression === 'surprised'
                        ? 'M29 44 a 2.5 3 0 1 0 5 0 a 2.5 3 0 1 0 -5 0'
                        : 'M27 43 Q 31 45 35 43'
                }
                fill="none"
                stroke="var(--char-ink)"
                strokeWidth="2.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </svg>
        </button>
      </div>
    </div>
  );
}
