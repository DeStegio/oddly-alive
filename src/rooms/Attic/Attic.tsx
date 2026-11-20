import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { findLetter } from '../../app/letters';
import { useWorld } from '../../app/worldInstance';
import { ThoughtBubble } from '../../characters/ThoughtBubble';
import { LivingTitle } from '../../components/LivingTitle';
import { WeatherLayer } from '../../components/WeatherLayer';
import { BOXES, HATS, HAT_NAMES, MARGUERITE_ALL, MARGUERITE_HATS, MARGUERITE_IDLE, type HatId } from '../../content/attic';
import { onFrame } from '../../engine/frameLoop';
import { useKeepsakes } from '../../state/keepsakes';
import { useObjects } from '../../state/world';
import { Diary } from './Diary';
import { Gramophone } from './Gramophone';
import { HatSvg, MargueriteSvg } from './Marguerite';
import { AtticSim, HEAD, PILE_H, PILE_W, stackBoxes, type PileKind } from './pile';
import { Trunk } from './Trunk';
import styles from './Attic.module.css';

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]!;
const ids = (csv: string) => csv.split(',').filter(Boolean);
const isHat = (v: string): v is HatId => (HATS as readonly string[]).includes(v);

/** Which kind of container each attic box is. */
const BOX_KIND: Record<string, PileKind> = {
  'box-xmas': 'box',
  'box-shoes': 'shoebox',
  'box-holiday': 'suitcase',
  'box-dust': 'dustbox',
  'box-theatre': 'hatbox',
  'box-art': 'crate',
};
const BOX_LABEL: Record<string, string> = {
  'box-xmas': 'XMAS',
  'box-shoes': 'shoes',
  'box-holiday': '',
  'box-dust': '',
  'box-theatre': 'HATS',
  'box-art': 'PAINT',
};

interface View {
  id: number;
  kind: PileKind;
  box?: string;
  w: number;
  h: number;
}

/**
 * The attic, by hand: a real pile of boxes nobody sorted. Drag them about;
 * they burst open when they land hard or get a good shake, and what was
 * inside spills out. Hats go on Marguerite if you drop them on her head, or
 * throw them there from across the room. The record plays while you turn it.
 */
export default function Attic() {
  const world = useWorld();
  const attic = useObjects((s) => s.attic);
  const hatsFound = useKeepsakes((s) => s.attic.hats);
  const [line, setLine] = useState<string | null>(null);
  const [found, setFound] = useState<{ title: string; story: string } | null>(null);
  const [views, setViews] = useState<View[]>([]);
  const [dust, setDust] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<AtticSim | null>(null);
  const els = useRef(new Map<number, HTMLDivElement>());
  const scale = useRef(1);
  const drag = useRef<number | null>(null);
  const opened = ids(attic.opened);
  const wearing = isHat(attic.wearing) ? attic.wearing : null;
  const wearingRef = useRef(wearing);
  wearingRef.current = wearing;

  const say = useCallback((text: string, ms = 2800) => {
    setLine(text);
    window.setTimeout(() => setLine((cur) => (cur === text ? null : cur)), ms);
  }, []);

  const sync = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    setViews(sim.list().map((p) => ({ id: p.id, kind: p.kind, box: p.box, w: p.w, h: p.h })));
  }, []);

  // coming up the ladder (or the address) counts as finding the attic
  useEffect(() => {
    useKeepsakes.getState().unlockAttic();
    world.effects.discover('attic');
  }, [world]);

  /** Put a hat on Marguerite (whatever she had on falls off). */
  const wear = useCallback(
    (hat: HatId, how: 'drop' | 'throw' | 'key') => {
      const sim = simRef.current;
      const prev = wearingRef.current;
      const s = useObjects.getState();
      const worn = ids(s.attic.worn);
      const nextWorn = worn.includes(hat) ? worn : [...worn, hat];
      s.setSlice('attic', { wearing: hat, worn: nextWorn.join(',') });
      wearingRef.current = hat;
      if (prev && prev !== hat && sim) {
        const p = sim.add(`hat:${prev}`, HEAD.x + 30, HEAD.y - 40);
        sim.fling(p.id, 3, -4, 0.1);
      }
      sync();
      if (how === 'throw') {
        say('nice shot, darling.');
        world.effects.discover('nice-shot');
      } else if (nextWorn.length === HATS.length) say(MARGUERITE_ALL);
      else say(MARGUERITE_HATS[hat]);
      if (nextWorn.length === HATS.length) world.effects.discover('dress-rehearsal');
      world.emit('OBJECT_STATE_CHANGED', { target: 'marguerite', key: 'hat', value: hat });
    },
    [say, sync, world],
  );

  // the pile: build it, and react to boxes bursting
  useEffect(() => {
    const sim = new AtticSim();
    simRef.current = sim;
    const openedNow = ids(useObjects.getState().attic.opened);
    stackBoxes(
      sim,
      BOXES.filter((b) => !openedNow.includes(b.id)).map((b) => ({ id: b.id, kind: BOX_KIND[b.id]! })),
    );
    // hats already found and not being worn lie about on the floor
    const onHer = useObjects.getState().attic.wearing;
    // every hat exists once: on her, on the floor, or still in its box
    const present = new Set<string>(onHer ? [onHer] : []);
    useKeepsakes
      .getState()
      .attic.hats.filter((h) => h !== onHer && isHat(h))
      .forEach((h, i) => {
        present.add(h);
        sim.add(`hat:${h as HatId}`, 280 + i * 70, PILE_H - 60);
      });

    let lastBump = 0;
    sim.onBump = (force) => {
      const now = performance.now();
      if (force > 6 && now - lastBump > 160) {
        lastBump = now;
        world.effects.sound(force > 10 ? 'thud' : 'pop');
      }
    };
    sim.onBurst = ({ box, x, y }) => {
      const def = BOXES.find((b) => b.id === box);
      if (!def) return;
      const all = [...ids(useObjects.getState().attic.opened), box];
      useObjects.getState().setSlice('attic', { opened: all.join(',') });
      world.emit('OBJECT_STATE_CHANGED', { target: `attic:${box}`, key: 'open', value: true });
      world.effects.sound('shake');
      const last = all.length === BOXES.length;
      setFound({ title: def.title, story: last ? `${def.story} And under everything, an envelope.` : def.story });
      if (def.hat && !present.has(def.hat)) {
        present.add(def.hat);
        useKeepsakes.getState().addHat(def.hat);
        const p = sim.add(`hat:${def.hat}`, x, y - 10);
        sim.fling(p.id, (Math.random() - 0.5) * 6, -9, 0.2);
      } else if (box === 'box-shoes') {
        const p = sim.add('shoe', x, y - 10);
        sim.fling(p.id, (Math.random() - 0.5) * 5, -7, 0.3);
      } else if (box === 'box-dust') {
        setDust((d) => [...d, { id: Date.now(), x, y }]);
        say('mind the dust. those are the bunnies. they were here first.');
      }
      if (last) {
        const env = sim.add('letter', x, y - 20);
        sim.fling(env.id, 1.5, -6, 0.05);
        findLetter(world, 'attic');
      }
      sync();
    };
    sync();
    return () => {
      sim.destroy();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fit the stage into its box
  useLayoutEffect(() => {
    const update = () => {
      const st = stageRef.current;
      if (!st) return;
      scale.current = Math.max(0.3, st.clientWidth / PILE_W);
      st.style.height = `${PILE_H * scale.current}px`;
      if (worldRef.current) worldRef.current.style.transform = `scale(${scale.current})`;
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // step the pile, draw it, and catch hats arriving on Marguerite's head
  useEffect(
    () =>
      onFrame((dt) => {
        const sim = simRef.current;
        if (!sim) return;
        sim.step(dt);
        for (const p of sim.list()) {
          const el = els.current.get(p.id);
          if (el) el.style.transform = `translate(${(p.body.position.x - p.w / 2).toFixed(1)}px, ${(p.body.position.y - p.h / 2).toFixed(1)}px) rotate(${p.body.angle.toFixed(3)}rad)`;
          if (!p.kind.startsWith('hat:') || sim.dragging === p.id) continue;
          const d = Math.hypot(p.body.position.x - HEAD.x, p.body.position.y - HEAD.y);
          if (d < HEAD.r && p.body.speed > 1.5) {
            // a hat thrown onto her head from across the room
            sim.remove(p.id);
            wear(p.kind.slice(4) as HatId, 'throw');
          }
        }
      }),
    [wear],
  );

  // ------------------------------------------------------------- the hand

  const toWorld = (e: React.PointerEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale.current, y: (e.clientY - r.top) / scale.current };
  };

  const onDown = (id: number) => (e: React.PointerEvent) => {
    const sim = simRef.current;
    if (!sim || e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const q = toWorld(e);
    sim.startDrag(id, q.x, q.y, e.timeStamp);
    drag.current = id;
  };
  const onMove = (e: React.PointerEvent) => {
    const sim = simRef.current;
    if (!sim || sim.dragging === null) return;
    const q = toWorld(e);
    sim.moveDrag(q.x, q.y, e.timeStamp);
  };
  const onUp = (e: React.PointerEvent) => {
    const sim = simRef.current;
    const id = drag.current;
    drag.current = null;
    if (!sim || id === null) return;
    sim.endDrag();
    const p = sim.get(id);
    if (!p) return;
    const q = toWorld(e);
    // a hat let go right over her head goes on
    if (p.kind.startsWith('hat:') && Math.hypot(q.x - HEAD.x, q.y - HEAD.y) < HEAD.r + 14) {
      sim.remove(p.id);
      wear(p.kind.slice(4) as HatId, 'drop');
    }
  };

  // keyboard and screen readers: open the next box
  const openNext = () => {
    const sim = simRef.current;
    const box = sim?.list().find((p) => p.box);
    if (box) sim!.burst(box.id);
  };

  const [tempo, setTempo] = useState(0);
  const onTempo = useCallback((s: number) => setTempo((t) => (Math.abs(t - s) > 0.15 || (s === 0 && t !== 0) ? s : t)), []);

  return (
    <section className={styles.room} aria-labelledby="attic-title" style={{ '--sway': Math.min(3, Math.abs(tempo)).toFixed(2) } as React.CSSProperties}>
      <div className={styles.roof} aria-hidden="true" />
      <div className={styles.roundWindow} aria-hidden="true">
        <WeatherLayer />
      </div>
      <div className={styles.light} aria-hidden="true" />

      <header className={styles.head}>
        <LivingTitle id="attic-title" lines={['At', 'tic']} label="Attic" size="room" />
        <p className={styles.blurb}>Nobody sorted these. Drag them, drop them, shake them, and things come out. Marguerite would like a hat; she isn’t fussy about how it arrives.</p>
      </header>

      <div className={styles.keys} role="group" aria-label="Attic, for the keyboard">
        <button type="button" onClick={openNext}>
          Open the next box
        </button>
        {HATS.filter((h) => hatsFound.includes(h)).map((h) => (
          <button key={h} type="button" aria-pressed={wearing === h} onClick={() => wear(h, 'key')}>
            Put {HAT_NAMES[h]} on Marguerite
          </button>
        ))}
      </div>

      {/* the stage: Marguerite on the left, the pile on the right */}
      <div ref={stageRef} className={styles.stage} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div ref={worldRef} className={styles.stageWorld} style={{ width: PILE_W, height: PILE_H }}>
          <div className={styles.margueriteOnStage} data-tempo={tempo !== 0}>
            <ThoughtBubble text={line} side="right" />
            <button type="button" className={`prop-btn ${styles.mHit}`} aria-label={wearing ? `Marguerite the dress form, wearing ${HAT_NAMES[wearing]}` : 'Marguerite the dress form'} onClick={() => say(pick(MARGUERITE_IDLE))}>
              <MargueriteSvg hat={wearing} />
            </button>
          </div>
          {views.map((v) => (
            <div
              key={v.id}
              className={styles.thing}
              data-kind={v.kind}
              style={{ width: v.w, height: v.h }}
              aria-hidden="true"
              ref={(el) => {
                if (el) els.current.set(v.id, el);
                else els.current.delete(v.id);
              }}
              onPointerDown={onDown(v.id)}
            >
              <ThingArt kind={v.kind} label={v.box ? BOX_LABEL[v.box] : undefined} />
            </div>
          ))}
          {dust.map((d) => (
            <span key={d.id} className={styles.dustPuff} style={{ left: d.x, top: d.y }} aria-hidden="true" onAnimationEnd={() => setDust((x) => x.filter((y) => y.id !== d.id))} />
          ))}
        </div>
      </div>
      <p className={styles.found} aria-live="polite">
        {found ? (
          <>
            <strong>{found.title}.</strong> {found.story}
          </>
        ) : opened.length === BOXES.length ? (
          'Every box is open. Nothing left but dust and a good feeling.'
        ) : (
          `${BOXES.length - opened.length} boxes nobody has opened in years.`
        )}
      </p>

      <div className={styles.lower}>
        <Gramophone onTempo={onTempo} />
        <Trunk />
        <Diary onOpen={(n) => n >= 5 && world.effects.discover('dear-diary')} />
      </div>
    </section>
  );
}

const INK = { stroke: 'var(--char-ink)', strokeWidth: 2.5, strokeLinejoin: 'round' as const };

/** What each thing in the pile looks like (drawn to fill its box). */
function ThingArt({ kind, label }: { kind: PileKind; label?: string }) {
  if (kind.startsWith('hat:')) return <HatSvg hat={kind.slice(4) as HatId} />;
  if (kind === 'shoe')
    return (
      <svg viewBox="0 0 56 30" className={styles.thingSvg}>
        <path d="M4 22 C 4 12 14 8 22 10 L 34 14 C 44 16 52 18 52 24 V 26 H 4 Z" fill="#7a4a2e" {...INK} />
        <path d="M18 12 l 4 6 M24 13 l 3 6" stroke="#f3ede2" strokeWidth="1.5" />
      </svg>
    );
  if (kind === 'letter')
    return (
      <svg viewBox="0 0 46 30" className={styles.thingSvg}>
        <rect x="2" y="2" width="42" height="26" rx="2" fill="#f6efe0" {...INK} />
        <path d="M2 4 L 23 18 L 44 4" fill="none" {...INK} strokeWidth={2} />
        <circle cx="23" cy="18" r="4" fill="var(--coral)" />
      </svg>
    );
  const fill: Record<string, string> = { box: '#c69a64', hatbox: '#b9a5db', suitcase: '#7a3b3b', crate: '#a07040', shoebox: '#d9c19a', dustbox: '#b8a58c' };
  return (
    <svg viewBox="0 0 100 70" preserveAspectRatio="none" className={styles.thingSvg}>
      <rect x="2" y="2" width="96" height="66" rx={kind === 'hatbox' ? 30 : 5} fill={fill[kind] ?? '#c69a64'} {...INK} />
      {kind === 'crate' ? <path d="M2 24 H 98 M2 46 H 98" stroke="var(--char-ink)" strokeWidth="2" /> : null}
      {kind === 'hatbox' ? null : <path d="M46 2 V 68" stroke="#e9d9b8" strokeWidth="8" opacity={0.7} />}
      {label ? (
        <text x="50" y="44" textAnchor="middle" className={styles.boxLabel}>
          {label}
        </text>
      ) : null}
    </svg>
  );
}
