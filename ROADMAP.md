# Roadmap

Phase numbers follow the master plan (`oddly-alive-master-plan.txt`).

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Research & creative foundation (docs) | done |
| 1 | Vite/React/TS strict, lint, router, tokens, shell, tests, error boundary | done |
| 2 | Living Room visual prototype, characters, first pointer reactions | done |
| 3 | Core interaction engine (bus, registry, scheduler, RNG, cooldowns) | done |
| 4 | Personality engine (variables, moods, expressions) | done |
| 5 | Living Room expansion (25 verified behaviors, first secrets) | done |
| 6 | Playground (Matter.js, stacking, chains, reset) | done |
| 7 | Mood Room (weather = mood, contextual objects) | done |
| 8 | Secrets, Secret Space, surprise director | done |
| 9 | Memory, return visits, Memory Room, reset controls | done |
| 10 | After Hours | done |
| 11 | Advanced combinations, cross-room chains | done |
| 12 | Sound, motion, polish | done |
| 13 | Shareability (seeds, links, postcards) | done |
| 14 | QA, E2E, accessibility, performance | done |
| 15 | README, deployment | done |

## Phase 2 — "The House Has a Story"

Planned and tracked in `PHASE_2_PLAN.md` (steps, branches, progress log).

| Step | Scope | Status |
| --- | --- | --- |
| 0 | Playground volleyball with Bip, Field Notes, refresh fix, clearer clicks | done |
| 1–2 | Voice guide (`VOICE.md`), copy lint, copy pass | done |
| 3 | Memory schema v3 keepsakes | done |
| 4–5 | House-wide weather; Mood Room barometer, almanac, Nimbus visits | done |
| 6 | Navigation for eight rooms | done |
| 7 | The Garden | done |
| 8 | The Attic | done |
| 9 | Great-Aunt Pim's letters and the rooftop finale | done |
| 10 | Deeper discoveries, layered hints, cabinet by room | done |
| 11 | Glue between rooms | done |
| 12 | QA and docs | done |

## Phase 3 — "The House Has a Mind of Its Own" (+ Infinite Rooms)

Planned and tracked in `PHASE_3_REFINED_PLAN.md`.

| Step | Scope | Status |
| --- | --- | --- |
| 3.0 | Baseline + refined plan | done |
| 3.1 | Agent autonomy engine | done |
| 3.2 | The button that fights back | done |
| 3.3 | Living Room social incidents | done |
| 3.4 | Infinite Rooms | done |
| 3.5 | Back-Fence Volley | done |
| 3.6 | Garden ecosystem | done |
| 3.7 | Attic shadow theatre | done |
| 3.8 | Reactive atmospheres | done |
| 3.9 | Cross-room continuity | done |
| 3.10–3.11 | Polish, QA, release | done |

## Phase 1 implementation plan

1. `npm create vite` equivalent by hand (React + TS), strict `tsconfig`.
2. ESLint (flat config, typescript-eslint, react-hooks) + Prettier.
3. Tokens in `src/styles/tokens.css`, global reset, self-hosted fonts.
4. Hash router with six room routes, lazy-loaded; shell with nav + settings.
5. Error boundary per scene; Suspense fallback that is in-character.
6. Vitest + Testing Library + Playwright config and one smoke test each.

## Risks

| Risk | Mitigation |
| --- | --- |
| Becoming a pile of unrelated tricks | every behavior goes through the bus → engine; catalog review question list |
| Visual overload | scheduler caps concurrent ambient reactions; restraint palette rule |
| Re-render storms from pointer/physics | ref-based pointer, shared rAF loop, narrow selectors |
| Leaked timers between rooms | scheduler `cancelAll` on room exit; tests assert cleanup |
| Physics instability on mobile | body cap, sleeping bodies, fixed timestep, reset |
| Storage corruption | versioned schema, validation, safe defaults, try/catch |
| Accessibility regressions | keyboard alternatives listed per behavior, E2E keyboard flows |
| Claims we can't verify (FPS, user delight) | report only measured things; UX targets listed as hypotheses |

## Phase 4 — "Rules You Can Discover"

Planned and tracked in `PHASE_4_REFINED_PLAN.md` (baseline, laws, steps, L8
numbers, critiques, honest limits).

| Step | Scope | Status |
| --- | --- | --- |
| 4.0 | Audit, plan, baseline screenshots, art kit, stage layout | done |
| 4.1 | Garden: pure sim, 12 solver-checked commissions, rewind by day track, Herbarium, free play, "ask me something" | done |
| 4.2 | Weather Workshop: atmosphere sim, 7 tools, 10 postcards, barometer as gauge, idle mode = house weather | done |
| 4.3 | Attic: "What Marguerite Forgot", Memory Board, evidence, 3 acts, trunk, fairness tests | done |
| 4.4 | Cross-room links (barrel, pressed flower, house weather, vignettes) + memory tests | done |
| 4.5 | Art pass: compact tags everywhere, weather grading, grain, contact shadows | done (partial on the older rooms; see the plan's honest limits) |
| 4.6 | Hints, copy, a11y, perf, full e2e, docs, release | done |
