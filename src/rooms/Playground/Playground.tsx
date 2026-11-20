import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWorld } from '../../app/worldInstance';
import { Dot, type DotMotion } from '../../characters/Dot';
import { useActor } from '../../characters/useActor';
import { LivingTitle } from '../../components/LivingTitle';
import { onFrame } from '../../engine/frameLoop';
import { useSettings } from '../../state/settings';
import { getFlag, setFlag } from '../../state/world';
import { useObjects } from '../../state/world';
import { FieldNotes } from './FieldNotes';
import { isResting, lob, predictHit, stepBall, throwToYard, type Ball, type Box, type World as FlightWorld } from './flight';
import { goalsDone, type GoalId, type PileStats } from './goals';
import { NextDoor, type NextDoorHandle } from './NextDoor';
import { EJECT_SPEED, GRAVITY, MAX_BODIES, PlaygroundSim, SHAPES, defaultLayout, type ShapeKind } from './physics';
import { ShapeView } from './ShapeView';
import { encodeArrangement, readSharedArrangement } from './share';
import { setArrangementProvider } from '../../app/share';
import styles from './Playground.module.css';

interface ShapeRef {
  id: number;
  kind: ShapeKind;
}

/** A shape in the air between the Playground and Bip's yard (room-local px). */
interface Flight {
  id: number;
  kind: ShapeKind;
  /** ball: free flight towards/inside the yard · lob: Bip's return · gone: thrown away */
  mode: 'ball' | 'lob' | 'gone';
  b: Ball;
  t: number;
  T: number;
  /** Bip can still hit it (it hasn't touched the yard floor). */
  volleyable: boolean;
  /** The rally this ball is carrying. */
  rally: number;
}

const SPAWNABLE: Array<{ kind: ShapeKind; label: string }> = [
  { kind: 'ball', label: 'Ball' },
  { kind: 'block', label: 'Block' },
  { kind: 'pebble', label: 'Pebble' },
  { kind: 'balloon', label: 'Balloon' },
  { kind: 'domino', label: 'Domino' },
];
const MAX_SPARKS = 8;
/* Layout (keep in sync with Playground.module.css):
   ≥ 1400px  tray | Field Notes | Bip's yard   (the two trays share the width)
   ≥ 1100px  tray | Field Notes, with Bip's yard under the tray
   narrower  everything stacked */
const THREE_COL_VW = 1400;
const TWO_COL_VW = 1100;
const GAP = 28;
const NOTES_MIN_3 = 280;
const NOTES_MIN_2 = 300;
/** Things fly a little heavier outside the trays, so a throw stays on screen. */
const AIR_GRAVITY = GRAVITY * 2.2;
const GONE_MS = 650;

const pick = (lines: string[]) => lines[Math.floor(Math.random() * lines.length)]!;

export default function Playground() {
  const world = useWorld();
  const motion = useSettings((s) => s.motion);
  const roomRef = useRef<HTMLElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<PlaygroundSim | null>(null);
  const els = useRef(new Map<number, HTMLButtonElement>());
  const faces = useRef(new Map<number, { face: string; until: number }>());
  const sparks = useRef<HTMLSpanElement[]>([]);
  const sparkIdx = useRef(0);
  const scale = useRef(1);
  const [shapes, setShapes] = useState<ShapeRef[]>([]);
  const [portrait, setPortrait] = useState(() => typeof window !== 'undefined' && window.innerWidth < 720);
  const [status, setStatus] = useState('');
  const dot = useActor('dot');
  const dotMotion = useRef<DotMotion>({ follow: true, home: { x: 0.86, y: 0.3 } });
  const towerFound = useRef(false);
  const [pile, setPile] = useState<PileStats>({ count: 0, tallest: 0, bestThrow: 0, bestRally: 0 });
  const bestThrow = useRef(0);
  const shakes = useRef(0);

  // ---- volleyball with Bip
  const yardRef = useRef<NextDoorHandle>(null);
  const flights = useRef(new Map<number, Flight>());
  const flightEls = useRef(new Map<number, HTMLDivElement>());
  const flightId = useRef(1);
  const [flightViews, setFlightViews] = useState<Array<{ id: number; kind: ShapeKind }>>([]);
  const [rally, setRally] = useState(0);
  const [bestRally, setBestRally] = useState(0);
  const rallyRef = useRef(0);
  const bestRallyRef = useRef(0);
  /** The shape in the tray that is "in play" (came back from Bip), and when it stopped moving. */
  const rallyBall = useRef<{ id: number; rally: number; still: number } | null>(null);
  /** Bip is holding this because the floor was full. */
  const heldByBip = useRef<{ kind: ShapeKind; rally: number } | null>(null);

  /** Tick a Field Notes goal (once per session; "Reset World" clears them). */
  const completeGoal = useCallback(
    (id: GoalId) => {
      const objects = useObjects.getState();
      const done = goalsDone(objects.playground.goals);
      if (done.has(id)) return;
      done.add(id);
      objects.setSlice('playground', { goals: [...done].join(',') });
      world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'goal', value: id });
    },
    [world],
  );

  useEffect(() => {
    dotMotion.current.follow = motion === 'full';
  }, [motion]);

  const syncShapes = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    setShapes(sim.list().map((s) => ({ id: s.id, kind: s.kind })));
    setStatus(`${sim.count} things on the floor.`);
  }, []);

  // create / destroy the simulation
  useEffect(() => {
    const layout = defaultLayout(portrait);
    const shared = readSharedArrangement(layout);
    const sim = new PlaygroundSim(shared ? { ...layout, arrangement: shared } : layout);
    simRef.current = sim;
    // a key appears here once the keyhole behind the picture has been found (INT-095)
    if (getFlag('living.keyholeRevealed') === true && getFlag('secret.keyFound') !== true) {
      sim.spawn('key', layout.width * 0.55, 60);
    }
    let lastCollisionEmit = 0;
    sim.onCollision = ({ a, b, force }) => {
      const now = performance.now();
      setFace(a.id, 'hit', 280);
      if (b) setFace(b.id, 'hit', 280);
      if (force > 4) spark(a.body.position.x, a.body.position.y + SHAPES[a.kind].h / 2 - 6);
      if (now - lastCollisionEmit > 200) {
        lastCollisionEmit = now;
        world.emit('OBJECT_COLLIDED', { a: `shape:${a.kind}`, b: b ? `shape:${b.kind}` : 'floor', force: Number(force.toFixed(1)) });
        world.effects.sound(force > 8 ? 'thud' : 'pop');
      }
    };
    syncShapes();
    setArrangementProvider(() => encodeArrangement(sim.serialize(), sim.layout.portrait));
    // rare event: gravity hiccups and everything hops
    const offRare = world.bus.on('RARE_EVENT', (ev) => {
      if (ev.payload.event === 'gravity-hiccup') sim.shake();
    });
    return () => {
      offRare();
      setArrangementProvider(null);
      sim.destroy();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portrait]);

  // responsive scale of the logical world into the tray (and Bip's yard, the same size)
  useLayoutEffect(() => {
    const tray = trayRef.current;
    if (!tray) return;
    const update = () => {
      const sim = simRef.current;
      const w = tray.clientWidth;
      const vw = window.innerWidth;
      const p = vw < 720;
      if (p !== portrait) setPortrait(p);
      if (!sim) return;
      const areaW = areaRef.current?.clientWidth ?? w;
      const avail = vw >= THREE_COL_VW ? (areaW - 2 * GAP - NOTES_MIN_3) / 2 : vw >= TWO_COL_VW ? areaW - GAP - NOTES_MIN_2 : areaW;
      const widthFit = Math.min(avail, 1200) / sim.layout.width;
      const top = tray.getBoundingClientRect().top + window.scrollY;
      const dock = p ? 70 : 24;
      const heightFit = (window.innerHeight - top - dock - 28) / sim.layout.height;
      scale.current = Math.max(0.3, Math.min(widthFit, Math.max(heightFit, p ? widthFit * 0.8 : 0.45)));
      const W = `${sim.layout.width * scale.current}px`;
      const H = `${sim.layout.height * scale.current}px`;
      tray.style.width = W;
      tray.style.height = H;
      if (worldRef.current) worldRef.current.style.transform = `scale(${scale.current})`;
      const yard = yardRef.current?.root();
      if (yard) {
        yard.style.width = W;
        yard.style.height = H;
        yard.style.setProperty('--s', String(scale.current));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [portrait, shapes.length]);

  // frame loop: step physics, write transforms, update faces
  useEffect(() => {
    let checkAt = 0;
    const written = new Map<number, string>();
    return onFrame((dt, now) => {
      const sim = simRef.current;
      if (!sim) return;
      sim.step(dt);
      for (const s of sim.list()) {
        const el = els.current.get(s.id);
        if (!el) continue;
        const spec = SHAPES[s.kind];
        const { x, y } = s.body.position;
        // write only when it changed: sleeping bodies cost nothing per frame
        const t = `translate(${(x - spec.w / 2).toFixed(1)}px, ${(y - spec.h / 2).toFixed(1)}px) rotate(${s.body.angle.toFixed(3)}rad)`;
        if (written.get(s.id) !== t) {
          written.set(s.id, t);
          el.style.transform = t;
        }
        const f = faces.current.get(s.id);
        const face = f && f.until > now ? f.face : s.body.isSleeping ? 'sleep' : towerFound.current && s.kind === 'block' ? 'proud' : 'calm';
        if (el.dataset.face !== face) el.dataset.face = face;
      }
      checkRallyBall(sim, now);
      stepFlights(dt);
      if (now > checkAt) {
        checkAt = now + 600;
        periodicChecks(sim);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setFace(id: number, face: string, ms: number) {
    faces.current.set(id, { face, until: performance.now() + ms });
  }

  function spark(x: number, y: number) {
    if (motion === 'reduced') return;
    const el = sparks.current[sparkIdx.current++ % MAX_SPARKS];
    if (!el) return;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.classList.remove(styles.sparkOn ?? 'sparkOn');
    void el.offsetWidth;
    el.classList.add(styles.sparkOn ?? 'sparkOn');
  }

  function periodicChecks(sim: PlaygroundSim) {
    const h = sim.stackHeight();
    if (h >= 5 && !towerFound.current) {
      towerFound.current = true;
      world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'tower', value: h });
      world.effects.discover('tower');
    } else if (h < 3 && towerFound.current) {
      towerFound.current = false;
    }
    if (h >= 5) completeGoal('tower');
    if (sim.count >= MAX_BODIES) completeGoal('full');

    const floorTop = sim.layout.height - 20;
    const dominoes = sim.list().filter((s) => s.kind === 'domino');
    if (dominoes.length >= 3 && dominoes.every((d) => Math.abs(Math.sin(d.body.angle)) > 0.75)) completeGoal('dominoes');
    for (const s of sim.list()) {
      if (s.kind === 'balloon' && s.body.bounds.max.y >= floorTop - 4) completeGoal('balloon');
      if (s.kind !== 'key' && s.kind !== 'balloon' && sim.dragging !== s.id && sim.inBin(s.id)) completeGoal('bin');
    }

    setPile((prev) => {
      const next = { count: sim.count, tallest: h, bestThrow: bestThrow.current, bestRally: bestRallyRef.current };
      return prev.count === next.count && prev.tallest === next.tallest && prev.bestThrow === next.bestThrow && prev.bestRally === next.bestRally ? prev : next;
    });

    for (const s of sim.list()) {
      if (s.kind === 'key' && sim.inBin(s.id) && sim.dragging !== s.id) {
        sim.remove(s.id);
        setFlag('secret.keyFound', true);
        world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'keyFound', value: true });
        world.effects.discover('key');
        syncShapes();
      }
    }
  }

  // ------------------------------------------------------------ volleyball

  /** Tray, yard and room geometry in room-local pixels. */
  function geometry() {
    const room = roomRef.current;
    const tray = trayRef.current;
    if (!room || !tray) return null;
    const r = room.getBoundingClientRect();
    const inner = (el: HTMLElement): Box => {
      const b = el.getBoundingClientRect();
      const left = b.left - r.left + el.clientLeft;
      const top = b.top - r.top + el.clientTop;
      return { left, top, right: left + el.clientWidth, bottom: top + el.clientHeight };
    };
    const yardEl = yardRef.current?.root() ?? null;
    const s = scale.current;
    const air: FlightWorld = { g: AIR_GRAVITY * s, yard: yardEl ? inner(yardEl) : null, floor: 20 * s, roomRight: r.width };
    return { room: r, tray: inner(tray), air, s };
  }

  function addFlight(f: Omit<Flight, 'id'>) {
    const id = flightId.current++;
    flights.current.set(id, { ...f, id });
    setFlightViews((v) => [...v, { id, kind: f.kind }]);
    return id;
  }

  function dropFlight(id: number) {
    flights.current.delete(id);
    setFlightViews((v) => v.filter((f) => f.id !== id));
  }

  /** Room for one more on the floor, counting what's already on its way back. */
  function hasRoom() {
    const sim = simRef.current;
    if (!sim) return false;
    let inbound = 0;
    for (const f of flights.current.values()) if (f.mode === 'lob') inbound++;
    return sim.count + inbound < MAX_BODIES;
  }

  function setRallyCount(n: number) {
    rallyRef.current = n;
    setRally(n);
    if (n > bestRallyRef.current) {
      bestRallyRef.current = n;
      setBestRally(n);
    }
  }

  function endRally(reason: 'floor' | 'miss' | 'gone' | 'new') {
    const n = rallyRef.current;
    if (rallyBall.current) simRef.current?.setFloaty(rallyBall.current.id, 0);
    rallyBall.current = null;
    if (n === 0) return;
    setRallyCount(0);
    if (reason !== 'new') world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'rallyOver', value: n });
    if (n >= 2 && reason === 'floor') yardRef.current?.say(pick([`rally of ${n}! good game.`, `${n} in a row! again?`]), 2200);
  }

  /** The ball that came back from Bip: the rally ends when it touches the floor (or settles). */
  function checkRallyBall(sim: PlaygroundSim, now: number) {
    const rb = rallyBall.current;
    if (!rb) return;
    const s = sim.get(rb.id);
    if (!s) {
      rallyBall.current = null;
      return;
    }
    if (sim.dragging === rb.id) {
      rb.still = 0;
      return;
    }
    if (s.body.bounds.max.y >= sim.layout.height - 20 - 1.5) {
      endRally('floor');
      return;
    }
    if (s.body.speed < 0.2) {
      if (!rb.still) rb.still = now;
      else if (now - rb.still > 800) endRally('floor');
    } else rb.still = 0;
  }

  /** A really hard throw: the shape leaves the tray and flies for real. */
  function throwOut(id: number, dir: { x: number; y: number }, speed: number) {
    const sim = simRef.current;
    const G = geometry();
    const s = sim?.get(id);
    if (!sim || !G || !s || s.kind === 'key') return false;
    const spec = SHAPES[s.kind];
    const continuing = rallyBall.current?.id === id;
    const carried = continuing ? rallyBall.current!.rally : 0;
    if (!continuing) endRally('new');
    rallyBall.current = null;

    const b: Ball = {
      x: G.tray.left + s.body.position.x * G.s,
      y: G.tray.top + s.body.position.y * G.s,
      vx: 0,
      vy: 0,
      angle: s.body.angle,
      spin: 0,
      r: (Math.max(spec.w, spec.h) / 2) * G.s,
    };
    const v = Math.min(Math.max(speed * G.s, 1.0), 2.0);
    sim.remove(id);
    faces.current.delete(id);
    syncShapes();

    // up or to the right: it arcs over to Bip. Down (through the floor) or to the left: lost.
    const down = dir.y > 0.55;
    if (s.kind !== 'balloon' && !down && dir.x > -0.3 && G.air.yard) {
      const aimed = throwToYard({ x: b.x, y: b.y }, { vx: dir.x * v, vy: dir.y * v }, G.air.yard, G.air.g, b.r);
      b.vx = aimed.vx;
      b.vy = aimed.vy;
      b.spin = b.vx / Math.max(8, b.r);
      addFlight({ kind: s.kind, mode: 'ball', b, t: 0, T: 0, volleyable: true, rally: carried });
      yardRef.current?.setMood('ready');
      world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'overTheFence', value: s.kind });
    } else {
      b.vx = dir.x * v * 0.6;
      b.vy = dir.y * v * 0.6;
      b.spin = b.vx / Math.max(8, b.r);
      addFlight({ kind: s.kind, mode: 'gone', b, t: 0, T: GONE_MS, volleyable: false, rally: 0 });
      if (continuing) endRally('gone');
      world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'ejected', value: s.kind });
    }
    return true;
  }

  /** Send a flight back towards the Playground as a lob that peaks over the tray. */
  function lobBack(f: Flight, from: { x: number; y: number }, G: NonNullable<ReturnType<typeof geometry>>) {
    const t = G.tray;
    const to = { x: t.left + (t.right - t.left) * 0.78, y: t.top + (t.bottom - t.top) * 0.12 };
    const { vx, vy, T } = lob(from, to, G.air.g);
    f.mode = 'lob';
    f.b.x = from.x;
    f.b.y = from.y;
    f.b.vx = vx;
    f.b.vy = vy;
    f.b.spin = vx / Math.max(8, f.b.r);
    f.t = 0;
    f.T = T;
    f.volleyable = false;
  }

  function volley(f: Flight, G: NonNullable<ReturnType<typeof geometry>>) {
    const n = f.rally + 1;
    setRallyCount(n);
    yardRef.current?.volley(n);
    world.effects.sound('pop');
    world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'volley', value: n });
    completeGoal('catch');
    if (n >= 5) completeGoal('rally5');
    if (n === 3) world.effects.discover('volley');
    if (n === 10) world.effects.discover('rally');
    if (!hasRoom()) {
      dropFlight(f.id);
      heldByBip.current = { kind: f.kind, rally: n };
      yardRef.current?.hold(f.kind);
      yardRef.current?.setMood('worried');
      yardRef.current?.say('your floor is full! poke me when there’s room.', 3000);
      return;
    }
    f.rally = n;
    lobBack(f, { x: f.b.x, y: f.b.y }, G);
  }

  /** Bip sends something back from where it stands (a serve, or after holding it). */
  function serve(kind: ShapeKind, rallyCount: number) {
    const G = geometry();
    const bip = yardRef.current?.bip();
    if (!G || !bip) return false;
    if (!hasRoom()) {
      yardRef.current?.setMood('worried');
      yardRef.current?.say('still no room on your floor!', 2200);
      return false;
    }
    heldByBip.current = null;
    yardRef.current?.hold(null);
    const spec = SHAPES[kind];
    const r = (Math.max(spec.w, spec.h) / 2) * G.s;
    const from = { x: bip.x - G.room.left, y: bip.top - G.room.top - r };
    const f: Flight = { id: 0, kind, mode: 'lob', b: { x: from.x, y: from.y, vx: 0, vy: 0, angle: 0, spin: 0, r }, t: 0, T: 0, volleyable: false, rally: rallyCount };
    lobBack(f, from, G);
    addFlight(f);
    yardRef.current?.setMood('happy');
    world.effects.sound('pop');
    return true;
  }

  /** A lob arrives over the tray: hand it to the physics, keeping its momentum. */
  function land(f: Flight, G: NonNullable<ReturnType<typeof geometry>>) {
    const sim = simRef.current;
    dropFlight(f.id);
    if (!sim) return;
    const s = sim.launch(f.kind, (f.b.x - G.tray.left) / G.s, (f.b.y - G.tray.top) / G.s, f.b.vx / G.s, f.b.vy / G.s, f.b.angle, f.b.spin);
    if (!s) return;
    // a ball in play floats down slowly, so there is time to get under it
    sim.setFloaty(s.id, 0.35);
    rallyBall.current = { id: s.id, rally: f.rally, still: 0 };
    syncShapes();
    world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'returned', value: f.kind });
  }

  function stepFlights(dt: number) {
    if (!flights.current.size) return;
    const G = geometry();
    if (!G) return;
    const yard = yardRef.current;
    const bip = yard?.bip() ?? null;
    const bipX = bip ? bip.x - G.room.left : 0;
    const bipTop = bip ? bip.top - G.room.top : 0;
    const noYard: FlightWorld = { ...G.air, yard: null };
    let incoming = false;

    for (const f of Array.from(flights.current.values())) {
      const b = f.b;
      if (f.mode === 'gone') {
        f.t += dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.angle += b.spin * dt;
        if (f.t >= GONE_MS) {
          dropFlight(f.id);
          continue;
        }
      } else if (f.mode === 'lob') {
        f.t += dt;
        stepBall(b, dt, noYard);
        if (f.t >= f.T) {
          land(f, G);
          continue;
        }
      } else {
        const floored = stepBall(b, dt, G.air);
        if (f.volleyable && bip) {
          incoming = true;
          const hitY = bipTop - b.r * 0.4;
          if (b.vy > 0 && b.y >= hitY && b.y <= hitY + bip.height * 0.5 && Math.abs(b.x - bipX) < bip.width * 0.55 + b.r) {
            volley(f, G);
            continue;
          }
          // run to where it will come down
          const p = predictHit(b, hitY, G.air);
          const inYard = G.air.yard && b.x > G.air.yard.left;
          yard?.moveTo(p ? p.x + G.room.left : inYard ? b.x + G.room.left : null);
          if (floored) {
            f.volleyable = false;
            f.rally = 0;
            endRally('miss');
            yard?.setMood('worried');
            yard?.say(pick(['missed it!', 'aw. too fast for me.', 'oops! my serve.']), 1500);
          }
        } else if (bip) {
          // missed: roll over, pick it up and serve it back
          yard?.moveTo(b.x + G.room.left);
          if (isResting(b, G.air) && Math.abs(b.x - bipX) < bip.width * 0.4) {
            dropFlight(f.id);
            yard?.hold(f.kind);
            const kind = f.kind;
            window.setTimeout(() => {
              if (!serve(kind, 0)) heldByBip.current = { kind, rally: 0 };
            }, 600);
            continue;
          }
        }
        if (b.y > G.room.height + 150 || b.x < -200) {
          dropFlight(f.id);
          if (f.rally > 0 || f.volleyable) endRally('gone');
          continue;
        }
      }
      const el = flightEls.current.get(f.id);
      if (el) {
        const spec = SHAPES[f.kind];
        const w = spec.w * G.s;
        const h = spec.h * G.s;
        const k = f.mode === 'gone' ? 1 - 0.85 * Math.min(1, f.t / GONE_MS) : 1;
        el.style.transform = `translate(${(b.x - w / 2).toFixed(1)}px, ${(b.y - h / 2).toFixed(1)}px) rotate(${b.angle.toFixed(3)}rad) scale(${k.toFixed(3)})`;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        el.style.visibility = 'visible';
        el.style.opacity = f.mode === 'gone' ? String(Math.max(0, 1 - f.t / GONE_MS)) : '1';
      }
    }
    if (!incoming && !heldByBip.current && flights.current.size === 0) yard?.moveTo(null);
  }

  const onBipPoke = () => {
    world.emit('OBJECT_CLICKED', { target: 'bip', repeat: 1, via: 'pointer' });
    const held = heldByBip.current;
    if (held) serve(held.kind, held.rally);
  };

  // --------------------------------------------------------------- input

  const toWorld = (clientX: number, clientY: number) => {
    const r = trayRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left) / scale.current, y: (clientY - r.top) / scale.current };
  };

  const dragInfo = useRef<{ id: number; t: number; x: number; y: number } | null>(null);

  const onShapeDown = (id: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const sim = simRef.current;
    if (!sim) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toWorld(e.clientX, e.clientY);
    sim.startDrag(id, p.x, p.y, e.timeStamp);
    dragInfo.current = { id, t: e.timeStamp, x: e.clientX, y: e.clientY };
    const kind = sim.get(id)?.kind ?? 'shape';
    world.emit('OBJECT_DRAGGED', { target: `shape:${kind}`, phase: 'start', speed: 0, distance: 0 });
  };
  const onShapeMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const sim = simRef.current;
    if (!sim || sim.dragging === null) return;
    const p = toWorld(e.clientX, e.clientY);
    sim.moveDrag(p.x, p.y, e.timeStamp);
  };
  const onShapeUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const sim = simRef.current;
    const info = dragInfo.current;
    dragInfo.current = null;
    if (!sim || !info) return;
    const stats = sim.endDrag();
    if (!stats) return;
    const kind = stats.shape.kind;
    const tap = Math.hypot(e.clientX - info.x, e.clientY - info.y) < 6 && e.timeStamp - info.t < 300;
    if (tap) {
      hop(stats.shape.id);
      world.emit('OBJECT_CLICKED', { target: `shape:${kind}`, repeat: 1, via: 'pointer' });
      return;
    }
    bestThrow.current = Math.max(bestThrow.current, stats.speed);
    // hard enough and it leaves the tray for real (the floor count drops right away)
    if (stats.speed > EJECT_SPEED) throwOut(stats.shape.id, stats.direction, stats.speed);
    if (stats.speed > 1.5) {
      setFace(stats.shape.id, 'dizzy', 2000);
      completeGoal('throw');
    }
    world.emit('OBJECT_DRAGGED', { target: `shape:${kind}`, phase: 'end', speed: Number(stats.speed.toFixed(2)), distance: Math.round(stats.distance) });
  };

  const hop = (id: number) => {
    simRef.current?.nudge(id, 0, -9);
    setFace(id, 'proud', 600);
  };

  const onShapeKey = (id: number, kind: ShapeKind) => (e: React.KeyboardEvent) => {
    const pushes: Record<string, [number, number]> = { ArrowLeft: [-6, -2], ArrowRight: [6, -2], ArrowUp: [0, -10], ArrowDown: [0, 6] };
    const push = pushes[e.key];
    if (push) {
      e.preventDefault();
      simRef.current?.nudge(id, push[0], push[1]);
      world.emit('OBJECT_DRAGGED', { target: `shape:${kind}`, phase: 'end', speed: 0.5, distance: 40 });
    }
  };

  const onTrayDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.tray) return;
    const p = toWorld(e.clientX, e.clientY);
    simRef.current?.poke(p.x, p.y);
    world.emit('OBJECT_CLICKED', { target: 'playground:floor', repeat: 1, via: 'pointer' });
  };

  const spawn = (kind: ShapeKind) => {
    const sim = simRef.current;
    if (!sim) return;
    const x = sim.layout.width * (0.3 + Math.random() * 0.4);
    const s = sim.spawn(kind, x, 40);
    if (!s) {
      setStatus('The floor is full. Reset, or throw something really hard out of the tray.');
      completeGoal('full');
      world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'full', value: true });
      return;
    }
    world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'spawn', value: kind });
    syncShapes();
  };

  const shake = () => {
    simRef.current?.shake();
    world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'shake', value: true });
    world.effects.sound('shake');
    if (++shakes.current >= 3) completeGoal('shake');
  };

  const reset = () => {
    const sim = simRef.current;
    if (!sim) return;
    sim.reset();
    if (getFlag('living.keyholeRevealed') === true && getFlag('secret.keyFound') !== true) sim.spawn('key', sim.layout.width * 0.55, 60);
    towerFound.current = false;
    faces.current.clear();
    endRally('new');
    syncShapes();
    world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'reset', value: true });
  };

  const layout = simRef.current?.layout ?? defaultLayout(portrait);
  const ramp = layout.ramp;

  return (
    <section ref={roomRef} className={styles.room} aria-labelledby="pg-title">
      <header className={styles.head}>
        <LivingTitle id="pg-title" lines={['Play', 'ground']} label="Playground" size="room" />
        <p className={styles.blurb}>
          Things fall over here on purpose. Drag, throw, stack. Tap empty floor to poke the pile. Throw really hard to the right and Bip next door will volley it back.
        </p>
      </header>

      <div className={styles.toolbar} role="toolbar" aria-label="Playground tools">
        {SPAWNABLE.map((s) => (
          <button key={s.kind} type="button" className={`paper-btn ${styles.tool}`} onClick={() => spawn(s.kind)}>
            <span className={styles.swatch} style={{ background: SHAPES[s.kind].color }} aria-hidden="true" />
            Drop a {s.label.toLowerCase()}
          </button>
        ))}
        <span className={styles.sep} aria-hidden="true" />
        <button type="button" className={`paper-btn ${styles.tool}`} onClick={shake}>
          Shake
        </button>
        <button type="button" className={`paper-btn ${styles.tool}`} onClick={reset}>
          Reset
        </button>
      </div>

      <div ref={areaRef} className={styles.playArea}>
        <div className={styles.trayCol}>
      <div ref={trayRef} className={styles.tray} onPointerDown={onTrayDown} data-tray="true">
        <div ref={worldRef} className={styles.world} style={{ width: layout.width, height: layout.height }} data-tray="true">
          <div
            className={styles.ramp}
            style={{
              left: ramp.x - ramp.w / 2,
              top: ramp.y - 9,
              width: ramp.w,
              transform: `rotate(${ramp.angle}rad)`,
            }}
            aria-hidden="true"
          />
          <div
            className={styles.bin}
            style={{ left: layout.bin.x - layout.bin.w / 2, top: layout.bin.y - layout.bin.h / 2, width: layout.bin.w, height: layout.bin.h }}
            aria-hidden="true"
          >
            <span>lost &amp; found</span>
          </div>
          {Array.from({ length: MAX_SPARKS }, (_, i) => (
            <span
              key={i}
              ref={(el) => {
                if (el) sparks.current[i] = el;
              }}
              className={styles.spark}
              aria-hidden="true"
            />
          ))}
          {shapes.map((s) => (
            <button
              key={s.id}
              type="button"
              ref={(el) => {
                if (el) {
                  // place it before its first paint (no flash at the corner)
                  if (!els.current.has(s.id)) {
                    const body = simRef.current?.get(s.id)?.body;
                    if (body) el.style.transform = `translate(${body.position.x - SHAPES[s.kind].w / 2}px, ${body.position.y - SHAPES[s.kind].h / 2}px) rotate(${body.angle}rad)`;
                  }
                  els.current.set(s.id, el);
                } else els.current.delete(s.id);
              }}
              className={styles.shape}
              style={{ width: SHAPES[s.kind].w, height: SHAPES[s.kind].h }}
              aria-label={`${SHAPES[s.kind].label}. Arrow keys push it; Enter makes it hop.`}
              onPointerDown={onShapeDown(s.id)}
              onPointerMove={onShapeMove}
              onPointerUp={onShapeUp}
              onPointerCancel={onShapeUp}
              onKeyDown={onShapeKey(s.id, s.kind)}
              onClick={(e) => {
                if (e.detail === 0) {
                  hop(s.id);
                  world.emit('OBJECT_CLICKED', { target: `shape:${s.kind}`, repeat: 1, via: 'keyboard' });
                }
              }}
            >
              <ShapeView kind={s.kind} />
            </button>
          ))}
        </div>
      </div>
      <p className={styles.status} role="status">
        {status}
      </p>
        </div>
        <div className={styles.notesCol}>
          <FieldNotes stats={pile} />
        </div>
        <div className={styles.yardCol}>
          <NextDoor ref={yardRef} rally={rally} best={bestRally} onPoke={onBipPoke} />
        </div>
      </div>

      {/* things in the air between the trays */}
      <div className={styles.sky} aria-hidden="true">
        {flightViews.map((f) => (
          <div
            key={f.id}
            className={styles.flying}
            ref={(el) => {
              if (el) flightEls.current.set(f.id, el);
              else flightEls.current.delete(f.id);
            }}
          >
            <ShapeView kind={f.kind} />
          </div>
        ))}
      </div>

      <Dot
        expression={dot.expression}
        thought={dot.thought}
        rootRef={dot.rootRef}
        gaze={dot.gaze}
        boundsRef={roomRef}
        motion={dotMotion}
        onActivate={() => world.emit('OBJECT_CLICKED', { target: 'dot', repeat: 1, via: 'pointer' })}
      />
    </section>
  );
}
