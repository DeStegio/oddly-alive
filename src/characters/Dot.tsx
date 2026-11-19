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
      const following =
        m.follow && pointer.active && pointer.inside && pointerInBounds && recentlyMoved;
      if (following) {
        // orbit politely: keep ~70px away, drifting around the pointer
        angle += dt * 0.0012;
        tx = px + Math.cos(angle) * 70;
        ty = py + Math.sin(angle) * 40 - 30;
      }
      if (isReducedMotion()) {
        x = tx;
        y = ty;
      } else {
        const k = following ? 0.0009 : 0.0005;
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
          aria-label="Dot, a small blue sphere who follows you around"
          onClick={onActivate}
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
