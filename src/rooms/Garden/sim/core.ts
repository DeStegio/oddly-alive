import { hybridOf, isBase, isHybrid, parents, traits } from './species';
import type { Action, Cell, GardenState, Plant, SimEvent, Species, Stage, SunPos } from './types';

/**
 * The garden simulation. `step(state, sun)` is one day; `act(state, action)`
 * is something the player does between days. Both return a new state and
 * never touch the old one, so rewinding is just keeping the old one.
 *
 * One day, in order (reading order everywhere, so it is deterministic):
 *  1. Crumb (day 1, on levels with the sparrow) takes every lone seed.
 *  2. Light: tall things shade cells away from the sun.
 *  3. Snapdragons eat a neighbouring mint each.
 *  4. Mint on wet soil spreads into one empty neighbour (wettest first), even at night.
 *  5. Growth.
 *  6. Creepers extend one cell (over rock too).
 *  7. Lit soil dries by 1; shade and night keep their water.
 *  8. Creepers share water along themselves.
 *  9. Moonflowers lit two days running wilt; sunflowers face the sun.
 * 10. Bees cross two different flowers in bloom side by side.
 */

/** N, E, S, W: the fixed order every tie is broken in. */
export const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export const MAX_WATER = 3;

export interface LevelLayout {
  /** Rows of the bed, north (by the fence) first: `.` soil, `#` rock, `S` shed, `*` marked soil. */
  map: string[];
  /** Starting moisture of the soil (one number, or one per row). */
  water: number | number[];
  /** Already in the ground: `kind x y stage`. */
  plants?: string[];
  seeds: Record<string, number>;
  barrel: number;
  crumb?: boolean;
}

export const idx = (s: Pick<GardenState, 'w'>, x: number, y: number) => y * s.w + x;
export const inBed = (s: Pick<GardenState, 'w' | 'h'>, x: number, y: number) => x >= 0 && y >= 0 && x < s.w && y < s.h;
export const cellAt = (s: GardenState, x: number, y: number): Cell | null => (inBed(s, x, y) ? s.cells[idx(s, x, y)]! : null);

export function clone(s: GardenState): GardenState {
  return {
    ...s,
    cells: s.cells.map((c) => ({ ...c, plant: c.plant ? { ...c.plant } : null })),
    tin: { ...s.tin },
    picked: { ...s.picked },
    events: [],
    fresh: [...s.fresh],
  };
}

export function makeState(layout: LevelLayout): GardenState {
  const h = layout.map.length;
  const w = Math.max(...layout.map.map((r) => r.length));
  const cells: Cell[] = [];
  for (let y = 0; y < h; y++) {
    const row = layout.map[y]!;
    const water = typeof layout.water === 'number' ? layout.water : (layout.water[y] ?? 0);
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? '.';
      const terrain = ch === '#' ? 'rock' : ch === 'S' ? 'shed' : 'soil';
      cells.push({ terrain, water: terrain === 'soil' ? Math.min(MAX_WATER, water) : 0, plant: null, mark: ch === '*' });
    }
  }
  const s: GardenState = { w, h, cells, day: 0, sun: null, night: false, shade: [], tin: { ...layout.seeds }, barrel: layout.barrel, wateredToday: false, picked: {}, nextId: 1, crumb: layout.crumb ?? false, events: [], fresh: [] };
  for (const spec of layout.plants ?? []) {
    const [kind, xs, ys, st] = spec.split(' ');
    const x = Number(xs);
    const y = Number(ys);
    const c = cellAt(s, x, y);
    if (!c || !kind) continue;
    c.plant = newPlant(s, kind as Species, Math.max(0, Math.min(3, Number(st ?? 0))) as Stage);
  }
  return s;
}

function newPlant(s: GardenState, kind: Species, stage: Stage = 0, root?: number): Plant {
  const id = s.nextId++;
  return { kind, stage, facing: null, litStreak: 0, id, root: root ?? id };
}

const isTall = (p: Plant | null) => !!p && p.stage >= 2 && traits(p.kind).tall;

/** In bloom right now. Moonflowers only show it on a night. */
export function inBloom(s: GardenState, p: Plant | null): boolean {
  if (!p || p.stage < 3) return false;
  return traits(p.kind).nightBloom ? s.night : true;
}

/** Cells in shade for a day with the sun at `sun` (night: everything is dark, nothing is lit). */
export function shadeMap(s: GardenState, sun: SunPos): boolean[] {
  const shade = s.cells.map(() => sun === 'night');
  if (sun === 'night') return shade;
  const reach: Array<[number, number]> = sun === 'noon' ? [[0, 1]] : sun === 'morning' ? [[-1, 0], [-2, 0]] : [[1, 0], [2, 0]];
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const c = s.cells[idx(s, x, y)]!;
      if (c.terrain !== 'shed' && !isTall(c.plant)) continue;
      for (const [dx, dy] of reach) if (inBed(s, x + dx, y + dy)) shade[idx(s, x + dx, y + dy)] = true;
    }
  return shade;
}

/** Who casts shade onto a cell, for the "tall-shade" rule (a plant shading another plant). */
function shadedByPlant(s: GardenState, sun: SunPos, x: number, y: number): boolean {
  if (sun === 'night') return false;
  const from: Array<[number, number]> = sun === 'noon' ? [[0, -1]] : sun === 'morning' ? [[1, 0], [2, 0]] : [[-1, 0], [-2, 0]];
  return from.some(([dx, dy]) => isTall(cellAt(s, x + dx, y + dy)?.plant ?? null));
}

function neighbours(s: GardenState, x: number, y: number) {
  const out: Array<{ x: number; y: number; c: Cell }> = [];
  for (const [dx, dy] of DIRS) {
    const c = cellAt(s, x + dx, y + dy);
    if (c) out.push({ x: x + dx, y: y + dy, c });
  }
  return out;
}

export function plantedNeighbours(s: GardenState, x: number, y: number): number {
  return neighbours(s, x, y).filter((n) => n.c.plant).length;
}

/** Connected cells of one creeper (same root). */
function creeperCells(s: GardenState, root: number): number[] {
  const out: number[] = [];
  s.cells.forEach((c, i) => {
    if (c.plant && c.plant.root === root && traits(c.plant.kind).climbs) out.push(i);
  });
  return out;
}

// ----------------------------------------------------------------- one day

export function step(prev: GardenState, sun: SunPos): GardenState {
  const s = clone(prev);
  const ev: SimEvent[] = [];
  const night = sun === 'night';
  s.day = prev.day + 1;
  s.sun = sun;
  s.night = night;
  s.wateredToday = false;
  s.fresh = [];

  // 1. Crumb, on the first day, takes every seed with nobody next to it
  if (s.crumb && prev.day === 0) {
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const c = s.cells[idx(s, x, y)]!;
        if (c.plant && c.plant.stage === 0 && plantedNeighbours(prev, x, y) === 0) {
          ev.push({ rule: 'crumb', x, y, kind: c.plant.kind });
          c.plant = null;
        }
      }
  }

  // 2. light, from how the bed stood at dawn (company is counted from dawn too)
  const dawn = clone(s);
  const shade = shadeMap(s, sun);
  s.shade = shade;
  const lit = (x: number, y: number) => !shade[idx(s, x, y)];
  const existed = new Set<number>();
  s.cells.forEach((c) => c.plant && existed.add(c.plant.id));

  // 3. snapdragons (and anything else that eats mint) take one neighbouring mint each
  if (!night)
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const p = s.cells[idx(s, x, y)]!.plant;
        if (!p || p.stage < 1 || !traits(p.kind).eatsMint) continue;
        const prey = neighbours(s, x, y).find((n) => n.c.plant && traits(n.c.plant.kind).spreads && n.c.plant.kind !== p.kind);
        if (prey) {
          ev.push({ rule: 'snap-eat', x: prey.x, y: prey.y, kind: prey.c.plant!.kind, detail: `${x},${y}` });
          prey.c.plant = null;
        }
      }

  // 4. spreading: mint on wet soil goes into one empty neighbour, the wettest first (nights too: mint never sleeps)
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const c = s.cells[idx(s, x, y)]!;
        const p = c.plant;
        if (!p || !existed.has(p.id) || p.stage < 1) continue;
        const how = traits(p.kind).spreads;
        if (!how) continue;
        if (c.water < 1) {
          ev.push({ rule: 'mint-dry', x, y, kind: p.kind });
          continue;
        }
        let best: { x: number; y: number; c: Cell } | null = null;
        for (const n of neighbours(s, x, y)) {
          if (n.c.terrain !== 'soil') continue;
          if (n.c.plant && !(n.c.plant.stage === 0 && !traits(n.c.plant.kind).spreads)) continue;
          if (how === 'lit' && !lit(n.x, n.y)) continue;
          if (!best || n.c.water > best.c.water) best = n;
        }
        if (!best) {
          if (neighbours(s, x, y).some((n) => n.c.terrain !== 'soil')) ev.push({ rule: 'rock-stop', x, y, kind: p.kind });
          continue;
        }
        if (best.c.plant) ev.push({ rule: 'mint-smother', x: best.x, y: best.y, kind: best.c.plant.kind });
        best.c.plant = newPlant(s, p.kind, 1);
        ev.push({ rule: 'mint-spread', x: best.x, y: best.y, kind: p.kind, detail: `${x},${y}` });
      }

  // 5. growth (plants that were in the ground at dawn)
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const c = s.cells[idx(s, x, y)]!;
      const p = c.plant;
      if (!p || !existed.has(p.id) || p.stage >= 3) continue;
      const t = traits(p.kind);
      if (t.climbs && p.id !== p.root) continue; // a creeper's later cells are just the vine
      const water = t.climbs ? Math.max(...creeperCells(s, p.root).map((i) => s.cells[i]!.water)) : c.water;
      if (night) {
        if (t.nightBloom && p.stage === 2 && water >= 1) {
          p.stage = 3;
          ev.push({ rule: 'moon-night', x, y, kind: p.kind });
        }
        continue;
      }
      if (water < 1) {
        ev.push({ rule: 'thirsty', x, y, kind: p.kind });
        continue;
      }
      const isLit = lit(x, y);
      if (t.light === 'lit' && !isLit) {
        if (shadedByPlant(s, sun, x, y)) ev.push({ rule: 'tall-shade', x, y, kind: p.kind });
        continue;
      }
      if (t.light === 'shade' && isLit) continue;
      if (t.company && plantedNeighbours(dawn, x, y) < t.company) {
        ev.push({ rule: 'radish-lonely', x, y, kind: p.kind });
        continue;
      }
      if (t.bites && neighbours(s, x, y).some((n) => n.c.plant && n.c.plant.kind === p.kind)) {
        ev.push({ rule: 'snap-bite', x, y, kind: p.kind });
        continue;
      }
      if (t.nightBloom && p.stage >= 2) continue; // waits for the night
      p.stage = (p.stage + 1) as Stage;
      ev.push({ rule: 'grow', x, y, kind: p.kind, detail: String(p.stage) });
      if (t.light === 'shade') ev.push({ rule: 'moon-shade', x, y, kind: p.kind });
      if (t.company) ev.push({ rule: 'radish-company', x, y, kind: p.kind });
    }

  // 6. creepers: one new cell a day, from the newest end, towards the light (over rock too)
  if (!night) {
    const roots = new Set<number>();
    s.cells.forEach((c) => c.plant && existed.has(c.plant.id) && traits(c.plant.kind).climbs && c.plant.stage >= 1 && roots.add(c.plant.root));
    for (const root of [...roots].sort((a, b) => a - b)) {
      const cells = creeperCells(s, root);
      const water = Math.max(...cells.map((i) => s.cells[i]!.water));
      if (water < 1) continue;
      const tip = cells.reduce((a, b) => (s.cells[b]!.plant!.id > s.cells[a]!.plant!.id ? b : a));
      const tx = tip % s.w;
      const ty = Math.floor(tip / s.w);
      const options = neighbours(s, tx, ty).filter((n) => !n.c.plant && n.c.terrain !== 'shed');
      if (!options.length) continue;
      const pickN = options.find((n) => lit(n.x, n.y)) ?? options[0]!;
      const kind = s.cells[tip]!.plant!.kind;
      pickN.c.plant = newPlant(s, kind, 1, root);
      ev.push({ rule: pickN.c.terrain === 'rock' ? 'creeper-climb' : 'grow', x: pickN.x, y: pickN.y, kind, detail: 'creep' });
    }
  }

  // 7. lit soil dries; shade keeps its water
  if (!night)
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const c = s.cells[idx(s, x, y)]!;
        if (c.terrain !== 'soil') continue;
        if (lit(x, y)) {
          if (c.water > 0) {
            c.water -= 1;
            ev.push({ rule: 'dry-sun', x, y });
          }
        } else if (c.water > 0) ev.push({ rule: 'damp-shade', x, y });
      }

  // 8. creepers carry water along themselves
  const roots = new Set<number>();
  s.cells.forEach((c) => c.plant && traits(c.plant.kind).climbs && roots.add(c.plant.root));
  for (const root of roots) {
    const cells = creeperCells(s, root);
    const max = Math.max(...cells.map((i) => s.cells[i]!.water));
    for (const i of cells) {
      const c = s.cells[i]!;
      if (c.terrain === 'soil' && c.water < max) {
        c.water = max;
        ev.push({ rule: 'creeper-water', x: i % s.w, y: Math.floor(i / s.w) });
      }
    }
  }

  // 9. moonflowers in the sun two days running wilt; sunflowers face where the sun was
  if (!night)
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const c = s.cells[idx(s, x, y)]!;
        const p = c.plant;
        if (!p) continue;
        const t = traits(p.kind);
        const isLit = lit(x, y);
        p.litStreak = isLit ? p.litStreak + 1 : 0;
        if (t.wiltsAfterLit && p.litStreak >= t.wiltsAfterLit) {
          ev.push({ rule: 'moon-wilt', x, y, kind: p.kind });
          c.plant = null;
          continue;
        }
        if (t.facesSun && isLit && p.stage >= 1) {
          const f = sun === 'morning' ? 'east' : sun === 'evening' ? 'west' : 'south';
          if (p.facing !== f) ev.push({ rule: 'sun-face', x, y, kind: p.kind, detail: f });
          p.facing = f;
        }
      }

  // 10. the bees: two different kinds in bloom side by side make a seed of something new
  if (!night) {
    const made = new Set<string>();
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const a = s.cells[idx(s, x, y)]!.plant;
        if (!a || !inBloom(s, a) || !isBase(a.kind)) continue;
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ] as const) {
          const b = cellAt(s, x + dx, y + dy)?.plant ?? null;
          if (!b || !inBloom(s, b) || !isBase(b.kind) || b.kind === a.kind) continue;
          const h = hybridOf(a.kind, b.kind);
          if (made.has(h)) continue;
          made.add(h);
          s.tin[h] = (s.tin[h] ?? 0) + 1;
          ev.push({ rule: 'bee-cross', x: x + dx / 2, y: y + dy / 2, kind: h });
        }
      }
  }

  s.events = ev;
  return s;
}

// ----------------------------------------------------------------- the player's hands

export type ActResult = { ok: true; state: GardenState } | { ok: false; why: 'occupied' | 'no-seed' | 'not-soil' | 'not-ripe' | 'empty' | 'watered' | 'barrel-empty' | 'not-fresh' | 'out' };

export function act(prev: GardenState, a: Action): ActResult {
  if (a.type === 'water') {
    if (a.x < 0 || a.x >= prev.w) return { ok: false, why: 'out' };
    if (prev.wateredToday) return { ok: false, why: 'watered' };
    if (prev.barrel <= 0) return { ok: false, why: 'barrel-empty' };
    const s = clone(prev);
    s.barrel -= 1;
    s.wateredToday = true;
    const pour = (x: number, amount: number) => {
      if (x < 0 || x >= s.w) return;
      for (let y = 0; y < s.h; y++) {
        const c = s.cells[idx(s, x, y)]!;
        if (c.terrain !== 'soil') {
          s.events.push({ rule: 'rock-stop', x, y });
          break;
        }
        c.water = Math.min(MAX_WATER, c.water + amount);
      }
    };
    pour(a.x, 2);
    pour(a.x - 1, 1);
    pour(a.x + 1, 1);
    s.events.push({ rule: 'barrel', x: a.x, y: 0 });
    return { ok: true, state: s };
  }
  const c = cellAt(prev, a.x, a.y);
  if (!c) return { ok: false, why: 'out' };
  if (a.type === 'plant') {
    if (c.terrain !== 'soil') return { ok: false, why: 'not-soil' };
    if (c.plant) return { ok: false, why: 'occupied' };
    if ((prev.tin[a.kind] ?? 0) <= 0) return { ok: false, why: 'no-seed' };
    const s = clone(prev);
    s.tin[a.kind] = (s.tin[a.kind] ?? 0) - 1;
    const p = newPlant(s, a.kind, 0);
    s.cells[idx(s, a.x, a.y)]!.plant = p;
    s.fresh.push(p.id);
    return { ok: true, state: s };
  }
  if (a.type === 'dig') {
    // a seed planted today comes back up for free (cheap experiments)
    if (!c.plant) return { ok: false, why: 'empty' };
    if (!prev.fresh.includes(c.plant.id)) return { ok: false, why: 'not-fresh' };
    const s = clone(prev);
    const k = c.plant.kind;
    s.cells[idx(s, a.x, a.y)]!.plant = null;
    s.tin[k] = (s.tin[k] ?? 0) + 1;
    s.fresh = s.fresh.filter((id) => id !== c.plant!.id);
    return { ok: true, state: s };
  }
  // pick
  if (!c.plant) return { ok: false, why: 'empty' };
  if (c.plant.stage < 3) return { ok: false, why: 'not-ripe' };
  const s = clone(prev);
  const k = c.plant.kind;
  s.cells[idx(s, a.x, a.y)]!.plant = null;
  s.picked[k] = (s.picked[k] ?? 0) + 1;
  return { ok: true, state: s };
}

// ----------------------------------------------------------------- reading the bed

export function plants(s: GardenState): Array<{ x: number; y: number; p: Plant; c: Cell }> {
  const out: Array<{ x: number; y: number; p: Plant; c: Cell }> = [];
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const c = s.cells[idx(s, x, y)]!;
      if (c.plant) out.push({ x, y, p: c.plant, c });
    }
  return out;
}

export const countOf = (s: GardenState, kind: Species, minStage = 0) => plants(s).filter(({ p }) => p.kind === kind && p.stage >= minStage).length;
export const bloomsOf = (s: GardenState, kind: Species) => plants(s).filter(({ p }) => p.kind === kind && inBloom(s, p)).length;
export const hybridSeeds = (s: GardenState) => Object.entries(s.tin).filter(([k, n]) => isHybrid(k) && n > 0).map(([k]) => k);
export const marked = (s: GardenState) => s.cells.map((c, i) => ({ c, x: i % s.w, y: Math.floor(i / s.w) })).filter(({ c }) => c.mark);
export { parents };
