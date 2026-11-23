# Phase 4 — Rules You Can Discover

Source brief: `PHASE_4_MASTER_PROMPT.txt` (owner, 2026-11-23). This is the
repo-grounded version: what exists, what we keep, what we replace, in what
order, and how we know it works. The owner asked for the phase to be done
without check-ins. Decisions are recorded here and in `DECISIONS.md` (34+).

Primary rule: **depth over breadth.** Three rooms, each built on one system
with rules the player discovers, problems that need those rules, and wrong
answers.

---

## 0. Baseline (inspected 2026-11-23, `main` @ 053f5c9)

- `npm run check`: TS strict 0 errors, ESLint 0 errors, **Vitest 306 tests / 41 files, all green**.
- Playwright: desktop 1440×900 + Pixel 7, axe, perf (see `TESTING.md`, which
  still says 142 tests and is stale; it gets real numbers in 4.6).
- Before screenshots: `docs/phase4/before/` (every room, desktop + Pixel 7,
  day at 0 s and 5 s, night at 0 s), captured by `e2e/shots.spec.ts`
  (`SHOTS=before npx playwright test shots`).

What the screenshots and code confirm:

| Room | What it is today | Why it is boring |
| --- | --- | --- |
| Garden (`rooms/Garden/Garden.tsx`, 884 lines) | 6 plots in a row; draw a glyph to plant; a printed card lists the glyphs; swipe to pick; clouds drawn in the sky; bees, hybrids, Crumb | No goal and no wrong answer. On desktop, the first 280 px are title and a 4-line paragraph; the play area is a lawn with six mounds. |
| Mood Room (`rooms/MoodRoom/*`) | A window that shows the house weather; 6 sill buttons nudge mood; a barometer of 8 weather buttons pins the weather for 3 min | The player picks the outcome. The window has nothing to figure out. |
| Attic (`rooms/Attic/*`, 662-line component) | Dust grid (canvas), 3 photos with digits, a trunk lock, a hat wheel, a gramophone, a shadow theatre that accepts "near enough" | Collect and input. On Pixel 7 the stage starts under a 650 px header. |

Reused as-is: the engine (`world`, `bus`, `scheduler`, `actors`, `frameLoop`,
`rng`, `memory` v3 + keepsakes), `findLetter`, the discovery/toast system,
`useObjects`, the dust grid (`rooms/Attic/dust.ts`), the shadow geometry
(`rooms/Attic/shadows/geometry.ts`), `LivingTitle`, `ThoughtBubble`, `Inch`,
`Nimbus`, the Living Room vase (`hybrid:a:b` keepsakes).

References (Opus Magnum, Baba Is You, Obra Dinn, Golden Idol, Stardew): **not
played or browsed** in this environment. The designs below follow the brief's
laws, not a study of those games.

---

## 1. Architecture additions

### 1.1 Pure simulations (L9)

Each room's game is a pure, seeded TS module with no React or DOM. React only
renders state. All three follow one shape:

```
state = initial(level)            // plain JSON-able object
state = act(state, action)        // player actions between ticks
state = step(state, input)        // one tick (garden: one day; weather: 0.1 s)
goal(state) → boolean             // per level, pure
```

- `src/rooms/Garden/sim/` — `types.ts`, `grid.ts`, `light.ts`, `step.ts`
  (`step(state, sun)`), `actions.ts` (`plant`, `dig`, `water`, `pick`),
  `history.ts` (snapshot stack; rewind = restore), `goals.ts`, `solver.ts`
  (replays, random play, naive checks).
- `src/rooms/Weather/sim/` — `field.ts` (24×12 grid of temperature,
  moisture, cloud, wind), `step.ts`, `tools.ts`, `optics.ts` (rainbow),
  `derive.ts` (valley → house weather word), `forecast.ts` (barometer runs a
  copy forward).
- `src/rooms/Attic/mystery/` — `board.ts` (assignments, group-of-3
  confirmation), `acts.ts`, `shadowScenes.ts`; story data in
  `src/content/attic.ts`.

### 1.2 Hint ladder (L7)

`src/app/hints.ts`: `useHintLadder({ key, progressKey, lines })`. 30 s without
progress → the asker glances at the target (a `glance` prop/CSS var), 60 s →
vague line, 120 s → specific line. Progress (any meaningful action that
changes sim state) resets the timer. A nav-level setting turns hints off
(`settings.hints`, default on).

### 1.3 Art kit (`src/art/`, section 7)

- `tokens.css` ramps: every accent gets `-d2 -d1 base -l1 -l2`, day and night.
- `PaperDefs.tsx`: one SVG `<filter id="paper-grain">` (feTurbulence) mounted
  once in the Shell. `html[data-power="low"]` (set when
  `navigator.connection.saveData` or reduced motion or `hardwareConcurrency ≤ 4`)
  removes it.
- `Ink.tsx`: two-stroke hand-inked path (`<Ink d=… w=…/>`).
- `ContactShadow.tsx`: soft ellipse under things (`--contact` token).
- `Stage.tsx` + `stage.module.css`: full-viewport stage with 3–4 depth layers
  (`far | mid | play | near`), pointer/tilt parallax (rAF, off for reduced
  motion), `--light-x/--light-y` scene light direction and `--grade`
  time-of-day tint. A compact `RoomTag` (small Fraunces on a paper tag) sits
  over the stage's top-left corner and carries the `h1`.
- `tween.ts`: one tiny tween helper (spring and ease) on the shared frame loop.
- `particles.ts`: one canvas particle helper (dust, pollen, rain, snow, sparks)
  with a hard cap (`MAX_PARTICLES = 160`).
- Room transition: a paper-wipe (`clip-path` sweep, 360 ms) in the Shell's
  `RoomEntrance`; reduced motion → cross-fade; input never blocked.

No new runtime dependency is planned. Any exception is justified in
`DECISIONS.md` with its bundle cost.

### 1.4 Persistence (decision 35)

Memory stays **v3, additive** (as Phase 3 did). New validated sections in
`world`, each with defaults so old saves load unchanged:

- `garden2: { solved: string[], herbarium: string[], barrel: number }`
- `workshop: { solved: string[], sandbox: SandboxSave | null }`
  (`SandboxSave` = rounded field arrays + tool positions, size-capped)
- `board: { found: string[], pinned: Record<obj, {owner, decade}>, locked: string[], act: 1|2|3, scenes: string[] }`

`garden.plots` is kept in the schema for old saves but the new Garden does not
use it. Migration tests: a Phase 3 save loads, keeps every old field, and gets
empty new sections; junk in the new sections is dropped.

---

## 2. Steps, branches, acceptance

Status: ☐ todo · ◐ in progress · ☑ done (verified as written in the log)

| # | Step | Branch | Done when |
| --- | --- | --- | --- |
| 4.0 | Audit, plan, baseline shots, art kit, stage layout | `feat/p4-foundation` | plan + shots exist; art kit modules + tokens; `RoomTag`/`Stage` used by the three rooms; check green |
| 4.1 | Garden: sim, tests, solver, commissions, UI, Herbarium, rewind, free play | `feat/p4-garden` | 12 commissions pass replay + do-nothing + naive + random-play checks; Playwright plays 1, 2, 5, 12 on desktop and Pixel 7 |
| 4.2 | Weather Workshop: sim, tools, postcards, barometer gauge, idle mode | `feat/p4-weather` | 10 postcard scripts pass headless; do-nothing/naive fail; 10k random steps stay bounded; frame budget kept |
| 4.3 | Attic: story, clue graph, Memory Board, evidence, acts, fairness tests | `feat/p4-attic` | fairness tests; stored playthrough solves headless and in e2e (desktop full, mobile Act 1) |
| 4.4 | Cross-room links + memory | `feat/p4-links` | barrel fill, smoker clue, vignettes, house weather from valley; migration tests |
| 4.5 | Art pass on remaining rooms and UI | `feat/p4-art` | compact tag + stage on every room, transitions, contact shadows; after shots looked at |
| 4.6 | Hints, copy, a11y, perf, full e2e, docs, release | `chore/p4-release` | `npm run check` + full Playwright green; L8 numbers measured; docs updated |

---

## 3. Garden — "a garden of plants with opinions"

### 3.1 Model

Grid `w×h` per level, at most 7×4. The brief asks for 5×5 on mobile with a
per-level layout; instead every level is authored once at ≤ 7 columns, which
fits a Pixel 7 in portrait at ≥ 48 px cells (decision 36: one layout per
level means one verified solution per level, and east/west stay where the
sun is). Each cell: `terrain`
(`soil | rock | shed`), `water` 0–3, optional plant
`{ kind, stage 0–3, facing, litStreak, id }`.

**The sun** sits on an arc with four stops: morning (east, right), noon,
evening (west, left, the house side), night (behind the fence). Dragging the
sun previews that day's shadows live on the bed; **releasing commits one day**
lit from where it was let go. Tapping the sun = one more day from the same
stop. Rewind = the **day track** under the sky (drag its marker back, tap a
past day, or `←`); see decision 37 for why rewind is not "drag the sun east".

**Order inside one day** (deterministic, reading order everywhere):

1. Crumb (levels with `crumb`, day 1 only): every seed (stage 0) with no
   planted orthogonal neighbour is taken.
2. Light: tall things (shed, sunflower stage ≥ 2, Sunsnap stage ≥ 2) shade
   cells away from the sun: noon 1 cell toward the viewer, morning 2 cells
   west, evening 2 cells east. Night: nothing is lit.
3. Snapdragons each eat one adjacent mint.
4. Mint with wet soil (≥ 1) spreads into one empty orthogonal neighbour
   (wettest first, then N, E, S, W), smothering a seed there.
5. Growth (needs water ≥ 1): sunflower if lit; moonflower if shaded (to
   stage 2), and stage 2 → 3 only on a night; radish if ≥ 2 planted
   neighbours; snapdragon if lit and no snapdragon neighbour (two bite each
   other); creeper extends one cell (it may cross rock) toward light.
6. Water: lit cells dry by 1; shade and night keep water. Creeper networks
   share water (every cell on a creeper gets the network's max − 1).
7. Moonflowers lit 2 days running wilt. Sunflowers that were lit face the
   sun (east / south / west).
8. Bees (not at night): two different species in bloom side by side → a
   hybrid seed in the tin (`hybrid:a:b`, alphabetical, the vase format).

Barrel: before a day, tip it onto one column: +2 down the column until a rock,
+1 to the neighbouring columns (same stop rule). Uses per commission are
limited; Weather Workshop rain adds bonus uses (never required).

Hybrids with their own rules: **Sunmint** (sunflower × mint: spreads like
mint, only into lit cells), **Sunsnap** (sunflower × snapdragon: tall, eats
mint), **Moonradish** (moonflower × radish is impossible by day; we use
radish × sunflower = **Sunradish**: grows alone if lit). Other pairs make a
hybrid that keeps parent A's rules in new colours (still goes to the vase).

### 3.2 Commissions (data in `src/content/garden.ts`)

Each: asker, request line, goal predicate, `check: 'any' | 'end'`, seeds,
layout, day limit, stored `solution`, `naiveAttempt`. The curve (final tuning
recorded in §9):

| # | Asker | Goal | Teaches |
| --- | --- | --- | --- |
| 1 | Pim | a sunflower in bloom facing the house | sun position |
| 2 | Lumen | a moonflower in bloom | shade + night |
| 3 | Tick | exactly four mint at the end of day 4 | spread and its brakes |
| 4 | Dot | three ripe radishes | company |
| 5 | Ferdinand | moonflower and sunflower in bloom on one night | two rules: own shade grows the moonflower |
| 6 | Crumb arrives | three sunflowers in bloom | guarded seeds + self-shade |
| 7 | Bip | a hybrid seed | bees |
| 8 | Inch | save the radish row from mint in 4 days | snapdragon / dry soil |
| 9 | Ferdinand | wet the cell behind the rocks | creeper bridge |
| 10 | Tick | shade three marked cells with one sunflower | low sun, long shadows |
| 11 | Bip | a Sunmint in bloom | hybrid rules + lit wet corridor |
| 12 | Great-Aunt Pim (letter) | match the sketch: heights and blooms | everything; ≥ 2 solutions |

Then free play (all seeds, Herbarium, "ask me something" = a template
mini-commission verified by replaying its generated solution).

### 3.3 What is deleted / kept

Deleted: glyph planting (`strokes.ts`), the rule card, swipe-to-pick as the
main verb, the empty lawn, clouds drawn in the sky, growth-while-away. Kept:
the sun, fence, shed, Bip on the fence, Inch, Crumb, bees, the hybrid → vase
continuity (`hybrid:a:b`). Secrets: see §8.

---

## 4. Weather Workshop

24×12 field over a glass-box valley: village, hill (with weathervane), pond,
well, Ferdinand's house, the field the Garden sees, the washing line. Per cell
temperature, moisture, cloud, wind. Rules as in the brief (heat rises, cools
with height, saturation → cloud, heavy cloud → rain/snow by temperature,
gradient → wind, tall wet cloud + updraft → lightning to the highest
conductor, cold still moist low ground → fog, rainbow from lamp geometry, the
pond evaporates). Step at 10 Hz on the shared frame loop, fixed dt.

Tools dragged into the valley: teacup, ice cube, paper fan (drag sets
direction/strength), sun lamp, mirror, weathervane (raise/lower), Nimbus
(hold to wring out). The barometer reads humidity and pressure and forecasts
by running a copy of the sim 10 s forward. Ten postcards as data in
`src/content/weather.ts`, each with a stored timed script.

Idle mode: outside the room the valley keeps running slowly (1 Hz), nudged by
the house mood (the old "let the mood decide"), and its derived weather is the
house weather (decision 38).

---

## 5. Attic — "What Marguerite Forgot"

Five residents across ~80 years, fifteen objects, clues from dust, photos,
diary pages, gramophone sleeves (with visual notation) and five shadow
scenes. The Memory Board: pin objects, string to a portrait, set a decade;
any three correct assignments lock together; wrong ones are never named.
Three acts (2 residents/5 objects, 4/10, 5/15 + twist). The trunk code is a
deduced year. Fairness tests: every answer has ≥ 1 clue; no clue names owner
and object together; board confirmation logic; stored playthrough.

---

## 6. Cross-room links

Valley rain over the field → barrel uses (capped at 3, bonus only). The
beekeeper's smoker gains a second clue (pressed flower) once the Garden has
made a hybrid. Attic vignettes mention the valley and the garden. House
weather comes from the valley.

---

## 7. Art acceptance

Before/after screenshots in `docs/phase4/before|after/`, looked at, critique
per room in §10. No layout shift on entry; LCP/frame-pacing e2e within the
existing budgets; night theme checked.

---

## 8. Secrets (kept honest)

Garden, Mood Room and Attic secrets whose triggers disappear are reassigned
to new triggers in the same spirit (ids kept so old saves keep their finds).
The final count goes in the README and the toast ("n of N").

---

## 9. Log

- 4.0 ◐ Audit done (this document). Baseline: 306 unit tests green; before
  screenshots captured and looked at (Garden: first 280 px are title and
  paragraph; Mood Room: a settings panel; Attic on Pixel 7: stage starts at
  y≈760 of 2400 device px).

---

## 10. Honest limits (filled in as we go)

- Fun cannot be measured directly. §9 reports L8 timings from Playwright
  "first minute" scripts and a written self-critique per room; neither is a
  usability test with real people.
