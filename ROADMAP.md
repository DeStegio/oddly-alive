# Roadmap

Phase numbers follow the master plan (`oddly-alive-master-plan.txt`).

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Research & creative foundation (docs) | done |
| 1 | Vite/React/TS strict, lint, router, tokens, shell, tests, error boundary | planned |
| 2 | Living Room visual prototype, characters, first pointer reactions | planned |
| 3 | Core interaction engine (bus, registry, scheduler, RNG, cooldowns) | planned |
| 4 | Personality engine (variables, moods, expressions) | planned |
| 5 | Living Room expansion (25 verified behaviors, first secrets) | planned |
| 6 | Playground (Matter.js, stacking, chains, reset) | planned |
| 7 | Mood Room (weather = mood, contextual objects) | planned |
| 8 | Secrets, Secret Space, surprise director | planned |
| 9 | Memory, return visits, Memory Room, reset controls | planned |
| 10 | After Hours | planned |
| 11 | Advanced combinations, cross-room chains | planned |
| 12 | Sound, motion, polish | planned |
| 13 | Shareability (seeds, links, postcards) | planned |
| 14 | QA, E2E, accessibility, performance | planned |
| 15 | README, deployment | planned |

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
