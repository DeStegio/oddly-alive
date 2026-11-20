import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { findLetter } from '../../app/letters';
import { useWorld } from '../../app/worldInstance';
import { Inch } from '../../characters/Inch';
import { ThoughtBubble } from '../../characters/ThoughtBubble';
import { LivingTitle } from '../../components/LivingTitle';
import { WeatherLayer } from '../../components/WeatherLayer';
import { useWeather } from '../../components/useWeather';
import { BIP_FENCE, CARD_TITLE, GARDEN_LINES, INCH_GARDEN, PACKETS, SHAPE_GLYPH, SHAPE_PLANT } from '../../content/garden';
import { onFrame } from '../../engine/frameLoop';
import type { StoredPlot } from '../../engine/memory';
import { useKeepsakes } from '../../state/keepsakes';
import { useSettings } from '../../state/settings';
import { useObjects } from '../../state/world';
import { PLANTS, PLANT_KINDS, advance, isPlantKind, plant, stage, sunGrow, type GrowContext, type PlantKind, type Stage } from './growth';
import { elevation, leanTowards, lightAt, phaseOf, shadow, skyColour, type Phase } from './light';
import { classify, type Pt } from './strokes';
import { CropIcon, PlantView } from './PlantView';
import styles from './Garden.module.css';

const pick = <T,>(lines: readonly T[]) => lines[Math.floor(Math.random() * lines.length)]!;
const CAME_BACK_MS = 30 * 60_000;
const SAVE_MS = 2000;
/** The pointer has to rest behind the fence this long before the sun follows it down. */
const SETTLE_MS = 350;
const STAGE_NAMES = ['just planted', 'a sprout', 'in leaf', 'in bud', 'in bloom'];
const FIREFLIES = 9;

interface Fly {
  id: number;
  kind: PlantKind;
  x: number;
  y: number;
  hx: number;
  hy: number;
}

/**
 * The back garden, where you are the sun. Move over the sky and the light goes
 * with you: plants grow where it falls, lean after it, and their shadows swing
 * round. Lower it behind the fence and night comes (the moonflower's time).
 * Plant by drawing a shape in the soil; pick by swiping across a ripe plant.
 */
export default function Garden() {
  const world = useWorld();
  const weather = useWeather();
  const afterHours = useSettings((s) => s.afterHours);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const plotsRef = useRef<Array<StoredPlot | null>>(useKeepsakes.getState().garden.plots.slice());
  const sceneRef = useRef<HTMLDivElement>(null);
  const fenceRef = useRef<HTMLDivElement>(null);
  const plotEls = useRef<Array<HTMLLIElement | null>>([]);
  const plantEls = useRef<Array<HTMLSpanElement | null>>([]);
  const trailRef = useRef<SVGPolylineElement>(null);
  const trailSvg = useRef<SVGSVGElement>(null);
  const inchRef = useRef<HTMLDivElement>(null);
  const startNight = afterHours || weather === 'night';
  const sun = useRef({ x: 0.35, e: startNight ? -0.4 : 0.65, tx: 0.35, te: startNight ? -0.4 : 0.65, bandSince: 0 });
  const [phase, setPhase] = useState<Phase>(startNight ? 'night' : 'day');
  const phaseRef = useRef<Phase>(phase);
  const sawNight = useRef(false);
  const stroke = useRef<{ pts: Pt[]; n: number } | null>(null);
  const strokeN = useRef(0);
  const dirty = useRef(false);
  const kindsPlanted = useRef(new Set<PlantKind>());
  const [mark, setMark] = useState<{ text: string; x: number; y: number; ok: boolean; n: number } | null>(null);
  const [flying, setFlying] = useState<Fly[]>([]);
  const flyId = useRef(1);
  const [inchLine, setInchLine] = useState<string | null>(null);
  const [bipLine, setBipLine] = useState<string | null>(null);
  const [keySeed, setKeySeed] = useState<PlantKind | null>(null);
  const weatherRef = useRef(weather);
  weatherRef.current = weather;
  const night = phase === 'night';

  const say = useCallback((set: React.Dispatch<React.SetStateAction<string | null>>, text: string, ms = 2600) => {
    set(text);
    window.setTimeout(() => set((cur) => (cur === text ? null : cur)), ms);
  }, []);

  const persistAll = useCallback(() => {
    const now = Date.now();
    plotsRef.current.forEach((p, i) => {
      const q = p ? { ...p, updatedAt: now } : null;
      plotsRef.current[i] = q;
      useKeepsakes.getState().setPlot(i, q);
    });
  }, []);

  const setPlot = useCallback((i: number, p: StoredPlot | null) => {
    plotsRef.current[i] = p;
    useKeepsakes.getState().setPlot(i, p);
    rerender();
  }, []);

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

  // ------------------------------------------------------------- planting and picking

  const sow = useCallback(
    (i: number, kind: PlantKind) => {
      setPlot(i, plant(kind, Date.now()));
      say(setInchLine, pick(GARDEN_LINES.plant));
      world.emit('OBJECT_STATE_CHANGED', { target: `garden:${kind}`, key: 'plant', value: i });
      kindsPlanted.current.add(kind);
      if (kindsPlanted.current.size === PLANT_KINDS.length) world.effects.discover('pims-hand');
    },
    [say, setPlot, world],
  );

  /** A picked plant goes indoors: flowers to the vase, radishes to the Playground. */
  const deliver = useCallback(
    (kind: PlantKind) => {
      if (kind === 'moonflower') findLetter(world, 'garden');
      world.emit('OBJECT_STATE_CHANGED', { target: `garden:${kind}`, key: 'harvest', value: 'house' });
      world.effects.sound('pop');
      if (PLANTS[kind].harvest === 'playground') {
        const s = useObjects.getState();
        s.setSlice('playground', { radishes: Math.min(6, s.playground.radishes + 1) });
        say(setInchLine, pick(GARDEN_LINES.harvestRadish));
        return;
      }
      useKeepsakes.getState().addToVase(kind);
      useObjects.getState().setLiving({ vaseNew: true });
      say(setInchLine, pick(GARDEN_LINES.harvestVase));
    },
    [say, world],
  );

  const harvest = useCallback(
    (i: number) => {
      const p = plotsRef.current[i];
      if (!p || !isPlantKind(p.kind)) return;
      const kind = p.kind;
      setPlot(i, null);
      deliver(kind);
      // off it goes through the back door
      const scene = sceneRef.current;
      const el = plantEls.current[i];
      if (!scene || !el) return;
      const r = scene.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      const id = flyId.current++;
      setFlying((f) => [...f, { id, kind, x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height * 0.4, hx: 24, hy: r.height * 0.7 }]);
      window.setTimeout(() => setFlying((f) => f.filter((x) => x.id !== id)), 1000);
    },
    [deliver, setPlot],
  );

  // ------------------------------------------------------------- growing

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

  // save now and then, and on the way out
  useEffect(() => {
    const t = window.setInterval(() => {
      if (!dirty.current) return;
      dirty.current = false;
      persistAll();
    }, SAVE_MS);
    return () => {
      window.clearInterval(t);
      persistAll();
    };
  }, [persistAll]);

  // the sun, the sky, the light on each plant
  useEffect(
    () =>
      onFrame((dt) => {
        const el = sceneRef.current;
        const fence = fenceRef.current;
        if (!el || !fence) return;
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const s = sun.current;
        const k = 1 - Math.exp(-dt / 110);
        s.x += (s.tx - s.x) * k;
        s.e += (s.te - s.e) * k;
        const top = r.height * 0.07;
        const horizon = fence.getBoundingClientRect().top - r.top;
        const sunX = s.x * r.width;
        const sunY = horizon - s.e * (horizon - top);
        const nightness = Math.max(0, Math.min(1, -s.e * 4));
        el.style.setProperty('--sun-x', `${sunX.toFixed(1)}px`);
        el.style.setProperty('--sun-y', `${sunY.toFixed(1)}px`);
        el.style.setProperty('--night', nightness.toFixed(3));
        el.style.setProperty('--day', Math.max(0, Math.min(1, s.e * 2)).toFixed(3));
        el.style.setProperty('--garden-sky', skyColour(s.e));
        el.style.setProperty('--garden-sky-top', skyColour(s.e - 0.18));

        const ph = phaseOf(s.e);
        if (ph !== phaseRef.current) {
          phaseRef.current = ph;
          setPhase(ph);
        }

        plotsRef.current.forEach((p, i) => {
          const plantEl = plantEls.current[i];
          const plotEl = plotEls.current[i];
          if (!plotEl) return;
          const b = plotEl.getBoundingClientRect();
          const cx = b.left - r.left + b.width / 2;
          const light = lightAt(cx, sunX, s.e, r.width);
          const sh = shadow(cx, sunX, s.e);
          plotEl.style.setProperty('--lit', light.toFixed(3));
          plotEl.style.setProperty('--sh-dx', `${sh.dx.toFixed(1)}px`);
          plotEl.style.setProperty('--sh-s', sh.stretch.toFixed(3));
          plotEl.style.setProperty('--sh-a', sh.alpha.toFixed(3));
          if (plantEl) {
            plantEl.style.setProperty('--lean', `${leanTowards(cx, sunX, s.e, r.width).toFixed(1)}deg`);
            plantEl.style.setProperty('--look', `${Math.max(-35, Math.min(35, ((sunX - cx) / r.width) * 80)).toFixed(1)}deg`);
          }
          if (!p || p.growth >= 1) return;
          const q = sunGrow(p, dt, light, ph === 'night', weatherRef.current);
          if (q === p) return;
          plotsRef.current[i] = q;
          dirty.current = true;
          if (stage(q.growth) !== stage(p.growth)) {
            rerender();
            if (q.growth >= 1 && isPlantKind(q.kind)) {
              useKeepsakes.getState().setPlot(i, { ...q, updatedAt: Date.now() });
              bloomed(q.kind);
            }
          }
        });
      }),
    [bloomed],
  );

  // dusk, night and morning: the neighbours notice
  useEffect(() => {
    if (phase === 'night') {
      sawNight.current = true;
      say(setBipLine, pick(GARDEN_LINES.bipNight));
    } else if (phase === 'dusk' && !sawNight.current) {
      say(setInchLine, pick(GARDEN_LINES.dusk));
    } else if (phase === 'day' && sawNight.current) {
      sawNight.current = false;
      say(setBipLine, pick(GARDEN_LINES.bipMorning));
      world.effects.discover('sundown');
    }
  }, [phase, say, world]);

  // ------------------------------------------------------------- the sun, by hand

  const toLocal = (e: React.PointerEvent) => {
    const r = sceneRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, r };
  };

  /** Over the sky the pointer is the sun; behind the fence (held a moment) it sets. */
  const aimSun = (e: React.PointerEvent) => {
    const { x, y, r } = toLocal(e);
    const fence = fenceRef.current?.getBoundingClientRect();
    if (!fence) return;
    const fTop = fence.top - r.top;
    const fBottom = fence.bottom - r.top;
    const s = sun.current;
    if (y > fBottom) {
      s.bandSince = 0;
      return; // over the beds: the sun stays where you left it
    }
    s.tx = Math.max(0.03, Math.min(0.97, x / r.width));
    if (y < fTop) {
      s.bandSince = 0;
      s.te = elevation(y, r.height * 0.07, fTop);
      return;
    }
    if (!s.bandSince) s.bandSince = e.timeStamp || performance.now();
    if ((e.timeStamp || performance.now()) - s.bandSince >= SETTLE_MS) s.te = elevation(y, r.height * 0.07, fTop);
  };

  // ------------------------------------------------------------- drawing in the soil

  const drawTrail = () => {
    const st = stroke.current;
    if (trailRef.current && st) trailRef.current.setAttribute('points', st.pts.map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' '));
  };

  const onBedsDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    sceneRef.current?.setPointerCapture?.(e.pointerId);
    const { x, y } = toLocal(e);
    const n = ++strokeN.current;
    stroke.current = { pts: [{ x, y }], n };
    if (trailSvg.current) trailSvg.current.dataset.state = 'drawing';
    drawTrail();
  };

  const onSceneDown = (e: React.PointerEvent) => {
    // touch has no hover: press and move over the sky to carry the sun
    if (e.pointerType !== 'mouse' && !stroke.current) {
      sceneRef.current?.setPointerCapture?.(e.pointerId);
      aimSun(e);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const st = stroke.current;
    if (st) {
      const { x, y } = toLocal(e);
      const last = st.pts[st.pts.length - 1]!;
      if (Math.hypot(x - last.x, y - last.y) >= 3) {
        st.pts.push({ x, y });
        drawTrail();
      }
      return;
    }
    if (e.pointerType === 'mouse' || e.buttons) aimSun(e);
  };

  /** Which plot a drawing belongs to: the one under the middle of it. */
  const plotUnder = (pts: Pt[]) => {
    const r = sceneRef.current!.getBoundingClientRect();
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    let best = -1;
    let bestD = Infinity;
    plotEls.current.forEach((el, i) => {
      if (!el) return;
      const b = el.getBoundingClientRect();
      const d = Math.abs(b.left - r.left + b.width / 2 - cx);
      if (d < bestD && d < b.width * 0.9) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  /** Plants a swipe went right across. */
  const plantsCrossed = (pts: Pt[]) => {
    const r = sceneRef.current!.getBoundingClientRect();
    const hit: number[] = [];
    plantEls.current.forEach((el, i) => {
      if (!el || !plotsRef.current[i]) return;
      const b = el.getBoundingClientRect();
      const cx = b.left - r.left + b.width / 2;
      const inBand = pts.filter((p) => p.y > b.top - r.top && p.y < b.bottom - r.top);
      if (inBand.some((p) => p.x < cx - b.width * 0.15) && inBand.some((p) => p.x > cx + b.width * 0.15)) hit.push(i);
    });
    return hit;
  };

  const showMark = (text: string, at: Pt, ok: boolean) => {
    const n = strokeN.current;
    setMark({ text, x: at.x, y: at.y, ok, n });
    window.setTimeout(() => setMark((m) => (m?.n === n ? null : m)), 1300);
  };

  const endStroke = (e: React.PointerEvent) => {
    const st = stroke.current;
    if (!st) return;
    stroke.current = null;
    const svg = trailSvg.current;
    const finish = (ok: boolean) => {
      if (svg) svg.dataset.state = ok ? 'ok' : 'miss';
      window.setTimeout(() => {
        if (strokeN.current === st.n && svg) {
          svg.dataset.state = '';
          trailRef.current?.setAttribute('points', '');
        }
      }, 650);
    };
    if (e.type === 'pointercancel') return finish(false);
    const pts = st.pts;
    const end = pts[pts.length - 1]!;
    if (pts.length < 3) {
      finish(false);
      say(setInchLine, pick(GARDEN_LINES.tap));
      return;
    }
    const shape = classify(pts);
    if (shape === 'slash') {
      const crossed = plantsCrossed(pts);
      const ripe = crossed.filter((i) => (plotsRef.current[i]?.growth ?? 0) >= 1);
      if (ripe.length) {
        finish(true);
        ripe.forEach(harvest);
        return;
      }
      finish(false);
      if (crossed.length) {
        const p = plotsRef.current[crossed[0]!];
        say(setInchLine, p?.kind === 'moonflower' && !night ? pick(GARDEN_LINES.moonWaiting) : pick(GARDEN_LINES.notRipe));
      }
      return;
    }
    const kind = shape ? SHAPE_PLANT[shape] : undefined;
    const i = plotUnder(pts);
    if (!kind || i < 0) {
      finish(false);
      showMark('?', end, false);
      say(setInchLine, pick(GARDEN_LINES.unclear));
      return;
    }
    if (plotsRef.current[i]) {
      finish(false);
      say(setInchLine, pick(GARDEN_LINES.taken));
      return;
    }
    finish(true);
    showMark(PACKETS[kind].name.toLowerCase(), end, true);
    sow(i, kind);
  };

  const onUp = (e: React.PointerEvent) => {
    if (stroke.current) endStroke(e);
  };

  // ------------------------------------------------------------- keyboard

  /** Keyboard and screen readers: choose a seed, then act on a plot. */
  const onPlotKey = (i: number) => (e: React.MouseEvent) => {
    if (e.detail !== 0) return;
    const p = plotsRef.current[i];
    if (!p) {
      if (keySeed) sow(i, keySeed);
      else say(setInchLine, 'pick a seed first.');
    } else if (p.growth >= 1 && isPlantKind(p.kind)) harvest(i);
    else say(setInchLine, p.kind === 'moonflower' && !night ? pick(GARDEN_LINES.moonWaiting) : pick(GARDEN_LINES.notRipe));
  };

  return (
    <section className={styles.room} data-phase={phase} aria-labelledby="garden-title">
      <header className={styles.head}>
        <LivingTitle id="garden-title" lines={['Gar', 'den']} label="Garden" size="room" />
        <p className={styles.blurb}>You’re the sun. Move over the sky and the light follows; things grow where it falls. Sink it behind the fence for night. Draw shapes in the soil to plant, and swipe across anything ripe to pick it.</p>
      </header>

      {/* keyboard and screen-reader controls (hidden until focused) */}
      <div className={styles.keys} role="group" aria-label="Garden controls for the keyboard">
        {PLANT_KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={keySeed === k} onClick={() => setKeySeed(keySeed === k ? null : k)}>
            {PACKETS[k].name} seeds
          </button>
        ))}
        <label>
          Sun, across the garden
          <input type="range" min={3} max={97} defaultValue={35} onChange={(e) => (sun.current.tx = Number(e.target.value) / 100)} />
        </label>
        <label>
          Sun height (below zero is night)
          <input type="range" min={-40} max={100} defaultValue={startNight ? -40 : 65} onChange={(e) => (sun.current.te = Number(e.target.value) / 100)} />
        </label>
      </div>

      <div ref={sceneRef} className={styles.scene} data-weather={weather} onPointerDown={onSceneDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className={styles.sky}>
          <span className={styles.stars} aria-hidden="true" />
          <span className={styles.moonDisc} aria-hidden="true" />
          <WeatherLayer />
        </div>
        <div className={styles.sun} aria-hidden="true" />
        <div ref={fenceRef} className={styles.fence} aria-hidden="true" />
        <div className={styles.pool} aria-hidden="true" />
        <div className={styles.house} aria-hidden="true">
          <span className={styles.houseDoor} />
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

        {/* Pim's planting card, propped on the lawn */}
        <div className={styles.card} aria-hidden="true">
          <span className={styles.cardTitle}>{CARD_TITLE}</span>
          <ul>
            {PLANT_KINDS.map((k) => (
              <li key={k} title={PACKETS[k].note}>
                <svg viewBox="0 0 24 24">
                  <path d={SHAPE_GLYPH[k]} />
                </svg>
                {PACKETS[k].name}
              </li>
            ))}
          </ul>
        </div>

        <ol className={styles.beds} aria-label="Garden plots" onPointerDown={onBedsDown}>
          {plotsRef.current.map((p, i) => {
            const kind = p && isPlantKind(p.kind) ? p.kind : null;
            const st: Stage = p ? stage(p.growth) : 0;
            const label = !p || !kind ? `Plot ${i + 1}: empty` : `Plot ${i + 1}: ${PACKETS[kind].name.toLowerCase()}, ${STAGE_NAMES[st]}${st === 4 ? ' (ready to pick)' : ''}`;
            return (
              <li
                key={i}
                className={styles.plotWrap}
                data-bed={Math.floor(i / 2)}
                ref={(el) => {
                  plotEls.current[i] = el;
                }}
              >
                <button type="button" className={styles.plot} data-stage={kind ? st : 'empty'} data-kind={kind ?? undefined} aria-label={label} onClick={onPlotKey(i)}>
                  {kind && st > 0 ? <span className={styles.shadow} aria-hidden="true" /> : null}
                  <span
                    className={styles.plant}
                    ref={(el) => {
                      plantEls.current[i] = el;
                    }}
                  >
                    {kind ? <PlantView kind={kind} stage={st} /> : null}
                  </span>
                  <span className={styles.soil} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>

        {night
          ? Array.from({ length: FIREFLIES }, (_, i) => <span key={i} className={styles.firefly} aria-hidden="true" style={{ left: `${12 + ((i * 37) % 80)}%`, top: `${48 + ((i * 23) % 38)}%`, animationDelay: `${-i * 0.7}s` }} />)
          : null}

        <svg ref={trailSvg} className={styles.trail} aria-hidden="true">
          <polyline ref={trailRef} points="" />
        </svg>
        {mark ? (
          <span key={mark.n} className={styles.mark} data-ok={mark.ok} style={{ left: mark.x, top: mark.y }} aria-hidden="true">
            {mark.text}
          </span>
        ) : null}
        {flying.map((f) => (
          <div key={f.id} className={styles.fly} aria-hidden="true" style={{ '--x': `${f.x}px`, '--y': `${f.y}px`, '--hx': `${f.hx}px`, '--hy': `${f.hy}px` } as React.CSSProperties}>
            <CropIcon kind={f.kind} />
          </div>
        ))}

        <div className={styles.inch}>
          <Inch thought={inchLine} rootRef={inchRef} label="Inch, who lives along the beds" onActivate={() => say(setInchLine, pick(INCH_GARDEN))} />
        </div>
      </div>
    </section>
  );
}
