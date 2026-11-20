import { AtticSim, PILE_H, PILE_W, SHAKES_TO_BURST, stackBoxes, type BurstInfo } from './pile';

const run = (sim: AtticSim, ms: number) => {
  for (let t = 0; t < ms; t += 16) sim.step(16);
};
const boxes = [
  { id: 'a', kind: 'box' as const },
  { id: 'b', kind: 'hatbox' as const },
  { id: 'c', kind: 'suitcase' as const },
  { id: 'd', kind: 'crate' as const },
];

describe('the attic pile', () => {
  it('a toppling pile does not burst its boxes in a chain', () => {
    const sim = new AtticSim();
    const bursts: string[] = [];
    sim.onBurst = (b) => bursts.push(b.box);
    stackBoxes(sim, [...boxes, { id: 'e', kind: 'shoebox' as const }, { id: 'f', kind: 'dustbox' as const }]);
    run(sim, 2000);
    // knock the bottom of one column sideways
    const bottom = sim.list().reduce((a, b) => (a.body.position.y > b.body.position.y ? a : b));
    sim.fling(bottom.id, 9, 0);
    run(sim, 3000);
    expect(bursts.length).toBeLessThanOrEqual(1);
    sim.destroy();
  });

  it('a stacked pile settles without anything bursting', () => {
    const sim = new AtticSim();
    const bursts: BurstInfo[] = [];
    sim.onBurst = (b) => bursts.push(b);
    stackBoxes(sim, boxes);
    run(sim, 4000);
    expect(bursts).toEqual([]);
    for (const p of sim.list()) {
      expect(p.body.position.y).toBeLessThan(PILE_H);
      expect(p.body.position.x).toBeGreaterThan(0);
      expect(p.body.position.x).toBeLessThan(PILE_W);
    }
    sim.destroy();
  });

  it('a box dropped from high up bursts open on landing', () => {
    const sim = new AtticSim();
    const bursts: BurstInfo[] = [];
    sim.onBurst = (b) => bursts.push(b);
    run(sim, 1600); // let a new pile settle first
    const box = sim.add('box', 300, 40, { box: 'x' });
    sim.fling(box.id, 0, 16);
    run(sim, 2000);
    expect(bursts.map((b) => b.box)).toEqual(['x']);
    expect(sim.get(box.id)).toBeUndefined();
    sim.destroy();
  });

  it('a good shake while holding a box bursts it', () => {
    const sim = new AtticSim();
    const bursts: string[] = [];
    sim.onBurst = (b) => bursts.push(b.box);
    const box = sim.add('shoebox', 300, 300, { box: 's' });
    run(sim, 800);
    sim.startDrag(box.id, 300, 300, 0);
    let x = 300;
    for (let i = 1; i <= SHAKES_TO_BURST + 2; i++) {
      x += i % 2 ? 60 : -60;
      sim.moveDrag(x, 250, i * 60);
    }
    expect(bursts).toEqual(['s']);
    sim.destroy();
  });

  it('things that are not boxes never burst, however hard they land', () => {
    const sim = new AtticSim();
    const bursts: string[] = [];
    sim.onBurst = (b) => bursts.push(b.box);
    const hat = sim.add('hat:beret', 300, 40);
    sim.fling(hat.id, 0, 18);
    run(sim, 2000);
    expect(bursts).toEqual([]);
    expect(sim.get(hat.id)).toBeDefined();
    sim.destroy();
  });
});
