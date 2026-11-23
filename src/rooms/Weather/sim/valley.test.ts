import { describe, expect, it } from 'vitest';
import { POSTCARDS } from '../../../content/postcards';
import { runScript } from './run';
import { H, PLACES, W, actOn, baseTemp, columnCloud, idx, isAir, lowAir, makeValley, pondFrozen, qsat, rainbows, stepValley, totalCloud, valleyStats, vaneStrikes, type Valley, type ValleyAction } from './valley';

const run = (v: Valley, steps: number) => {
  for (let i = 0; i < steps; i++) v = stepValley(v);
  return v;
};
const place = (v: Valley, a: ValleyAction) => actOn(v, a);

describe('the valley, one rule at a time', () => {
  it('air is colder higher up, and settles back to that with no tools', () => {
    const v = run(makeValley(), 50);
    expect(v.temp[idx(5, 0)]!).toBeLessThan(v.temp[idx(5, 9)]!);
    expect(v.temp[idx(5, 9)]!).toBeCloseTo(baseTemp(9, 0), 0);
    expect(totalCloud(run(makeValley({ humidity: 0.2 }), 200))).toBeLessThan(0.5);
  });

  it('warm, wet air rises and makes a cloud above the teacup', () => {
    let v = place(makeValley(), { type: 'place', tool: 'teacup', x: 11.5, y: 10.4 });
    v = run(v, 100);
    expect(columnCloud(v, 11)).toBeGreaterThan(1.5);
    // the cloud is above the cup, not at its level
    let top = H;
    for (let y = 0; y < H; y++) if (v.cloud[idx(11, y)]! > 0.3) top = Math.min(top, y);
    expect(top).toBeLessThan(10);
  });

  it('saturation: warm air holds more vapour than cold', () => {
    expect(qsat(20)).toBeGreaterThan(qsat(0));
    expect(qsat(0)).toBeGreaterThan(qsat(-10));
  });

  it('heavy cloud rains over warm ground and snows over freezing ground', () => {
    let warm = place(makeValley(), { type: 'place', tool: 'teacup', x: 11.5, y: 10.4 });
    warm = run(warm, 120);
    expect(warm.rain[11]! + warm.wet[11]!).toBeGreaterThan(0);
    let cold = place(makeValley({ climate: -14 }), { type: 'place', tool: 'teacup', x: 18.5, y: 3.5 });
    cold = run(cold, 120);
    expect(PLACES.hill.some((x) => cold.snow[x]! > 0)).toBe(true);
  });

  it('wind blows from cold towards warm, and the fan pushes it', () => {
    let v = place(makeValley(), { type: 'place', tool: 'lamp', x: 12, y: 6 });
    v = run(v, 30);
    expect(v.wind[idx(9, 6)]!).toBeGreaterThan(0); // left of the lamp: towards it
    expect(v.wind[idx(15, 6)]!).toBeLessThan(0); // right of the lamp: towards it
    let f = place(makeValley(), { type: 'place', tool: 'fan', x: 14, y: 6, dir: -1 });
    f = run(f, 10);
    expect(f.wind[idx(11, 6)]!).toBeLessThan(-0.05);
  });

  it('fog needs cold, wet and still; the fan blows it away', () => {
    const still: ValleyAction[] = [
      { type: 'place', tool: 'ice', x: 8.5, y: 9.6 },
      { type: 'place', tool: 'teacup', x: 8.5, y: 10.4 },
    ];
    const v = run(still.reduce(place, makeValley({ humidity: 0.45 })), 80);
    expect(Math.max(...v.fog)).toBeGreaterThan(0.4);
    const windy = run([...still, { type: 'place', tool: 'fan', x: 6, y: 9.5, dir: 1 } as ValleyAction].reduce(place, makeValley({ humidity: 0.45 })), 80);
    expect(Math.max(...[...PLACES.field, ...PLACES.pond].map((x) => windy.fog[x]!))).toBeLessThan(0.4);
  });

  it('a tall storm cloud strikes the weathervane when it is up, something else when it is down', () => {
    const storm: ValleyAction[] = [
      { type: 'place', tool: 'teacup', x: 14.5, y: 9 },
      { type: 'place', tool: 'lamp', x: 18.5, y: 7 },
      { type: 'place', tool: 'ice', x: 14.5, y: 2.5 },
    ];
    const up = run(storm.reduce(place, makeValley()), 400);
    expect(vaneStrikes(up)).toBeGreaterThan(0);
    const down = run(storm.reduce(place, makeValley({ vaneUp: false })), 400);
    expect(down.strikes.length).toBeGreaterThan(0);
    expect(vaneStrikes(down)).toBe(0);
  });

  it('a rainbow sits opposite the lamp, wider when the lamp is lower, and only shows where rain falls', () => {
    let v = place(makeValley(), { type: 'place', tool: 'teacup', x: 11.5, y: 10.4 });
    v = run(v, 60);
    expect(rainbows(v)).toEqual([]); // no light, no rainbow
    const a = rainbows(place(v, { type: 'place', tool: 'lamp', x: 10, y: 3 }));
    const b = rainbows(place(v, { type: 'place', tool: 'lamp', x: 12, y: 3 }));
    const low = rainbows(place(v, { type: 'place', tool: 'lamp', x: 10, y: 8 }));
    expect(a[0]!.cx).toBeGreaterThan(b[0]!.cx); // lamp left → rainbow right
    expect(low[0]!.r).toBeGreaterThan(a[0]!.r);
    expect(a[0]!.seen.every((x) => v.rain[x]! > 0)).toBe(true);
    const two = rainbows(place(place(v, { type: 'place', tool: 'lamp', x: 12, y: 5 }), { type: 'place', tool: 'mirror', x: 10, y: 4 }));
    expect(two.map((r) => r.from)).toEqual(['lamp', 'mirror']);
  });

  it('a cold valley freezes the pond; the lamp keeps it open', () => {
    const cold = run(makeValley({ climate: -14 }), 60);
    expect(pondFrozen(cold)).toBe(true);
    const lamped = run(place(makeValley({ climate: -14 }), { type: 'place', tool: 'lamp', x: 11.5, y: 9.6 }), 60);
    expect(pondFrozen(lamped)).toBe(false);
  });

  it('Nimbus wrings himself out into heavy rain and gets smaller; the valley plumps him up again', () => {
    let v = place(makeValley(), { type: 'nimbus', x: 8, squeezing: true });
    const before = v.nimbus.size;
    v = run(v, 80);
    expect(v.nimbus.size).toBeLessThan(before);
    expect(v.fieldRain).toBeGreaterThan(0.2);
    let rest = place(v, { type: 'nimbus', x: 8, squeezing: false });
    const small = rest.nimbus.size;
    rest = run(place(rest, { type: 'place', tool: 'lamp', x: 11.5, y: 9.4 }), 400);
    expect(rest.nimbus.size).toBeGreaterThan(small);
  });

  it('tools stay in the air, inside the box', () => {
    const v = place(makeValley(), { type: 'place', tool: 'teacup', x: 40, y: 40 });
    const t = v.tools[0]!;
    expect(isAir(Math.floor(t.x), Math.floor(t.y))).toBe(true);
    expect(t.y).toBeLessThan(lowAir(Math.floor(t.x)) + 1);
  });
});

describe('determinism and stability', () => {
  it('the same valley and the same moves give the same weather', () => {
    const go = () => run([{ type: 'place', tool: 'teacup', x: 11.5, y: 10.4 } as ValleyAction, { type: 'place', tool: 'fan', x: 14, y: 5, dir: -1 } as ValleyAction].reduce(place, makeValley()), 300);
    expect(JSON.stringify(go())).toBe(JSON.stringify(go()));
  });

  it('stepping never mutates the valley it was given', () => {
    const v = makeValley();
    const before = JSON.stringify(v);
    stepValley(v);
    expect(JSON.stringify(v)).toBe(before);
  });

  it('10,000 steps with random tools stay finite and bounded', () => {
    let seed = 42;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let v = makeValley({ climate: -6 });
    const tools = ['teacup', 'ice', 'fan', 'lamp', 'mirror'] as const;
    for (let s = 0; s < 10_000; s++) {
      if (s % 150 === 0) {
        const r = rnd();
        if (r < 0.6) v = actOn(v, { type: 'place', tool: tools[Math.floor(rnd() * tools.length)]!, x: rnd() * W, y: rnd() * H, dir: rnd() < 0.5 ? -1 : 1 });
        else if (r < 0.8) v = actOn(v, { type: 'remove', tool: tools[Math.floor(rnd() * tools.length)]! });
        else if (r < 0.9) v = actOn(v, { type: 'nimbus', x: rnd() * W, squeezing: rnd() < 0.5 });
        else v = actOn(v, { type: 'vane', up: rnd() < 0.5 });
      }
      v = stepValley(v);
    }
    const st = valleyStats(v);
    expect(st.finite).toBe(true);
    expect(st.tMin).toBeGreaterThan(-41);
    expect(st.tMax).toBeLessThan(61);
    expect(Math.max(...v.cloud)).toBeLessThanOrEqual(6);
    expect(Math.max(...v.vapour)).toBeLessThanOrEqual(6);
    expect(v.nimbus.size).toBeGreaterThanOrEqual(0.05);
    expect(v.nimbus.size).toBeLessThanOrEqual(1);
  });
});

describe('every postcard', () => {
  for (const p of POSTCARDS) {
    const spec = { climate: p.climate, humidity: p.humidity, vaneUp: p.vaneUp, breeze: p.breeze, tools: p.tools, nimbus: p.nimbus, phases: p.phases };
    it(`${p.id}: the stored script does it`, () => {
      expect(runScript(spec, p.script, p.seconds).solved).toBe(true);
    });
    it(`${p.id}: doing nothing doesn't, and nor does the naive attempt`, () => {
      expect(runScript(spec, [], p.seconds).solved).toBe(false);
      expect(runScript(spec, p.naiveAttempt, p.seconds).solved).toBe(false);
    });
    it(`${p.id}: the script only uses tools on the sill`, () => {
      for (const [, a] of p.script) {
        if (a.type === 'place' || a.type === 'remove') expect(p.tools).toContain(a.tool);
        if (a.type === 'nimbus') expect(p.nimbus).toBe(true);
      }
    });
  }
  it('there are ten, in order, the finale last', () => {
    expect(POSTCARDS).toHaveLength(10);
    expect(POSTCARDS.at(-1)!.phases.length).toBe(4);
  });
});
