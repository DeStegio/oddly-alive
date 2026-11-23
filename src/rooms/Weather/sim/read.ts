import type { Weather } from '../../../engine/weather';
import { H, PLACES, TOOL_IDS, W, baseTemp, cloneValley, idx, isAir, lowAir, makeValley, qsat, rainbows, stepValley, type Tool, type ToolId, type Valley } from './valley';

/**
 * Reading the valley: the house weather it makes, what the barometer says
 * (it forecasts by running a copy of the valley forward), and a compact
 * string for keeping the sandbox between visits.
 */

/** The house weather this valley is having right now (null: nothing to report, let the mood decide). */
export function valleyWeather(v: Valley): Weather | null {
  if (v.strikes.some((s) => v.t - s.at <= 60)) return 'storm';
  if (v.snowfall.some((s) => s > 0.001)) return 'snow';
  const raining = v.rain.reduce((a, b) => a + b, 0) > 0.01;
  if (raining && rainbows(v).length) return 'rainbow';
  if (raining) return 'rain';
  if ([...PLACES.field, ...PLACES.pond].filter((x) => v.fog[x]! > 0.4).length >= 2) return 'fog';
  let wind = 0;
  let n = 0;
  for (let i = 0; i < W * H; i++)
    if (isAir(i % W, Math.floor(i / W))) {
      wind += Math.abs(v.wind[i]!);
      n++;
    }
  if (wind / n > 0.06) return 'windy';
  if (v.tools.some((t) => t.id === 'lamp')) return 'sunny';
  return null;
}

export interface Reading {
  /** Average relative humidity, 0..100 %. */
  humidity: number;
  /** A pretend pressure in hPa: low when the air is warm, wet and cloudy. */
  pressure: number;
  /** What the valley will do in the next ten seconds if nobody touches it. */
  outlook: { kind: 'rain' | 'snow' | 'storm' | 'fog' | 'clearing' | 'settled' | 'raining' | 'snowing'; inSeconds: number | null };
}

export function readBarometer(v: Valley, aheadSeconds = 10): Reading {
  let rh = 0;
  let n = 0;
  let warm = 0;
  let cloud = 0;
  for (let i = 0; i < W * H; i++) {
    const x = i % W;
    const y = Math.floor(i / W);
    if (!isAir(x, y)) continue;
    rh += Math.min(1.2, (v.vapour[i]! + v.cloud[i]!) / qsat(v.temp[i]!));
    warm += v.temp[i]! - baseTemp(y, v.climate);
    cloud += v.cloud[i]!;
    n++;
  }
  const humidity = Math.round(Math.min(100, (rh / n) * 100));
  const pressure = Math.round(1016 - (warm / n) * 1.5 - cloud * 0.8);
  // look ahead: the same valley, untouched, for a few seconds
  let f = cloneValley(v);
  const strikesBefore = v.strikes.length;
  let outlook: Reading['outlook'] = { kind: 'settled', inSeconds: null };
  const raining = v.rain.some((r) => r > 0.002) || v.snowfall.some((s) => s > 0.001);
  for (let s = 1; s <= aheadSeconds * 10; s++) {
    f = stepValley(f);
    if (f.strikes.length > strikesBefore) {
      outlook = { kind: 'storm', inSeconds: Math.ceil(s / 10) };
      break;
    }
    if (!raining && f.snowfall.some((x) => x > 0.001)) {
      outlook = { kind: 'snow', inSeconds: Math.ceil(s / 10) };
      break;
    }
    if (!raining && f.rain.some((x) => x > 0.002)) {
      outlook = { kind: 'rain', inSeconds: Math.ceil(s / 10) };
      break;
    }
  }
  if (outlook.kind === 'settled') {
    if (raining && !f.rain.some((x) => x > 0.002) && !f.snowfall.some((x) => x > 0.001)) outlook = { kind: 'clearing', inSeconds: aheadSeconds };
    else if (raining) outlook = { kind: v.snowfall.some((x) => x > 0.001) ? 'snowing' : 'raining', inSeconds: null };
    else if ([...PLACES.field, ...PLACES.pond].some((x) => f.fog[x]! > 0.4 && v.fog[x]! <= 0.4)) outlook = { kind: 'fog', inSeconds: aheadSeconds };
  }
  return { humidity, pressure, outlook };
}

// ----------------------------------------------------------------- keeping the sandbox

const SAVE_V = 'v1';
const num = (n: number) => (Math.round(n * 100) / 100).toString();

/** A compact, validated text form of the valley (fits memory's 6000-character cap). */
export function saveValley(v: Valley): string {
  const tools = v.tools.map((t) => `${t.id}:${num(t.x)}:${num(t.y)}:${t.dir}:${num(t.left)}`).join(';');
  const air = (arr: number[]) =>
    arr
      .filter((_, i) => isAir(i % W, Math.floor(i / W)))
      .map((n) => num(n))
      .join(',');
  return [SAVE_V, num(v.climate), num(v.breeze), num(v.humidity), v.vaneUp ? 1 : 0, num(v.nimbus.size), num(v.pondLevel), tools, air(v.temp), air(v.vapour), air(v.cloud), v.snow.map(num).join(','), v.wet.map(num).join(',')].join('|');
}

export function loadValley(text: string): Valley | null {
  const parts = text.split('|');
  if (parts[0] !== SAVE_V || parts.length !== 13) return null;
  const n = (s: string | undefined, lo: number, hi: number) => {
    const x = Number(s);
    return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : null;
  };
  const climate = n(parts[1], -30, 10);
  const breeze = n(parts[2], -0.3, 0.3);
  const humidity = n(parts[3], 0, 1);
  if (climate === null || breeze === null || humidity === null) return null;
  const v = makeValley({ climate, humidity, breeze, vaneUp: parts[4] === '1' });
  v.nimbus.size = n(parts[5], 0.05, 1) ?? 0.6;
  v.pondLevel = n(parts[6], 0.2, 2) ?? 1;
  v.tools = [];
  for (const spec of (parts[7] ?? '').split(';').filter(Boolean)) {
    const [id, x, y, dir, left] = spec.split(':');
    if (!(TOOL_IDS as readonly string[]).includes(id ?? '')) continue;
    const t: Tool = { id: id as ToolId, x: n(x, 0, W) ?? 1, y: n(y, 0, H) ?? 1, dir: dir === '-1' ? -1 : 1, left: n(left, 0, 1) ?? 1 };
    if (!v.tools.some((o) => o.id === t.id)) v.tools.push(t);
  }
  const fill = (target: number[], csv: string | undefined, lo: number, hi: number) => {
    const vals = (csv ?? '').split(',');
    let k = 0;
    for (let i = 0; i < W * H; i++) {
      if (!isAir(i % W, Math.floor(i / W))) continue;
      const x = n(vals[k++], lo, hi);
      if (x === null) return false;
      target[i] = x;
    }
    return k === vals.length;
  };
  if (!fill(v.temp, parts[8], -40, 60) || !fill(v.vapour, parts[9], 0, 6) || !fill(v.cloud, parts[10], 0, 6)) return null;
  const cols = (csv: string | undefined) => (csv ?? '').split(',').map((s) => n(s, 0, 3) ?? 0);
  const snow = cols(parts[11]);
  const wet = cols(parts[12]);
  if (snow.length !== W || wet.length !== W) return null;
  v.snow = snow;
  v.wet = wet;
  return v;
}

/** Where the ground air is cold enough to freeze the pond (for drawing ice). */
export const pondIce = (v: Valley) => (PLACES.pond as readonly number[]).filter((x) => v.temp[idx(x, lowAir(x))]! < 0);
