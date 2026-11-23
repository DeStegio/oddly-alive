import type { SVGProps } from 'react';

interface InkProps extends Omit<SVGProps<SVGPathElement>, 'stroke' | 'strokeWidth' | 'fill'> {
  d: string;
  /** Base stroke width in SVG units (one width per scale: 2.5 props, 2 details, 1.5 tiny). */
  w?: number;
  /** Fill for closed shapes (defaults to none). */
  fill?: string;
  color?: string;
}

/**
 * A hand-inked line: the path drawn twice, a full stroke and a thinner one
 * nudged towards the shade side, so the line swells a little on one edge the
 * way a dip pen does. The fill is painted once, under both strokes.
 */
export function Ink({ d, w = 2.5, fill = 'none', color = 'var(--char-ink)', ...rest }: InkProps) {
  return (
    <g>
      <path d={d} fill={fill} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" {...rest} />
      <path d={d} fill="none" stroke={color} strokeWidth={w * 0.5} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${(w * 0.28).toFixed(2)} ${(w * 0.22).toFixed(2)})`} opacity={0.9} />
    </g>
  );
}

/**
 * The shade side of a cut-out shape: the same outline shifted away from the
 * scene light and clipped to the shape, filled with the ramp's darker step.
 * Flat paper, no gradient. `id` must be unique on the page.
 */
export function ShadeSide({ d, fill, dx = 3, dy = 3, id }: { d: string; fill: string; dx?: number; dy?: number; id: string }) {
  return (
    <g aria-hidden="true">
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={fill} />
        <path d={d} fill="var(--sheet, transparent)" transform={`translate(${-dx} ${-dy})`} />
      </g>
    </g>
  );
}
