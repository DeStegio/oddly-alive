import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { findLetter } from '../../app/letters';
import { useWorld } from '../../app/worldInstance';
import { Inch } from '../../characters/Inch';
import { ThoughtBubble } from '../../characters/ThoughtBubble';
import { LivingTitle } from '../../components/LivingTitle';
import { WeatherLayer } from '../../components/WeatherLayer';
import { useWeather } from '../../components/useWeather';
import { BIP_FENCE, CARD_SKY, CARD_TITLE, CLOUD_GLYPH, GARDEN_LINES, INCH_GARDEN, PACKETS, SHAPE_GLYPH, SHAPE_PLANT } from '../../content/garden';
import { onFrame } from '../../engine/frameLoop';
import type { StoredPlot } from '../../engine/memory';
import { useKeepsakes } from '../../state/keepsakes';
import { useSettings } from '../../state/settings';
import { useObjects } from '../../state/world';
import { PLANTS, PLANT_KINDS, advance, isPlantKind, plant, stage, sunGrow, type GrowContext, type PlantKind, type Stage } from './growth';
import { elevation, leanTowards, lightAt, phaseOf, shadow, skyColour, type Phase } from './light';
import { MAX_CLOUDS, dryness, fireflyLight, isRaining, newCloud, orbit, rainbow, stepCloud, under, wilt, type Cloud } from './sky';
import { classify, features, type Pt } from './strokes';
import { hybridId, isOpen, makeBugs, stepBugs, type Bug, type Flower } from './pollinators';
import { arrive, poke, thiefAway, tickThief, type Thief } from './seedThief';
import { CropIcon, PlantView } from './PlantView';
import styles from './Garden.module.css';

const pick = <T,>(lines: readonly T[]) => lines[Math.floor(Math.random() * lines.length)]!;
const CAME_BACK_MS = 30 * 60_000;
const SAVE_MS = 2000;
/** The pointer has to rest behind the fence this long before the sun follows it down. */
const SETTLE_MS = 350;
const STAGE_NAMES = ['just planted', 'a sprout', 'in leaf', 'in bud', 'in bloom'];
const FIREFLIES = 9;
/** Crosses made by the insects this visit: plot + when it was planted → the other parent. */
const crossings = new Map<string, PlantKind>();
const crossKey = (i: number, p: StoredPlot) => `${i}:${p.plantedAt}`;
/** Crumb the sparrow comes at most this often. */
const THIEF_EVERY_MS = 75_000;

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
 * Strong sun dries the beds out, so draw a cloud in the sky for rain (with the
 * sun on the other side, a rainbow). At night the fireflies follow you, and
 * their light is what the moonflowers grow by.
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
  const stroke = useRef<{ pts: Pt[]; n: number; where: 'soil' | 'sky' } | null>(null);
  const clouds = useRef<Cloud[]>([]);
  const cloudId = useRef(1);
  const [cloudViews, setCloudViews] = useState<Array<{ id: number; w: number }>>([]);
  const cloudEls = useRef(new Map<number, HTMLDivElement>());
  const dry = useRef<number[]>(Array.from({ length: 6 }, () => 0.3));
  const saidAt = useRef({ thirsty: 0, snap: 0, rain: 0 });
  const sawRainbow = useRef(false);
  const swarm = useRef({ x: 0, y: 0, ready: false });
  const hand = useRef({ x: 0, y: 0, inside: false });
  const flyEls = useRef<Array<HTMLSpanElement | null>>([]);
  const snapAt = useRef<number[]>(Array.from({ length: 6 }, () => 0));
  const bugs = useRef<Bug[] | null>(null);
  const bugEls = useRef<Array<HTMLSpanElement | null>>([]);
  const thief = useRef<Thief>(thiefAway());
  const thiefSeed = useRef<PlantKind | null>(null);
  const thiefLast = useRef(-THIEF_EVERY_MS + 8000);
  const thiefEl = useRef<HTMLButtonElement>(null);
  const [thiefPhase, setThiefPhase] = useState<Thief['phase']>('away');
  const sawCross = useRef(false);
  const strokeN = useRef(0);
  const dirty = useRef(false);
  const kindsPlanted = useRef(new Set<PlantKind>());
  const [mark, setMark] = useState<{ text: string; x: number; y: number; ok: boolean; n: number } | null>(null);
  const [flying, setFlying] = useState<Fly[]>([]);
  const flyId = useRef(1);
  const [inchLine, setInchLine] = useState<string | null>(null);
  const [bipLine, setBipLine] = useState<string | null>(null);
  const [keySeed, setKeySeed] = useState<PlantKind | null>(null);
  const reducedRef = useRef(false);
  reducedRef.current = useSettings((st) => st.motion) === 'reduced';
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
      const partner = crossings.get(crossKey(i, p));
      crossings.delete(crossKey(i, p));
      setPlot(i, null);
      if (partner && kind !== 'radish') {
        // a hybrid: something new for the vase
        useKeepsakes.getState().addToVase(hybridId(kind, partner));
        useObjects.getState().setLiving({ vaseNew: true });
        world.emit('OBJECT_STATE_CHANGED', { target: 'garden:hybrid', key: 'harvest', value: hybridId(kind, partner) });
        world.effects.discover('hybrid-bloom');
        world.effects.sound('chime');
        say(setInchLine, pick(GARDEN_LINES.hybrid));
      } else deliver(kind);
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
    [deliver, say, setPlot, world],
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
      onFrame((dt, now) => {
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

        // clouds drift downwind, rain, and thin out
        const wind = weatherRef.current === 'windy' ? 0.03 : 0.008;
        const before = clouds.current.length;
        clouds.current = clouds.current.map((c) => stepCloud(c, dt, wind, r.width)).filter((c): c is Cloud => c !== null);
        if (clouds.current.length !== before) setCloudViews(clouds.current.map((c) => ({ id: c.id, w: c.w })));
        for (const c of clouds.current) {
          const ce = cloudEls.current.get(c.id);
          if (!ce) continue;
          ce.style.transform = `translate(${(c.x - c.w / 2).toFixed(1)}px, ${(c.y - c.w * 0.25).toFixed(1)}px)`;
          ce.style.setProperty('--rain-h', `${Math.max(0, r.height * 0.9 - c.y).toFixed(0)}px`);
          ce.style.opacity = Math.min(1, c.life / 1800).toFixed(2);
          ce.dataset.rain = String(isRaining(c));
          const bow = rainbow(c, sunX, s.e, r.width);
          ce.dataset.bow = String(bow);
          if (bow && !sawRainbow.current) {
            sawRainbow.current = true;
            world.effects.discover('rainbow-maker');
            say(setBipLine, pick(GARDEN_LINES.bipRainbow));
          }
        }

        // at night the fireflies follow your hand (or wander, if you've gone)
        const sw = swarm.current;
        if (ph === 'night') {
          const h = hand.current;
          const tx = h.inside ? h.x : r.width * (0.5 + Math.sin(now / 4000) * 0.3);
          const ty = h.inside ? h.y : r.height * (0.62 + Math.cos(now / 3100) * 0.08);
          if (!sw.ready) Object.assign(sw, { x: tx, y: ty, ready: true });
          const kf = 1 - Math.exp(-dt / 450);
          sw.x += (tx - sw.x) * kf;
          sw.y += (ty - sw.y) * kf;
          flyEls.current.forEach((fe, i) => {
            if (!fe) return;
            const o = orbit(i, now, sw.x, sw.y);
            fe.style.transform = `translate(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px)`;
          });
        } else sw.ready = false;
        const wet = weatherRef.current === 'rain' || weatherRef.current === 'storm';

        const open: Flower[] = [];
        plotsRef.current.forEach((p, i) => {
          const plantEl = plantEls.current[i];
          const plotEl = plotEls.current[i];
          if (!plotEl) return;
          const b = plotEl.getBoundingClientRect();
          const cx = b.left - r.left + b.width / 2;
          if (p && p.growth >= 1 && isPlantKind(p.kind) && isOpen(p.kind, ph === 'night')) open.push({ plot: i, x: cx, y: b.top - r.top + b.height * 0.22, kind: p.kind });
          const cover = clouds.current.filter((c) => under(c, cx));
          const rained = wet || cover.some(isRaining);
          const light = lightAt(cx, sunX, s.e, r.width) * (cover.length ? 0.35 : 1);
          const was = dry.current[i]!;
          const d = dryness(was, p && p.growth < 1 ? light : light * 0.5, dt, rained);
          dry.current[i] = d;
          plotEl.style.setProperty('--dry', d.toFixed(3));
          if (rained && was > 0.6 && d <= 0.6 && p && now - saidAt.current.rain > 8000) {
            saidAt.current.rain = now;
            say(setInchLine, pick(GARDEN_LINES.rain));
          }
          const headY = b.top - r.top + b.height * 0.35;
          const glow = ph === 'night' && sw.ready ? fireflyLight(cx, headY, sw.x, sw.y) : 0;
          const sh = shadow(cx, sunX, s.e);
          plotEl.style.setProperty('--lit', light.toFixed(3));
          plotEl.style.setProperty('--sh-dx', `${sh.dx.toFixed(1)}px`);
          plotEl.style.setProperty('--sh-s', sh.stretch.toFixed(3));
          plotEl.style.setProperty('--sh-a', sh.alpha.toFixed(3));
          if (plantEl) {
            plantEl.style.setProperty('--lean', `${leanTowards(cx, sunX, s.e, r.width).toFixed(1)}deg`);
            plantEl.style.setProperty('--wilt', wilt(d).toFixed(3));
            if (p?.kind === 'moonflower' && glow > 0.6) world.effects.discover('night-light');
            if (p?.kind === 'snapdragon' && p.growth >= 1 && glow > 0.7 && now - snapAt.current[i]! > 1500) {
              snapAt.current[i] = now;
              plantEl.dataset.snap = 'true';
              window.setTimeout(() => delete plantEl.dataset.snap, 380);
              if (now - saidAt.current.snap > 15000) {
                saidAt.current.snap = now;
                say(setInchLine, pick(GARDEN_LINES.snap));
              }
            }
            plantEl.style.setProperty('--look', `${Math.max(-35, Math.min(35, ((sunX - cx) / r.width) * 80)).toFixed(1)}deg`);
          }
          if (!p || p.growth >= 1) return;
          if (d >= 1) {
            if (now - saidAt.current.thirsty > 20000) {
              saidAt.current.thirsty = now;
              say(setInchLine, pick(GARDEN_LINES.thirsty));
            }
            return; // parched: nothing grows until it rains
          }
          const q = sunGrow(p, dt, ph === 'night' ? glow : light, ph === 'night', weatherRef.current);
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

        // the insects: flower to flower, pollen on their legs
        if (!bugs.current) bugs.current = makeBugs(r.width, r.height);
        const env = { w: r.width, h: r.height, wind: weatherRef.current === 'windy' ? 140 : 0, raining: wet || clouds.current.some(isRaining), night: ph === 'night', sunX };
        const stepped = stepBugs(bugs.current, open, env, now, dt, Math.random);
        bugs.current = stepped.bugs;
        stepped.bugs.forEach((bug, i) => {
          const el = bugEls.current[i];
          if (!el) return;
          el.style.transform = `translate(${bug.x.toFixed(1)}px, ${bug.y.toFixed(1)}px) scaleX(${bug.vx < -2 ? -1 : 1})`;
          el.dataset.home = String(env.night);
        });
        for (const v of stepped.visits) {
          const plantEl = plantEls.current[v.plot];
          if (plantEl) {
            plantEl.dataset.visit = 'true';
            window.setTimeout(() => delete plantEl.dataset.visit, 600);
          }
          const p = plotsRef.current[v.plot];
          if (v.crossWith && p && !crossings.has(crossKey(v.plot, p))) {
            crossings.set(crossKey(v.plot, p), v.crossWith);
            rerender();
            world.emit('OBJECT_STATE_CHANGED', { target: 'garden:cross', key: v.kind, value: v.crossWith });
            world.effects.discover('cross-pollinated');
            if (!sawCross.current) {
              sawCross.current = true;
              say(setInchLine, pick(GARDEN_LINES.cross));
            }
          }
        }

        // Crumb, the sparrow, after a seed you've just planted
        const t = thief.current;
        if (t.phase === 'away') {
          // something planted in the last half-minute that's still small (seed or young sprout)
          const fresh = plotsRef.current.findIndex((p) => p && p.growth < 0.45 && Date.now() - p.plantedAt < 30_000);
          if (fresh >= 0 && ph === 'day' && !env.raining && now - thiefLast.current > THIEF_EVERY_MS && !reducedRef.current) {
            thiefLast.current = now;
            thief.current = arrive(fresh, now);
            setThiefPhase('perched');
            world.emit('OBJECT_STATE_CHANGED', { target: 'garden:thief', key: 'arrived', value: fresh });
          }
        } else {
          const r2 = tickThief(t, now);
          if (r2.thief.phase !== t.phase) setThiefPhase(r2.thief.phase);
          if (r2.outcome === 'took') {
            const p = plotsRef.current[t.plot];
            thiefSeed.current = p && isPlantKind(p.kind) ? p.kind : null;
            if (p && p.growth < 0.6) setPlot(t.plot, null);
            say(setInchLine, pick(GARDEN_LINES.thiefTook));
          } else if (r2.outcome === 'gone') {
            say(setBipLine, pick(GARDEN_LINES.bipSparrow));
            world.emit('OBJECT_STATE_CHANGED', { target: 'garden:thief', key: 'outcome', value: 'gone' });
            thiefSeed.current = null;
          }
          thief.current = r2.thief;
          placeThief(r, now);
        }
      }),
    [bloomed, say, world],
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
    stroke.current = { pts: [{ x, y }], n, where: 'soil' };
    if (trailSvg.current) {
      trailSvg.current.dataset.state = 'drawing';
      trailSvg.current.dataset.where = 'soil';
    }
    drawTrail();
  };

  const onSceneDown = (e: React.PointerEvent) => {
    if (stroke.current || e.button !== 0 || (e.target as Element).closest('button')) return;
    const { x, y, r } = toLocal(e);
    const fence = fenceRef.current?.getBoundingClientRect();
    if (!fence || y > fence.top - r.top) return;
    // pressing in the sky: draw (a curl makes a cloud) while the sun still follows
    sceneRef.current?.setPointerCapture?.(e.pointerId);
    const n = ++strokeN.current;
    stroke.current = { pts: [{ x, y }], n, where: 'sky' };
    if (trailSvg.current) {
      trailSvg.current.dataset.state = 'drawing';
      trailSvg.current.dataset.where = 'sky';
    }
    drawTrail();
    aimSun(e);
  };

  const onMove = (e: React.PointerEvent) => {
    const here = toLocal(e);
    Object.assign(hand.current, { x: here.x, y: here.y, inside: true });
    const st = stroke.current;
    if (st?.where === 'sky') aimSun(e);
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

  /** A curl or a scribble in the sky becomes a raincloud there. */
  const drawCloud = (pts: Pt[]) => {
    if (pts.length < 6) return false;
    const shape = classify(pts);
    const f = features(pts);
    if (!(shape === 'loop' || shape === 'spiral' || (f.openness < 0.35 && f.length > 140))) return false;
    const fence = fenceRef.current!.getBoundingClientRect();
    const r = sceneRef.current!.getBoundingClientRect();
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const cy = Math.min(fence.top - r.top - 40, pts.reduce((a, p) => a + p.y, 0) / pts.length);
    const c = newCloud(cloudId.current++, cx, Math.max(30, cy), f.width * 1.3);
    clouds.current = [...clouds.current, c].slice(-MAX_CLOUDS);
    setCloudViews(clouds.current.map((k) => ({ id: k.id, w: k.w })));
    world.emit('OBJECT_STATE_CHANGED', { target: 'garden:cloud', key: 'rain', value: true });
    world.effects.discover('make-it-rain');
    return true;
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
    if (st.where === 'sky') return finish(drawCloud(pts));
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

  // ------------------------------------------------------------- Crumb

  /** Where Crumb is, by what it's doing. */
  const placeThief = (r: DOMRect, now: number) => {
    const el = thiefEl.current;
    const t = thief.current;
    const plotEl = plotEls.current[t.plot];
    const fence = fenceRef.current;
    if (!el || !plotEl || !fence) return;
    const pb = plotEl.getBoundingClientRect();
    const fb = fence.getBoundingClientRect();
    const px = pb.left - r.left + pb.width / 2;
    const soil = pb.bottom - r.top - pb.height * 0.12;
    const perch = fb.top - r.top - 2;
    const age = now - t.since;
    let x = px;
    let y = perch;
    if (t.phase === 'hopping') {
      const k = Math.min(1, age / 900);
      y = perch + (soil - perch) * k - Math.sin(k * Math.PI) * 40;
    } else if (t.phase === 'pecking') y = soil;
    else if (t.phase === 'leaving' || t.phase === 'startled') {
      const k = Math.min(1, age / 1400);
      x = px + k * r.width * 0.6;
      y = (t.phase === 'startled' ? soil : perch) - k * r.height * 0.5;
    }
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  };

  /** Shoo it (before it has the seed) or follow it (after): it drops the seed into a free plot. */
  const shooThief = () => {
    const r = poke(thief.current, performance.now());
    if (r.outcome === 'none') return;
    thief.current = r.thief;
    setThiefPhase(r.thief.phase);
    if (r.outcome === 'shooed') {
      world.effects.discover('seed-saver');
      say(setInchLine, pick(GARDEN_LINES.thiefShooed));
    } else if (r.outcome === 'dropped' && thiefSeed.current) {
      const free = plotsRef.current.findIndex((p) => !p);
      if (free >= 0) setPlot(free, plant(thiefSeed.current, Date.now()));
      say(setInchLine, pick(GARDEN_LINES.thiefDropped));
      thiefSeed.current = null;
    }
    world.emit('OBJECT_STATE_CHANGED', { target: 'garden:thief', key: 'outcome', value: r.outcome });
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
        <p className={styles.blurb}>You’re the sun. Move over the sky and the light follows; things grow where it falls. Sink it behind the fence for night. Draw shapes in the soil to plant, swipe across anything ripe to pick it, and if the beds dry out, draw them a cloud.</p>
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

      <div
        ref={sceneRef}
        className={styles.scene}
        data-weather={weather}
        onPointerDown={onSceneDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={() => (hand.current.inside = false)}
      >
        <div className={styles.sky}>
          <span className={styles.stars} aria-hidden="true" />
          <span className={styles.moonDisc} aria-hidden="true" />
          <WeatherLayer />
        </div>
        <div className={styles.sun} aria-hidden="true" />
        {cloudViews.map((c) => (
          <div
            key={c.id}
            className={styles.cloud}
            aria-hidden="true"
            style={{ width: c.w, height: c.w * 0.5 }}
            ref={(el) => {
              if (el) cloudEls.current.set(c.id, el);
              else cloudEls.current.delete(c.id);
            }}
          >
            <span className={styles.bow} />
            <span className={styles.rain} />
            <span className={styles.puff} />
          </div>
        ))}
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
            <li className={styles.cardSky}>
              <svg viewBox="0 0 24 24">
                <path d={CLOUD_GLYPH} />
              </svg>
              {CARD_SKY}
            </li>
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
                <button type="button" className={styles.plot} data-stage={kind ? st : 'empty'} data-kind={kind ?? undefined} data-crossed={p && crossings.has(crossKey(i, p)) ? 'true' : undefined} aria-label={label} onClick={onPlotKey(i)}>
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
          ? Array.from({ length: FIREFLIES }, (_, i) => (
              <span
                key={i}
                className={styles.firefly}
                aria-hidden="true"
                style={{ animationDelay: `${-i * 0.37}s` }}
                ref={(el) => {
                  flyEls.current[i] = el;
                }}
              />
            ))
          : null}

        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={styles.bug}
            data-kind={i < 2 ? 'bee' : 'butterfly'}
            aria-hidden="true"
            ref={(el) => {
              bugEls.current[i] = el;
            }}
          />
        ))}
        {thiefPhase !== 'away' ? (
          <button ref={thiefEl} type="button" className={styles.thief} data-phase={thiefPhase} aria-label={GARDEN_LINES.thiefLabel} onClick={shooThief}>
            <svg viewBox="0 0 44 34" aria-hidden="true">
              <path d="M6 20 C 6 8 26 4 34 14 L 42 12 L 36 20 C 34 28 14 30 6 20 Z" fill="#a07a5c" stroke="var(--char-ink)" strokeWidth="2.5" strokeLinejoin="round" />
              <path className={styles.wing} d="M14 16 C 18 8 28 10 28 18 C 22 20 16 20 14 16 Z" fill="#7a5a42" stroke="var(--char-ink)" strokeWidth="2" />
              <circle cx="31" cy="14" r="1.8" fill="var(--char-ink)" />
              <path d="M16 28 v 5 M22 28 v 5" stroke="var(--char-ink)" strokeWidth="2" />
              {thiefPhase === 'carrying' ? <ellipse cx="42" cy="16" rx="3" ry="2" fill="#6b4f3a" stroke="var(--char-ink)" strokeWidth="1.2" /> : null}
            </svg>
          </button>
        ) : null}
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
