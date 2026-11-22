import { memo } from 'react';
import { sceneAt, type SceneDef } from './sceneGenerator';
import { ART, CAMEO_SPOT, Cameo, DEJA_SPOT } from './scenes';
import { H, W, ratio, type PortalShape } from './zoomController';

/**
 * The next room is clipped to the portal's shape, in its own (full-size)
 * coordinates. As you arrive (--arrive 0→1) the clip opens out past the
 * corners, so at the hand-over the next room shows edge to edge.
 */
const CLIP: Partial<Record<PortalShape, string>> = {
  circle: `circle(calc(${H / 2}px + var(--arrive, 0) * 300px) at 50% 50%)`,
  diamond: 'polygon(50% calc(var(--arrive, 0) * -60%), calc(100% + var(--arrive, 0) * 60%) 50%, 50% calc(100% + var(--arrive, 0) * 60%), calc(var(--arrive, 0) * -60%) 50%)',
};
import styles from './InfiniteRooms.module.css';

/** How many rooms deep we draw from the one you're in (you, the next, the one after). */
export const NEST = 2;

interface Props {
  def: SceneDef;
  /** 0 = the room you're in; 1 = the one in its portal; 2 = the one in that. */
  level: number;
}

/**
 * One room, drawn at its full 1000×625 size, with the next room shrunk into
 * its portal (and the one after that in the next portal). The frame around
 * the portal fades out as you arrive (driven by --arrive on the stage),
 * so the hand-over to the next room is seamless.
 */
export const SceneView = memo(function SceneView({ def, level }: Props) {
  const art = ART[def.archetype];
  const p = def.portal;
  const r = ratio(p);
  const mirror = def.flip ? 'translate(1000 0) scale(-1 1)' : undefined;
  const cameo = CAMEO_SPOT[def.archetype];
  const deja = DEJA_SPOT[def.archetype];
  const next = level < NEST ? sceneAt(def.seed, def.depth + 1) : null;
  const prev = def.dejaVu && def.depth > 1 ? sceneAt(def.seed, def.depth - 1) : null;
  return (
    <div className={styles.scene} style={{ width: W, height: H }} data-archetype={def.archetype} data-level={level}>
      <svg className={styles.art} viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
        <g transform={mirror}>
          {art.back(def)}
          {def.cameo ? <Cameo who={def.cameo} x={cameo.x} y={cameo.y} s={cameo.s} /> : null}
          {prev ? (
            <g transform={`translate(${deja.x} ${deja.y})`}>
              <rect x="-6" y="-6" width="132" height="87" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="3" />
              {/* a little picture of the room you just came from */}
              <svg x="0" y="0" width="120" height="75" viewBox={`0 0 ${W} ${H}`}>
                {ART[prev.archetype].back(prev)}
              </svg>
            </g>
          ) : null}
        </g>
      </svg>
      {/* the room beyond */}
      <div className={styles.portal} style={{
          left: p.x,
          top: p.y,
          width: W,
          height: H,
          transform: `scale(${r})`,
          background: ART[(next ?? sceneAt(def.seed, def.depth + 1)).archetype].ground,
          clipPath: CLIP[p.shape],
          // only the room you're in opens its portal as you arrive
          ...(level > 0 ? ({ '--arrive': 0 } as React.CSSProperties) : null),
        }}>
        {next ? <SceneView def={next} level={level + 1} /> : null}
      </div>
      <svg className={styles.art} viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
        <g className={level === 0 ? styles.frameFade : undefined}>{art.frame(def)}</g>
        {art.front ? art.front(def) : null}
      </svg>
    </div>
  );
});

