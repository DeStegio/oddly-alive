import Matter from 'matter-js';
import type { HatId } from '../../content/attic';

const { Engine, Bodies, Body, Composite, Constraint, Events, Sleeping, Vector } = Matter;

/**
 * The attic's pile of boxes, and whatever falls out of them. A small Matter.js
 * world (it shares the lazily loaded physics chunk with the Playground).
 * No DOM: logical units, tested in Node.
 */
/** The whole attic stage (Marguerite on the left, the pile on the right). */
export const PILE_W = 900;
export const PILE_H = 420;
const FLOOR = 16;

/** Where Marguerite's head is, in stage units: hats that reach it go on. */
export const HEAD = { x: 120, y: 170, r: 40 };

export type PileKind = 'box' | 'hatbox' | 'suitcase' | 'crate' | 'shoebox' | 'dustbox' | `hat:${HatId}` | 'shoe' | 'letter';

export interface PileBody {
  id: number;
  kind: PileKind;
  /** Which attic box this is (for boxes). */
  box?: string;
  body: Matter.Body;
  w: number;
  h: number;
}

const SIZES: Record<string, { w: number; h: number; density: number; friction: number; restitution: number; air?: number }> = {
  box: { w: 110, h: 80, density: 0.002, friction: 0.7, restitution: 0.05 },
  hatbox: { w: 96, h: 70, density: 0.0016, friction: 0.6, restitution: 0.08 },
  suitcase: { w: 130, h: 70, density: 0.0025, friction: 0.7, restitution: 0.04 },
  crate: { w: 100, h: 90, density: 0.003, friction: 0.8, restitution: 0.03 },
  shoebox: { w: 90, h: 50, density: 0.0015, friction: 0.6, restitution: 0.05 },
  dustbox: { w: 100, h: 74, density: 0.0012, friction: 0.6, restitution: 0.05 },
  hat: { w: 64, h: 34, density: 0.0008, friction: 0.5, restitution: 0.2 },
  shoe: { w: 56, h: 30, density: 0.0015, friction: 0.6, restitution: 0.2 },
  letter: { w: 46, h: 30, density: 0.0004, friction: 0.4, restitution: 0.1, air: 0.08 },
};
const sizeOf = (kind: PileKind) => SIZES[kind.startsWith('hat:') ? 'hat' : kind]!;

/** A box landing harder than this (relative speed, px/step) bursts open. */
export const BURST_FORCE = 10.5;
/** …and the box itself has to be the fast one (a toppling neighbour doesn't count). */
const BURST_OWN_SPEED = 9;
/** Nothing bursts while a freshly built pile settles. */
const SETTLE_MS = 1500;
/** This many sharp changes of direction while dragging counts as a good shake. */
export const SHAKES_TO_BURST = 4;

export interface BurstInfo {
  box: string;
  kind: PileKind;
  x: number;
  y: number;
}

export class AtticSim {
  readonly engine: Matter.Engine;
  private bodies = new Map<number, PileBody>();
  private byBody = new Map<number, PileBody>();
  private nextId = 1;
  private acc = 0;
  private age = 0;
  private static readonly STEP = 1000 / 60;
  private drag: { c: Matter.Constraint; who: PileBody; lastX: number; lastT: number; vx: number; vy: number; dir: number; flips: number; lastFlip: number } | null = null;
  onBurst: ((b: BurstInfo) => void) | null = null;
  onBump: ((force: number) => void) | null = null;

  constructor() {
    this.engine = Engine.create({ enableSleeping: true });
    const t = 80;
    const opts = { isStatic: true, friction: 0.8, restitution: 0.2, label: 'wall' };
    Composite.add(this.engine.world, [
      Bodies.rectangle(PILE_W / 2, PILE_H + t / 2 - FLOOR, PILE_W + t * 2, t, opts),
      Bodies.rectangle(-t / 2, PILE_H / 2, t, PILE_H * 3, opts),
      Bodies.rectangle(PILE_W + t / 2, PILE_H / 2, t, PILE_H * 3, opts),
    ]);
    Events.on(this.engine, 'collisionStart', (ev) => {
      for (const pair of ev.pairs) {
        const a = this.byBody.get(pair.bodyA.id);
        const b = this.byBody.get(pair.bodyB.id);
        const force = Vector.magnitude(Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity));
        if (force > 3) this.onBump?.(force);
        if (force < BURST_FORCE) continue;
        if (this.age < SETTLE_MS) continue;
        for (const p of [a, b]) if (p?.box && this.drag?.who !== p && p.body.speed >= BURST_OWN_SPEED) this.burst(p.id);
      }
    });
  }

  add(kind: PileKind, x: number, y: number, opts: { box?: string; angle?: number } = {}): PileBody {
    const s = sizeOf(kind);
    const chamfer = kind === 'hatbox' || kind.startsWith('hat:') ? { radius: Math.min(s.w, s.h) * 0.45 } : { radius: 6 };
    const body = Bodies.rectangle(x, y, s.w, s.h, {
      density: s.density,
      friction: s.friction,
      restitution: s.restitution,
      frictionAir: s.air ?? 0.01,
      chamfer,
      angle: opts.angle ?? 0,
      sleepThreshold: 60,
    });
    const p: PileBody = { id: this.nextId++, kind, box: opts.box, body, w: s.w, h: s.h };
    this.bodies.set(p.id, p);
    this.byBody.set(body.id, p);
    Composite.add(this.engine.world, body);
    return p;
  }

  remove(id: number) {
    const p = this.bodies.get(id);
    if (!p) return;
    if (this.drag?.who.id === id) this.endDrag();
    Composite.remove(this.engine.world, p.body);
    this.bodies.delete(id);
    this.byBody.delete(p.body.id);
  }

  get(id: number) {
    return this.bodies.get(id);
  }

  list(): PileBody[] {
    return Array.from(this.bodies.values());
  }

  /** A box gives way: it disappears and tells the room what it held. */
  burst(id: number) {
    const p = this.bodies.get(id);
    if (!p?.box) return;
    const { x, y } = p.body.position;
    this.remove(id);
    this.onBurst?.({ box: p.box, kind: p.kind, x, y });
  }

  step(dtMs: number) {
    this.acc += Math.min(dtMs, 100);
    let n = 0;
    while (this.acc >= AtticSim.STEP && n < 4) {
      Engine.update(this.engine, AtticSim.STEP);
      this.acc -= AtticSim.STEP;
      this.age += AtticSim.STEP;
      n++;
    }
    if (n === 4) this.acc = 0;
  }

  // ------------------------------------------------------------- the hand

  startDrag(id: number, x: number, y: number, now: number) {
    const p = this.bodies.get(id);
    if (!p) return;
    this.endDrag();
    Sleeping.set(p.body, false);
    const local = Vector.sub({ x, y }, p.body.position);
    const c = Constraint.create({ pointA: { x, y }, bodyB: p.body, pointB: Vector.rotate(local, -p.body.angle), stiffness: 0.2, damping: 0.1, length: 0 });
    Composite.add(this.engine.world, c);
    this.drag = { c, who: p, lastX: x, lastT: now, vx: 0, vy: 0, dir: 0, flips: 0, lastFlip: now };
  }

  moveDrag(x: number, y: number, now: number) {
    const d = this.drag;
    if (!d) return;
    const dt = Math.max(1, now - d.lastT);
    const vx = (x - d.lastX) / dt;
    d.vx = d.vx * 0.5 + vx * 0.5;
    d.vy = d.vy * 0.5 + ((y - d.c.pointA.y) / dt) * 0.5;
    // shaking: quick reversals of direction
    // the raw speed, not the smoothed one: smoothing would iron out the very reversals we want
    const dir = Math.abs(vx) > 0.6 ? Math.sign(vx) : 0;
    if (dir && d.dir && dir !== d.dir) {
      d.flips = now - d.lastFlip < 450 ? d.flips + 1 : 1;
      d.lastFlip = now;
    }
    if (dir) d.dir = dir;
    d.lastX = x;
    d.lastT = now;
    d.c.pointA = { x, y };
    if (d.who.box && d.flips >= SHAKES_TO_BURST) {
      const id = d.who.id;
      this.endDrag();
      this.burst(id);
    }
  }

  endDrag(): { who: PileBody; vx: number; vy: number } | null {
    const d = this.drag;
    if (!d) return null;
    Composite.remove(this.engine.world, d.c);
    this.drag = null;
    return { who: d.who, vx: d.vx, vy: d.vy };
  }

  get dragging(): number | null {
    return this.drag?.who.id ?? null;
  }

  destroy() {
    this.endDrag();
    Events.off(this.engine, 'collisionStart', undefined as never);
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.bodies.clear();
    this.byBody.clear();
    this.onBurst = null;
    this.onBump = null;
  }

  /** Set a body moving (things spilling out of a box). Velocity in px/step. */
  fling(id: number, vx: number, vy: number, spin = 0) {
    const p = this.bodies.get(id);
    if (!p) return;
    Body.setVelocity(p.body, { x: vx, y: vy });
    Body.setAngularVelocity(p.body, spin);
  }
}

/** The pile as it first sits: boxes stacked on the floor, one on top of another. */
export function stackBoxes(sim: AtticSim, boxes: Array<{ id: string; kind: PileKind }>) {
  const columns = [PILE_W * 0.58, PILE_W * 0.76];
  const heights = [0, 0];
  boxes.forEach((b, i) => {
    const col = i % 2;
    const s = sizeOf(b.kind);
    const y = PILE_H - FLOOR - heights[col]! - s.h / 2;
    heights[col] = heights[col]! + s.h;
    sim.add(b.kind, columns[col]! + (i % 3) * 6 - 6, y, { box: b.id });
  });
}
