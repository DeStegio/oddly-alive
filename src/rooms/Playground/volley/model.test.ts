import { createRng } from '../../../engine/rng';
import { COURT, MATERIALS, bipCanHit, bipMove, bipPlan, dotHit, initialBip, lobTo, predictLanding, serve, stepBall, type BallState, type MaterialId } from './model';

const fly = (b: BallState, id: MaterialId, maxS = 6) => {
  const m = MATERIALS[id];
  let s = b;
  for (let t = 0; t < maxS; t += 1 / 120) {
    const r = stepBall(s, m, 1 / 120, 0, t);
    s = r.ball;
    if (r.landed) return { ...r, t };
  }
  return { ball: s, t: maxS, landed: undefined };
};

describe('back-fence volley: the ball', () => {
  it('a serve from Dot comes down on Bip’s side, and the other way round', () => {
    for (const id of Object.keys(MATERIALS) as MaterialId[]) {
      expect(fly(serve('dot', MATERIALS[id]), id).landed?.side).toBe('bip');
      expect(fly(serve('bip', MATERIALS[id]), id).landed?.side).toBe('dot');
    }
  });

  it('materials really differ: a balloon hangs in the air, a radish drops', () => {
    const from: BallState = { x: 100, y: 150, vx: 300, vy: -300, spin: 0, angle: 0, last: 'dot' };
    const balloon = fly(from, 'balloon');
    const radish = fly(from, 'radish');
    expect(balloon.t).toBeGreaterThan(radish.t * 1.8);
    expect(Math.abs(balloon.ball.x - 100)).toBeLessThan(Math.abs(radish.ball.x - 100) * 1.5 + 200);
  });

  it('the fence stops a low shot', () => {
    const low: BallState = { x: 340, y: 290, vx: 500, vy: 0, spin: 0, angle: 0, last: 'dot' };
    let s = low;
    let hit = false;
    for (let i = 0; i < 60; i++) {
      const r = stepBall(s, MATERIALS.ball, 1 / 120);
      hit ||= !!r.hitNet;
      s = r.ball;
    }
    expect(hit).toBe(true);
    expect(s.x).toBeLessThan(COURT.net);
  });

  it('prediction agrees with what actually happens', () => {
    const b = serve('dot', MATERIALS.ball);
    const guess = predictLanding(b, MATERIALS.ball);
    const real = fly(b, 'ball');
    expect(Math.abs(guess.x - real.ball.x)).toBeLessThan(2);
  });
});

describe('back-fence volley: Dot’s hits', () => {
  const dot = { x: 200, y: COURT.ground };
  const incoming: BallState = { x: 210, y: 250, vx: -100, vy: 200, spin: 0, angle: 0, last: 'bip' };

  it('timing changes the shot: early is flat and quick, late is a high lob', () => {
    const early = dotHit(incoming, MATERIALS.ball, dot, 0);
    const late = dotHit(incoming, MATERIALS.ball, dot, 1);
    expect(Math.atan2(-late.vy, late.vx)).toBeGreaterThan(Math.atan2(-early.vy, early.vx));
    expect(Math.hypot(early.vx, early.vy)).toBeGreaterThan(Math.hypot(late.vx, late.vy));
  });

  it('any timing clears the fence (the hit is forgiving), for every material', () => {
    for (const id of Object.keys(MATERIALS) as MaterialId[]) {
      for (const timing of [0, 0.5, 1]) {
        const shot = dotHit({ ...incoming, x: 330, y: 270 }, MATERIALS[id], { x: 320, y: COURT.ground }, timing);
        const r = fly(shot, id);
        expect(r.landed?.side ?? 'bip').toBe('bip');
      }
    }
  });
});

describe('back-fence volley: Bip', () => {
  it('he heads for where the ball will land, after a short delay, and gets there for a fair shot', () => {
    const rng = createRng(4);
    const b = lobTo({ x: 200, y: 250, vx: 0, vy: 0, spin: 0, angle: 0, last: 'dot' }, MATERIALS.ball, 600, 1.2, 'dot');
    let bip = bipPlan(initialBip(), b, MATERIALS.ball, 0, rng);
    expect(bip.moveAt).toBeGreaterThan(0.1);
    expect(bipMove(bip, 0.05, 0.05).x).toBe(bip.x); // still reacting
    let s = b;
    let hit = false;
    for (let t = 0; t < 3 && !hit; t += 1 / 120) {
      bip = bipMove(bip, t, 1 / 120);
      const r = stepBall(s, MATERIALS.ball, 1 / 120);
      s = r.ball;
      if (bipCanHit(bip, s)) hit = true;
      if (r.landed) break;
    }
    expect(hit).toBe(true);
  });

  it('but not always: over many rallies he misses some (and the cocky ones more)', () => {
    let misses = 0;
    let cockyMisses = 0;
    for (let seed = 1; seed <= 200; seed++) {
      for (const streak of [0, 8]) {
        const rng = createRng(seed);
        const b = lobTo({ x: 250, y: 240, vx: 0, vy: 0, spin: 0, angle: 0, last: 'dot' }, MATERIALS.ball, 470 + (seed % 7) * 45, 1.1, 'dot');
        let bip = bipPlan({ ...initialBip(), streak }, b, MATERIALS.ball, 0, rng);
        let s = b;
        let hit = false;
        for (let t = 0; t < 3 && !hit; t += 1 / 120) {
          bip = bipMove(bip, t, 1 / 120);
          const r = stepBall(s, MATERIALS.ball, 1 / 120);
          s = r.ball;
          if (bipCanHit(bip, s)) hit = true;
          if (r.landed) break;
        }
        if (!hit) {
          if (streak) cockyMisses++;
          else misses++;
        }
      }
    }
    expect(misses).toBeGreaterThan(5);
    expect(misses).toBeLessThan(120);
    expect(cockyMisses).toBeGreaterThanOrEqual(misses);
  });
});
