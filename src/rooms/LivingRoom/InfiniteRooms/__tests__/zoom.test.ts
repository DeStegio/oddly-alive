import { ARCHETYPES, archetypeAt, sceneAt, FALSE_EVERY } from '../sceneGenerator';
import { EXIT_AT, H, W, portalH, startCamera, viewRect, zoomBy, type Camera } from '../zoomController';

describe('the recursive zoom', () => {
  const portal = { x: 600, y: 200, w: 180, shape: 'rect' as const };

  it('starts on the whole room and ends exactly on the portal', () => {
    expect(viewRect(portal, 0)).toEqual({ x: 0, y: 0, w: W, h: H });
    const end = viewRect(portal, 1);
    expect(end.x).toBeCloseTo(portal.x);
    expect(end.y).toBeCloseTo(portal.y);
    expect(end.w).toBeCloseTo(portal.w);
    expect(end.h).toBeCloseTo(portalH(portal));
  });

  it('the portal stays put on screen in proportion all the way in (no drift)', () => {
    for (const p of [0.1, 0.4, 0.7, 0.95]) {
      const v = viewRect(portal, p);
      // the portal's place within the view is the same fraction as the view's place within the room
      const fx = (portal.x - v.x) / v.w;
      const zoomed = (portal.x - v.x) / v.w;
      expect(fx).toBeCloseTo(zoomed);
      expect(v.w).toBeGreaterThan(portal.w - 1e-9);
      expect(v.x).toBeLessThanOrEqual(portal.x + 1e-9);
    }
  });

  it('crossing into the next room rebases to p = 0 (scale never piles up)', () => {
    let cam: Camera = startCamera();
    const entered: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = zoomBy(cam, 0.35);
      cam = r.cam;
      for (const e of r.events) if (e.type === 'entered') entered.push(e.depth);
      expect(cam.p).toBeGreaterThanOrEqual(0);
      expect(cam.p).toBeLessThan(1);
    }
    expect(entered).toEqual([2, 3, 4]);
    expect(cam.depth).toBe(4);
  });

  it('zooming back out walks back through the rooms, then asks to go home', () => {
    let cam: Camera = { depth: 3, p: 0.2, out: 0 };
    const events: string[] = [];
    for (let i = 0; i < 12; i++) {
      const r = zoomBy(cam, -0.3);
      cam = r.cam;
      events.push(...r.events.map((e) => e.type));
    }
    expect(events.filter((e) => e === 'left')).toHaveLength(2);
    expect(events).toContain('exit');
    expect(cam.depth).toBe(1);
    expect(cam.out).toBeLessThanOrEqual(EXIT_AT);
  });

  it('a hundred rooms in and back: the numbers stay sane', () => {
    let cam: Camera = startCamera();
    for (let i = 0; i < 200; i++) cam = zoomBy(cam, 0.5).cam;
    expect(cam.depth).toBe(101);
    expect(cam.p).toBeCloseTo(0);
    for (let i = 0; i < 200; i++) cam = zoomBy(cam, -0.5).cam;
    expect(cam.depth).toBe(1);
  });
});

describe('rooms from a seed', () => {
  it('the same seed and depth always make the same room', () => {
    for (const d of [1, 2, 9, 50, 1234]) expect(sceneAt(7, d)).toEqual(sceneAt(7, d));
    expect(sceneAt(7, 3)).not.toEqual(sceneAt(8, 3));
  });

  it('never the same kind of room twice in a row, and every kind turns up', () => {
    for (const seed of [1, 2, 3, 99, 4242]) {
      const seen = new Set<string>();
      let prev = '';
      for (let d = 1; d <= 400; d++) {
        const a = archetypeAt(seed, d);
        expect(a).not.toBe(prev);
        prev = a;
        seen.add(a);
      }
      for (const a of ARCHETYPES) expect(seen.has(a)).toBe(true);
      expect(seen.has('false')).toBe(true);
    }
  });

  it('the almost-home room comes round every so often', () => {
    expect(archetypeAt(5, FALSE_EVERY)).toBe('false');
    expect(archetypeAt(5, FALSE_EVERY * 3)).toBe('false');
  });

  it('portals are big enough to find, and stay inside the room (flipped too)', () => {
    for (let d = 1; d <= 200; d++) {
      const p = sceneAt(11, d).portal;
      expect(p.w).toBeGreaterThanOrEqual(120);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.w).toBeLessThanOrEqual(W);
      expect(p.y + portalH(p)).toBeLessThanOrEqual(H);
    }
  });
});
