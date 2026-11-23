# Testing

Everything below was run and observed during development. Numbers are from
the last full run before release. They come from one Windows 11 laptop, headless
Chromium 131 (Playwright 1.49), and Node 22.16.

## Commands

```bash
npm run typecheck   # tsc -b, strict
npm run lint        # eslint (typescript-eslint, react-hooks)
npm test            # vitest (unit, integration and component tests)
npm run e2e         # playwright: builds, serves the production build, runs desktop + mobile
npm run check       # typecheck + lint + unit tests
```

## Results (last run: Phase 4 release, 2026-11-23)

| Suite | Result |
| --- | --- |
| TypeScript (strict, `noUncheckedIndexedAccess`) | 0 errors |
| ESLint | 0 errors, 7 warnings (fast-refresh export notes, one hook-deps note) |
| Vitest | 394 tests in 43 files, all passing |
| Playwright (Desktop Chrome 1440×900 + Pixel 7) | 112 passed, 10 skipped by design (desktop-only probes, the opt-in screenshot spec), 0 failed; one retry is configured and none was needed in the last run |
| axe-core (WCAG 2 A/AA, serious and critical) | 0 violations in all eight rooms, desktop and mobile |

Phase 4 added (and is covered by): the garden simulation and all twelve
commissions (`rooms/Garden/sim/sim.test.ts`: rules one at a time,
determinism, rewind = restore, stored solutions, idling and naive attempts
fail, blind random play < 8 %); the valley (`rooms/Weather/sim/valley.test.ts`:
rules one at a time, 10 000 random steps stay finite and bounded, every
postcard script works, idling and naive scripts don't); the attic mystery
(`rooms/Attic/mystery/mystery.test.ts`: fairness of the clue graph, group
confirmation, nothing names a wrong pin, a full headless playthrough);
cross-room links and memory (`app/links.test.tsx`); e2e that plays the
rooms through the UI (`e2e/garden.spec.ts`, `weather.spec.ts`,
`attic.spec.ts`) and the L8 first-minute timings (`e2e/firstminute.spec.ts`).

## What the unit and integration tests cover

- **Engine** (`src/engine/__tests__/core.test.ts`): typed event bus and error isolation, seeded RNG determinism, weighted-pick boundaries (zero, negative and NaN weights, extremes), and the scheduler. Scheduler cases are: completion and cleanup, priority preemption and dropping, cooldowns, the ambient cap, direct input cancelling ambience, cancelled timers never firing, and throwing reactions not leaking. Behavior engine cases are: room, predicate and cooldown filters, per-group weighted picks with recent-repeat suppression, determinism per seed, priority ordering, chance gates, and chained events.
- **Personality** (`personality.test.ts`): bounds, annoyance and recovery, curiosity from varied play, excitement that wears off, sleepiness when ignored, trust growing into affection, dwell-time hysteresis, the After Hours bias, Mood Room objects, room-hopping confusion, and reset semantics.
- **World** (`world.test.ts`): end-to-end event → mood → reaction, idle and active thresholds, sleeping and waking, counters, room changes cancelling reactions, mood continuity across rooms, the bound on event depth, and session reset.
- **Rooms and behaviors**: Living Room (13 scenarios), Playground physics (ball rolling into dominoes in both orientations, bounds and rest, body cap, momentum, buoyancy, stacking, reset and serialize, the bin) plus component and share encoding, Mood Room (nap combination, mirror wink, cross-room continuity, mood-specific answers, forecast is words), Secret Space and the surprise director (warm-up, interval, idle gating, per-session limits, novelty, determinism), After Hours (constellations by keyboard, toggles, manual night switch), and combinations (mood-gated transformation, gossip across rooms, the lamp noticed upstairs, arguing, line repetition control, first-minute hint).
- **Memory** (`memory.test.ts`): fresh, restore and v1→v2 migration, corrupt JSON and unknown shapes, validation that strips junk and enforces bounds, quota and security errors, the off switch, nicknames, one visit counted per tab session, persistence across visits, the third-visit surprise, never storing pointer or typing data, and Forget me (including the regression where a store update re-saved immediately after forgetting).
- **Audio** (`audio.test.ts`): silent until enabled, throttling, graceful without Web Audio.
- **Share** (`app/share.test.ts`): link round-trip, only allowed keys, hostile input rejected, reproducible seed variants, postcards that are deterministic, well-formed, and contain nothing personal.

## End-to-end flows (`e2e/`)

- every room renders with no console errors and no horizontal overflow (desktop and mobile)
- first minute: lamp, button, Pim, typing `hello` → discovery toast
- keyhole → golden key appears in the Playground
- keyboard only: skip link, operating a character, nav, pushing a shape with the arrows
- memory survives a reload; Forget me empties storage
- Playground: drop, shake, reset
- After Hours: the manual switch themes the whole house; five stars make a constellation
- reduced motion follows the OS and can be toggled
- a shared link reproduces the scene seed and carries no memory
- navigation works mid-reaction
- axe-core audit of all six rooms

## Performance (measured, not promised)

`e2e/perf.spec.ts` drives the Living Room with 50 synthetic pointer moves. It
compares frame pacing with a blank page under the same input. Tracing is
disabled for this spec, because Playwright's trace screencast alone halved the
frame rate in an earlier run.

| Measurement (headless Chromium, this machine) | Result |
| --- | --- |
| Blank page median frame | 16.7 ms |
| Living Room median frame while the pointer moves | 16.7 ms (Phase 4 release run) |
| Living Room p95 frame | 16.8–33.4 ms across runs (noisier when other workers run in parallel) |
| Long tasks (> 50 ms) during interaction | 0–2 |
| DOM nodes after visiting all rooms three times | 480 → 479 → 474 (no growth) |
| Main JS bundle | 344 kB (114.5 kB gzip); Phase 3 was 335 kB (111.0 kB gzip), measured by building 053f5c9. Phase 4 adds the shared valley simulation to main (idle mode needs it); everything else is in the room chunks: Garden 55 kB (18.5 gzip), Weather Workshop 25 kB (9.8), Attic 47 kB (16.9). Matter.js separate, 86 kB (28 kB gzip), Playground only |

**Limitations.** This is not a device benchmark. Headless Chromium on a
laptop is neither a low-end phone nor a real GPU pipeline. Before claiming
anything about mobile performance, test on representative devices with the
browser's own profiler.

## Not done (honest list)

- No usability study with real visitors. The first-5-seconds / 30-seconds /
  2-minutes / 5-minutes targets in `PRODUCT_VISION.md` are still hypotheses.
- Only Chromium has been run automatically. Firefox and Safari were not
  tested. The code avoids engine-specific APIs, and features like
  `text-wrap`, `:has` and `color-mix` degrade gracefully, but this is
  unverified.
- No screen-reader walkthrough with NVDA or VoiceOver. axe-core checks
  structure and contrast; it cannot judge the experience.
- Audio has only been tested against a mocked AudioContext (no sound is
  created until enabled; bursts are throttled). Nobody listened to the real
  playback during development, so mixing and levels may need tuning by ear.
