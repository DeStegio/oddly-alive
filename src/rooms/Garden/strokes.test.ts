import { elevation, leanTowards, lightAt, phaseOf, shadow, skyColour } from './light';
import { classify, type Pt } from './strokes';

const arc = (cx: number, cy: number, r: number, from: number, to: number, n = 40): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = from + ((to - from) * i) / (n - 1);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });

describe('reading strokes drawn in the soil', () => {
  it('a line drawn upwards is a sunflower', () => {
    expect(classify(Array.from({ length: 12 }, (_, i) => ({ x: 100 + (i % 2), y: 300 - i * 8 })))).toBe('line');
  });

  it('a closed loop is a radish', () => {
    expect(classify(arc(100, 100, 30, 0, Math.PI * 2))).toBe('loop');
  });

  it('a spiral is a snapdragon', () => {
    const pts = Array.from({ length: 80 }, (_, i) => {
      const a = (i / 79) * Math.PI * 5;
      const r = 6 + i * 0.6;
      return { x: 100 + Math.cos(a) * r, y: 100 + Math.sin(a) * r };
    });
    expect(classify(pts)).toBe('spiral');
  });

  it('a zigzag is mint', () => {
    expect(classify([0, 1, 2, 3, 4, 5, 6].map((i) => ({ x: 50 + (i % 2 ? 40 : 0), y: 100 + i * 6 })))).toBe('zigzag');
  });

  it('an open half-circle is a moonflower', () => {
    expect(classify(arc(100, 100, 40, -Math.PI / 2, Math.PI / 2))).toBe('crescent');
  });

  it('a quick flat swipe is a cut; dots and scribbles are nothing', () => {
    expect(classify(Array.from({ length: 10 }, (_, i) => ({ x: 20 + i * 15, y: 200 + (i % 2) })))).toBe('slash');
    expect(classify([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }])).toBeNull();
  });
});

describe('the garden day', () => {
  it('pointer height is the sun: noon at the top, night below the horizon', () => {
    expect(elevation(0, 0, 200)).toBe(1);
    expect(elevation(200, 0, 200)).toBe(0);
    expect(phaseOf(elevation(100, 0, 200))).toBe('day');
    expect(phaseOf(elevation(180, 0, 200))).toBe('dusk');
    expect(phaseOf(elevation(260, 0, 200))).toBe('night');
  });

  it('plants under the sun get the most light, and none at night', () => {
    expect(lightAt(500, 500, 1, 1000)).toBeCloseTo(1);
    expect(lightAt(100, 900, 1, 1000)).toBeLessThan(0.5);
    expect(lightAt(500, 500, -0.2, 1000)).toBe(0);
  });

  it('plants lean towards the sun and shadows stretch at dusk', () => {
    expect(leanTowards(100, 800, 1, 1000)).toBeGreaterThan(0);
    expect(leanTowards(800, 100, 1, 1000)).toBeLessThan(0);
    expect(shadow(400, 500, 0.1).stretch).toBeGreaterThan(shadow(400, 500, 0.9).stretch);
    expect(skyColour(1)).toBe('rgb(207, 224, 255)');
    expect(skyColour(-0.5)).toBe('rgb(42, 40, 64)');
  });
});
