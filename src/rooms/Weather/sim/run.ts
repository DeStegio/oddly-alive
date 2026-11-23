import { STEPS_PER_SECOND, actOn, makeValley, stepValley, type ToolId, type Valley, type ValleyAction } from './valley';

/**
 * Postcards are goals over the valley that must HOLD for a while (the
 * weather has to persist, not flicker through). Some are a sequence of
 * phases that must happen in order. Scripts are timed lists of tool moves,
 * so every postcard can be checked headlessly.
 */
export interface Phase {
  label: string;
  check: (v: Valley) => boolean;
  /** Seconds the check must stay true. */
  hold: number;
}

export interface PostcardSpec {
  climate: number;
  humidity: number;
  vaneUp?: boolean;
  breeze?: number;
  /** Tools on the sill for this postcard. */
  tools: ToolId[];
  nimbus: boolean;
  phases: Phase[];
}

export type Script = Array<[seconds: number, action: ValleyAction]>;

export interface Progress {
  phase: number;
  /** Steps the current phase's check has been true. */
  held: number;
  done: boolean;
}

export const startProgress = (): Progress => ({ phase: 0, held: 0, done: false });

/** Advance a postcard's progress by one step of the valley. */
export function track(spec: PostcardSpec, p: Progress, v: Valley): Progress {
  if (p.done) return p;
  const ph = spec.phases[p.phase]!;
  if (!ph.check(v)) return p.held ? { ...p, held: 0 } : p;
  const held = p.held + 1;
  if (held < Math.round(ph.hold * STEPS_PER_SECOND)) return { ...p, held };
  const next = p.phase + 1;
  return next >= spec.phases.length ? { phase: next, held: 0, done: true } : { phase: next, held: 0, done: false };
}

export const valleyFor = (spec: PostcardSpec) => makeValley({ climate: spec.climate, humidity: spec.humidity, vaneUp: spec.vaneUp ?? true, breeze: spec.breeze ?? 0 });

export function runScript(spec: PostcardSpec, script: Script, seconds: number): { solved: boolean; at: number; v: Valley; phase: number } {
  let v = valleyFor(spec);
  let p = startProgress();
  const queue = [...script].sort((a, b) => a[0] - b[0]);
  const steps = Math.round(seconds * STEPS_PER_SECOND);
  for (let s = 0; s < steps; s++) {
    while (queue.length && queue[0]![0] * STEPS_PER_SECOND <= s) v = actOn(v, queue.shift()![1]);
    v = stepValley(v);
    p = track(spec, p, v);
    if (p.done) return { solved: true, at: (s + 1) / STEPS_PER_SECOND, v, phase: p.phase };
  }
  return { solved: false, at: seconds, v, phase: p.phase };
}
