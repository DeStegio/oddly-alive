import { isResting, lob, predictHit, stepBall, throwToYard, type Ball, type World } from './flight';

const world: World = { g: 0.0015, yard: { left: 1000, top: 0, right: 1600, bottom: 450 }, floor: 14, roomRight: 1700 };
const ball = (over: Partial<Ball> = {}): Ball => ({ x: 600, y: 200, vx: 1.6, vy: -0.6, angle: 0, spin: 0.01, r: 25, ...over });

describe('ball flight outside the trays', () => {
  it('predicts where a throw to the right comes down in the yard', () => {
    const hitY = 300;
    const hit = predictHit(ball(), hitY, world)!;
    expect(hit).not.toBeNull();
    expect(hit.x).toBeGreaterThan(1000);
    expect(hit.x).toBeLessThan(1600);
    // stepping the real ball lands it at the predicted spot
    const b = ball();
    for (let t = 0; t < hit.t + 8; t += 8) stepBall(b, 8, world);
    expect(Math.abs(b.x - hit.x)).toBeLessThan(15);
  });

  it('a throw that falls short never reaches the yard', () => {
    expect(predictHit(ball({ vx: 0.3, vy: 0 }), 300, world)).toBeNull();
  });

  it('a ball that is not hit bounces on the yard floor and comes to rest', () => {
    const b = ball({ x: 1200, y: 100, vx: 0.2, vy: 0 });
    let floored = false;
    for (let t = 0; t < 6000; t += 8) floored = stepBall(b, 8, world) || floored;
    expect(floored).toBe(true);
    expect(isResting(b, world)).toBe(true);
    expect(b.y + b.r).toBeCloseTo(450 - 14, 0);
  });

  it('bounces off the yard’s far wall instead of leaving', () => {
    const b = ball({ x: 1500, y: 380, vx: 3, vy: 0 });
    for (let t = 0; t < 400; t += 8) stepBall(b, 8, world);
    expect(b.x).toBeLessThan(1600);
  });

  it('a throw high over the yard still comes down inside it', () => {
    const b = ball({ x: 900, y: 120, vx: 2.4, vy: -1.25 });
    let floored = false;
    for (let t = 0; t < 5000 && !floored; t += 8) floored = stepBall(b, 8, world);
    expect(floored).toBe(true);
    expect(b.x).toBeGreaterThan(1000);
    expect(b.x).toBeLessThan(1600);
    expect(b.y).toBeGreaterThan(0);
  });

  it('a very fast throw cannot tunnel through the net, even with big frame steps', () => {
    const b = ball({ x: 1500, y: 150, vx: 3, vy: 0 });
    for (let t = 0; t < 3000; t += 50) stepBall(b, 50, world);
    expect(b.x).toBeLessThan(1600);
    expect(b.x).toBeGreaterThan(1000);
  });

  it('a throw straight up still arcs over and comes down in the yard', () => {
    const from = { x: 500, y: 300 };
    const v = throwToYard(from, { vx: 0, vy: -2 }, world.yard!, world.g, 25);
    expect(v.vx).toBeGreaterThan(0);
    const b = ball({ ...from, vx: v.vx, vy: v.vy });
    let top = Infinity;
    let floored = false;
    for (let t = 0; t < 6000 && !floored; t += 8) {
      floored = stepBall(b, 8, world);
      top = Math.min(top, b.y - b.r);
    }
    expect(top).toBeGreaterThan(0); // never reached the ceiling
    expect(b.x).toBeGreaterThan(1000);
    expect(b.x).toBeLessThan(1600);
  });

  it('a good throw to the right keeps its own speed', () => {
    const v = throwToYard({ x: 500, y: 300 }, { vx: 1.2, vy: -0.6 }, world.yard!, world.g, 25);
    expect(v.vx).toBeCloseTo(1.2, 5);
    expect(v.vy).toBeCloseTo(-0.6, 5);
  });

  it('a lob reaches its target gently, already on its way down', () => {
    const g = world.g;
    const from = { x: 1300, y: 350 };
    const to = { x: 600, y: 80 };
    const { vx, vy, T } = lob(from, to, g);
    const x = from.x + vx * T;
    const y = from.y + vy * T + 0.5 * g * T * T;
    expect(x).toBeCloseTo(to.x, 3);
    expect(y).toBeCloseTo(to.y, 3);
    expect(Math.abs(vx)).toBeLessThanOrEqual(0.85); // unhurried across
    const arrivalVy = vy + g * T;
    expect(arrivalVy).toBeGreaterThanOrEqual(0); // past the top of the arc
    expect(arrivalVy).toBeLessThan(1); // but not slammed down
  });
});
