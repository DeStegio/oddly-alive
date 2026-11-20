import Matter from 'matter-js';

const { Engine, Bodies, Body, Composite, Constraint, Events, Sleeping, Vector } = Matter;

export const SHAPE_KINDS = ['ball', 'block', 'pebble', 'balloon', 'domino', 'pill', 'key'] as const;
export type ShapeKind = (typeof SHAPE_KINDS)[number];

export interface ShapeSpec {
  w: number;
  h: number;
  color: string;
  circle?: boolean;
  chamfer?: number;
  density: number;
  restitution: number;
  friction: number;
  /** Floats upward (balloon). */
  buoyant?: boolean;
  label: string;
}

/** Weight and movement differ per kind (INT-069). */
export const SHAPES: Record<ShapeKind, ShapeSpec> = {
  ball: { w: 72, h: 72, color: 'var(--coral)', circle: true, density: 0.0014, restitution: 0.62, friction: 0.01, label: 'a bouncy coral ball' },
  block: { w: 92, h: 92, color: 'var(--blue)', chamfer: 10, density: 0.0045, restitution: 0.04, friction: 0.6, label: 'a heavy blue block' },
  pebble: { w: 50, h: 38, color: 'var(--lavender)', chamfer: 16, density: 0.0009, restitution: 0.2, friction: 0.4, label: 'a light lavender pebble' },
  balloon: { w: 64, h: 76, color: 'var(--yellow)', circle: true, density: 0.0005, restitution: 0.5, friction: 0.05, buoyant: true, label: 'a floaty yellow balloon' },
  domino: { w: 24, h: 118, color: 'var(--mint)', chamfer: 4, density: 0.0022, restitution: 0.05, friction: 0.4, label: 'a tall mint domino' },
  pill: { w: 118, h: 48, color: 'var(--yellow)', chamfer: 24, density: 0.0016, restitution: 0.3, friction: 0.3, label: 'a yellow pill-shaped cushion' },
  key: { w: 84, h: 36, color: '#e9b949', chamfer: 8, density: 0.0018, restitution: 0.2, friction: 0.5, label: 'a small golden key' },
};

export interface PlacedShape {
  kind: ShapeKind;
  x: number;
  y: number;
  angle?: number;
}

export interface Layout {
  width: number;
  height: number;
  portrait: boolean;
  ramp: { x: number; y: number; w: number; angle: number };
  bin: { x: number; y: number; w: number; h: number };
  arrangement: PlacedShape[];
}

export const MAX_BODIES = 24;

export function defaultLayout(portrait: boolean): Layout {
  if (portrait) {
    return {
      width: 600,
      height: 900,
      portrait,
      ramp: { x: 170, y: 520, w: 300, angle: 0.5 },
      bin: { x: 470, y: 120, w: 110, h: 90 },
      arrangement: [
        { kind: 'ball', x: 70, y: 380 },
        ...[340, 385, 430, 475, 520].map((x) => ({ kind: 'domino' as const, x, y: 900 - 20 - 59 })),
        { kind: 'block', x: 120, y: 820 },
        { kind: 'pill', x: 150, y: 700 },
        { kind: 'pebble', x: 260, y: 840 },
        { kind: 'balloon', x: 420, y: 300 },
      ],
    };
  }
  return {
    width: 1000,
    height: 600,
    portrait,
    ramp: { x: 220, y: 330, w: 340, angle: 0.48 },
    bin: { x: 890, y: 70, w: 120, h: 92 },
    arrangement: [
      { kind: 'ball', x: 90, y: 200 },
      ...[470, 525, 580, 635, 690].map((x) => ({ kind: 'domino' as const, x, y: 600 - 20 - 59 })),
      { kind: 'block', x: 860, y: 520 },
      { kind: 'pill', x: 840, y: 440 },
      { kind: 'pebble', x: 770, y: 545 },
      { kind: 'balloon', x: 360, y: 120 },
    ],
  };
}

export interface SimBody {
  id: number;
  kind: ShapeKind;
  body: Matter.Body;
}

/** A drag released faster than this (logical px/ms) is thrown out of the tray. */
export const EJECT_SPEED = 2.0;
/** Matter's default gravity, expressed in logical px/ms² (used for flights outside the sim). */
export const GRAVITY = 0.001;

export interface CollisionInfo {
  a: SimBody;
  b: SimBody | null;
  force: number;
}

/**
 * A small wrapper around Matter.js for the Playground. Fixed timestep,
 * capped body count, sleeping enabled, and a pointer constraint for drags.
 * It has no DOM knowledge so it can be unit tested in Node.
 */
export class PlaygroundSim {
  readonly engine: Matter.Engine;
  readonly layout: Layout;
  private shapes = new Map<number, SimBody>();
  private byBody = new Map<number, SimBody>();
  private nextId = 1;
  private drag: { constraint: Matter.Constraint; shape: SimBody; startedAt: number; start: Matter.Vector; last: Matter.Vector; lastT: number; speed: number; vel: Matter.Vector } | null = null;
  private acc = 0;
  private static readonly STEP = 1000 / 60;
  onCollision: ((c: CollisionInfo) => void) | null = null;
  /** Shapes that fall slower than gravity says (0..1 of gravity cancelled). */
  private floaty = new Map<number, number>();

  constructor(layout: Layout) {
    this.layout = layout;
    this.engine = Engine.create({ enableSleeping: true });
    this.engine.gravity.y = 1;
    this.buildStatics();
    for (const p of layout.arrangement) this.spawn(p.kind, p.x, p.y, p.angle ?? 0);
    Events.on(this.engine, 'collisionStart', (ev) => {
      for (const pair of ev.pairs) {
        const a = this.byBody.get(pair.bodyA.id) ?? null;
        const b = this.byBody.get(pair.bodyB.id) ?? null;
        const va = pair.bodyA.velocity;
        const vb = pair.bodyB.velocity;
        const force = Vector.magnitude(Vector.sub(va, vb));
        if (force < 2.2) continue;
        if (a) this.onCollision?.({ a, b, force });
        else if (b) this.onCollision?.({ a: b, b: null, force });
      }
    });
  }

  private buildStatics() {
    const { width: W, height: H, ramp } = this.layout;
    const t = 80;
    const opts = { isStatic: true, restitution: 0.4, friction: 0.6, label: 'wall' };
    Composite.add(this.engine.world, [
      Bodies.rectangle(W / 2, H + t / 2 - 20, W + t * 2, t, opts),
      Bodies.rectangle(-t / 2, H / 2, t, H * 3, opts),
      Bodies.rectangle(W + t / 2, H / 2, t, H * 3, opts),
      Bodies.rectangle(W / 2, -t / 2, W + t * 2, t, opts),
      Bodies.rectangle(ramp.x, ramp.y, ramp.w, 18, { ...opts, angle: ramp.angle, label: 'ramp', friction: 0.02 }),
    ]);
  }

  get count() {
    return this.shapes.size;
  }

  list(): SimBody[] {
    return Array.from(this.shapes.values());
  }

  get(id: number): SimBody | undefined {
    return this.shapes.get(id);
  }

  spawn(kind: ShapeKind, x: number, y: number, angle = 0): SimBody | null {
    if (this.shapes.size >= MAX_BODIES) return null;
    const s = SHAPES[kind];
    const common = { density: s.density, restitution: s.restitution, friction: s.friction, frictionAir: s.buoyant ? 0.04 : 0.01, angle, label: kind, sleepThreshold: 90 };
    const body = s.circle
      ? Bodies.circle(x, y, s.w / 2, common)
      : Bodies.rectangle(x, y, s.w, s.h, s.chamfer ? { ...common, chamfer: { radius: s.chamfer } } : common);
    const shape: SimBody = { id: this.nextId++, kind, body };
    this.shapes.set(shape.id, shape);
    this.byBody.set(body.id, shape);
    Composite.add(this.engine.world, body);
    return shape;
  }

  remove(id: number) {
    const s = this.shapes.get(id);
    if (!s) return;
    if (this.drag?.shape.id === id) this.endDrag();
    Composite.remove(this.engine.world, s.body);
    this.floaty.delete(id);
    this.shapes.delete(id);
    this.byBody.delete(s.body.id);
  }

  /** Advance with a fixed timestep; dt is clamped so a hidden tab can't explode. */
  step(dtMs: number) {
    this.acc += Math.min(dtMs, 100);
    let steps = 0;
    while (this.acc >= PlaygroundSim.STEP && steps < 4) {
      for (const s of this.shapes.values()) {
        const lift = SHAPES[s.kind].buoyant ? 1.08 : (this.floaty.get(s.id) ?? 0);
        if (lift && !s.body.isSleeping) {
          const g = this.engine.gravity;
          Body.applyForce(s.body, s.body.position, { x: 0, y: -s.body.mass * g.y * g.scale * lift });
        }
      }
      Engine.update(this.engine, PlaygroundSim.STEP);
      this.acc -= PlaygroundSim.STEP;
      steps++;
    }
    if (steps === 4) this.acc = 0;
  }

  // ----------------------------------------------------------------- drag

  startDrag(id: number, x: number, y: number, now: number) {
    const s = this.shapes.get(id);
    if (!s) return;
    this.endDrag();
    Sleeping.set(s.body, false);
    const local = Vector.sub({ x, y }, s.body.position);
    const constraint = Constraint.create({
      pointA: { x, y },
      bodyB: s.body,
      pointB: Vector.rotate(local, -s.body.angle),
      stiffness: 0.18,
      damping: 0.08,
      length: 0,
    });
    Composite.add(this.engine.world, constraint);
    this.drag = { constraint, shape: s, startedAt: now, start: { x, y }, last: { x, y }, lastT: now, speed: 0, vel: { x: 0, y: 0 } };
  }

  moveDrag(x: number, y: number, now: number) {
    if (!this.drag) return;
    const d = this.drag;
    const dt = Math.max(1, now - d.lastT);
    const step = Vector.div(Vector.sub({ x, y }, d.last), dt);
    const inst = Vector.magnitude(step);
    d.speed = d.speed * 0.6 + inst * 0.4;
    d.vel = Vector.add(Vector.mult(d.vel, 0.6), Vector.mult(step, 0.4));
    d.last = { x, y };
    d.lastT = now;
    d.constraint.pointA = { x, y };
  }

  /** Release; the body keeps its momentum (INT-061). Returns drag stats. */
  endDrag(): { shape: SimBody; speed: number; distance: number; direction: Matter.Vector } | null {
    if (!this.drag) return null;
    const d = this.drag;
    Composite.remove(this.engine.world, d.constraint);
    this.drag = null;
    const m = Vector.magnitude(d.vel);
    const direction = m > 0 ? Vector.div(d.vel, m) : { x: 0, y: 0 };
    return { shape: d.shape, speed: d.speed, distance: Vector.magnitude(Vector.sub(d.last, d.start)), direction };
  }

  get dragging(): number | null {
    return this.drag?.shape.id ?? null;
  }

  /**
   * Add a shape that arrives already moving (something thrown in from outside).
   * Velocity is in logical px/ms. Null when the floor is full.
   */
  launch(kind: ShapeKind, x: number, y: number, vx: number, vy: number, angle = 0, spin = 0): SimBody | null {
    const s = this.spawn(kind, x, y, angle);
    if (!s) return null;
    const STEP = PlaygroundSim.STEP;
    Body.setVelocity(s.body, { x: vx * STEP, y: vy * STEP });
    Body.setAngularVelocity(s.body, spin * STEP);
    return s;
  }

  /**
   * Make a shape float like a volleyball (less gravity, more air drag, so it
   * hangs and drops roughly where it looks like it will), or 0 to undo.
   */
  setFloaty(id: number, lift: number) {
    const s = this.shapes.get(id);
    if (!s) return;
    if (lift > 0) {
      this.floaty.set(id, Math.min(0.9, lift));
      s.body.frictionAir = 0.04;
    } else {
      this.floaty.delete(id);
      s.body.frictionAir = SHAPES[s.kind].buoyant ? 0.04 : 0.01;
    }
  }

  // ------------------------------------------------------------- impulses

  nudge(id: number, vx: number, vy: number) {
    const s = this.shapes.get(id);
    if (!s) return;
    Sleeping.set(s.body, false);
    Body.setVelocity(s.body, { x: s.body.velocity.x + vx, y: s.body.velocity.y + vy });
    Body.setAngularVelocity(s.body, s.body.angularVelocity + vx * 0.01);
  }

  /** Everything hops (INT-063). */
  shake(rng: () => number = Math.random) {
    for (const s of this.shapes.values()) this.nudge(s.id, (rng() - 0.5) * 8, -6 - rng() * 6);
  }

  /** A poke in empty space pushes nearby shapes away. */
  poke(x: number, y: number, radius = 180) {
    for (const s of this.shapes.values()) {
      const d = Vector.sub(s.body.position, { x, y });
      const dist = Vector.magnitude(d);
      if (dist > radius || dist < 1) continue;
      const f = (1 - dist / radius) * 9;
      this.nudge(s.id, (d.x / dist) * f, (d.y / dist) * f - 2);
    }
  }

  // --------------------------------------------------------------- queries

  /** Tallest resting stack of shapes (INT-065). */
  stackHeight(): number {
    const resting = this.list().filter((s) => Vector.magnitude(s.body.velocity) < 0.35 && !SHAPES[s.kind].buoyant);
    const below = new Map<number, SimBody[]>();
    for (const top of resting) {
      for (const bottom of resting) {
        if (top === bottom) continue;
        const tb = top.body.bounds;
        const bb = bottom.body.bounds;
        const touching = Math.abs(tb.max.y - bb.min.y) < 10;
        const overlap = Math.min(tb.max.x, bb.max.x) - Math.max(tb.min.x, bb.min.x) > 12;
        if (touching && overlap) below.set(top.id, [...(below.get(top.id) ?? []), bottom]);
      }
    }
    const memo = new Map<number, number>();
    const depth = (s: SimBody, guard: number): number => {
      if (guard > MAX_BODIES) return 1;
      const m = memo.get(s.id);
      if (m) return m;
      const under = below.get(s.id) ?? [];
      const h = 1 + (under.length ? Math.max(...under.map((u) => depth(u, guard + 1))) : 0);
      memo.set(s.id, h);
      return h;
    };
    let best = 0;
    for (const s of resting) best = Math.max(best, depth(s, 0));
    return best;
  }

  /** Is a shape inside the lost-and-found bin? */
  inBin(id: number): boolean {
    const s = this.shapes.get(id);
    if (!s) return false;
    const { bin } = this.layout;
    const p = s.body.position;
    return Math.abs(p.x - bin.x) < bin.w / 2 && Math.abs(p.y - bin.y) < bin.h / 2;
  }

  serialize(): PlacedShape[] {
    return this.list().map((s) => ({
      kind: s.kind,
      x: Math.round(s.body.position.x),
      y: Math.round(s.body.position.y),
      angle: Number(s.body.angle.toFixed(2)),
    }));
  }

  reset(arrangement: PlacedShape[] = this.layout.arrangement) {
    this.endDrag();
    for (const id of Array.from(this.shapes.keys())) this.remove(id);
    for (const p of arrangement) this.spawn(p.kind, p.x, p.y, p.angle ?? 0);
  }

  destroy() {
    this.endDrag();
    Events.off(this.engine, 'collisionStart', undefined as never);
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.shapes.clear();
    this.byBody.clear();
    this.floaty.clear();
    this.onCollision = null;
  }
}
