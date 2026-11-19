import { MAX_BODIES, PlaygroundSim, defaultLayout } from './physics';

function run(sim: PlaygroundSim, ms: number) {
  for (let t = 0; t < ms; t += 16) sim.step(16);
}

const angleOf = (sim: PlaygroundSim, kind: string) =>
  sim
    .list()
    .filter((s) => s.kind === kind)
    .map((s) => Math.abs(s.body.angle));

describe.each([false, true])('playground physics (portrait=%s)', (portrait) => {
  it('the opening ball rolls down the ramp and topples the dominoes (INT-068)', () => {
    const sim = new PlaygroundSim(defaultLayout(portrait));
    run(sim, 9000);
    const toppled = angleOf(sim, 'domino').filter((a) => a > 0.6).length;
    expect(toppled).toBeGreaterThanOrEqual(3);
    sim.destroy();
  });

  it('keeps everything inside the tray and lets bodies come to rest', () => {
    const sim = new PlaygroundSim(defaultLayout(portrait));
    run(sim, 15_000);
    const { width, height } = sim.layout;
    for (const s of sim.list()) {
      expect(s.body.position.x).toBeGreaterThan(-5);
      expect(s.body.position.x).toBeLessThan(width + 5);
      expect(s.body.position.y).toBeLessThan(height + 5);
    }
    const moving = sim.list().filter((s) => s.kind !== 'balloon' && Math.hypot(s.body.velocity.x, s.body.velocity.y) > 0.5);
    expect(moving.length).toBe(0);
    sim.destroy();
  });
});

describe('playground sim API', () => {
  it('caps the number of bodies (bounded physics)', () => {
    const sim = new PlaygroundSim(defaultLayout(false));
    let spawned = 0;
    for (let i = 0; i < 50; i++) if (sim.spawn('pebble', 500, 100)) spawned++;
    expect(sim.count).toBe(MAX_BODIES);
    expect(spawned).toBe(MAX_BODIES - defaultLayout(false).arrangement.length);
    sim.destroy();
  });

  it('a released drag keeps momentum (INT-061)', () => {
    const sim = new PlaygroundSim(defaultLayout(false));
    const pebble = sim.list().find((s) => s.kind === 'pebble')!;
    run(sim, 2000);
    const { x, y } = pebble.body.position;
    sim.startDrag(pebble.id, x, y, 0);
    for (let i = 1; i <= 10; i++) {
      sim.moveDrag(x - i * 25, y - i * 20, i * 16);
      sim.step(16);
    }
    const stats = sim.endDrag()!;
    expect(stats.speed).toBeGreaterThan(1);
    expect(stats.distance).toBeGreaterThan(200);
    expect(Math.abs(pebble.body.velocity.x)).toBeGreaterThan(1);
    sim.destroy();
  });

  it('the balloon floats upward', () => {
    const sim = new PlaygroundSim(defaultLayout(false));
    const balloon = sim.list().find((s) => s.kind === 'balloon')!;
    const y0 = balloon.body.position.y;
    run(sim, 1500);
    expect(balloon.body.position.y).toBeLessThan(y0);
    sim.destroy();
  });

  it('measures a resting stack (INT-065)', () => {
    const layout = { ...defaultLayout(false), arrangement: [] };
    const sim = new PlaygroundSim(layout);
    for (let i = 0; i < 5; i++) sim.spawn('block', 600, 560 - i * 95);
    run(sim, 4000);
    expect(sim.stackHeight()).toBeGreaterThanOrEqual(4);
    sim.destroy();
  });

  it('reset restores the arrangement and serialize round-trips', () => {
    const sim = new PlaygroundSim(defaultLayout(false));
    sim.spawn('block', 500, 100);
    sim.shake(() => 0.5);
    run(sim, 500);
    const snap = sim.serialize();
    sim.reset();
    expect(sim.count).toBe(defaultLayout(false).arrangement.length);
    sim.reset(snap);
    expect(sim.serialize().map((s) => s.kind)).toEqual(snap.map((s) => s.kind));
    sim.destroy();
  });

  it('detects shapes in the lost-and-found bin', () => {
    const layout = defaultLayout(false);
    const sim = new PlaygroundSim({ ...layout, arrangement: [] });
    const key = sim.spawn('key', layout.bin.x, layout.bin.y)!;
    expect(sim.inBin(key.id)).toBe(true);
    sim.destroy();
  });
});
