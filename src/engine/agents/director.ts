import { Priority } from '../scheduler';
import { weightedPick, type Rng } from '../rng';
import type { EventType, WorldEvent } from '../events';
import type { ActorId } from '../types';
import type { World, WorldPlugin } from '../world';
import { AgentMemory, PropLocks, freshNeeds, growNeeds, regardOf, satisfy, score } from './model';
import type { AgentDef, GoalControl, GoalDef, NeedKey, Needs, Perception } from './types';

export interface AgentDirectorOptions {
  /** How often agents reconsider (ms). Decisions are discrete, not per-frame. */
  evalMs?: number;
  /** After an incident, the house goes quiet for this long. */
  quietMs?: number;
  /** No incidents while the visitor did something this recently. */
  busyVisitorMs?: number;
  /** Don't start anything for this long after entering a room. */
  settleMs?: number;
  /** Chance of acting at all on an eligible evaluation (keeps it rare). */
  urge?: number;
}

interface Running {
  def: GoalDef;
  startedAt: number;
  listeners: Array<(type: EventType, payload: unknown) => void>;
  ctl: GoalControl;
}

/**
 * The agent director: every so often it looks at the room, lets characters
 * with something on their mind pick a goal (weighted by need and appeal,
 * seeded), and runs it as a scheduler reaction on that character's channel.
 * One incident at a time, quiet periods after, nothing while you're busy,
 * everything cancelled when you leave the room.
 */
export class AgentDirector implements WorldPlugin {
  readonly locks = new PropLocks();
  readonly memory = new AgentMemory();
  private agents = new Map<ActorId, AgentDef>();
  private goals: GoalDef[] = [];
  private needs = new Map<ActorId, Needs>();
  private running = new Map<string, Running>();
  private cooldowns = new Map<string, number>();
  private recent: string[] = [];
  private stages = new Map<string, unknown>();
  private lastEval = 0;
  private lastTick = 0;
  private quietUntil = 0;
  private roomSince = 0;
  private enabled = true;
  private readonly o: Required<AgentDirectorOptions>;
  /** Started/finished goals, for tests and the diary. Bounded. */
  readonly log: Array<{ goal: string; at: number; event: 'start' | 'end'; outcome?: string }> = [];

  constructor(
    private rng: Rng,
    opts: AgentDirectorOptions = {},
  ) {
    this.o = {
      evalMs: opts.evalMs ?? 1500,
      quietMs: opts.quietMs ?? 35_000,
      busyVisitorMs: opts.busyVisitorMs ?? 2500,
      settleMs: opts.settleMs ?? 8000,
      urge: opts.urge ?? 0.35,
    };
  }

  addAgents(...defs: AgentDef[]) {
    for (const d of defs) {
      this.agents.set(d.id, d);
      if (!this.needs.has(d.id)) this.needs.set(d.id, freshNeeds(d));
    }
  }

  addGoals(...defs: GoalDef[]) {
    for (const g of defs) if (!this.goals.some((x) => x.id === g.id)) this.goals.push(g);
  }

  /** A room offers a stage (props incidents can move). Returns an unregister. */
  setStage(name: string, api: unknown): () => void {
    this.stages.set(name, api);
    return () => {
      if (this.stages.get(name) === api) this.stages.delete(name);
    };
  }

  setEnabled(on: boolean) {
    this.enabled = on;
  }

  needsOf(id: ActorId): Needs {
    return this.needs.get(id) ?? freshNeeds({ id, growth: {} });
  }

  owner(prop: string) {
    return this.locks.owner(prop);
  }

  goal(id: string): GoalDef | undefined {
    return this.goals.find((g) => g.id === id);
  }

  isRunning(goalId: string) {
    return this.running.has(goalId);
  }

  runningGoals(): string[] {
    return Array.from(this.running.keys());
  }

  /** Is an incident on right now? (Other systems can choose to stay quiet.) */
  incidentActive() {
    for (const r of this.running.values()) if (r.def.kind === 'incident') return true;
    return false;
  }

  // ------------------------------------------------------------- world hooks

  onEvent = (ev: WorldEvent, world: World) => {
    if (ev.type === 'ROOM_ENTERED' || ev.type === 'ROOM_EXITED') {
      this.cancelAll(world);
      this.roomSince = world.clock.now();
      return;
    }
    // running goals hear what the visitor does (interventions)
    for (const r of Array.from(this.running.values())) for (const l of r.listeners) l(ev.type, ev.payload);
  };

  onTick = (now: number, world: World) => {
    const dt = this.lastTick ? Math.min(5000, now - this.lastTick) : 0;
    this.lastTick = now;
    for (const [id, def] of this.agents) this.needs.set(id, growNeeds(this.needsOf(id), def, dt));
    if (now - this.lastEval < this.o.evalMs) return;
    this.lastEval = now;
    this.evaluate(now, world);
  };

  // ------------------------------------------------------------- deciding

  perceive(now: number, world: World): Perception {
    const view = world.view();
    return {
      now,
      room: view.room,
      weather: view.weather,
      reducedMotion: view.reducedMotion,
      idleMs: world.idleFor(now),
      present: (id) => world.actors.isPresent(id),
      busy: (id) => world.scheduler.isBusy(id) || this.locks.owner(`actor:${id}`) !== null,
      owner: (prop) => this.locks.owner(prop),
      flag: (k) => view.flag(k),
      needs: (id) => this.needsOf(id),
      regard: (a, b) => regardOf(this.agents, a, b),
      remembers: (key, within) => this.memory.has(key, now, within),
      stage: <T,>(name: string) => (this.stages.get(name) as T | undefined) ?? null,
    };
  }

  /** Goals that could start now, with their scores. */
  candidates(now: number, world: World): Array<{ goal: GoalDef; weight: number }> {
    const p = this.perceive(now, world);
    const incidentOn = this.incidentActive();
    const visitorBusy = p.idleMs < this.o.busyVisitorMs;
    return this.goals
      .filter((g) => {
        if (!g.rooms.includes(p.room)) return false;
        if (this.running.has(g.id)) return false;
        if ((this.cooldowns.get(g.id) ?? 0) > now) return false;
        if (g.kind === 'incident' && (incidentOn || now < this.quietUntil || visitorBusy)) return false;
        const cast = [g.actor, ...(g.cast ?? [])];
        if (cast.some((a) => !p.present(a) || p.busy(a))) return false;
        if ((g.props ?? []).some((pr) => p.owner(pr) !== null)) return false;
        return g.when ? g.when(p) : true;
      })
      .map((goal) => ({ goal, weight: score(goal, p, this.recent) }))
      .filter((c) => c.weight > 0);
  }

  evaluate(now: number, world: World): string | null {
    if (!this.enabled) return null;
    if (now - this.roomSince < this.o.settleMs) return null;
    const list = this.candidates(now, world);
    if (!list.length) return null;
    // most of the time, nobody bothers: quiet is part of it
    const strongest = Math.max(...list.map((c) => c.weight));
    if (this.rng() > this.o.urge * Math.min(1, 0.4 + strongest)) return null;
    const pick = weightedPick(list.map((c) => ({ item: c.goal, weight: c.weight })), this.rng);
    if (!pick) return null;
    return this.start(pick, world) ? pick.id : null;
  }

  // ------------------------------------------------------------- acting

  /** Start a goal now (tests and debugging can force one). */
  start(def: GoalDef, world: World): boolean {
    const owner = `goal:${def.id}`;
    const cast = (def.cast ?? []).map((a) => `actor:${a}`);
    if (!this.locks.acquire(owner, [...(def.props ?? []), ...cast])) return false;
    const now = world.clock.now();
    let finished = false;
    const running: Running = { def, startedAt: now, listeners: [], ctl: null as unknown as GoalControl };

    const finish = () => {
      if (finished) return;
      finished = true;
      this.locks.release(owner);
      this.running.delete(def.id);
      const at = world.clock.now();
      this.cooldowns.set(def.id, at + def.cooldownMs);
      if (def.kind === 'incident') this.quietUntil = at + this.o.quietMs;
      this.log.push({ goal: def.id, at, event: 'end', outcome: running.ctl.outcome });
      if (this.log.length > 60) this.log.shift();
      world.emit('OBJECT_STATE_CHANGED', { target: `agent:${def.id}`, key: 'end', value: running.ctl.outcome || 'done' });
    };

    const result = world.scheduler.schedule({
      id: `agent:${def.id}`,
      channel: def.actor,
      priority: def.priority ?? (def.kind === 'incident' ? Priority.CHARACTER : Priority.AMBIENT),
      durationMs: def.durationMs,
      ambient: def.kind === 'ambient',
      run: (rc) => {
        const ctl: GoalControl = {
          after: (ms, fn) => rc.after(ms, fn),
          get cancelled() {
            return rc.cancelled || finished;
          },
          done: (outcome) => {
            if (outcome) ctl.outcome = outcome;
            world.scheduler.cancelChannel(def.actor);
          },
          rng: this.rng,
          actors: world.actors,
          effects: world.effects,
          emit: (type, payload) => world.emit(type, payload),
          remember: (key, detail) => this.memory.add(key, world.clock.now(), detail),
          satisfy: (id, need: NeedKey, delta) => this.needs.set(id, satisfy(this.needsOf(id), need, delta)),
          stage: <T,>(name: string) => (this.stages.get(name) as T | undefined) ?? null,
          onEvent: (fn) => running.listeners.push(fn),
          outcome: '',
        };
        running.ctl = ctl;
        this.running.set(def.id, running);
        this.recent.push(def.id);
        if (this.recent.length > 8) this.recent.shift();
        this.log.push({ goal: def.id, at: now, event: 'start' });
        // acting on a need eases it a little straight away
        for (const k of def.answers) ctl.satisfy(def.actor, k, -0.25);
        let cleanup: void | (() => void);
        try {
          cleanup = def.start(ctl);
        } catch (err) {
          finish();
          throw err;
        }
        return () => {
          try {
            if (typeof cleanup === 'function') cleanup();
          } finally {
            finish();
          }
        };
      },
    });
    if (result !== 'started' && result !== 'preempted') {
      this.locks.release(owner);
      return false;
    }
    return true;
  }

  cancel(goalId: string, world: World) {
    const r = this.running.get(goalId);
    if (r && world.scheduler.activeOn(r.def.actor) === `agent:${goalId}`) world.scheduler.cancelChannel(r.def.actor);
  }

  cancelAll(world: World) {
    for (const id of Array.from(this.running.keys())) this.cancel(id, world);
    // anything left over (shouldn't be) is dropped; its locks go with it
    for (const id of Array.from(this.running.keys())) this.locks.release(`goal:${id}`);
    this.running.clear();
  }
}
