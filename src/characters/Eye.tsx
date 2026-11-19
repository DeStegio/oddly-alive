import { useEffect, useId, useRef } from 'react';
import { onFrame } from '../engine/frameLoop';
import { layoutEpoch, pointer } from '../engine/pointer';
import { isReducedMotion } from '../state/settings';

export interface GazeControl {
  /** When set, pupils look in this normalized direction instead of the pointer. */
  override: { x: number; y: number } | null;
  /** Invert the direction (looking away from the pointer). */
  avert: boolean;
}

interface EyeProps {
  cx: number;
  cy: number;
  r: number;
  pupil: number;
  /** 0 = open, 1 = closed. */
  lid: number;
  gaze?: React.MutableRefObject<GazeControl>;
  /** How far pupils travel, as a fraction of (r - pupil). */
  reach?: number;
  lidColor?: string;
  pupilScale?: number;
  className?: string;
}

/**
 * An eye that tracks the pointer imperatively (no React re-render per frame).
 * The lid is a rect clipped to the eye; CSS transitions its scale.
 */
export function Eye({
  cx,
  cy,
  r,
  pupil,
  lid,
  gaze,
  reach = 0.85,
  lidColor = 'var(--lavender)',
  pupilScale = 1,
  className,
}: EyeProps) {
  const pupilRef = useRef<SVGGElement>(null);
  const eyeRef = useRef<SVGCircleElement>(null);
  const clipId = useId().replace(/:/g, '');

  useEffect(() => {
    const max = (r - pupil) * reach;
    let curX = 0;
    let curY = 0;
    let rect: DOMRect | null = null;
    let seenEpoch = -1;
    let frames = 0;
    let lastMove = -1;
    let lastEpoch = -1;
    let idle = false;
    let wasSpecial = false;
    return onFrame(() => {
      const el = eyeRef.current;
      const p = pupilRef.current;
      if (!el || !p) return;
      // nothing moved and no override: skip the work entirely
      const g0 = gaze?.current;
      const special = Boolean(g0?.override) || Boolean(g0?.avert);
      const skip = !special && !wasSpecial && pointer.lastMove === lastMove && layoutEpoch() === lastEpoch && idle;
      wasSpecial = special;
      if (skip) return;
      lastMove = pointer.lastMove;
      lastEpoch = layoutEpoch();
      let tx = 0;
      let ty = 0;
      const g = gaze?.current;
      if (g?.override) {
        tx = g.override.x * max;
        ty = g.override.y * max;
      } else if (pointer.active && (pointer.inside || performance.now() - pointer.lastMove < 3500)) {
        // after the pointer leaves the page, eyes keep looking where it was for a few seconds (INT-012)
        frames++;
        if (!rect || seenEpoch !== layoutEpoch() || frames % 30 === 0) {
          rect = el.getBoundingClientRect();
          seenEpoch = layoutEpoch();
        }
        const ex = rect.left + rect.width / 2;
        const ey = rect.top + rect.height / 2;
        let dx = pointer.x - ex;
        let dy = pointer.y - ey;
        const dist = Math.hypot(dx, dy) || 1;
        const strength = Math.min(1, dist / 160);
        dx = (dx / dist) * max * strength;
        dy = (dy / dist) * max * strength;
        tx = g?.avert ? -dx : dx;
        ty = g?.avert ? -dy * 0.6 : dy;
      }
      // settled: nothing to write this frame (until the pointer moves again)
      idle = Math.abs(tx - curX) + Math.abs(ty - curY) < 0.04 && !g?.avert;
      if (idle) return;
      const k = isReducedMotion() ? 1 : 0.22;
      curX += (tx - curX) * k;
      curY += (ty - curY) * k;
      p.setAttribute('transform', `translate(${curX.toFixed(2)} ${curY.toFixed(2)})`);
    });
  }, [r, pupil, reach, gaze]);

  return (
    <g className={className}>
      <clipPath id={clipId}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <circle
        ref={eyeRef}
        cx={cx}
        cy={cy}
        r={r}
        fill="#fff"
        stroke="var(--char-ink, #24232b)"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
      <g clipPath={`url(#${clipId})`}>
        <g ref={pupilRef}>
          <circle
            cx={cx}
            cy={cy}
            r={pupil * pupilScale}
            fill="#24232b"
            style={{ transition: 'r var(--dur-ui) var(--ease-out)' }}
          />
          <circle cx={cx + pupil * 0.35} cy={cy - pupil * 0.4} r={pupil * 0.3} fill="#fff" />
        </g>
        <rect
          x={cx - r - 2}
          y={cy - r - 2}
          width={r * 2 + 4}
          height={r * 2 + 4}
          fill={lidColor}
          stroke="var(--char-ink, #24232b)"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
          className="oa-lid"
          style={{
            transformBox: 'fill-box',
            transformOrigin: 'top',
            transform: `scaleY(${lid})`,
            transition: 'transform 140ms var(--ease-out)',
          }}
        />
      </g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--char-ink, #24232b)"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
