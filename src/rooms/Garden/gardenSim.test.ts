import { droplet, pullTension, step, throwVelocity, type Scene, type Thing } from './gardenSim';

const scene: Scene = {
  width: 1000,
  height: 500,
  grassY: 470,
  g: 0.0012,
  beds: [
    { plot: 0, x0: 100, x1: 200, soilY: 420 },
    { plot: 5, x0: 800, x1: 900, soilY: 420 },
  ],
};
const thing = (over: Partial<Thing>): Thing => ({ body: 'seed', x: 50, y: 300, vx: 0, vy: 0, r: 4, angle: 0, resting: false, ...over });
const run = (t: Thing, ms = 6000) => {
  for (let i = 0; i < ms; i += 16) {
    const l = step(t, 16, scene);
    if (l) return l;
  }
  return null;
};

describe('garden: things in the air', () => {
  it('a seed thrown in an arc lands in the plot under where it comes down', () => {
    expect(run(thing({ x: 60, y: 300, vx: 0.65, vy: -0.6 }))).toEqual({ type: 'soil', plot: 5 });
    expect(run(thing({ x: 60, y: 300, vx: 0.15, vy: -0.2 }))).toEqual({ type: 'soil', plot: 0 });
  });

  it('a seed that misses the beds ends up on the lawn', () => {
    const t = thing({ x: 400, y: 300, vx: 0.02, vy: 0 });
    expect(run(t)).toEqual({ type: 'grass' });
    expect(t.resting || t.y + t.r >= scene.grassY - 1).toBe(true);
  });

  it('thrown off the left edge goes to the house, off the right over the fence', () => {
    expect(run(thing({ body: 'crop', x: 120, y: 300, vx: -1.5, vy: -0.4, r: 14 }))).toEqual({ type: 'house' });
    expect(run(thing({ body: 'crop', x: 880, y: 300, vx: 1.5, vy: -0.6, r: 14 }))).toEqual({ type: 'fence' });
  });

  it('crops bounce on soil instead of being planted', () => {
    const t = thing({ body: 'crop', x: 150, y: 300, vx: 0, vy: 0.4, r: 10 });
    expect(run(t, 3000)).toEqual({ type: 'grass' });
  });

  it('water falls from the spout and waters the soil it hits', () => {
    const d = droplet(160, 300, 0, 0, 0);
    const l = run(d);
    expect(l?.type).toBe('soil');
    // a fast-moving can sprays water sideways, onto the lawn
    expect(run(droplet(400, 300, 1.2, 0, 0))).toEqual({ type: 'grass' });
  });

  it('throws are capped; pulls build tension up to a pop', () => {
    const v = throwVelocity(9, -9);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(2.2, 5);
    expect(throwVelocity(0.3, 0.1)).toEqual({ vx: 0.3, vy: 0.1 });
    expect(pullTension(0, 70)).toBe(0);
    expect(pullTension(-35, 70)).toBe(0.5);
    expect(pullTension(-200, 70)).toBe(1);
    expect(pullTension(30, 70)).toBe(0);
  });
});
