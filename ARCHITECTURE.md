# Architecture

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| UI | React 18 + Vite + TypeScript (strict) | fast dev loop, typed throughout |
| Styling | CSS Modules + global token sheet | art-directed per-room CSS without utility soup |
| Animation | CSS transitions/keyframes driven by data attributes + a tiny rAF spring helper | high-frequency motion stays out of React; no second animation library needed |
| Shared state | Zustand (one store, sliced selectors) | low-frequency world state shared by six rooms |
| Physics | Matter.js, **Playground only**, lazy-loaded | stacking and collisions genuinely need a solver |
| Routing | React Router (hash router) | static hosting (GitHub Pages) with no server rewrites |
| Tests | Vitest + Testing Library (jsdom), Playwright E2E | |
| Audio | Web Audio API, synthesized at runtime | no audio files, nothing licensed, opt-in |

No backend, accounts, analytics or 3D.

## Data flow

```
 DOM input ──► useWorldInput / object handlers
                    │  emit(WorldEvent)
                    ▼
              ┌───────────┐
              │ Event Bus │  typed discriminated union
              └─────┬─────┘
        ┌───────────┼──────────────┬───────────────┐
        ▼           ▼              ▼               ▼
  Personality   Behavior       Discovery       Memory
  Engine        Engine         Registry        Manager
  (vars→mood)   (registry →    (secrets)       (versioned
        │        eligible →        │            localStorage)
        │        weighted pick)    │
        ▼           ▼              ▼
     World Store ◄─ Reaction Scheduler (priority, channel, cooldown, cancel)
        │                │
        ▼                ▼
  React (low-freq)   Actor channel  ──►  characters/props apply commands
                     (imperative, no global re-render)
                            ▲
                     Surprise Director (rare events, novelty, ticks)
```

## Modules (`src/engine`)

1. **events.ts** — `WorldEvent` discriminated union; each `type` has its own
   strongly typed payload. Helper `makeEvent`.
2. **bus.ts** — `EventBus` with `on(type, handler)`, `onAny`, `emit`; returns
   unsubscribe functions; handler errors are isolated.
3. **rng.ts** — seeded Mulberry32, `weightedPick`, `shuffle`, string → seed hash.
4. **clock.ts** — injectable clock (`now`, `setTimeout`, `clearTimeout`) so the
   scheduler and personality are deterministic in tests.
5. **scheduler.ts** — `ReactionScheduler`. A reaction declares `channel`
   (usually an actor id), `priority`, `durationMs`, optional `cooldownKey`,
   `start()` returning a cleanup. One reaction per channel; higher or equal
   priority preempts and runs the previous cleanup; lower priority is dropped.
   Global cap on concurrent ambient reactions. `cancelAll` on reset/room exit.
6. **behaviors.ts / registry.ts** — `Behavior` = `{ id, on: EventType[],
   rooms, priority, weight(ctx), cooldownMs, when(ctx, ev), react(ctx, ev) }`.
   The registry indexes behaviors by event type.
7. **behaviorEngine.ts** — on each event: candidates → predicate → cooldown →
   recent-reaction suppression (weight × 0.2 for the last N ids) → seeded
   weighted pick per priority band → schedule.
8. **personality.ts** — pure functions: `applyEvent(state, ev)`,
   `decay(state, dtMs, ctx)`, `deriveMood(state, ctx)` with hysteresis and a
   minimum dwell time. Six bounded variables (`curiosity, energy, trust,
   mischief, stimulation, fatigue`) plus two fast-decaying signals
   (`repetition`, `confusion`).
9. **surpriseDirector.ts** — rare-event table with room filter, min interval,
   per-session limits and novelty weighting.
10. **memory.ts** — schema v2, migration from v1, validation, corruption →
    safe defaults, storage failures swallowed and reported.
11. **audio.ts** — opt-in synth (voices per character, pops, chimes, night pad).
12. **actors.ts** — imperative command channel: `actors.send('pim',
    { type: 'expression', value: 'shy', durationMs: 1500 })`.
13. **world.ts** — wires everything together once (`createWorld()`), owns the
    500 ms world tick, idle detection and page-visibility suspension.

## React layer (`src`)

- `app/` — router, shell, error boundary, scene transitions.
- `components/` — shared UI (Nav, Settings, Title, ThoughtBubble…).
- `characters/` — SVG characters reading actor commands.
- `rooms/<Room>/` — one folder per room, lazy-loaded.
- `state/store.ts` — Zustand world store.
- `content/` — copy, secrets, thoughts (data, not logic).

## Performance rules

- Pointer position lives in a ref-backed `pointer` singleton, never in React
  state. Eye tracking and springs read it in a shared rAF loop that stops when
  nothing is subscribed or the tab is hidden.
- Store selectors are narrow; mood changes re-render only subscribers.
- Every timer/listener has a matching cleanup on unmount / room exit / reset.
- Particle and physics counts are capped (`limits.ts`).

## Persistence semantics

| Action | Clears |
| --- | --- |
| Reset Session | personality variables, active reactions, current-session counters |
| Reset World | room object states, playground arrangement, transformations, After Hours toggle |
| Clear Local Memory | everything stored in `localStorage` (visits, discoveries, counts, nickname, settings) and the live session |

Shared links carry only a seed, room id and an arrangement — never memory.
