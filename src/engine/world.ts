import type { RoomId } from '../app/rooms';
import { isReducedMotion, useSettings } from '../state/settings';
import { getFlag, setFlag as setObjectFlag } from '../state/world';
import { getWorldState, setWorldState } from '../state/worldStore';
import { actors as defaultActors, type ActorChannel } from './actors';
import {
  BehaviorEngine,
  BehaviorRegistry,
  type AnyBehavior,
  type WorldEffects,
  type WorldView,
} from './behaviorEngine';
import { EventBus } from './bus';
import { realClock, type Clock } from './clock';
import { MAX_EVENT_DEPTH, makeEvent, type EventPayloads, type EventType, type WorldEvent } from './events';
import { applyEvent, createPersonality, decay, deriveMood, type PersonalityState } from './personality';
import { createRng, randomSeed, type Rng } from './rng';
import { ReactionScheduler } from './scheduler';
import { VAR_KEYS, type PersonalityVars } from './types';

export const IDLE_SHORT_MS = 12_000;
export const IDLE_LONG_MS = 45_000;

export interface WorldOptions {
  clock?: Clock;
  seed?: number;
  tickMs?: number;
  actors?: ActorChannel;
  behaviors?: AnyBehavior[];
  maxAmbient?: number;
}

/** Hooks other modules (discoveries, memory, surprises, audio) plug into. */
export interface WorldPlugin {
  /** Runs after personality/counters, before behaviors. */
  onEvent?: (ev: WorldEvent, world: World) => void;
  onTick?: (now: number, world: World) => void;
}

/**
 * The world wires every engine module together. Event flow:
 * emit → personality → counters → plugins → behaviors → bus listeners.
 * Follow-up events are queued (breadth-first) and depth-limited.
 */
export class World {
  readonly bus = new EventBus();
  readonly registry = new BehaviorRegistry();
  readonly scheduler: ReactionScheduler;
  readonly engine: BehaviorEngine;
  readonly actors: ActorChannel;
  readonly clock: Clock;
  readonly rng: Rng;
  readonly seed: number;
  personality: PersonalityState;

  private plugins: WorldPlugin[] = [];
  private queue: WorldEvent[] = [];
  private draining = false;
  private interval: number | null = null;
  private lastTick: number;
  private idleLevel: 0 | 1 | 2 = 0;
  private recentClicks: Array<{ target: string; at: number }> = [];
  private sessionStart: number;
  private roomEnteredAt: number;
  private readonly tickMs: number;
  private announceSeq = 0;
  private soundHandler: ((name: string) => void) | null = null;

  constructor(opts: WorldOptions = {}) {
    this.clock = opts.clock ?? realClock;
    this.seed = opts.seed ?? randomSeed();
    this.rng = createRng(this.seed);
    this.actors = opts.actors ?? defaultActors;
    this.tickMs = opts.tickMs ?? 500;
    this.scheduler = new ReactionScheduler(this.clock, { maxAmbient: opts.maxAmbient ?? 3 });
    const now = this.clock.now();
    this.lastTick = now;
    this.sessionStart = now;
    this.roomEnteredAt = now;
    this.personality = createPersonality(now);
    if (opts.behaviors) this.registry.register(...opts.behaviors);
    this.engine = new BehaviorEngine({
      registry: this.registry,
      scheduler: this.scheduler,
      rng: this.rng,
      actors: this.actors,
      effects: this.effects,
      view: () => this.view(),
      now: () => this.clock.now(),
      emit: (type, payload, parent) => this.emit(type, payload, parent.depth + 1),
    });
  }

  use(plugin: WorldPlugin): () => void {
    this.plugins.push(plugin);
    return () => {
      this.plugins = this.plugins.filter((p) => p !== plugin);
    };
  }

  setSoundHandler(fn: ((name: string) => void) | null) {
    this.soundHandler = fn;
  }

  /** Restore persisted trust etc. without emitting. */
  restore(trust: number | undefined) {
    this.personality = createPersonality(this.clock.now(), trust);
    this.syncStore(true);
  }

  // ---------------------------------------------------------------- events

  emit<T extends EventType>(type: T, payload: EventPayloads[T], depth = 0): void {
    if (depth > MAX_EVENT_DEPTH) return;
    const ev = makeEvent(type, payload, { room: getWorldState().room, timestamp: this.clock.now(), depth }) as WorldEvent;
    this.queue.push(ev);
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length) {
        const next = this.queue.shift() as WorldEvent;
        this.process(next);
      }
    } finally {
      this.draining = false;
    }
  }

  private process(ev: WorldEvent) {
    const prevInputAt = this.personality.lastInputAt;
    this.personality = applyEvent(this.personality, ev);
    const wasInput = this.personality.lastInputAt !== prevInputAt;
    if (wasInput && this.idleLevel > 0 && ev.type !== 'USER_ACTIVE') {
      this.idleLevel = 0;
      this.emit('USER_ACTIVE', { idleMs: ev.timestamp - prevInputAt });
    }

    if (ev.type === 'OBJECT_CLICKED') {
      const target = ev.payload.target;
      this.recentClicks.push({ target, at: ev.timestamp });
      if (this.recentClicks.length > 64) this.recentClicks.shift();
      setWorldState((s) => ({ counts: { ...s.counts, [target]: (s.counts[target] ?? 0) + 1 } }));
    }
    setWorldState((s) => ({ eventTotals: { ...s.eventTotals, [ev.type]: (s.eventTotals[ev.type] ?? 0) + 1 } }));

    for (const p of this.plugins) {
      try {
        p.onEvent?.(ev, this);
      } catch (err) {
        if (import.meta.env.DEV) console.error('[world] plugin failed', err);
      }
    }
    this.engine.handle(ev);
    this.bus.emit(ev);
  }

  // ------------------------------------------------------------------ time

  tick(now = this.clock.now()) {
    const dt = Math.max(0, Math.min(5000, now - this.lastTick));
    this.lastTick = now;
    const before = this.personality.mood;
    this.personality = decay(this.personality, dt, now);
    this.personality = deriveMood(this.personality, { now, afterHours: useSettings.getState().afterHours });
    if (this.personality.mood !== before) {
      this.emit('MOOD_CHANGED', { from: before, to: this.personality.mood });
    }
    const idleMs = now - this.personality.lastInputAt;
    if (this.idleLevel === 0 && idleMs >= IDLE_SHORT_MS) {
      this.idleLevel = 1;
      this.emit('USER_IDLE', { ms: idleMs, level: 'short' });
    } else if (this.idleLevel === 1 && idleMs >= IDLE_LONG_MS) {
      this.idleLevel = 2;
      this.emit('USER_IDLE', { ms: idleMs, level: 'long' });
    }
    for (const p of this.plugins) {
      try {
        p.onTick?.(now, this);
      } catch (err) {
        if (import.meta.env.DEV) console.error('[world] tick plugin failed', err);
      }
    }
    this.syncStore();
  }

  private syncStore(force = false) {
    const s = getWorldState();
    const patch: Partial<ReturnType<typeof getWorldState>> = {};
    if (s.mood !== this.personality.mood) {
      patch.mood = this.personality.mood;
      if (!s.moodsSeen.includes(this.personality.mood)) patch.moodsSeen = [...s.moodsSeen, this.personality.mood];
    }
    const changed = force || VAR_KEYS.some((k) => Math.abs(s.vars[k] - this.personality.vars[k]) > 0.02);
    if (changed) patch.vars = { ...this.personality.vars };
    if (Object.keys(patch).length) setWorldState(patch);
  }

  start() {
    if (this.interval !== null || typeof window === 'undefined') return;
    this.lastTick = this.clock.now();
    this.interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') this.tick();
    }, this.tickMs);
  }

  stop() {
    if (this.interval !== null) window.clearInterval(this.interval);
    this.interval = null;
    this.scheduler.cancelAll();
  }

  // ----------------------------------------------------------------- rooms

  enterRoom(room: RoomId) {
    const s = getWorldState();
    const from = s.room;
    const now = this.clock.now();
    if (from === room && s.roomVisits[room]) return;
    if (s.roomVisits[from]) this.emit('ROOM_EXITED', { room: from, dwellMs: now - this.roomEnteredAt });
    // reactions belong to the room they started in
    this.scheduler.cancelAll((spec) => spec.priority < 50);
    for (const id of this.actors.presentActors()) this.actors.send(id, { type: 'reset' });
    const visits = (s.roomVisits[room] ?? 0) + 1;
    setWorldState({ room, lastRoom: room, roomVisits: { ...s.roomVisits, [room]: visits } });
    this.roomEnteredAt = now;
    this.emit('ROOM_ENTERED', { room, from: s.roomVisits[from] ? from : null, visits });
  }

  /** Escape: cancel non-essential effects immediately. */
  calm() {
    this.scheduler.cancelAll((spec) => spec.priority < 50);
    for (const id of this.actors.presentActors()) this.actors.send(id, { type: 'reset' });
  }

  // ------------------------------------------------------------------ view

  view(): WorldView {
    const s = getWorldState();
    const now = this.clock.now();
    return {
      room: s.room,
      mood: this.personality.mood,
      vars: this.personality.vars,
      afterHours: useSettings.getState().afterHours,
      reducedMotion: isReducedMotion(),
      visits: s.visits,
      sessionMs: now - this.sessionStart,
      count: (target) => s.counts[target] ?? 0,
      recent: (target, windowMs) => this.recentClicks.filter((c) => c.target === target && now - c.at <= windowMs).length,
      discovered: (secret) => secret in s.discoveries,
      discoveredCount: () => Object.keys(s.discoveries).length,
      roomVisits: (room) => s.roomVisits[room] ?? 0,
      flag: (key) => getFlag(key),
    };
  }

  readonly effects: WorldEffects = {
    setFlag: (key, value) => setObjectFlag(key, value),
    discover: (secret) => this.discoverHandler?.(secret),
    nudge: (delta: Partial<PersonalityVars>) => {
      const vars = { ...this.personality.vars };
      for (const k of VAR_KEYS) {
        const d = delta[k];
        if (d !== undefined) vars[k] = Math.max(0, Math.min(1, vars[k] + d));
      }
      this.personality = { ...this.personality, vars };
    },
    announce: (text) => setWorldState({ caption: { id: ++this.announceSeq, text } }),
    sound: (name) => this.soundHandler?.(name),
  };

  /** Set by the discovery registry. */
  discoverHandler: ((secret: string) => void) | null = null;

  idleFor(now = this.clock.now()) {
    return now - this.personality.lastInputAt;
  }

  /** Reset personality and transient reactions (keeps memory and objects). */
  resetSession() {
    this.calm();
    this.engine.resetHistory();
    this.scheduler.clearCooldowns();
    this.recentClicks = [];
    this.idleLevel = 0;
    this.emit('WORLD_RESET', { scope: 'session' });
    this.calm();
    setWorldState({ counts: {}, moodsSeen: [this.personality.mood] });
    this.syncStore(true);
  }
}
