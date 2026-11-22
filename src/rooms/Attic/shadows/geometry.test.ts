import { cast, nudgeApart, recognise, startProps, type Prop } from './geometry';

const lamp = { x: 400, y: 430 };
const set = (over: Partial<Record<Prop['kind'], Partial<Prop>>>) => startProps().map((p) => ({ ...p, ...over[p.kind] }));

describe('shadow theatre: casting', () => {
  it('a prop close to the lamp throws a big, soft shadow; far away, a smaller, sharper one', () => {
    const near = cast({ kind: 'cup', x: 400, y: 380, rot: 0 }, lamp);
    const far = cast({ kind: 'cup', x: 400, y: 100, rot: 0 }, lamp);
    expect(near.scale).toBeGreaterThan(far.scale);
    expect(near.blur).toBeGreaterThan(far.blur);
  });

  it('shadows fall away from the lamp, so moving the lamp moves them', () => {
    const p: Prop = { kind: 'hat', x: 300, y: 250, rot: 0 };
    const a = cast(p, { x: 400, y: 430 });
    const b = cast(p, { x: 200, y: 430 });
    expect(a.x).toBeLessThan(p.x);
    expect(b.x).toBeGreaterThan(p.x);
  });
});

describe('shadow theatre: shapes that come alive', () => {
  it('the starting spread makes nothing (free play first)', () => {
    expect(recognise(startProps(), lamp)).toBeNull();
  });

  it('two hands together, level: a bird', () => {
    const r = recognise(set({ handL: { x: 300, y: 250 }, handR: { x: 320, y: 255, rot: 10 } }), lamp);
    expect(r?.creature).toBe('bird');
    expect(r?.props.sort()).toEqual(['handL', 'handR']);
  });

  it('one hand turned upright on its own: a rabbit (either way up is near enough)', () => {
    expect(recognise(set({ handL: { rot: -95 } }), lamp)?.creature).toBe('rabbit');
    expect(recognise(set({ handR: { rot: 80 } }), lamp)?.creature).toBe('rabbit');
  });

  it('the hat just above the cup: a cat; the kettle with the fern: a dragon; a hat on the bust: a curtsy', () => {
    expect(recognise(set({ hat: { x: 460, y: 300 } }), lamp)?.creature).toBe('cat');
    expect(recognise(set({ fern: { x: 590, y: 330 } }), lamp)?.creature).toBe('dragon');
    expect(recognise(set({ hat: { x: 718, y: 280 } }), lamp)?.creature).toBe('curtsy');
  });

  it('after a creature, its props drift apart so it doesn’t fire again straight away', () => {
    const props = set({ handL: { x: 300, y: 250 }, handR: { x: 320, y: 255 } });
    const r = recognise(props, lamp)!;
    expect(recognise(nudgeApart(props, r.props), lamp)?.creature).not.toBe('bird');
  });
});
