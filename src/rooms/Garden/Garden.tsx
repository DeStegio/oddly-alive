import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { findLetter } from '../../app/letters';
import { useWorld } from '../../app/worldInstance';
import { Inch } from '../../characters/Inch';
import { ThoughtBubble } from '../../characters/ThoughtBubble';
import { LivingTitle } from '../../components/LivingTitle';
import { WeatherLayer } from '../../components/WeatherLayer';
import { useWeather } from '../../components/useWeather';
import { BIP_FENCE, GARDEN_LINES, INCH_GARDEN, PACKETS, TIN_LABEL } from '../../content/garden';
import { onFrame } from '../../engine/frameLoop';
import type { StoredPlot } from '../../engine/memory';
import { useKeepsakes } from '../../state/keepsakes';
import { useSettings } from '../../state/settings';
import { useObjects } from '../../state/world';
import { droplet, pullTension, step, throwVelocity, type Scene, type Thing } from './gardenSim';
import { PLANTS, PLANT_KINDS, advance, isPlantKind, plant, stage, water, type GrowContext, type PlantKind, type Stage } from './growth';
import { CropIcon, PlantView } from './PlantView';
import styles from './Garden.module.css';

const pick = <T,>(lines: readonly T[]) => lines[Math.floor(Math.random() * lines.length)]!;
const TICK_MS = 1000;
const CAME_BACK_MS = 30 * 60_000;
/** Drag a ripe plant up this far (px) and it comes out. */
const PULL_PX = 70;
const DROPS = 60;
const STAGE_NAMES = ['just planted', 'a sprout', 'in leaf', 'in bud', 'in bloom'];

/** Something flying or lying on the lawn: a seed or a picked crop. */
interface Item extends Thing {
  id: number;
  kind: PlantKind;
  /** Seeds that miss: when they get eaten. */
  eatAt?: number;
}

type Held = { what: 'seed'; kind: PlantKind } | { what: 'can' } | { what: 'crop'; kind: PlantKind; id: number } | null;

/**
 * The back garden, by hand: throw seeds from the tin and they grow where
 * they land; hold the watering can and only the drops that hit soil count;
 * pull a ripe plant up against its roots and throw it, to the house (vase)
 * or over the fence to Bip. Plants lean as you brush past.
 */
export default function Garden() {
  const world = useWorld();
  const weather = useWeather();
  const afterHours = useSettings((s) => s.afterHours);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const plotsRef = useRef<Array<StoredPlot | null>>(useKeepsakes.getState().garden.plots.slice());
  const sceneRef = useRef<HTMLDivElement>(null);
  const soilEls = useRef<Array<HTMLSpanElement | null>>([]);
  const plantEls = useRef<Array<HTMLSpanElement | null>>([]);
  const itemEls = useRef(new Map<number, HTMLDivElement>());
  const dropEls = useRef<Array<HTMLSpanElement | null>>([]);
  const heldRef = useRef<HTMLDivElement>(null);
  const inchRef = useRef<HTMLDivElement>(null);
  const items = useRef(new Map<number, Item>());
  const drops = useRef<Array<Thing | null>>(Array.from({ length: DROPS }, () => null));
  const nextId = useRef(1);
  const [itemViews, setItemViews] = useState<Array<{ id: number; kind: PlantKind; body: 'seed' | 'crop' }>>([]);
  const [held, setHeldState] = useState<Held>(null);
  const heldNow = useRef<Held>(null);
  const pointer = useRef({ x: 0, y: 0, vx: 0, vy: 0, t: 0, inside: false });
  const pull = useRef<{ plot: number; startY: number; dy: number } | null>(null);
  const lean = useRef<number[]>(Array.from({ length: 6 }, () => 0));
  const snapAt = useRef<number[]>(Array.from({ length: 6 }, () => 0));
  const waterDirty = useRef(false);
  const [inchLine, setInchLine] = useState<string | null>(null);
  const [bipLine, setBipLine] = useState<string | null>(null);
  const [keyTool, setKeyTool] = useState<PlantKind | 'water' | null>(null);
  const ctxRef = useRef<GrowContext>({ weather, night: afterHours, present: true });
  ctxRef.current = { weather, night: afterHours, present: true };
  const night = afterHours || weather === 'night';

  const setHeld = (h: Held) => {
    heldNow.current = h;
    setHeldState(h);
  };

  const say = useCallback((set: React.Dispatch<React.SetStateAction<string | null>>, text: string, ms = 2600) => {
    set(text);
    window.setTimeout(() => set((cur) => (cur === text ? null : cur)), ms);
  }, []);

  const persist = useCallback((i: number) => useKeepsakes.getState().setPlot(i, plotsRef.current[i] ?? null), []);

  const setPlot = useCallback(
    (i: number, p: StoredPlot | null) => {
      plotsRef.current[i] = p;
      persist(i);
      rerender();
    },
    [persist],
  );

  const bloomed = useCallback(
    (kind: PlantKind) => {
      world.emit('OBJECT_STATE_CHANGED', { target: `garden:${kind}`, key: 'bloom', value: true });
      world.effects.discover('green-thumb');
      useKeepsakes.getState().note('garden:first-bloom', `The first ${PACKETS[kind].name.toLowerCase()} came out in the garden.`, { once: true });
      if (kind === 'moonflower') world.effects.discover('night-shift');
      if (plotsRef.current.every((p) => p && p.growth >= 1)) world.effects.discover('full-bed');
    },
    [world],
  );

  // ------------------------------------------------------------- harvest

  /** A picked crop arrives somewhere: the house (vase / Playground) or over the fence (Bip). */
  const deliver = useCallback(
    (kind: PlantKind, to: 'house' | 'fence') => {
      if (kind === 'moonflower') findLetter(world, 'garden');
      world.emit('OBJECT_STATE_CHANGED', { target: `garden:${kind}`, key: 'harvest', value: to });
      if (PLANTS[kind].harvest === 'playground') {
        const s = useObjects.getState();
        s.setSlice('playground', { radishes: Math.min(6, s.playground.radishes + 1) });
        if (to === 'fence') say(setBipLine, pick(['radish! for the game. beep.', 'caught it. into the tray it goes.']));
        else say(setInchLine, pick(GARDEN_LINES.harvestRadish));
        return;
      }
      if (to === 'fence') {
        say(setBipLine, pick(['flowers? for me? beep. beep.', 'I’ll put them by the net. thank you.']));
        world.effects.discover('bip-bouquet');
        return;
      }
      useKeepsakes.getState().addToVase(kind);
      useObjects.getState().setLiving({ vaseNew: true });
      say(setInchLine, pick(GARDEN_LINES.harvestVase));
    },
    [say, world],
  );

  // ------------------------------------------------------------- the scene

  const scene = useCallback((): Scene | null => {
    const el = sceneRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const beds = soilEls.current.flatMap((s, plot) => {
      if (!s) return [];
      const b = s.getBoundingClientRect();
      return [{ plot, x0: b.left - r.left, x1: b.right - r.left, soilY: b.top - r.top + 4 }];
    });
    const wind = ctxRef.current.weather === 'windy' ? 0.00025 : 0;
    return { width: r.width, height: r.height, grassY: r.height - 14, beds, g: 0.0016, wind };
  }, []);

  const addItem = (kind: PlantKind, body: 'seed' | 'crop', t: Omit<Thing, 'body'>) => {
    const id = nextId.current++;
    items.current.set(id, { ...t, body, id, kind });
    setItemViews((v) => [...v, { id, kind, body }]);
    return id;
  };

  const removeItem = (id: number) => {
    items.current.delete(id);
    setItemViews((v) => v.filter((x) => x.id !== id));
  };

  // catch up on time spent away, once, on the way in
  useEffect(() => {
    const now = Date.now();
    const away: GrowContext = { weather: 'clear', night: false, present: false };
    let cameBack = false;
    plotsRef.current = plotsRef.current.map((p, i) => {
      if (!p) return null;
      const next = advance(p, now, away);
      if (now - p.updatedAt >= CAME_BACK_MS && next.growth - p.growth >= 0.2) cameBack = true;
      if (next !== p) useKeepsakes.getState().setPlot(i, next);
      return next;
    });
    rerender();
    if (cameBack) world.effects.discover('came-back');
  }, [world]);

  // grow while you watch
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now();
      let changed = false;
      plotsRef.current = plotsRef.current.map((p, i) => {
        if (!p) return null;
        const q = advance(p, now, ctxRef.current);
        if (stage(q.growth) !== stage(p.growth)) {
          changed = true;
          plotsRef.current[i] = q;
          persist(i);
          if (q.growth >= 1 && isPlantKind(q.kind)) window.setTimeout(() => bloomed(q.kind as PlantKind), 0);
        }
        return q;
      });
      if (waterDirty.current) {
        waterDirty.current = false;
        plotsRef.current.forEach((_, i) => persist(i));
      }
      if (changed) rerender();
    }, TICK_MS);
    return () => {
      window.clearInterval(t);
      plotsRef.current.forEach((_, i) => persist(i));
    };
  }, [persist, bloomed]);

  // everything in the air, the can's stream, and plants leaning as you pass
  useEffect(
    () =>
      onFrame((dt, now) => {
        const s = scene();
        if (!s) return;
        const p = pointer.current;
        const h = heldNow.current;

        // a still hand has no speed (pointer events stop when the mouse does)
        if (performance.now() - p.t > 40) {
          const k = Math.pow(0.8, dt / 16);
          p.vx *= k;
          p.vy *= k;
        }
        // the held thing follows the hand
        if (heldRef.current) heldRef.current.style.transform = `translate(${p.x}px, ${p.y}px)`;

        // pouring
        if (h?.what === 'can') {
          for (let k = 0; k < 2; k++) {
            const free = drops.current.findIndex((d) => d === null);
            if (free < 0) break;
            drops.current[free] = droplet(p.x - 34, p.y - 6, p.vx, p.vy, Math.random() - 0.5);
          }
        }
        drops.current.forEach((d, i) => {
          const el = dropEls.current[i];
          if (!d) {
            if (el && el.style.opacity !== '0') el.style.opacity = '0';
            return;
          }
          const landed = step(d, dt, s);
          if (landed) {
            drops.current[i] = null;
            if (landed.type === 'soil') {
              const plot = plotsRef.current[landed.plot];
              if (plot) {
                plotsRef.current[landed.plot] = water(plot, Date.now());
                waterDirty.current = true;
              }
            }
            return;
          }
          if (el) {
            el.style.opacity = '1';
            el.style.transform = `translate(${d.x}px, ${d.y}px)`;
          }
        });

        // seeds and crops
        for (const it of Array.from(items.current.values())) {
          if (h?.what === 'crop' && h.id === it.id) continue;
          const landed = step(it, dt, s);
          if (landed) onLanding(it, landed);
          if (it.eatAt && now >= it.eatAt) {
            removeItem(it.id);
            say(setInchLine, pick(['thank you. lovely seed.', 'oh, a snack. don’t mind if I do.']));
            continue;
          }
          const el = itemEls.current.get(it.id);
          if (el) el.style.transform = `translate(${it.x}px, ${it.y}px) rotate(${it.angle.toFixed(2)}rad)`;
        }

        // plants lean as the hand brushes past; sunflowers watch it; snapdragons snap
        const r = sceneRef.current!.getBoundingClientRect();
        plantEls.current.forEach((el, i) => {
          if (!el) return;
          const b = el.getBoundingClientRect();
          const cx = b.left - r.left + b.width / 2;
          const top = b.top - r.top;
          const near = p.inside && Math.abs(p.x - cx) < b.width * 0.6 && p.y > top - 10 && p.y < top + b.height;
          const target = near ? Math.max(-28, Math.min(28, p.vx * 40)) : 0;
          lean.current[i]! += (target - lean.current[i]!) * Math.min(1, dt / 90);
          const pulling = pull.current?.plot === i ? pullTension(pull.current.dy, PULL_PX) : 0;
          el.style.setProperty('--lean', `${lean.current[i]!.toFixed(1)}deg`);
          el.style.setProperty('--pull', pulling.toFixed(3));
          const look = Math.max(-35, Math.min(35, ((p.x - cx) / Math.max(60, r.width * 0.25)) * 35));
          el.style.setProperty('--look', `${p.inside ? look.toFixed(1) : 0}deg`);
          const plot = plotsRef.current[i];
          if (plot?.kind === 'snapdragon' && plot.growth >= 1 && p.inside && Math.hypot(p.x - cx, p.y - top) < 46 && now - snapAt.current[i]! > 1600) {
            snapAt.current[i] = now;
            el.dataset.snap = 'true';
            window.setTimeout(() => delete el.dataset.snap, 380);
          }
        });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene],
  );

  function onLanding(it: Item, landed: NonNullable<ReturnType<typeof step>>) {
    if (it.body === 'seed') {
      if (landed.type === 'soil' && !plotsRef.current[landed.plot]) {
        removeItem(it.id);
        setPlot(landed.plot, plant(it.kind, Date.now()));
        say(setInchLine, pick(GARDEN_LINES.plant));
        world.emit('OBJECT_STATE_CHANGED', { target: `garden:${it.kind}`, key: 'plant', value: landed.plot });
        if (landed.plot >= 4) world.effects.discover('long-shot');
        return;
      }
      if (landed.type === 'fence') {
        removeItem(it.id);
        say(setBipLine, pick(['seeds? I can’t eat seeds. beep.', 'that came over the fence. is it a serve?']));
        return;
      }
      if (landed.type === 'house') {
        removeItem(it.id);
        return;
      }
      // on the lawn (or a plot that's taken): Inch has it
      if (landed.type === 'soil') {
        it.vy = -0.2;
        it.vx = (Math.random() - 0.5) * 0.3;
      }
      if (!it.eatAt) it.eatAt = performance.now() + 1600;
      return;
    }
    // crops
    if (landed.type === 'house' || landed.type === 'fence') {
      removeItem(it.id);
      deliver(it.kind, landed.type);
    }
  }

  // ------------------------------------------------------------- the hand

  const toLocal = (e: React.PointerEvent) => {
    const r = sceneRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const track = (e: React.PointerEvent) => {
    const q = toLocal(e);
    const p = pointer.current;
    const t = e.timeStamp;
    const dt = Math.max(1, t - p.t);
    if (p.t) {
      p.vx = p.vx * 0.6 + ((q.x - p.x) / dt) * 0.4;
      p.vy = p.vy * 0.6 + ((q.y - p.y) / dt) * 0.4;
    }
    p.x = q.x;
    p.y = q.y;
    p.t = t;
    p.inside = true;
  };

  const grab = (e: React.PointerEvent, h: Exclude<Held, null>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    track(e);
    pointer.current.vx = 0;
    pointer.current.vy = 0;
    sceneRef.current?.setPointerCapture?.(e.pointerId);
    setHeld(h);
  };

  const onPlantDown = (i: number) => (e: React.PointerEvent) => {
    const p = plotsRef.current[i];
    if (!p || e.button !== 0) return;
    e.stopPropagation();
    track(e);
    sceneRef.current?.setPointerCapture?.(e.pointerId);
    pull.current = { plot: i, startY: pointer.current.y, dy: 0 };
  };

  const onMove = (e: React.PointerEvent) => {
    track(e);
    const pl = pull.current;
    if (!pl) return;
    pl.dy = pointer.current.y - pl.startY;
    const p = plotsRef.current[pl.plot];
    if (!p || pullTension(pl.dy, PULL_PX) < 1) return;
    // it gives
    pull.current = null;
    if (p.growth >= 1 && isPlantKind(p.kind)) {
      const kind = p.kind;
      setPlot(pl.plot, null);
      const id = addItem(kind, 'crop', { x: pointer.current.x, y: pointer.current.y, vx: 0, vy: 0, r: 14, angle: 0, resting: false });
      setHeld({ what: 'crop', kind, id });
      world.effects.sound('pop');
    } else {
      // not ready: it springs back, and someone has an opinion
      say(setInchLine, p.kind === 'moonflower' && !night ? pick(GARDEN_LINES.moonWaiting) : 'not ready yet. the roots are holding on.');
    }
  };

  const onUp = (e: React.PointerEvent) => {
    track(e);
    pull.current = null;
    const h = heldNow.current;
    if (!h) return;
    const v = throwVelocity(pointer.current.vx, pointer.current.vy);
    if (h.what === 'seed') {
      addItem(h.kind, 'seed', { x: pointer.current.x, y: pointer.current.y, vx: v.vx, vy: v.vy, r: 4, angle: 0, resting: false });
    } else if (h.what === 'crop') {
      const it = items.current.get(h.id);
      if (it) Object.assign(it, { x: pointer.current.x, y: pointer.current.y, vx: v.vx, vy: v.vy, resting: false });
    }
    setHeld(null);
  };

  // ------------------------------------------------------------- keyboard

  /** Keyboard and screen readers: choose a tool, then act on a plot. */
  const onPlotKey = (i: number) => (e: React.MouseEvent) => {
    if (e.detail !== 0) return;
    const p = plotsRef.current[i];
    if (!p) {
      if (keyTool && keyTool !== 'water') {
        setPlot(i, plant(keyTool, Date.now()));
        say(setInchLine, pick(GARDEN_LINES.plant));
      } else say(setInchLine, 'pick a seed packet first.');
    } else if (p.growth >= 1 && isPlantKind(p.kind)) {
      setPlot(i, null);
      deliver(p.kind, 'house');
    } else {
      setPlot(i, water(p, Date.now()));
      say(setInchLine, pick(GARDEN_LINES.water));
    }
  };

  const heldKind = held && held.what !== 'can' ? held.kind : null;

  return (
    <section className={styles.room} data-night={night} aria-labelledby="garden-title">
      <header className={styles.head}>
        <LivingTitle id="garden-title" lines={['Gar', 'den']} label="Garden" size="room" />
        <p className={styles.blurb}>
          Throw seeds from the tin; they grow where they land. Hold the can to water. Pull a ripe plant up by the roots and throw it: to the house, or over the fence to Bip.
        </p>
      </header>

      {/* keyboard and screen-reader controls (hidden until focused) */}
      <div className={styles.keys} role="group" aria-label="Garden tools for the keyboard">
        {PLANT_KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={keyTool === k} onClick={() => setKeyTool(keyTool === k ? null : k)}>
            {PACKETS[k].name} seeds
          </button>
        ))}
        <button type="button" aria-pressed={keyTool === 'water'} onClick={() => setKeyTool(keyTool === 'water' ? null : 'water')}>
          Watering can
        </button>
      </div>

      <div
        ref={sceneRef}
        className={styles.scene}
        data-weather={weather}
        data-holding={held?.what ?? 'nothing'}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={() => (pointer.current.inside = false)}
      >
        <div className={styles.sky}>
          <WeatherLayer />
        </div>
        <div className={styles.fence} aria-hidden="true" />
        <div className={styles.house} aria-hidden="true">
          <span className={styles.houseDoor} />
          <span className={styles.basket} />
        </div>
        <div className={styles.bip}>
          <ThoughtBubble text={bipLine} side="left" />
          <button type="button" className={`prop-btn ${styles.bipHit}`} aria-label="Bip, leaning on the fence" onClick={() => say(setBipLine, pick(BIP_FENCE))}>
            <svg viewBox="0 0 80 50" aria-hidden="true">
              <rect x="8" y="8" width="64" height="40" rx="12" fill="var(--blue)" stroke="var(--char-ink)" strokeWidth="2.5" />
              <rect x="16" y="15" width="48" height="26" rx="8" fill="#24232b" />
              <rect x="25" y="21" width="6" height="9" rx="3" fill="#a6f0c6" />
              <rect x="49" y="21" width="6" height="9" rx="3" fill="#a6f0c6" />
              <path d="M34 34 q 6 4 12 0" fill="none" stroke="#a6f0c6" strokeWidth="2" strokeLinecap="round" />
              <path d="M40 8 V 1" stroke="var(--char-ink)" strokeWidth="2.5" />
              <circle cx="40" cy="1" r="3.5" fill="var(--coral)" stroke="var(--char-ink)" strokeWidth="2" />
            </svg>
          </button>
        </div>

        <ol className={styles.beds} aria-label="Garden plots">
          {plotsRef.current.map((p, i) => {
            const kind = p && isPlantKind(p.kind) ? p.kind : null;
            const st: Stage = p ? stage(p.growth) : 0;
            const label = !p || !kind ? `Plot ${i + 1}: empty` : `Plot ${i + 1}: ${PACKETS[kind].name.toLowerCase()}, ${STAGE_NAMES[st]}${st === 4 ? ' (ready to pull)' : ''}`;
            return (
              <li key={i} className={styles.plotWrap} data-bed={Math.floor(i / 2)}>
                <button type="button" className={styles.plot} data-stage={kind ? st : 'empty'} data-kind={kind ?? undefined} aria-label={label} onClick={onPlotKey(i)} onPointerDown={kind ? onPlantDown(i) : undefined}>
                  <span
                    className={styles.plant}
                    ref={(el) => {
                      plantEls.current[i] = el;
                    }}
                  >
                    {kind ? <PlantView kind={kind} stage={st} /> : null}
                  </span>
                  <span
                    className={styles.soil}
                    aria-hidden="true"
                    ref={(el) => {
                      soilEls.current[i] = el;
                    }}
                  />
                </button>
              </li>
            );
          })}
        </ol>

        {/* the seed tin and the watering can, on the lawn */}
        <div className={styles.tin} role="group" aria-label={TIN_LABEL}>
          <span className={styles.tinLabel} aria-hidden="true">
            seeds
          </span>
          {PLANT_KINDS.map((k) => (
            <span key={k} className={styles.slot} data-kind={k} title={`${PACKETS[k].name}: ${PACKETS[k].note}`} aria-hidden="true" onPointerDown={(e) => grab(e, { what: 'seed', kind: k })} />
          ))}
        </div>
        <div className={styles.can} data-held={held?.what === 'can'} aria-hidden="true" onPointerDown={(e) => grab(e, { what: 'can' })}>
          <CanSvg />
        </div>

        {/* flying and fallen things */}
        {itemViews.map((v) => (
          <div
            key={v.id}
            className={v.body === 'seed' ? styles.seed : styles.crop}
            data-kind={v.kind}
            aria-hidden="true"
            ref={(el) => {
              if (el) itemEls.current.set(v.id, el);
              else itemEls.current.delete(v.id);
            }}
            onPointerDown={
              v.body === 'crop'
                ? (e) => {
                    const it = items.current.get(v.id);
                    if (it?.resting) {
                      it.resting = false;
                      grab(e, { what: 'crop', kind: v.kind, id: v.id });
                    }
                  }
                : undefined
            }
          >
            {v.body === 'crop' && !(held?.what === 'crop' && held.id === v.id) ? <CropIcon kind={v.kind} /> : null}
          </div>
        ))}
        {Array.from({ length: DROPS }, (_, i) => (
          <span
            key={i}
            className={styles.drop}
            aria-hidden="true"
            ref={(el) => {
              dropEls.current[i] = el;
            }}
          />
        ))}

        {/* what's in your hand */}
        {held ? (
          <div ref={heldRef} className={styles.held} data-what={held.what} aria-hidden="true">
            {held.what === 'can' ? <CanSvg /> : heldKind && held.what === 'crop' ? <CropIcon kind={heldKind} /> : <span className={styles.seedInHand} data-kind={heldKind ?? undefined} />}
          </div>
        ) : null}

        <div className={styles.inch}>
          <Inch thought={inchLine} rootRef={inchRef} label="Inch, who lives along the beds" onActivate={() => say(setInchLine, pick(INCH_GARDEN))} />
        </div>
      </div>
    </section>
  );
}

function CanSvg() {
  return (
    <svg viewBox="0 0 80 56" aria-hidden="true">
      <path d="M22 18 H 60 V 48 C 60 52 56 54 52 54 H 30 C 26 54 22 52 22 48 Z" fill="var(--blue)" stroke="var(--char-ink)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M22 26 L 4 12" stroke="var(--char-ink)" strokeWidth="5" strokeLinecap="round" />
      <path d="M22 26 L 4 12" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 22 C 76 22 76 44 60 44" fill="none" stroke="var(--char-ink)" strokeWidth="3" />
      <path d="M30 18 C 30 6 52 6 52 18" fill="none" stroke="var(--char-ink)" strokeWidth="3" />
    </svg>
  );
}
