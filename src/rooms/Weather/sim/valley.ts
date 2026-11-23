/**
 * The Weather Workshop's valley: a tiny atmosphere in a glass box (Phase 4).
 * Pure, deterministic, fixed step (0.1 s). No React, no DOM.
 *
 * A 24×12 grid of air over a strip of ground (village, washing line, field,
 * pond, well, hill with a weathervane). Each air cell has temperature,
 * vapour, cloud water and a horizontal wind. Rules, in order, each step:
 *
 *  1. Temperature: the air settles towards a profile that gets colder with
 *     height; tools add heat (teacup, lamp, mirror) or take it (ice).
 *  2. Moisture comes in: the teacup steams, the ice melts, the pond and wet
 *     ground evaporate in warmth, Nimbus wrings himself out.
 *  3. Heat rises: air warmer than its row lifts vapour and cloud upwards.
 *  4. Cool and moist makes cloud (and releases a little heat); dry air
 *     evaporates cloud again.
 *  5. Wind blows from cold to warm (plus the fan) and carries vapour/cloud.
 *  6. Heavy cloud rains (snow if the air at the ground is below freezing).
 *  7. Fog: cloud sitting in calm, cold air on the low ground.
 *  8. A tall, wet cloud over a strong updraft builds charge; lightning
 *     strikes the highest conductive thing below (the weathervane if up).
 *  9. Rainbows: from where the lamp (and the mirror) are, wherever rain falls.
 */
export const W = 24;
export const H = 12;
export const DT = 0.1;
export const STEPS_PER_SECOND = 10;

/** Ground height (in cells) per column, left to right. */
export const GROUND: readonly number[] = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4];
/** Named places along the valley floor (column indices). */
export const PLACES = {
  village: [0, 1, 2, 3],
  ferdinand: [3],
  washing: [5, 6],
  field: [7, 8, 9],
  pond: [10, 11, 12, 13],
  well: [14],
  hill: [17, 18, 19, 20, 21, 22],
  vane: 19,
} as const;

export type ToolId = 'teacup' | 'ice' | 'fan' | 'lamp' | 'mirror';
export const TOOL_IDS: readonly ToolId[] = ['teacup', 'ice', 'fan', 'lamp', 'mirror'];

export interface Tool {
  id: ToolId;
  /** Position in cell units (0..W, 0..H; y down). */
  x: number;
  y: number;
  /** Fan: which way it blows (−1 left, 1 right). */
  dir: -1 | 1;
  /** Ice: how much is left (melts away). */
  left: number;
}

export interface Strike {
  x: number;
  target: 'vane' | 'hill' | 'ground';
  at: number;
}

export interface Valley {
  /** Steps run. */
  t: number;
  /** Climate: shifts the whole temperature profile (winter postcards are colder). */
  climate: number;
  /** A steady breeze across the valley (cells per step, + is eastwards). */
  breeze: number;
  /** The air outside the box: the valley slowly mixes back towards this humidity. */
  humidity: number;
  temp: number[];
  vapour: number[];
  cloud: number[];
  wind: number[];
  /** Per column: rain and snow falling this step (for drawing and goals). */
  rain: number[];
  snowfall: number[];
  /** Per column: how wet the ground is, and how much snow lies there. */
  wet: number[];
  snow: number[];
  /** Per column: fog on the low ground (0..1). */
  fog: number[];
  /** Per column: electrical charge in the cloud above. */
  charge: number[];
  /** Total rain that has fallen on the field (the Garden's barrel). */
  fieldRain: number;
  pondLevel: number;
  tools: Tool[];
  vaneUp: boolean;
  nimbus: { x: number; squeezing: boolean; size: number };
  strikes: Strike[];
}

export const idx = (x: number, y: number) => y * W + x;
export const groundTop = (x: number) => H - GROUND[x]!;
export const isAir = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < groundTop(x);
/** The lowest air cell of a column (the air at the ground). */
export const lowAir = (x: number) => groundTop(x) - 1;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const round = (v: number) => Math.round(v * 1e6) / 1e6;

/** Saturation vapour (more in warm air). */
export const qsat = (T: number) => 0.55 * Math.exp(0.065 * T);
/** The settled temperature of a cell with no tools around: 15° at the floor, colder with height. */
export const baseTemp = (y: number, climate: number) => 15 + climate - 2.4 * (H - 1 - y);

export function makeValley(opts: { climate?: number; humidity?: number; vaneUp?: boolean; breeze?: number } = {}): Valley {
  const climate = opts.climate ?? 0;
  const humidity = opts.humidity ?? 0.35;
  const n = W * H;
  const temp = new Array<number>(n).fill(0);
  const vapour = new Array<number>(n).fill(0);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const T = baseTemp(y, climate);
      temp[idx(x, y)] = isAir(x, y) ? T : 0;
      vapour[idx(x, y)] = isAir(x, y) ? qsat(T) * humidity : 0;
    }
  const cols = () => new Array<number>(W).fill(0);
  return {
    t: 0,
    climate,
    breeze: opts.breeze ?? 0,
    humidity,
    temp,
    vapour,
    cloud: new Array<number>(n).fill(0),
    wind: new Array<number>(n).fill(0),
    rain: cols(),
    snowfall: cols(),
    wet: cols(),
    snow: cols(),
    fog: cols(),
    charge: cols(),
    fieldRain: 0,
    pondLevel: 1,
    tools: [],
    vaneUp: opts.vaneUp ?? true,
    nimbus: { x: 6, squeezing: false, size: 0.6 },
    strikes: [],
  };
}

export function cloneValley(v: Valley): Valley {
  return {
    ...v,
    temp: v.temp.slice(),
    vapour: v.vapour.slice(),
    cloud: v.cloud.slice(),
    wind: v.wind.slice(),
    rain: v.rain.slice(),
    snowfall: v.snowfall.slice(),
    wet: v.wet.slice(),
    snow: v.snow.slice(),
    fog: v.fog.slice(),
    charge: v.charge.slice(),
    tools: v.tools.map((t) => ({ ...t })),
    nimbus: { ...v.nimbus },
    strikes: v.strikes.slice(),
  };
}

// ----------------------------------------------------------------- tools (the player's hands)

export type ValleyAction =
  | { type: 'place'; tool: ToolId; x: number; y: number; dir?: -1 | 1 }
  | { type: 'remove'; tool: ToolId }
  | { type: 'vane'; up: boolean }
  | { type: 'nimbus'; x: number; squeezing: boolean };

/** Tools are kept inside the box, in the air. */
function clampToAir(x: number, y: number) {
  const cx = clamp(x, 0.5, W - 0.5);
  const col = Math.floor(cx);
  return { x: cx, y: clamp(y, 0.5, groundTop(col) - 0.5) };
}

export function actOn(prev: Valley, a: ValleyAction): Valley {
  const v = cloneValley(prev);
  if (a.type === 'place') {
    const p = clampToAir(a.x, a.y);
    const existing = v.tools.find((t) => t.id === a.tool);
    if (existing) Object.assign(existing, p, { dir: a.dir ?? existing.dir });
    else v.tools.push({ id: a.tool, ...p, dir: a.dir ?? 1, left: 1 });
  } else if (a.type === 'remove') v.tools = v.tools.filter((t) => t.id !== a.tool);
  else if (a.type === 'vane') v.vaneUp = a.up;
  else v.nimbus = { ...v.nimbus, x: clamp(a.x, 0, W - 1), squeezing: a.squeezing };
  return v;
}

const tool = (v: Valley, id: ToolId) => v.tools.find((t) => t.id === id);

// ----------------------------------------------------------------- one step

export function stepValley(prev: Valley): Valley {
  const v = cloneValley(prev);
  const { temp, vapour, cloud, wind } = v;
  v.t = prev.t + 1;
  v.rain.fill(0);
  v.snowfall.fill(0);
  const lamp = tool(v, 'lamp');
  const mirror = tool(v, 'mirror');
  const cup = tool(v, 'teacup');
  const ice = tool(v, 'ice');
  const fan = tool(v, 'fan');

  // 1. temperature: settle towards the profile, plus what the tools do
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!isAir(x, y)) continue;
      const i = idx(x, y);
      let target = baseTemp(y, v.climate);
      const near = (t: Tool | undefined, r: number) => (t ? Math.max(0, 1 - Math.hypot(t.x - (x + 0.5), t.y - (y + 0.5)) / r) : 0);
      target += 16 * near(cup, 1.8);
      target += 13 * near(lamp, 3.2);
      if (lamp && mirror) target += 7 * near(mirror, 2.4);
      if (ice && ice.left > 0) target -= 26 * near(ice, 3) * (0.4 + 0.6 * ice.left);
      temp[i] = temp[i]! + (target - temp[i]!) * 0.08;
    }

  // 2. moisture in: steam, meltwater, the pond, wet ground, Nimbus
  let evaporated = 0;
  if (cup) addAround(v, cup.x, cup.y, 0.05, 1.3);
  if (ice && ice.left > 0) {
    addAround(v, ice.x, ice.y, 0.012, 1.5);
    ice.left = Math.max(0, ice.left - 0.0009);
  }
  for (let x = 0; x < W; x++) {
    const i = idx(x, lowAir(x));
    const T = temp[i]!;
    const warm = Math.max(0, T - 4) / 12;
    let e = 0;
    if ((PLACES.pond as readonly number[]).includes(x) && T > 0.5) e = 0.006 * warm * v.pondLevel;
    else if (v.wet[x]! > 0) {
      e = Math.min(v.wet[x]!, 0.002 * warm);
      v.wet[x] = v.wet[x]! - e;
    }
    vapour[i] = vapour[i]! + e;
    evaporated += e;
  }
  if (v.nimbus.squeezing && v.nimbus.size > 0.05) {
    const x = Math.round(v.nimbus.x);
    const squeeze = 0.14 * v.nimbus.size;
    for (let y = 0; y < 3; y++) if (isAir(x, y)) cloud[idx(x, y)] = cloud[idx(x, y)]! + squeeze / 3;
    v.nimbus.size = Math.max(0.05, v.nimbus.size - 0.0025);
  }
  // the valley gives back: evaporation plumps Nimbus up again
  v.nimbus.size = Math.min(1, v.nimbus.size + evaporated * 0.015 + 0.00001);

  // 3. heat rises, carrying vapour and cloud
  const rowMean = new Array<number>(H).fill(0);
  for (let y = 0; y < H; y++) {
    let s = 0;
    let n = 0;
    for (let x = 0; x < W; x++)
      if (isAir(x, y)) {
        s += temp[idx(x, y)]!;
        n++;
      }
    rowMean[y] = n ? s / n : 0;
  }
  const lift = new Array<number>(W * H).fill(0);
  for (let y = H - 1; y >= 1; y--)
    for (let x = 0; x < W; x++) {
      if (!isAir(x, y) || !isAir(x, y - 1)) continue;
      const i = idx(x, y);
      const up = idx(x, y - 1);
      const b = temp[i]! - rowMean[y]!;
      if (b <= 0.3) continue;
      const f = Math.min(0.35, 0.03 * b);
      lift[i] = f;
      const dq = vapour[i]! * f;
      const dc = cloud[i]! * f;
      vapour[i] = vapour[i]! - dq;
      vapour[up] = vapour[up]! + dq;
      cloud[i] = cloud[i]! - dc;
      cloud[up] = cloud[up]! + dc;
    }

  // 4. condensation and evaporation of cloud
  for (let i = 0; i < W * H; i++) {
    const x = i % W;
    const y = Math.floor(i / W);
    if (!isAir(x, y)) continue;
    const s = qsat(temp[i]!);
    if (vapour[i]! > s) {
      const d = (vapour[i]! - s) * 0.5;
      vapour[i] = vapour[i]! - d;
      cloud[i] = cloud[i]! + d;
      temp[i] = temp[i]! + d * 1.2;
    } else if (cloud[i]! > 0) {
      const d = Math.min(cloud[i]!, (s - vapour[i]!) * 0.12);
      cloud[i] = cloud[i]! - d;
      vapour[i] = vapour[i]! + d;
    }
  }

  // 5. wind: from cold to warm, plus the fan; it carries vapour and cloud
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (!isAir(x, y)) {
        wind[i] = 0;
        continue;
      }
      const l = isAir(x - 1, y) ? temp[idx(x - 1, y)]! : temp[i]!;
      const r = isAir(x + 1, y) ? temp[idx(x + 1, y)]! : temp[i]!;
      let u = 0.006 * (r - l) + v.breeze;
      if (fan) {
        const ahead = (x + 0.5 - fan.x) * fan.dir;
        const off = Math.abs(y + 0.5 - fan.y);
        if (ahead > -0.5 && ahead < 9 && off < 2.6) u += fan.dir * 0.32 * (1 - ahead / 10) * (1 - off / 3);
      }
      wind[i] = clamp(wind[i]! * 0.6 + u * 0.4, -0.4, 0.4);
    }
  advect(v, vapour);
  advect(v, cloud);

  // 6. heavy cloud rains (or snows) onto the ground below
  for (let x = 0; x < W; x++)
    for (let y = 0; y < groundTop(x); y++) {
      const i = idx(x, y);
      if (cloud[i]! <= 0.75) continue;
      const p = (cloud[i]! - 0.6) * 0.12;
      cloud[i] = cloud[i]! - p;
      const ground = temp[idx(x, lowAir(x))]!;
      if (ground > 0.5) {
        v.rain[x] = v.rain[x]! + p;
        v.wet[x] = Math.min(3, v.wet[x]! + p);
        if ((PLACES.pond as readonly number[]).includes(x)) v.pondLevel = Math.min(2, v.pondLevel + p * 0.05);
        if ((PLACES.field as readonly number[]).includes(x)) v.fieldRain += p;
      } else {
        v.snowfall[x] = v.snowfall[x]! + p;
        v.snow[x] = Math.min(3, v.snow[x]! + p);
      }
    }
  // snow melts in warm air
  for (let x = 0; x < W; x++) {
    const T = temp[idx(x, lowAir(x))]!;
    if (T > 2 && v.snow[x]! > 0) v.snow[x] = Math.max(0, v.snow[x]! - 0.0015 * (T - 2));
  }
  v.pondLevel = Math.max(0.2, v.pondLevel - 0.00008);

  // 7. fog: cloud sitting in still, cold air on the low ground
  for (let x = 0; x < W; x++) {
    const i = idx(x, lowAir(x));
    const low = GROUND[x]! <= 2;
    const near = vapour[i]! / qsat(temp[i]!);
    const target = low && temp[i]! < 9 && Math.abs(wind[i]!) < 0.12 ? clamp(cloud[i]! * 2.5 + (near - 0.85) * 5, 0, 1) : 0;
    v.fog[x] = v.fog[x]! + (target - v.fog[x]!) * 0.1;
  }

  // 8. tall wet cloud + strong updraft builds charge; lightning finds the highest conductor
  for (let x = 0; x < W; x++) {
    let col = 0;
    let rise = 0;
    let tall = 0;
    for (let y = 0; y < groundTop(x); y++) {
      col += cloud[idx(x, y)]!;
      rise = Math.max(rise, lift[idx(x, y)]!);
      if (cloud[idx(x, y)]! > 0.25) tall++;
    }
    v.charge[x] = clamp(v.charge[x]! + (col > 2.2 && tall >= 5 && rise > 0.15 ? 0.004 * col : -0.006), 0, 1.2);
  }
  const hot = v.charge.reduce((best, c, x) => (c > (v.charge[best] ?? 0) ? x : best), 0);
  if (v.charge[hot]! >= 1) {
    const vaneNear = v.vaneUp && Math.abs(hot - PLACES.vane) <= 5;
    const target: Strike['target'] = vaneNear ? 'vane' : GROUND[hot]! >= 5 ? 'hill' : 'ground';
    v.strikes = [...v.strikes, { x: vaneNear ? PLACES.vane : hot, target, at: v.t }].slice(-20);
    for (let x = Math.max(0, hot - 3); x <= Math.min(W - 1, hot + 3); x++) v.charge[x] = 0;
  }

  // the box isn't airtight: vapour mixes slowly back towards the outside air, clouds thin
  for (let i = 0; i < W * H; i++) {
    const x = i % W;
    const y = Math.floor(i / W);
    if (!isAir(x, y)) continue;
    vapour[i] = vapour[i]! + (qsat(baseTemp(y, v.climate)) * v.humidity - vapour[i]!) * 0.004;
    cloud[i] = cloud[i]! * 0.997;
  }

  // keep everything finite and bounded
  for (let i = 0; i < W * H; i++) {
    temp[i] = round(clamp(temp[i]!, -40, 60));
    vapour[i] = round(clamp(vapour[i]!, 0, 6));
    cloud[i] = round(clamp(cloud[i]!, 0, 6));
    wind[i] = round(wind[i]!);
  }
  return v;
}

function addAround(v: Valley, x: number, y: number, amount: number, r: number) {
  for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++)
    for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
      if (!isAir(xx, yy)) continue;
      const k = Math.max(0, 1 - Math.hypot(xx + 0.5 - x, yy + 0.5 - y) / r);
      v.vapour[idx(xx, yy)] = v.vapour[idx(xx, yy)]! + amount * k;
    }
}

/** Upwind transport along each row (stable: |wind| ≤ 0.4 cell per step). */
function advect(v: Valley, f: number[]) {
  const out = f.slice();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      const u = v.wind[i]!;
      if (!u || !isAir(x, y)) continue;
      const to = x + (u > 0 ? 1 : -1);
      if (!isAir(to, y)) continue;
      const moved = f[i]! * Math.abs(u);
      out[i] = out[i]! - moved;
      out[idx(to, y)] = out[idx(to, y)]! + moved;
    }
  for (let i = 0; i < f.length; i++) f[i] = out[i]!;
}

// ----------------------------------------------------------------- reading the valley

export const columnCloud = (v: Valley, x: number) => {
  let s = 0;
  for (let y = 0; y < groundTop(x); y++) s += v.cloud[idx(x, y)]!;
  return s;
};
export const totalCloud = (v: Valley) => v.cloud.reduce((a, b) => a + b, 0);
export const rainOn = (v: Valley, xs: readonly number[]) => xs.reduce((a, x) => a + v.rain[x]!, 0);
export const snowOn = (v: Valley, xs: readonly number[]) => xs.reduce((a, x) => a + v.snowfall[x]!, 0);
export const pondFrozen = (v: Valley) => (PLACES.pond as readonly number[]).some((x) => v.temp[idx(x, lowAir(x))]! < 0);
export const vaneStrikes = (v: Valley) => v.strikes.filter((s) => s.target === 'vane').length;

export interface Rainbow {
  /** Centre column of the arc and its radius (cells). */
  cx: number;
  r: number;
  /** Feet (columns) where it touches down. */
  feet: [number, number];
  /** Columns where it can be seen (only where rain is falling). */
  seen: number[];
  from: 'lamp' | 'mirror';
}

/**
 * Rainbows: light from behind you, rain in front. The arc is centred
 * opposite the light (move the lamp left, the rainbow goes right) and is
 * bigger the lower the light is. You only see the parts where rain falls.
 */
export function rainbows(v: Valley): Rainbow[] {
  const lamp = tool(v, 'lamp');
  if (!lamp) return [];
  const out: Rainbow[] = [];
  const make = (sx: number, sy: number, from: Rainbow['from']) => {
    const cx = W - sx;
    const r = 2 + sy * 0.55;
    const feet: [number, number] = [cx - r, cx + r];
    const seen: number[] = [];
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.ceil(cx + r)); x++) if (v.rain[x]! > 0.004) seen.push(x);
    if (seen.length) out.push({ cx, r, feet, seen, from });
  };
  make(lamp.x, lamp.y, 'lamp');
  if (mirrorOf(v)) make(mirrorOf(v)!.x, mirrorOf(v)!.y, 'mirror');
  return out;
}
const mirrorOf = (v: Valley) => tool(v, 'mirror');

/** A rainbow foot lands on column `x` (within half a cell) while rain falls there. */
export const rainbowEndsAt = (v: Valley, x: number) => rainbows(v).some((b) => b.feet.some((f) => Math.abs(f - (x + 0.5)) <= 0.75) && v.rain[x]! > 0.004);

export function valleyStats(v: Valley) {
  let tMin = Infinity;
  let tMax = -Infinity;
  let bad = false;
  for (const arr of [v.temp, v.vapour, v.cloud, v.wind]) for (const n of arr) if (!Number.isFinite(n)) bad = true;
  v.temp.forEach((T, i) => {
    if (!isAir(i % W, Math.floor(i / W))) return;
    tMin = Math.min(tMin, T);
    tMax = Math.max(tMax, T);
  });
  return { tMin, tMax, cloud: totalCloud(v), vapour: v.vapour.reduce((a, b) => a + b, 0), finite: !bad };
}
