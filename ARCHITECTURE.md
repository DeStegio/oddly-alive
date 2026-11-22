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
| Reset World | room object states, playground arrangement, transformations, After Hours toggle, garden beds and attic dress-up (letters, almanac, diary and personal bests stay) |
| Clear Local Memory | everything stored in `localStorage` (visits, discoveries, counts, nickname, settings, keepsakes) and the live session |

Shared links carry only a seed, room id and an arrangement — never memory.

## As built (release notes)

The design above held up. A few things were added or changed during
implementation:

| Area | Module | Notes |
| --- | --- | --- |
| Plugins | `World.use({ onEvent, onTick })` | Memory, audio and the surprise director plug in without the world knowing about them. |
| Event queue | `World.emit` | Follow-up events are queued breadth-first and depth-limited (`MAX_EVENT_DEPTH = 4`). |
| Objects | `state/world.ts` | Per-room object slices addressed by string flags (`'living.lampOn'`) and type-checked against defaults. "Reset World" restores them. |
| Memory | `engine/memory.ts`, `app/memorySync.ts`, `state/keepsakes.ts` | Schema v3 (Phase 2) adds `world` keepsakes: garden, letters, weather almanac, a capped diary, personal bests, attic. v1→v2→v3 migration. Schema v2 with v1 migration, validation, an off switch, and a "forgotten" latch so Forget me stays forgotten. Sound is never restored. |
| Surprises | `engine/surpriseDirector.ts` | Rare events gated by activity, minimum interval, room, per-session limits and novelty; behaviors decide how they look. |
| Audio | `engine/audio.ts`, `app/audioSync.ts` | Web Audio synthesis, created only after opt-in; actor-channel observers give characters voices. |
| Sharing | `app/share.ts`, `app/postcard.ts`, `rooms/Playground/share.ts` | Seeded scene variants; links with allow-listed keys; SVG plus canvas postcard. |
| Line variety | `behaviors/helpers.ts` `pickLine` | Characters don't repeat a line while fresher ones exist. |
| Loading | `app/App.tsx` | Rooms are code-split, then prefetched when idle (physics last). |

### Phase 2 additions

| Area | Module | Notes |
| --- | --- | --- |
| Weather | `engine/weather.ts`, `app/weatherSync.ts`, `components/WeatherLayer.tsx` | Mood → weather map plus a 3-minute pin; `WEATHER_CHANGED`; `html[data-weather]`; CSS-only particles. |
| Keepsakes | `state/keepsakes.ts` | Memory v3 `world`: garden, letters, almanac, diary, records, attic. |
| Flights | `rooms/Playground/flight.ts` | Ballistics between the trays, Bip's landing prediction, lobs. |
| Garden | `rooms/Garden/growth.ts`, `rooms/Garden/gardenSim.ts` | Pure growth model; seeds, droplets and thrown crops (Phase 2.1). |
| Attic | `rooms/Attic/pile.ts`, `rooms/Attic/spin.ts` | Matter.js pile with bursting boxes; hand-spun gramophone tempo (Phase 2.1). |
| Letters | `content/letters.ts`, `app/letters.ts` | `findLetter` keeps, notes, announces; finale in After Hours. |
| Watchers | `app/watchers.ts` | Night Owl, Tourist, Homebody. |
| Voice | `VOICE.md`, `content/__tests__/copy.test.ts` | |

Behavior files: `character.ts` (moods, idle, tab return), `living.ts`,
`playground.ts`, `mood.ts`, `secret.ts`, `rare.ts`, `memory.ts`,
`night.ts`, `combos.ts` (cross-room chains and multi-character gags).
