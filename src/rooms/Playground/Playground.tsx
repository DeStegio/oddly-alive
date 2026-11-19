import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWorld } from '../../app/worldInstance';
import { Dot, type DotMotion } from '../../characters/Dot';
import { useActor } from '../../characters/useActor';
import { LivingTitle } from '../../components/LivingTitle';
import { onFrame } from '../../engine/frameLoop';
import { useSettings } from '../../state/settings';
import { getFlag, setFlag } from '../../state/world';
import { PlaygroundSim, SHAPES, defaultLayout, type ShapeKind } from './physics';
import { ShapeView } from './ShapeView';
import { readSharedArrangement } from './share';
import styles from './Playground.module.css';

interface ShapeRef {
  id: number;
  kind: ShapeKind;
}

const SPAWNABLE: Array<{ kind: ShapeKind; label: string }> = [
  { kind: 'ball', label: 'Ball' },
  { kind: 'block', label: 'Block' },
  { kind: 'pebble', label: 'Pebble' },
  { kind: 'balloon', label: 'Balloon' },
  { kind: 'domino', label: 'Domino' },
];
const MAX_SPARKS = 8;

export default function Playground() {
  const world = useWorld();
  const motion = useSettings((s) => s.motion);
  const roomRef = useRef<HTMLElement>(null);
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
    return () => {
      sim.destroy();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portrait]);

  // responsive scale of the logical world into the tray
  useLayoutEffect(() => {
    const tray = trayRef.current;
    if (!tray) return;
    const update = () => {
      const sim = simRef.current;
      const w = tray.clientWidth;
      const p = window.innerWidth < 720;
      if (p !== portrait) setPortrait(p);
      if (!sim) return;
      const parentW = tray.parentElement?.clientWidth ?? w;
      const widthFit = Math.min(parentW, 1200) / sim.layout.width;
      const top = tray.getBoundingClientRect().top + window.scrollY;
      const dock = p ? 70 : 24;
      const heightFit = (window.innerHeight - top - dock - 28) / sim.layout.height;
      scale.current = Math.max(0.3, Math.min(widthFit, Math.max(heightFit, p ? widthFit * 0.8 : 0.45)));
      tray.style.width = `${sim.layout.width * scale.current}px`;
      tray.style.height = `${sim.layout.height * scale.current}px`;
      if (worldRef.current) worldRef.current.style.transform = `scale(${scale.current})`;
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
    if (stats.speed > 1.5) setFace(stats.shape.id, 'dizzy', 2000);
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
      setStatus('The floor is full. Reset, or remove something by throwing it really hard.');
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
  };

  const reset = () => {
    const sim = simRef.current;
    if (!sim) return;
    sim.reset();
    if (getFlag('living.keyholeRevealed') === true && getFlag('secret.keyFound') !== true) sim.spawn('key', sim.layout.width * 0.55, 60);
    towerFound.current = false;
    faces.current.clear();
    syncShapes();
    world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'reset', value: true });
  };

  const layout = simRef.current?.layout ?? defaultLayout(portrait);

  return (
    <section ref={roomRef} className={styles.room} aria-labelledby="pg-title">
      <header className={styles.head}>
        <LivingTitle id="pg-title" lines={['Play', 'ground']} label="Playground" size="room" />
        <p className={styles.blurb}>
          Things fall over here on purpose. Drag, throw, stack. Tap empty floor to poke the pile.
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

      <div ref={trayRef} className={styles.tray} onPointerDown={onTrayDown} data-tray="true">
        <div ref={worldRef} className={styles.world} style={{ width: layout.width, height: layout.height }} data-tray="true">
          <div
            className={styles.ramp}
            style={{
              left: layout.ramp.x - layout.ramp.w / 2,
              top: layout.ramp.y - 9,
              width: layout.ramp.w,
              transform: `rotate(${layout.ramp.angle}rad)`,
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
                if (el) els.current.set(s.id, el);
                else els.current.delete(s.id);
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

