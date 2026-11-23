import { useEffect, useRef, type ReactNode } from 'react';
import { LivingTitle } from '../components/LivingTitle';
import { onFrame } from '../engine/frameLoop';
import { pointer } from '../engine/pointer';
import { useSettings } from '../state/settings';
import styles from './art.module.css';

interface StageProps {
  /** Accessible room name, shown on the paper tag. */
  label: string;
  /** Id of the room's h1 (the tag). */
  id: string;
  className?: string;
  /** A small line beside the tag (desktop only). */
  note?: ReactNode;
  children: ReactNode;
  /** Scene light direction for this room (−1..1). */
  light?: { x: number; y: number };
  /** `data-*` attributes for the section. */
  data?: Record<string, string | undefined>;
  stageRef?: React.RefObject<HTMLElement>;
  style?: React.CSSProperties;
}

/**
 * A room as a full-viewport stage (L8): the play area fills the first screen,
 * the room's name is a small paper tag over the corner, and depth layers
 * (`<Layer depth="far|mid|play|near">`) drift a few pixels with the pointer.
 * Reduced motion: no drift.
 */
export function Stage({ label, id, className, note, children, light, data, stageRef, style }: StageProps) {
  const own = useRef<HTMLElement>(null);
  const ref = stageRef ?? own;
  const reduced = useSettings((s) => s.motion) === 'reduced';

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let px = 0;
    let py = 0;
    return onFrame((dt) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const tx = pointer.active ? (pointer.x / w) * 2 - 1 : 0;
      const ty = pointer.active ? (pointer.y / h) * 2 - 1 : 0;
      const k = 1 - Math.exp(-dt / 260);
      const nx = px + (tx - px) * k;
      const ny = py + (ty - py) * k;
      if (Math.abs(nx - px) + Math.abs(ny - py) < 0.0005) return;
      px = nx;
      py = ny;
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
    });
  }, [ref, reduced]);

  const dataAttrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={`${styles.stage} ${className ?? ''}`}
      aria-labelledby={id}
      style={{ ...(light ? { '--light-x': light.x, '--light-y': light.y } : {}), ...style } as React.CSSProperties}
      {...dataAttrs}
    >
      <div className={styles.tag}>
        <LivingTitle id={id} lines={[label]} label={label} size="tag" radius={90} />
        {note ? <span className={styles.tagNote}>{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** One depth layer of a stage. `play` does not drift (that is where the hands are). */
export function Layer({ depth, className, children, style }: { depth: 'far' | 'mid' | 'play' | 'near'; className?: string; children?: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={`${styles.layer} ${className ?? ''}`} data-depth={depth} style={style}>
      {children}
    </div>
  );
}

/**
 * The compact room label on its own (for rooms that keep their own layout):
 * a small paper tag carrying the room's h1, where the giant split title used
 * to be (Phase 4, L8: the first screen is for playing, not reading).
 */
export function RoomTag({ id, label, note, lines, actorId, onShove }: { id: string; label: string; note?: ReactNode; lines?: string[]; actorId?: Parameters<typeof LivingTitle>[0]['actorId']; onShove?: () => void }) {
  return (
    <div className={`${styles.tag} ${styles.tagInline}`}>
      <LivingTitle id={id} lines={lines ?? [label]} label={label} size="tag" radius={90} actorId={actorId} onShove={onShove} />
      {note ? <span className={styles.tagNote}>{note}</span> : null}
    </div>
  );
}
