import { useEffect, useRef, useState } from 'react';
import { onFrame } from '../../../engine/frameLoop';
import type { World } from '../../../engine/world';
import { isReducedMotion } from '../../../state/settings';
import { SPOT_TARGETS, landing, nearestTarget, useStageProps, type Place, type PropId, type SpotTarget } from './stageProps';
import styles from './Incidents.module.css';

type Refs = Record<'stage' | 'cushionHome' | 'cupHome' | 'plant' | 'dot' | 'lamp' | SpotTarget, React.RefObject<HTMLElement>>;

interface Props {
  world: World;
  refs: Refs;
  /** The layer hands back its prop elements so incidents can aim Dot at them. */
  propEls: React.MutableRefObject<Partial<Record<PropId, HTMLElement | null>>>;
}

const WHERE: Record<Place, string> = { home: 'where it belongs', dot: 'Dot has it', floor: 'on the floor', hidden: 'behind the plant' };
const NAME: Record<PropId, string> = { cushion: 'The sofa cushion', cup: 'Pim’s teacup' };
const SPOT_NAME: Record<SpotTarget, string> = { pim: 'Pim', dot: 'Dot', tick: 'Tick', button: 'the button' };

const rel = (r: DOMRect, s: DOMRect) => ({ x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2, w: r.width, h: r.height });

/**
 * The movable things of the Living Room, drawn above the scenery: the cushion,
 * the teacup and Lumen's spotlight. Positions follow anchors (and Dot) every
 * frame; the visitor can drag them, or press Enter to put them back.
 */
export function PropLayer({ world, refs, propEls }: Props) {
  const props = useStageProps();
  const els = useRef<Partial<Record<PropId, HTMLButtonElement | null>>>({});
  const pos = useRef<Record<PropId, { x: number; y: number; w: number; h: number } | null>>({ cushion: null, cup: null });
  const drag = useRef<{ id: PropId | 'spot'; ox: number; oy: number; x: number; y: number; moved: number } | null>(null);
  const coneRef = useRef<SVGPolygonElement>(null);
  const poolRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<PropId | 'spot' | null>(null);

  // keep the incidents' handle on the elements
  useEffect(() => {
    propEls.current.cushion = els.current.cushion ?? null;
    propEls.current.cup = els.current.cup ?? null;
  });

  // every frame: where should each thing be, and glide it there
  useEffect(
    () =>
      onFrame((dt) => {
        const stage = refs.stage.current;
        if (!stage) return;
        const s = stage.getBoundingClientRect();
        const st = useStageProps.getState();
        const k = isReducedMotion() ? 1 : 1 - Math.exp(-dt / 90);
        for (const id of ['cushion', 'cup'] as const) {
          const el = els.current[id];
          const anchor = (id === 'cushion' ? refs.cushionHome : refs.cupHome).current;
          if (!el || !anchor) continue;
          const home = rel(anchor.getBoundingClientRect(), s);
          const p = st[id];
          let target = { x: home.x, y: home.y };
          if (drag.current?.id === id) target = { x: drag.current.x, y: drag.current.y };
          else if (p.place === 'dot' && refs.dot.current) {
            const d = rel(refs.dot.current.getBoundingClientRect(), s);
            target = { x: d.x, y: d.y - d.h * 0.55 };
          } else if (p.place === 'floor') target = { x: p.x * s.width, y: p.y * s.height };
          else if (p.place === 'hidden' && refs.plant.current) {
            const pl = rel(refs.plant.current.getBoundingClientRect(), s);
            target = { x: pl.x - pl.w * 0.18, y: pl.y + pl.h * 0.22 };
          }
          const cur = pos.current[id] ?? { ...target, w: home.w, h: home.h };
          const jump = drag.current?.id === id ? 1 : k;
          cur.x += (target.x - cur.x) * jump;
          cur.y += (target.y - cur.y) * jump;
          cur.w = home.w;
          cur.h = home.h;
          pos.current[id] = cur;
          el.style.width = `${home.w.toFixed(1)}px`;
          el.style.height = `${home.h.toFixed(1)}px`;
          el.style.transform = `translate(${(cur.x - home.w / 2).toFixed(1)}px, ${(cur.y - home.h / 2).toFixed(1)}px)${p.place === 'dot' ? ' rotate(-14deg)' : p.place === 'floor' ? ' rotate(8deg)' : ''}`;
        }
        // the spotlight: a cone from Lumen's shade to its target, and a pool of light there
        const svg = svgRef.current;
        const cone = coneRef.current;
        const pool = poolRef.current;
        if (svg && cone && pool && st.spot.on && refs.lamp.current) {
          svg.setAttribute('viewBox', `0 0 ${s.width.toFixed(0)} ${s.height.toFixed(0)}`);
          const lamp = refs.lamp.current.getBoundingClientRect();
          const src = { x: lamp.left - s.left + lamp.width * 0.5, y: lamp.top - s.top + lamp.height * 0.22 };
          let to = { x: s.width / 2, y: s.height * 0.7, w: 120 };
          if (drag.current?.id === 'spot') to = { x: drag.current.x, y: drag.current.y, w: 130 };
          else if (st.spot.target && refs[st.spot.target].current) {
            const t = rel(refs[st.spot.target].current!.getBoundingClientRect(), s);
            to = { x: t.x, y: t.y, w: Math.max(90, t.w * 1.15) };
          }
          const half = to.w / 2;
          cone.setAttribute('points', `${src.x - 14},${src.y} ${src.x + 14},${src.y} ${to.x + half},${to.y} ${to.x - half},${to.y}`);
          pool.style.transform = `translate(${(to.x - half).toFixed(1)}px, ${(to.y - half * 0.6).toFixed(1)}px)`;
          pool.style.width = `${to.w.toFixed(0)}px`;
          pool.style.height = `${(to.w * 1.2).toFixed(0)}px`;
        }
      }),
    [refs],
  );

  // ---- by hand
  const local = (e: React.PointerEvent) => {
    const s = refs.stage.current!.getBoundingClientRect();
    return { x: e.clientX - s.left, y: e.clientY - s.top, s };
  };

  const onDown = (id: PropId | 'spot') => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const q = local(e);
    const cur = id === 'spot' ? null : pos.current[id];
    drag.current = { id, ox: cur ? cur.x - q.x : 0, oy: cur ? cur.y - q.y : 0, x: cur?.x ?? q.x, y: cur?.y ?? q.y, moved: 0 };
    setDragging(id);
    if (id !== 'spot' && useStageProps.getState()[id].place === 'dot') {
      // taken straight off Dot
      useStageProps.getState().move(id, 'floor', { x: q.x / q.s.width, y: q.y / q.s.height });
      world.emit('OBJECT_STATE_CHANGED', { target: id, key: 'taken', value: 'from-dot' });
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const q = local(e);
    const nx = q.x + d.ox;
    const ny = q.y + d.oy;
    d.moved += Math.hypot(nx - d.x, ny - d.y);
    d.x = nx;
    d.y = ny;
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setDragging(null);
    if (!d) return;
    const q = local(e);
    if (d.id === 'spot') {
      const targets = SPOT_TARGETS.flatMap((t) => {
        const el = refs[t].current;
        return el ? [{ id: t, ...rel(el.getBoundingClientRect(), q.s) }] : [];
      });
      const t = d.moved < 4 ? nextTarget() : nearestTarget({ x: d.x, y: d.y }, targets, 120);
      if (t) aimSpot(t);
      return;
    }
    const id = d.id;
    // a tap on something out of place puts it back; a drag puts it where you let go
    if (d.moved < 4) {
      if (useStageProps.getState()[id].place !== 'home') putBack(id);
      return;
    }
    const anchor = (id === 'cushion' ? refs.cushionHome : refs.cupHome).current;
    const home = anchor ? rel(anchor.getBoundingClientRect(), q.s) : null;
    const place = landing({ x: d.x, y: d.y }, home, 70);
    // things let go of in mid-air fall to the floor
    const floorY = Math.max(d.y / q.s.height, 0.8);
    useStageProps.getState().move(id, place, place === 'floor' ? { x: Math.min(0.95, Math.max(0.05, d.x / q.s.width)), y: Math.min(0.94, floorY) } : undefined);
    world.emit('OBJECT_STATE_CHANGED', { target: id, key: 'visitor', value: place });
  };

  const putBack = (id: PropId) => {
    useStageProps.getState().move(id, 'home');
    world.emit('OBJECT_STATE_CHANGED', { target: id, key: 'visitor', value: 'home' });
    world.effects.sound('pop');
  };
  const nextTarget = (): SpotTarget => {
    const cur = useStageProps.getState().spot.target;
    const present = SPOT_TARGETS.filter((t) => refs[t].current);
    return present[(present.indexOf(cur ?? present[0]!) + 1) % present.length]!;
  };
  const aimSpot = (t: SpotTarget) => {
    useStageProps.getState().setSpot({ target: t });
    world.emit('OBJECT_STATE_CHANGED', { target: 'spot', key: 'visitor', value: t });
  };

  return (
    <div className={styles.layer}>
      {props.spot.on ? (
        <>
          <svg ref={svgRef} className={styles.cone} aria-hidden="true">
            <polygon ref={coneRef} points="" />
          </svg>
          <button
            ref={poolRef}
            type="button"
            className={styles.pool}
            data-dragging={dragging === 'spot'}
            aria-label={`Lumen’s spotlight, on ${props.spot.target ? SPOT_NAME[props.spot.target] : 'nobody'}. Press to move it to someone else, or drag it.`}
            onPointerDown={onDown('spot')}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => {
              drag.current = null;
              setDragging(null);
            }}
            onClick={(e) => e.detail === 0 && aimSpot(nextTarget())}
          />
        </>
      ) : null}
      {(['cushion', 'cup'] as const).map((id) => (
        <button
          key={id}
          ref={(el) => {
            els.current[id] = el;
          }}
          type="button"
          className={styles.prop}
          data-prop={id}
          data-place={props[id].place}
          data-dragging={dragging === id}
          aria-label={`${NAME[id]} (${WHERE[props[id].place]}).${props[id].place !== 'home' ? ' Press to put it back.' : ''}`}
          onPointerDown={onDown(id)}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => {
            drag.current = null;
            setDragging(null);
          }}
          onClick={(e) => {
            if (e.detail !== 0) return;
            if (props[id].place !== 'home') putBack(id);
          }}
        >
          {id === 'cushion' ? <CushionSvg /> : <CupSvg />}
        </button>
      ))}
    </div>
  );
}

const INK = { stroke: 'var(--char-ink)', strokeWidth: 2.5, strokeLinejoin: 'round' as const, vectorEffect: 'non-scaling-stroke' as const };

function CushionSvg() {
  return (
    <svg viewBox="0 0 66 74" className={styles.svg} aria-hidden="true">
      <path d="M4 30 Q 0 10 20 6 L 54 2 Q 66 2 66 16 L 64 70 L 8 72 Z" fill="var(--yellow)" {...INK} />
      <path d="M22 24 l 22 -3 M20 38 l 24 -2 M20 52 l 24 -2" stroke="var(--char-ink)" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
}

function CupSvg() {
  return (
    <svg viewBox="0 0 48 40" className={styles.svg} aria-hidden="true">
      <path d="M14 6 q 4 -5 0 -9 M24 6 q 4 -5 0 -9" fill="none" stroke="var(--char-ink)" strokeWidth="1.6" opacity="0.4" strokeLinecap="round" transform="translate(0 6)" />
      <path d="M6 14 H 34 V 28 Q 34 36 26 36 H 14 Q 6 36 6 28 Z" fill="#fffaf1" {...INK} />
      <path d="M34 18 q 9 0 9 6 q 0 6 -9 6" fill="none" {...INK} />
      <path d="M6 20 H 34" stroke="var(--coral)" strokeWidth="3" />
      <ellipse cx="20" cy="38" rx="17" ry="2.5" fill="var(--char-ink)" opacity="0.25" />
    </svg>
  );
}
