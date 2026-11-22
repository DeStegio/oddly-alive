import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { findLetter } from '../../app/letters';
import { useWorld } from '../../app/worldInstance';
import { ThoughtBubble } from '../../characters/ThoughtBubble';
import { LivingTitle } from '../../components/LivingTitle';
import { WeatherLayer } from '../../components/WeatherLayer';
import {
  DUST_LINES,
  HATS,
  HAT_FOUND,
  HAT_NAMES,
  LOCK_LABEL,
  LOCK_LINES,
  MARGUERITE_ALL,
  MARGUERITE_BARE,
  MARGUERITE_DUSTY,
  MARGUERITE_HATS,
  MARGUERITE_IDLE,
  MARGUERITE_NO_HATS,
  MEMORIES,
  MEMORY_HINT,
  type HatId,
  type Memory,
} from '../../content/attic';
import { onFrame } from '../../engine/frameLoop';
import { useKeepsakes } from '../../state/keepsakes';
import { useObjects } from '../../state/world';
import { Diary } from './Diary';
import { DustGrid, cycle, dwell, told, turn } from './dust';
import { Gramophone } from './Gramophone';
import { SPOTS, TALL, WIDE, inside, type AtticLayout, type Spot } from './layout';
import { HatSvg, MargueriteSvg } from './Marguerite';
import { PhotoArt } from './Photos';
import { Trunk } from './Trunk';
import { ShadowTheatre } from './shadows/ShadowTheatre';
import styles from './Attic.module.css';

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]!;
const ids = (csv: string) => csv.split(',').filter(Boolean);
const isHat = (v: string): v is HatId => (HATS as readonly string[]).includes(v);
const CODE = MEMORIES.map((m) => m.digit);
const BUNNIES = 7;
const MOTES = 28;
/** A place counts as clean below this much dust. */
const CLEAN = 0.22;

interface Bunny {
  x: number;
  y: number;
  tx: number;
  ty: number;
  caught: boolean;
}

const addTo = (field: 'opened' | 'dust', id: string) => {
  const s = useObjects.getState();
  const list = ids(s.attic[field]);
  if (!list.includes(id)) s.setSlice('attic', { [field]: [...list, id].join(',') });
};

/**
 * The attic, under years of dust. Rub it off (press and rub) and things come
 * back: dust bunnies run for the thickest dust left; clean photographs
 * remember, if you keep still over them; Marguerite changes hats on the
 * wheel; the trunk wants three numbers the photos know; the record plays
 * while you turn it. Something is lying on the floor under all of it.
 */
export default function Attic() {
  const world = useWorld();
  const attic = useObjects((s) => s.attic);
  const hatsFound = useKeepsakes((s) => s.attic.hats).filter(isHat);
  const [line, setLine] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layout, setLayout] = useState<AtticLayout>(WIDE);
  const L = useRef(layout);
  L.current = layout;
  const scale = useRef(1);
  const dust = useRef<DustGrid | null>(null);
  const dustDirty = useRef(true);
  const cleaned = useRef(new Set<string>(ids(useObjects.getState().attic.dust)));
  const [clean, setClean] = useState<Set<string>>(() => new Set(cleaned.current));
  const hand = useRef({ x: -999, y: -999, down: false, mouse: true, ax: 0, ay: 0, stillSince: 0, startX: 0, startY: 0, moved: 0 });
  const swipe = useRef<{ what: 'hat' | number; y: number } | null>(null);
  const bunnies = useRef<Bunny[]>([]);
  const bunnyEls = useRef<Array<HTMLSpanElement | null>>([]);
  const moteEls = useRef<Array<HTMLSpanElement | null>>([]);
  const nextMote = useRef(0);
  const photoEls = useRef(new Map<string, HTMLDivElement>());
  const progress = useRef<Record<string, number>>({});
  const focusedPhoto = useRef<string | null>(null);
  const [memory, setMemory] = useState<{ id: Memory['id']; lines: number } | null>(null);
  const [dials, setDials] = useState([0, 0, 0]);
  const dialsRef = useRef(dials);
  const saidAt = useRef({ bunny: 0 });
  const opened = ids(attic.opened);
  const trunkOpen = opened.includes('trunk');
  const wearing = isHat(attic.wearing) ? attic.wearing : null;
  const wearingRef = useRef(wearing);
  wearingRef.current = wearing;
  const hatsRef = useRef(hatsFound);
  hatsRef.current = hatsFound;

  const say = useCallback((text: string, ms = 3000) => {
    setLine(text);
    window.setTimeout(() => setLine((cur) => (cur === text ? null : cur)), ms);
  }, []);

  // coming up the ladder (or the address) counts as finding the attic
  useEffect(() => {
    useKeepsakes.getState().unlockAttic();
    world.effects.discover('attic');
    if (cleaned.current.size === 0) window.setTimeout(() => say(DUST_LINES.start), 900);
  }, [world, say]);

  // ------------------------------------------------------------- the dust

  /** Lay the dust down (for this layout), minus what's already been cleaned. */
  const buildDust = useCallback((lay: AtticLayout) => {
    const g = new DustGrid(Math.ceil(lay.w / lay.cell), Math.ceil(lay.h / lay.cell), lay.cell);
    // a little uneven: thicker up in the corners, thinner where people walked
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) g.lv[r * g.cols + c] = 0.82 + (((c * 7 + r * 13) % 10) / 10) * 0.18;
    if (cleaned.current.has('all')) g.clear({ x: 0, y: 0, w: lay.w, h: lay.h });
    for (const s of SPOTS) if (cleaned.current.has(s)) g.clear(lay.spots[s]);
    dust.current = g;
    dustDirty.current = true;
    // the bunnies start out in the thick of it
    const caught = ids(useObjects.getState().attic.opened).includes('bunnies');
    bunnies.current = Array.from({ length: BUNNIES }, (_, i) => {
      const home = caught ? { x: lay.bunnyRow.x + i * lay.bunnyRow.gap, y: lay.bunnyRow.y } : { x: lay.w * (0.1 + ((i * 0.37) % 0.8)), y: lay.h * (0.2 + ((i * 0.29) % 0.7)) };
      return { ...home, tx: home.x, ty: home.y, caught };
    });
  }, []);

  // fit the attic to the screen (a taller attic on phones)
  useLayoutEffect(() => {
    const update = () => {
      const st = stageRef.current;
      if (!st) return;
      const lay = st.clientWidth && st.clientWidth < 640 ? TALL : WIDE;
      if (lay !== L.current || !dust.current) {
        L.current = lay;
        setLayout(lay);
        buildDust(lay);
      }
      scale.current = Math.max(0.3, (st.clientWidth || lay.w) / lay.w);
      st.style.height = `${lay.h * scale.current}px`;
      if (worldRef.current) worldRef.current.style.transform = `scale(${scale.current})`;
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [buildDust]);

  // ------------------------------------------------------------- hats

  const wear = useCallback(
    (hat: HatId | null) => {
      const s = useObjects.getState();
      const worn = ids(s.attic.worn);
      const nextWorn = hat && !worn.includes(hat) ? [...worn, hat] : worn;
      s.setSlice('attic', { wearing: hat ?? '', worn: nextWorn.join(',') });
      wearingRef.current = hat;
      if (!hat) say(MARGUERITE_BARE);
      else if (nextWorn.length === HATS.length && !worn.includes(hat)) say(MARGUERITE_ALL);
      else say(MARGUERITE_HATS[hat]);
      if (nextWorn.length === HATS.length) world.effects.discover('dress-rehearsal');
      world.emit('OBJECT_STATE_CHANGED', { target: 'marguerite', key: 'hat', value: hat ?? '' });
    },
    [say, world],
  );

  const changeHat = useCallback(
    (dir: 1 | -1) => {
      if (!cleaned.current.has('marguerite')) return say(pick(MARGUERITE_DUSTY));
      const found = HATS.filter((h) => hatsRef.current.includes(h));
      if (!found.length) return say(MARGUERITE_NO_HATS);
      wear(cycle(found, wearingRef.current, dir));
    },
    [say, wear],
  );

  // ------------------------------------------------------------- the lock

  const turnDial = useCallback(
    (i: number, dir: 1 | -1) => {
      if (!cleaned.current.has('trunk') || ids(useObjects.getState().attic.opened).includes('trunk')) return;
      const next = dialsRef.current.map((v, k) => (k === i ? turn(v, dir) : v));
      dialsRef.current = next;
      setDials(next);
      world.effects.sound('press');
      if (next.every((v, k) => v === CODE[k])) {
        addTo('opened', 'trunk');
        world.effects.sound('chime');
        world.effects.discover('combination');
        world.emit('OBJECT_STATE_CHANGED', { target: 'attic:trunk', key: 'open', value: true });
        say(LOCK_LINES.open);
      }
    },
    [say, world],
  );

  // ------------------------------------------------------------- a place comes clean

  const cameClean = useCallback(
    (spot: Spot | 'all') => {
      if (cleaned.current.has(spot)) return;
      cleaned.current.add(spot);
      addTo('dust', spot);
      setClean(new Set(cleaned.current));
      world.emit('OBJECT_STATE_CHANGED', { target: `attic:${spot}`, key: 'clean', value: true });
      if (spot.startsWith('hat:')) {
        const hat = spot.slice(4) as HatId;
        useKeepsakes.getState().addHat(hat);
        say(HAT_FOUND[hat], 1900);
        // she has it on a moment later
        window.setTimeout(() => wear(hat), 2000);
      } else if (spot === 'letter') {
        say(DUST_LINES.letter);
        findLetter(world, 'attic');
      } else if (spot === 'trunk' && !ids(useObjects.getState().attic.opened).includes('trunk')) say(LOCK_LINES.locked);
      else if (spot.startsWith('photo:') && !progress.current[spot]) say(MEMORY_HINT, 3600);
      else if (spot === 'all') {
        world.effects.discover('spring-clean');
        say(DUST_LINES.clean);
      }
    },
    [say, wear, world],
  );

  /** Keyboard: dust the next thing completely. */
  const dustNext = () => {
    const g = dust.current;
    const next = SPOTS.find((s) => !cleaned.current.has(s));
    if (!g || !next) return;
    g.clear(L.current.spots[next]);
    dustDirty.current = true;
    cameClean(next);
  };

  // ------------------------------------------------------------- every frame

  useEffect(() => {
    let checkIn = 0;
    return onFrame((dt, now) => {
      const g = dust.current;
      const lay = L.current;
      if (!g) return;
      const h = hand.current;

      // the dust layer
      if (dustDirty.current && canvasRef.current) {
        dustDirty.current = false;
        const ctx = canvasRef.current.getContext?.('2d');
        if (ctx) {
          const img = ctx.createImageData(g.cols, g.rows);
          for (let i = 0; i < g.lv.length; i++) {
            const v = g.lv[i]!;
            const n = ((i * 2654435761) >>> 24) / 255;
            img.data[i * 4] = 150 + n * 30;
            img.data[i * 4 + 1] = 138 + n * 26;
            img.data[i * 4 + 2] = 122 + n * 20;
            img.data[i * 4 + 3] = Math.round(Math.min(1, v) * 212);
          }
          ctx.putImageData(img, 0, 0);
        }
        stageRef.current?.style.setProperty('--dust', g.total().toFixed(3));
      }

      // dust bunnies: they run for the thickest dust when your hand comes near
      let free = 0;
      bunnies.current.forEach((b, i) => {
        const el = bunnyEls.current[i];
        if (!b.caught) {
          free++;
          const near = h.down && Math.hypot(h.x - b.x, h.y - b.y) < 90;
          const atRest = Math.hypot(b.tx - b.x, b.ty - b.y) < 2;
          if (near || (atRest && g.levelAt(b.x, b.y) < 0.35)) {
            const spot = g.hideout(b, near ? h : b, near ? 420 : 2000);
            if (spot) {
              b.tx = spot.x + ((i * 5) % 9) - 4;
              b.ty = spot.y + ((i * 3) % 7) - 3;
              if (near && now - saidAt.current.bunny > 9000) {
                saidAt.current.bunny = now;
                say(pick(DUST_LINES.bunny));
              }
            } else if (!near) {
              b.caught = true;
              b.tx = lay.bunnyRow.x + bunnies.current.filter((x) => x.caught).length * lay.bunnyRow.gap;
              b.ty = lay.bunnyRow.y;
            }
          }
        }
        const dx = b.tx - b.x;
        const dy = b.ty - b.y;
        const d = Math.hypot(dx, dy);
        const step = Math.min(d, dt * (b.caught ? 0.12 : 0.42));
        if (d > 0.5) {
          b.x += (dx / d) * step;
          b.y += (dy / d) * step;
        }
        if (el) {
          el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px)`;
          el.dataset.running = String(d > 2);
          el.style.opacity = b.caught ? '1' : (0.35 + Math.min(1, g.levelAt(b.x, b.y)) * 0.65).toFixed(2);
        }
      });
      if (free === 0 && bunnies.current.length && !ids(useObjects.getState().attic.opened).includes('bunnies')) {
        addTo('opened', 'bunnies');
        world.effects.discover('dust-bunnies');
        say(DUST_LINES.cornered);
      }

      // photographs: remembering takes stillness
      const still = (h.mouse || h.down) && now - h.stillSince > 220;
      for (const m of MEMORIES) {
        const spot = `photo:${m.id}` as Spot;
        const el = photoEls.current.get(m.id);
        if (!el || !cleaned.current.has(spot)) continue;
        const over = (still && inside(lay.spots[spot], h.x, h.y)) || focusedPhoto.current === m.id;
        const before = progress.current[m.id] ?? 0;
        const watched = ids(useObjects.getState().attic.opened).includes(`mem:${m.id}`);
        const p = dwell(before, dt, over);
        // once a memory has been told in full, it stays developed
        progress.current[m.id] = watched ? Math.max(p, 1600) : p;
        const t = told(progress.current[m.id]!, m.lines.length);
        el.style.setProperty('--develop', t.develop.toFixed(3));
        el.dataset.playing = String(over && t.develop >= 1);
        if (over && t.develop >= 1) {
          setMemory((cur) => (cur?.id === m.id && cur.lines >= t.lines ? cur : { id: m.id, lines: Math.max(t.lines, cur?.id === m.id ? cur.lines : 0) }));
          if (t.lines === m.lines.length && !watched) {
            addTo('opened', `mem:${m.id}`);
            world.emit('OBJECT_STATE_CHANGED', { target: `attic:photo:${m.id}`, key: 'remembered', value: true });
            if (MEMORIES.every((x) => ids(useObjects.getState().attic.opened).includes(`mem:${x.id}`))) world.effects.discover('memory-lane');
          }
        }
      }

      // now and then: has anything come clean?
      checkIn -= dt;
      if (checkIn > 0) return;
      checkIn = 200;
      for (const s of SPOTS) if (!cleaned.current.has(s) && g.coverage(lay.spots[s]) < CLEAN) cameClean(s);
      if (!cleaned.current.has('all') && g.total() < 0.05) {
        g.clear({ x: 0, y: 0, w: lay.w, h: lay.h });
        dustDirty.current = true;
        cameClean('all');
      }
    });
  }, [cameClean, say, world]);

  // ------------------------------------------------------------- the hand

  const toWorld = (clientX: number, clientY: number) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left) / scale.current, y: (clientY - r.top) / scale.current };
  };

  const moveHand = (e: React.PointerEvent) => {
    const q = toWorld(e.clientX, e.clientY);
    const h = hand.current;
    const dist = h.x > -999 ? Math.hypot(q.x - h.x, q.y - h.y) : 0;
    h.x = q.x;
    h.y = q.y;
    h.mouse = e.pointerType === 'mouse';
    if (Math.hypot(q.x - h.ax, q.y - h.ay) > 7) {
      h.ax = q.x;
      h.ay = q.y;
      h.stillSince = performance.now();
    }
    return dist;
  };

  const spawnMotes = (x: number, y: number, n: number) => {
    for (let k = 0; k < n; k++) {
      const el = moteEls.current[nextMote.current++ % MOTES];
      if (!el) continue;
      el.style.left = `${x + (Math.random() - 0.5) * 30}px`;
      el.style.top = `${y + (Math.random() - 0.5) * 20}px`;
      el.style.setProperty('--dx', `${((Math.random() - 0.5) * 80).toFixed(0)}px`);
      el.style.setProperty('--dy', `${(-30 - Math.random() * 60).toFixed(0)}px`);
      el.classList.remove(styles.moteUp ?? 'moteUp');
      void el.offsetWidth;
      el.classList.add(styles.moteUp ?? 'moteUp');
    }
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    stageRef.current?.setPointerCapture?.(e.pointerId);
    moveHand(e);
    const h = hand.current;
    h.down = true;
    h.startX = h.x;
    h.startY = h.y;
    h.moved = 0;
    const lay = L.current;
    // a swipe up or down on Marguerite, or on a dial, turns it (for touch: there's no wheel)
    const dial = dialAt(h.x, h.y);
    if (dial >= 0) swipe.current = { what: dial, y: h.y };
    else if (inside(lay.spots.marguerite, h.x, h.y)) swipe.current = { what: 'hat', y: h.y };
    else swipe.current = null;
  };

  const onMove = (e: React.PointerEvent) => {
    const dist = moveHand(e);
    const h = hand.current;
    if (!h.down) return;
    h.moved += dist;
    const sw = swipe.current;
    if (sw) {
      // a notch per so many screen pixels, whatever the scale
      const stepPx = (sw.what === 'hat' ? 44 : 26) / scale.current;
      const steps = Math.trunc((sw.y - h.y) / stepPx);
      if (steps && Math.abs(h.y - h.startY) > Math.abs(h.x - h.startX)) {
        const dir = steps > 0 ? 1 : -1;
        sw.y -= steps * stepPx;
        for (let k = 0; k < Math.abs(steps); k++) {
          if (sw.what === 'hat' && cleaned.current.has('marguerite')) changeHat(dir);
          else if (typeof sw.what === 'number' && cleaned.current.has('trunk')) turnDial(sw.what, dir);
        }
      }
    }
    // rubbing: the more you rub, the more comes off
    const g = dust.current;
    if (!g || dist <= 0) return;
    const off = g.scrub(h.x, h.y, Math.min(0.6, dist / 45), 34);
    if (off > 0.02) {
      dustDirty.current = true;
      if (Math.random() < Math.min(0.9, off)) spawnMotes(h.x, h.y, 1 + Math.floor(off * 2));
    }
  };

  const onUp = () => {
    const h = hand.current;
    const tap = h.down && h.moved < 6;
    h.down = false;
    swipe.current = null;
    if (tap && inside(L.current.spots.marguerite, h.x, h.y)) say(cleaned.current.has('marguerite') ? pick(MARGUERITE_IDLE) : pick(MARGUERITE_DUSTY));
  };

  /** Which dial of the trunk lock is at (x, y), if any. */
  const dialAt = (x: number, y: number) => {
    const t = L.current.spots.trunk;
    const dy = t.y + t.h * 0.635;
    if (Math.abs(y - dy) > t.h * 0.2) return -1;
    for (let i = 0; i < 3; i++) if (Math.abs(x - (t.x + t.w * (0.35 + i * 0.15))) < t.w * 0.075) return i;
    return -1;
  };

  // the wheel: hats on Marguerite, numbers on the lock (only those take the wheel)
  useEffect(() => {
    const st = stageRef.current;
    if (!st) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      const q = toWorld(e.clientX, e.clientY);
      const dial = dialAt(q.x, q.y);
      const onHer = inside(L.current.spots.marguerite, q.x, q.y);
      if (dial < 0 && !onHer) return;
      e.preventDefault();
      acc += e.deltaY;
      const stepPx = onHer ? 80 : 40;
      if (Math.abs(acc) < stepPx) return;
      const dir = acc < 0 ? 1 : -1;
      acc = 0;
      if (dial >= 0) turnDial(dial, dir);
      else changeHat(dir);
    };
    st.addEventListener('wheel', onWheel, { passive: false });
    return () => st.removeEventListener('wheel', onWheel);
  }, [changeHat, turnDial]);

  const [tempo, setTempo] = useState(0);
  const onTempo = useCallback((s: number) => setTempo((t) => (Math.abs(t - s) > 0.15 || (s === 0 && t !== 0) ? s : t)), []);

  const lay = layout;
  const S = lay.spots;
  const box = (r: { x: number; y: number; w: number; h: number }): React.CSSProperties => ({ left: r.x, top: r.y, width: r.w, height: r.h });
  const mem = memory ? MEMORIES.find((m) => m.id === memory.id)! : null;
  const backs = MEMORIES.filter((m) => opened.includes(`mem:${m.id}`));

  return (
    <section className={styles.room} aria-labelledby="attic-title" style={{ '--sway': Math.min(3, Math.abs(tempo)).toFixed(2) } as React.CSSProperties}>
      <div className={styles.roof} aria-hidden="true" />

      <header className={styles.head}>
        <LivingTitle id="attic-title" lines={['At', 'tic']} label="Attic" size="room" />
        <p className={styles.blurb}>Years of dust. Press and rub it off, and see what was underneath. Some things up here want you to keep still; some want turning.</p>
      </header>

      <div className={styles.keys} role="group" aria-label="Attic, for the keyboard">
        <button type="button" onClick={dustNext}>
          Dust the next thing
        </button>
      </div>

      <div ref={stageRef} className={styles.stage} data-layout={lay === TALL ? 'tall' : 'wide'} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => !hand.current.down && (hand.current.x = -999)}>
        <div ref={worldRef} className={styles.stageWorld} style={{ width: lay.w, height: lay.h }}>
          <div className={styles.wall} aria-hidden="true" style={{ height: lay.floor }} />
          <div className={styles.floorboards} aria-hidden="true" style={{ top: lay.floor }} />
          <div className={styles.roundWindow} aria-hidden="true" style={box(lay.window)}>
            <WeatherLayer />
          </div>
          <div className={styles.shelf} aria-hidden="true" style={box(lay.shelf)} />
          <div className={styles.stool} aria-hidden="true" style={box(lay.stool)} />
          <div className={styles.crate} aria-hidden="true" style={box(lay.crate)} />

          {/* Pim's photographs */}
          {MEMORIES.map((m) => (
            <div
              key={m.id}
              className={styles.photo}
              style={box(S[`photo:${m.id}`])}
              data-clean={clean.has(`photo:${m.id}`)}
              tabIndex={0}
              role="img"
              aria-label={clean.has(`photo:${m.id}`) ? `Photograph: ${m.title}. Keep focus here to remember it.` : 'A dusty photograph frame'}
              onFocus={() => (focusedPhoto.current = m.id)}
              onBlur={() => (focusedPhoto.current = null)}
              ref={(el) => {
                if (el) photoEls.current.set(m.id, el);
                else photoEls.current.delete(m.id);
              }}
            >
              <PhotoArt id={m.id} />
              {opened.includes(`mem:${m.id}`) ? (
                <span className={styles.pencil} aria-hidden="true">
                  {m.back}
                </span>
              ) : null}
            </div>
          ))}

          {/* hats, where they were left */}
          {HATS.map((h) =>
            hatsFound.includes(h) ? null : (
              <div key={h} className={styles.hatSpot} style={box(S[`hat:${h}`])} aria-hidden="true">
                <HatSvg hat={h} />
              </div>
            ),
          )}

          <div className={styles.margueriteOnStage} style={box(S.marguerite)} data-tempo={tempo !== 0}>
            <ThoughtBubble text={line} side="right" />
            <button
              type="button"
              className={`prop-btn ${styles.mHit}`}
              aria-label={`Marguerite the dress form${wearing ? `, wearing ${HAT_NAMES[wearing]}` : ''}. Arrow keys change her hat.`}
              onClick={(e) => e.detail === 0 && say(cleaned.current.has('marguerite') ? pick(MARGUERITE_IDLE) : pick(MARGUERITE_DUSTY))}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowRight') changeHat(1);
                else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') changeHat(-1);
                else return;
                e.preventDefault();
              }}
            >
              <MargueriteSvg hat={wearing} />
            </button>
          </div>

          <div className={styles.gramSpot} style={box(S.gramophone)}>
            <Gramophone onTempo={onTempo} dusty={!clean.has('gramophone')} />
          </div>

          <div className={styles.trunkSpot} style={box(S.trunk)} data-open={trunkOpen}>
            <TrunkArt />
            <div className={styles.lock} role="group" aria-label={LOCK_LABEL}>
              {dials.map((d, i) => (
                <span
                  key={i}
                  className={styles.dial}
                  style={{ left: `${35 + i * 15}%`, fontSize: lay === TALL ? 20 : 14 }}
                  role="spinbutton"
                  tabIndex={0}
                  aria-label={`Dial ${i + 1}`}
                  aria-valuemin={0}
                  aria-valuemax={9}
                  aria-valuenow={trunkOpen ? CODE[i] : d}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') turnDial(i, 1);
                    else if (e.key === 'ArrowDown') turnDial(i, -1);
                    else return;
                    e.preventDefault();
                  }}
                >
                  {trunkOpen ? CODE[i] : d}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.diaryBook} style={box(S.diary)} aria-hidden="true" />
          {clean.has('letter') ? <div className={styles.envelopeOnFloor} style={box(S.letter)} aria-hidden="true" /> : null}

          <canvas ref={canvasRef} className={styles.dust} width={Math.ceil(lay.w / lay.cell)} height={Math.ceil(lay.h / lay.cell)} style={{ width: lay.w, height: lay.h }} aria-hidden="true" />

          {Array.from({ length: BUNNIES }, (_, i) => (
            <span
              key={i}
              className={styles.bunny}
              aria-hidden="true"
              ref={(el) => {
                bunnyEls.current[i] = el;
              }}
            >
              <i />
            </span>
          ))}
          {Array.from({ length: MOTES }, (_, i) => (
            <span
              key={i}
              className={styles.mote}
              aria-hidden="true"
              ref={(el) => {
                moteEls.current[i] = el;
              }}
            />
          ))}
        </div>
        {mem ? (
          <div className={styles.caption} aria-live="polite">
            <h2 className={styles.memoryTitle}>{mem.title}</h2>
            {mem.lines.slice(0, memory!.lines).map((l) => (
              <p key={l}>{l}</p>
            ))}
            {memory!.lines >= mem.lines.length ? <p className={styles.back}>On the back, in pencil: “{mem.back}”.</p> : null}
          </div>
        ) : null}
      </div>

      <div className={styles.memory} aria-live="polite">
        {!mem && backs.length ? <p className={styles.small}>Pencil on the backs of the photographs: {backs.map((m) => `“${m.back}”`).join(', ')}.</p> : null}
      </div>

      {trunkOpen || clean.has('diary') ? (
        <div className={styles.lower}>
          {trunkOpen ? <Trunk /> : null}
          {clean.has('diary') ? <Diary onOpen={(n) => n >= 5 && world.effects.discover('dear-diary')} /> : null}
        </div>
      ) : null}
      <ShadowTheatre world={world} onMarguerite={(l) => say(l)} />
    </section>
  );
}

const INK = { stroke: 'var(--char-ink)', strokeWidth: 2.5, strokeLinejoin: 'round' as const };

function TrunkArt() {
  return (
    <svg viewBox="0 0 156 96" preserveAspectRatio="none" className={styles.trunkSvg} aria-hidden="true">
      <rect x="3" y="34" width="150" height="58" rx="5" fill="#6b3f2a" {...INK} />
      <g className={styles.lid}>
        <path d="M3 36 C 3 6 153 6 153 36 Z" fill="#7a4a30" {...INK} />
        <path d="M40 9 V 36 M116 9 V 36" stroke="#c9a24a" strokeWidth="5" />
      </g>
      <path d="M40 36 V 92 M116 36 V 92" stroke="#c9a24a" strokeWidth="5" />
      <rect x="48" y="50" width="60" height="22" rx="4" fill="#c9a24a" {...INK} strokeWidth={2} />
    </svg>
  );
}
