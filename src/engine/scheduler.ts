import type { Clock } from './clock';

/** Higher number wins. Mirrors the brief's priority order. */
export const Priority = {
  RARE: 10,
  AMBIENT: 20,
  CHARACTER: 30,
  DIRECT: 40,
  SAFETY: 50,
} as const;
export type PriorityLevel = (typeof Priority)[keyof typeof Priority];

export interface ReactionControl {
  /** setTimeout that is automatically cleared if the reaction is cancelled. */
  after(ms: number, fn: () => void): void;
  readonly cancelled: boolean;
}

export interface ReactionSpec {
  /** Usually the behavior id. */
  id: string;
  /** One reaction per channel at a time (usually an actor id). */
  channel: string;
  priority: PriorityLevel;
  durationMs: number;
  cooldownKey?: string;
  cooldownMs?: number;
  /** Ambient reactions count toward the concurrent-ambient cap. */
  ambient?: boolean;
  /**
   * Start the reaction. May return a cleanup that runs on finish or cancel.
   * Cleanups must restore anything the reaction changed.
   */
  run: (ctl: ReactionControl) => void | (() => void);
}

export type ScheduleResult = 'started' | 'preempted' | 'dropped' | 'cooldown' | 'capped';

interface Active {
  spec: ReactionSpec;
  startedAt: number;
  endTimer: number;
  timers: Set<number>;
  cleanup: (() => void) | void;
  ctl: { cancelled: boolean };
}

export interface SchedulerOptions {
  maxAmbient?: number;
  onError?: (err: unknown) => void;
}

/**
 * Runs reactions with priorities, per-channel exclusivity, cooldowns, a cap on
 * concurrent ambient effects, and guaranteed cleanup on finish/cancel.
 */
export class ReactionScheduler {
  private active = new Map<string, Active>();
  private cooldowns = new Map<string, number>();
  private readonly maxAmbient: number;
  private readonly onError: (err: unknown) => void;
  readonly log: Array<{ id: string; result: ScheduleResult; at: number }> = [];

  constructor(
    private clock: Clock,
    opts: SchedulerOptions = {},
  ) {
    this.maxAmbient = opts.maxAmbient ?? 3;
    this.onError =
      opts.onError ??
      ((err) => {
        if (import.meta.env.DEV) console.error('[scheduler]', err);
      });
  }

  isCooling(key: string): boolean {
    const until = this.cooldowns.get(key);
    if (until === undefined) return false;
    if (until <= this.clock.now()) {
      this.cooldowns.delete(key);
      return false;
    }
    return true;
  }

  setCooldown(key: string, ms: number) {
    this.cooldowns.set(key, this.clock.now() + ms);
  }

  isBusy(channel: string): boolean {
    return this.active.has(channel);
  }

  activeOn(channel: string): string | null {
    return this.active.get(channel)?.spec.id ?? null;
  }

  activeCount(): number {
    return this.active.size;
  }

  ambientCount(): number {
    let n = 0;
    for (const a of this.active.values()) if (a.spec.ambient) n++;
    return n;
  }

  schedule(spec: ReactionSpec): ScheduleResult {
    const result = this.tryStart(spec);
    this.log.push({ id: spec.id, result, at: this.clock.now() });
    if (this.log.length > 100) this.log.shift();
    return result;
  }

  private tryStart(spec: ReactionSpec): ScheduleResult {
    const key = spec.cooldownKey ?? spec.id;
    if (spec.cooldownMs && this.isCooling(key)) return 'cooldown';

    const current = this.active.get(spec.channel);
    if (current && current.spec.priority > spec.priority) return 'dropped';
    if (spec.ambient && !current && this.ambientCount() >= this.maxAmbient) return 'capped';

    // Direct input outranks ambience everywhere: clear ambient effects.
    if (spec.priority >= 40) {
      for (const [ch, a] of Array.from(this.active)) {
        if (ch !== spec.channel && a.spec.priority <= 20) this.cancelChannel(ch);
      }
    }

    let result: ScheduleResult = 'started';
    if (current) {
      this.cancelChannel(spec.channel);
      result = 'preempted';
    }
    if (spec.cooldownMs) this.cooldowns.set(key, this.clock.now() + spec.cooldownMs);

    const ctl = { cancelled: false };
    const timers = new Set<number>();
    const control: ReactionControl = {
      after: (ms, fn) => {
        const h = this.clock.setTimeout(() => {
          timers.delete(h);
          if (!ctl.cancelled) this.safe(fn);
        }, ms);
        timers.add(h);
      },
      get cancelled() {
        return ctl.cancelled;
      },
    };
    const entry: Active = {
      spec,
      startedAt: this.clock.now(),
      endTimer: 0,
      timers,
      cleanup: undefined,
      ctl,
    };
    this.active.set(spec.channel, entry);
    entry.endTimer = this.clock.setTimeout(() => this.finish(spec.channel, entry), spec.durationMs);
    try {
      entry.cleanup = spec.run(control);
    } catch (err) {
      this.onError(err);
      this.finish(spec.channel, entry);
      return 'dropped';
    }
    return result;
  }

  private finish(channel: string, entry: Active) {
    if (this.active.get(channel) !== entry) return;
    this.teardown(entry);
    this.active.delete(channel);
  }

  private teardown(entry: Active) {
    entry.ctl.cancelled = true;
    this.clock.clearTimeout(entry.endTimer);
    for (const t of entry.timers) this.clock.clearTimeout(t);
    entry.timers.clear();
    if (typeof entry.cleanup === 'function') this.safe(entry.cleanup);
    entry.cleanup = undefined;
  }

  cancelChannel(channel: string): boolean {
    const entry = this.active.get(channel);
    if (!entry) return false;
    this.active.delete(channel);
    this.teardown(entry);
    return true;
  }

  /** Cancel everything matching the filter (default: all). */
  cancelAll(filter?: (spec: ReactionSpec) => boolean): number {
    let n = 0;
    for (const [ch, entry] of Array.from(this.active)) {
      if (!filter || filter(entry.spec)) {
        this.active.delete(ch);
        this.teardown(entry);
        n++;
      }
    }
    return n;
  }

  clearCooldowns() {
    this.cooldowns.clear();
  }

  private safe(fn: () => void) {
    try {
      fn();
    } catch (err) {
      this.onError(err);
    }
  }
}
