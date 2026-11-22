import { DEVELOP_MS, DustGrid, LINE_MS, cycle, dwell, told, turn } from './dust';

describe('attic dust', () => {
  it('rubbing takes dust off where you rub, more at the middle', () => {
    const g = new DustGrid(10, 10, 20);
    expect(g.total()).toBe(1);
    const off = g.scrub(100, 100, 0.5, 30);
    expect(off).toBeGreaterThan(0);
    expect(g.levelAt(100, 100)).toBeLessThan(g.levelAt(125, 100));
    expect(g.levelAt(10, 10)).toBe(1);
  });

  it('measures how dusty a thing is, and can clear it', () => {
    const g = new DustGrid(10, 10, 20);
    const box = { x: 40, y: 40, w: 40, h: 40 };
    expect(g.coverage(box)).toBe(1);
    for (let i = 0; i < 6; i++) g.scrub(60, 60, 0.5, 40);
    expect(g.coverage(box)).toBeLessThan(0.2);
    g.clear({ x: 0, y: 0, w: 200, h: 200 });
    expect(g.total()).toBe(0);
  });

  it('dust bunnies run to the thickest dust away from your hand, until there is none', () => {
    const g = new DustGrid(10, 10, 20);
    g.clear({ x: 0, y: 0, w: 200, h: 100 });
    const spot = g.hideout({ x: 50, y: 50 }, { x: 50, y: 50 }, 400)!;
    expect(spot.y).toBeGreaterThan(100);
    g.clear({ x: 0, y: 0, w: 200, h: 200 });
    expect(g.hideout({ x: 50, y: 50 }, { x: 0, y: 0 }, 400)).toBeNull();
  });
});

describe('memories, hats and the lock', () => {
  it('a photo develops while you keep still, then tells its lines one at a time', () => {
    let p = 0;
    p = dwell(p, DEVELOP_MS / 2, true);
    expect(told(p, 3)).toEqual({ develop: 0.5, lines: 0 });
    p = dwell(p, DEVELOP_MS / 2, true);
    expect(told(p, 3).lines).toBe(1);
    p = dwell(p, LINE_MS * 5, true);
    expect(told(p, 3).lines).toBe(3);
    expect(dwell(1000, 400, false)).toBe(800);
  });

  it('the wheel goes round the hats and back to none; dials wrap', () => {
    expect(cycle(['a', 'b'], null, 1)).toBe('a');
    expect(cycle(['a', 'b'], 'b', 1)).toBeNull();
    expect(cycle(['a', 'b'], null, -1)).toBe('b');
    expect(turn(9, 1)).toBe(0);
    expect(turn(0, -1)).toBe(9);
  });
});
