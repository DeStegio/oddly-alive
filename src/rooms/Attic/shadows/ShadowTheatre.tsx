import { useCallback, useEffect, useRef, useState } from 'react';
import { SHADOWS } from '../../../content/shadows';
import type { World } from '../../../engine/world';
import { STAGE, cast, nudgeApart, recognise, startProps, type Creature, type Lamp, type Prop, type PropKind, type Recognition } from './geometry';
import styles from './Shadows.module.css';

const INK = '#24232b';

/** Silhouettes, drawn around (0,0), about 60 units across. Props use the same shapes in colour. */
const SHAPES: Record<PropKind, string> = {
  handL: 'M-14 26 L -16 -2 L -24 -14 Q -26 -20 -20 -20 L -10 -8 L -12 -28 Q -12 -34 -6 -33 L -2 -12 L 0 -34 Q 2 -40 7 -37 L 8 -12 L 12 -30 Q 15 -35 19 -31 L 16 -6 L 20 -20 Q 24 -24 26 -18 L 20 8 Q 16 26 6 28 Z',
  handR: 'M14 26 L 16 -2 L 24 -14 Q 26 -20 20 -20 L 10 -8 L 12 -28 Q 12 -34 6 -33 L 2 -12 L 0 -34 Q -2 -40 -7 -37 L -8 -12 L -12 -30 Q -15 -35 -19 -31 L -16 -6 L -20 -20 Q -24 -24 -26 -18 L -20 8 Q -16 26 -6 28 Z',
  hat: 'M-16 10 V -24 H 16 V 10 Z M-30 10 H 30 V 18 H -30 Z',
  cup: 'M-20 -12 H 16 V 8 Q 16 20 4 20 H -8 Q -20 20 -20 8 Z M16 -6 Q 28 -6 28 2 Q 28 10 16 10',
  kettle: 'M-22 18 Q -26 -10 0 -14 Q 26 -10 22 18 Z M-8 -14 Q 0 -26 8 -14 M22 0 L 36 -14 L 38 -10 L 24 6',
  fern: 'M0 30 Q 2 0 -2 -32 M0 20 Q -16 14 -22 4 M0 20 Q 16 14 22 4 M-1 6 Q -14 0 -18 -10 M-1 6 Q 14 0 18 -10 M-2 -8 Q -12 -14 -14 -22 M-2 -8 Q 10 -14 12 -22',
  bust: 'M-12 -30 Q 0 -36 12 -30 L 10 -22 Q 22 -16 20 4 Q 14 22 0 26 Q -14 22 -20 4 Q -22 -16 -10 -22 Z M-3 26 V 34 M-10 36 H 10',
};
const STROKED: Partial<Record<PropKind, boolean>> = { fern: true };
const COLOUR: Record<PropKind, string> = { handL: '#f1d3b5', handR: '#f1d3b5', hat: '#4a3f63', cup: '#fffaf1', kettle: '#c94f5e', fern: '#3f7a52', bust: '#e8d5c4' };

const CREATURE: Record<Creature, string> = {
  bird: 'M-40 0 Q -20 -26 0 -4 Q 20 -26 40 0 Q 20 -10 6 4 L 0 12 L -6 4 Q -20 -10 -40 0 Z',
  rabbit: 'M-18 24 Q -26 0 -10 -6 L -16 -40 Q -12 -46 -8 -40 L -2 -10 L 4 -42 Q 8 -48 12 -42 L 6 -6 Q 22 0 18 24 Z',
  cat: 'M-20 26 Q -26 -4 -14 -14 L -18 -32 L -6 -20 Q 0 -22 6 -20 L 18 -32 L 14 -14 Q 26 -4 20 26 Z M18 20 Q 40 14 34 -6',
  dragon: 'M-36 10 Q -30 -16 -4 -14 L 4 -24 L 8 -12 Q 26 -10 34 0 Q 20 4 8 6 L 14 16 L -4 10 Q -20 22 -36 10 Z',
  curtsy: SHAPES.bust,
};

interface Props {
  world: World;
  /** Marguerite has views on her own shadow. */
  onMarguerite: (line: string) => void;
  /** A shape came alive (the attic turns it into a memory). */
  onCreature?: (c: Creature) => void;
}

/**
 * The shadow theatre: an old sheet on the attic wall, a lamp, and a few
 * things to hold up to the light. Drag them (and the lamp); turn them with
 * the wheel, Q / E, or the Turn button. Some combinations come alive.
 */
export function ShadowTheatre({ world, onMarguerite, onCreature }: Props) {
  const [props, setProps] = useState<Prop[]>(startProps);
  const [lamp, setLamp] = useState<Lamp>({ x: 400, y: 430 });
  const [alive, setAlive] = useState<(Recognition & { n: number }) | null>(null);
  const [selected, setSelected] = useState<PropKind>('handL');
  const [line, setLine] = useState<string>(SHADOWS.start);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ what: PropKind | 'lamp'; dx: number; dy: number } | null>(null);
  const seen = useRef(new Set<Creature>());
  const aliveN = useRef(0);
  const cooling = useRef(0);

  const toStage = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * STAGE.w, y: ((e.clientY - r.top) / r.height) * STAGE.h };
  };
  const clamp = (p: { x: number; y: number }) => ({ x: Math.max(30, Math.min(STAGE.w - 30, p.x)), y: Math.max(40, Math.min(STAGE.h - 24, p.y)) });

  /** Has anything come alive? (Checked whenever things settle.) */
  const check = useCallback(
    (ps: Prop[], l: Lamp) => {
      if (alive || performance.now() < cooling.current) return;
      const r = recognise(ps, l);
      if (!r) return;
      const n = ++aliveN.current;
      setAlive({ ...r, n });
      setLine(SHADOWS.creature[r.creature]);
      seen.current.add(r.creature);
      world.emit('OBJECT_STATE_CHANGED', { target: 'shadow', key: 'creature', value: r.creature });
      world.effects.discover('shadow-play');
      if (seen.current.size >= 5) world.effects.discover('menagerie');
      if (r.creature === 'curtsy') onMarguerite(SHADOWS.marguerite);
      onCreature?.(r.creature);
      world.effects.sound('chime');
      window.setTimeout(() => {
        setAlive((a) => (a?.n === n ? null : a));
        setProps((cur) => nudgeApart(cur, r.props));
        cooling.current = performance.now() + 900;
      }, 2800);
    },
    [alive, onCreature, onMarguerite, world],
  );

  // look again a moment after things settle (or once the last creature's moment is over)
  useEffect(() => {
    const wait = Math.max(250, cooling.current - performance.now() + 60);
    const t = window.setTimeout(() => check(props, lamp), wait);
    return () => window.clearTimeout(t);
  }, [alive, check, lamp, props]);

  // the wheel turns whatever is under the pointer
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const target = (e.target as Element).closest('[data-prop]')?.getAttribute('data-prop') as PropKind | null;
      if (!target) return;
      e.preventDefault();
      turn(target, e.deltaY > 0 ? 15 : -15);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const turn = (k: PropKind, by: number) => setProps((ps) => ps.map((p) => (p.kind === k ? { ...p, rot: Math.round((p.rot + by) % 360) } : p)));
  const move = (k: PropKind, dx: number, dy: number) => setProps((ps) => ps.map((p) => (p.kind === k ? { ...p, ...clamp({ x: p.x + dx, y: p.y + dy }) } : p)));

  const onDown = (what: PropKind | 'lamp') => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const q = toStage(e);
    const at = what === 'lamp' ? lamp : props.find((p) => p.kind === what)!;
    drag.current = { what, dx: at.x - q.x, dy: at.y - q.y };
    if (what !== 'lamp') setSelected(what);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const q = clamp(toStage(e));
    const to = { x: q.x + d.dx, y: q.y + d.dy };
    if (d.what === 'lamp') setLamp({ x: Math.max(40, Math.min(STAGE.w - 40, to.x)), y: Math.max(300, Math.min(STAGE.h - 10, to.y)) });
    else setProps((ps) => ps.map((p) => (p.kind === d.what ? { ...p, ...clamp(to) } : p)));
  };
  const onUp = () => {
    drag.current = null;
  };
  const onKey = (k: PropKind | 'lamp') => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 30 : 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const mv = moves[e.key];
    if (mv) {
      e.preventDefault();
      if (k === 'lamp') setLamp((l) => ({ x: Math.max(40, Math.min(STAGE.w - 40, l.x + mv[0])), y: Math.max(300, Math.min(STAGE.h - 10, l.y + mv[1])) }));
      else move(k, mv[0], mv[1]);
    } else if (k !== 'lamp' && (e.key === 'q' || e.key === '[')) turn(k, -15);
    else if (k !== 'lamp' && (e.key === 'e' || e.key === ']')) turn(k, 15);
  };

  const shadows = props.map((p) => cast(p, lamp));
  const glow = { left: `${(lamp.x / STAGE.w) * 100}%`, top: `${((lamp.y - 160) / STAGE.h) * 100}%` };

  return (
    <section className={styles.section} aria-labelledby="shadow-title">
      <h2 id="shadow-title" className={styles.title}>
        {SHADOWS.title}
      </h2>
      <div ref={stageRef} className={styles.stage} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} data-alive={alive?.creature ?? ''}>
        <div className={styles.sheet} aria-hidden="true" />
        <div className={styles.glow} style={glow} aria-hidden="true" />
        <svg className={styles.shadows} viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} aria-hidden="true">
          <defs>
            {/* shadows only land on the sheet (inset 4% 3% 18% 3%) */}
            <clipPath id="shadow-sheet">
              <rect x={STAGE.w * 0.03} y={STAGE.h * 0.04} width={STAGE.w * 0.94} height={STAGE.h * 0.78} />
            </clipPath>
            {[0, 1, 2, 3, 4, 5].map((b) => (
              <filter key={b} id={`shadow-blur-${b}`}>
                <feGaussianBlur stdDeviation={b * 0.8} />
              </filter>
            ))}
          </defs>
          <g clipPath="url(#shadow-sheet)">
          {shadows.map((s) =>
            alive?.props.includes(s.kind) ? null : (
              <g key={s.kind} transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.rot}) scale(${s.scale.toFixed(3)})`} filter={`url(#shadow-blur-${Math.min(5, Math.round(s.blur))})`}>
                <path d={SHAPES[s.kind]} fill={STROKED[s.kind] ? 'none' : INK} stroke={STROKED[s.kind] ? INK : 'none'} strokeWidth={STROKED[s.kind] ? 5 : 0} strokeLinecap="round" opacity="0.82" />
              </g>
            ),
          )}
          {alive ? (
            <g key={alive.n} transform={`translate(${alive.x.toFixed(1)} ${alive.y.toFixed(1)}) scale(${alive.scale.toFixed(3)})`}>
              <g className={styles.creature} data-creature={alive.creature}>
                <path d={CREATURE[alive.creature]} fill={INK} opacity="0.85" />
              </g>
              {alive.creature === 'cat' ? (
                <g className={styles.bunnyRun}>
                  <ellipse cx="-50" cy="22" rx="10" ry="8" fill={INK} opacity="0.8" />
                </g>
              ) : null}
              {alive.creature === 'dragon' ? <circle className={styles.puff} cx="44" cy="-2" r="10" fill={INK} opacity="0.5" /> : null}
            </g>
          ) : null}
          </g>
        </svg>
        {/* the props themselves, in front of the sheet */}
        {props.map((p) => (
          <button
            key={p.kind}
            type="button"
            className={styles.prop}
            data-prop={p.kind}
            data-selected={selected === p.kind}
            style={{ left: `${(p.x / STAGE.w) * 100}%`, top: `${(p.y / STAGE.h) * 100}%`, transform: `translate(-50%, -50%) rotate(${p.rot}deg)` }}
            aria-label={`${SHADOWS.prop[p.kind]}. Arrow keys move it, Q and E turn it.`}
            onPointerDown={onDown(p.kind)}
            onKeyDown={onKey(p.kind)}
            onFocus={() => setSelected(p.kind)}
          >
            <svg viewBox="-40 -42 80 84" aria-hidden="true">
              <path d={SHAPES[p.kind]} fill={STROKED[p.kind] ? 'none' : COLOUR[p.kind]} stroke={STROKED[p.kind] ? COLOUR[p.kind] : INK} strokeWidth={STROKED[p.kind] ? 5 : 2.5} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </button>
        ))}
        <button
          type="button"
          className={styles.lamp}
          style={{ left: `${(lamp.x / STAGE.w) * 100}%`, top: `${(lamp.y / STAGE.h) * 100}%` }}
          aria-label={SHADOWS.lamp}
          onPointerDown={onDown('lamp')}
          onKeyDown={onKey('lamp')}
        >
          <svg viewBox="-24 -30 48 40" aria-hidden="true">
            <path d="M-16 0 L -8 -24 H 8 L 16 0 Z" fill="var(--yellow)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M0 0 V 8 M-10 9 H 10" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className={styles.under}>
        <p className={styles.line} aria-live="polite">
          {line}
        </p>
        <button type="button" className="paper-btn" onClick={() => turn(selected, 30)}>
          {SHADOWS.turn(SHADOWS.prop[selected])}
        </button>
      </div>
    </section>
  );
}
