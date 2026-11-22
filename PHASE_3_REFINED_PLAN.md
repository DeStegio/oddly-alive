# Phase 3 — The House Has a Mind of Its Own (+ Infinite Rooms)

Source brief: `ODDLY_ALIVE_PHASE_3_MASTER_PROMPT.txt` (owner, 2026-11-22). This
document is the repo-grounded version of it: what exists, what we reuse, what
we build, in what order, and how we know it works. The owner asked for the
whole phase to be carried out without check-ins; decisions are recorded here
and in `DECISIONS.md`.

Primary rule: **don't just react, act.**

---

## 0. Baseline: what the house is today (inspected, not assumed)

Stack: React 18 + TS strict + Vite, CSS Modules + tokens, Zustand, hash
routing (GitHub Pages), Vitest/Testing Library (234 tests), Playwright
(desktop 1440×900 + Pixel 7, axe a11y, perf). Matter.js only in the
Playground. Web Audio, opt-in.

Engine (`src/engine`, ~2.6k lines), all reused as-is:

| Module | What it gives Phase 3 |
| --- | --- |
| `world.ts` | one `World`: emit → personality → counters → plugins → behaviors; `use(plugin)` with `onEvent`/`onTick` (500 ms tick); `idleFor(now)` |
| `bus.ts`, `events.ts` | typed events (`OBJECT_CLICKED`, `OBJECT_STATE_CHANGED`, `RARE_EVENT`, …), depth-limited chains |
| `scheduler.ts` | `ReactionScheduler`: per-channel exclusivity, priorities (RARE 10 … SAFETY 50), cooldowns, ambient cap (3), guaranteed cleanup, `cancelAll` |
| `actors.ts` | `ActorChannel`: imperative commands to characters (`expression`, `anim`, `say`, `gaze`, `poke`), presence |
| `personality.ts`, `characterMood.ts` | house-wide vars (curiosity, energy, trust, mischief, stimulation, fatigue) and moods |
| `surpriseDirector.ts` | rare events: idle gating, min interval, per-session limits, novelty weighting |
| `rng.ts`, `clock.ts` | seeded Mulberry32, `hashString`, `weightedPick`; `ManualClock` for deterministic tests |
| `frameLoop.ts` | one shared rAF loop (`onFrame`), paused when hidden |
| `memory.ts` | versioned local memory (v3: discoveries, counts, keepsakes world) with migrations |

Rooms today: Living Room (characters Pim, Dot, Lumen, Tick, Ferdinand, the
"do not press" button with a 5-press chain, portrait with keyhole, pull cord to
the attic, basement), Playground (Matter.js toys + Bip volleyball, Field
Notes), Garden (you are the sun, drawing, clouds/thirst/rainbows, fireflies),
Mood Room (house weather, barometer, almanac, Nimbus), Secret Space, Memory
Room, After Hours (rooftop, constellations), Attic (dust, memories, lock,
hats, gramophone, diary, trunk). 53 secrets, 8 letters.

What does **not** exist yet: goal-driven agents, prop ownership/locks,
character-initiated multi-actor scenes, a button with a relationship, any
zoom/recursive scene system, player-controlled volley, pollinators, shadow
play, an instrument.

References (neal.fun, bruno-simon.com, patatap, zoomquilt): **not browsed** —
no browsing tool in this environment. Ideas below come from the brief and the
house's own rules, not from studying those sites.

---

## 1. Architecture additions (small, on top of the engine)

### 1.1 Agents — `src/engine/agents/`

- `types.ts` — `AgentDef` (id, needs with decay/growth, relationships),
  `GoalDef` (id, actor, `when(ctx)`, `utility(ctx)`, resources, cooldown,
  priority, `start(ctl)` returning cleanup, optional `interruptible`).
- `needs.ts` — bounded needs (0..1): attention, rest, curiosity, order, play.
  Pure `tick(needs, dt, context)`.
- `utility.ts` — score = utility × need fit × relationship × novelty
  (anti-repetition) ; zero if infeasible, cooling or locked. Pure, tested.
- `locks.ts` — `PropLocks`: exclusive ownership of props (cushion, spotlight,
  shield…), released by cleanup; `owner(prop)`.
- `director.ts` — `AgentDirector` as a `WorldPlugin` (`onTick`, evaluates
  every ~1.5 s, not per frame): perceives (room, idle time, flags, present
  actors, recent events), picks at most one goal per pass with `weightedPick`
  over utilities (seeded rng), runs it through the existing
  `ReactionScheduler` on the actor's channel (so priorities, preemption by
  direct input and cleanup come free). Caps: ≤1 incident at a time, quiet
  period after each incident, no incidents while the visitor is mid-input
  (< 2.5 s since last input) or in a game; everything cancelled on room exit.
- Memory: a tiny session list of notable outcomes (`agentMemory`) that goals
  and lines can consult ("Dot took the cushion last time").

Positions stay local to rooms (refs/CSS vars); the director only deals in
discrete facts.

### 1.2 Living Room stage props

Movable props become **stage objects** with a position in stage % (state in a
small room-local store, not the global world store): the **cushion** on the
sofa, the **teacup** on a new side table (the stolen object), and the
spotlight target. Characters "walk"
by CSS transitions between stage points; their acting uses existing
expressions/anims.

### 1.3 Infinite Rooms — `src/rooms/LivingRoom/InfiniteRooms/`

Fixed full-viewport mode opened from the portrait. Local controller only:
`zoomController.ts` (camera state, rebase), `portalGeometry.ts` (portal rect
in scene units, transform math), `sceneGenerator.ts` (seed + depth →
archetype + variant, no immediate repeats), `sceneRegistry.ts` (archetype
components), `worldSeed.ts`. At most previous/current/next mounted; scale is
rebased to 1 after every handoff. Bus events only for enter/visit/surprise/exit.

---

## 2. Milestones (order resolves dependencies)

Status legend: ☐ todo · ◐ in progress · ☑ done (verified as written in the log)

| # | Milestone | Branch | Key commits |
| --- | --- | --- | --- |
| 3.0 | Baseline + this plan | `docs/p3-plan` | docs: refine phase 3 creative direction · test: capture existing room behavior baselines |
| 3.1 | Agent autonomy engine | `feat/p3-agents` | feat: introduce agent goal and needs models · feat: implement autonomous action scheduler · feat: add character perception and relationships · test: verify deterministic agent decisions |
| 3.2 | The button that fights back | `feat/p3-button` | feat: add button personality and escalation · feat: build animated protective glass shield · feat: add physical shield interactions · feat: connect button behavior with dot and tick · test: cover button state machine and recovery |
| 3.3 | Living Room social incidents | `feat/p3-incidents` | feat: implement autonomous living room incidents · feat: add character-to-character reactions · feat: enable visitor intervention in incidents · test: verify incident cancellation and resolution |
| 3.4A | Infinite Rooms prototype (3 linked rooms) | `feat/p3-infinite` | docs/feat: zoom engine, portal alignment, rebasing |
| 3.4B | Surreal scene generator (6 archetypes) | same | feat: add surreal room scene definitions · feat: implement seeded room variation system |
| 3.4C | Living surreal worlds | same | feat: add impossible room environmental behaviors · feat: introduce character cameos and deja vu events |
| 3.4D | Controls, a11y, QA (100 transitions) | same | feat: reverse zoom and home · a11y: touch keyboard reduced motion · test: recursive navigation and determinism · perf |
| 3.5 | Playground volley (Dot vs Bip) | `feat/p3-volley` | refactor: isolate volley simulation · feat: player movement and timed hits · feat: bip prediction and mistakes · feat: alternate ball materials · test |
| 3.6 | Garden ecosystem | `feat/p3-garden-life` | feat: pollinators · feat: pollen + hybrid blooms · feat: seed thief · test |
| 3.7 | Attic shadow theatre | `feat/p3-shadows` | feat: light and shadow stage · feat: composition and silhouettes · feat: shadow creatures · test |
| 3.8 | Reactive atmospheres | `feat/p3-atmos` | feat: weather combinations · feat: constellation instrument · feat: night behaviors · test |
| 3.9 | Cross-room continuity | `feat/p3-continuity` | feat: cross-room consequences · feat: character memories · feat: diary vignettes · test: migrations |
| 3.10–3.11 | Acting, sound, polish, QA, release | `chore/p3-release` | style/a11y/perf/docs |

Phase 3 lands on `phase-3` (integration branch); `main` (= deploy) only at
3.11, or earlier at a stable point if a milestone is worth shipping on its own.

---

## 3. Milestone specs

### 3.1 Agents

Characters and their goals (first set):

| Actor | Needs that drive it | Goals |
| --- | --- | --- |
| Dot | play, attention | steal the cushion, pinch the teacup, poke the button, get Tick's attention |
| Pim | rest, comfort | settle on the sofa, recover the cushion, peek at the visitor |
| Tick | order | return misplaced props, glare at disorder, tidy after an incident |
| Lumen | attention | spotlight someone/something, sulk when ignored |
| Ferdinand | light | lean to the light, react to weather |

Done when: two actors start, carry out and recover from goals with no clicks;
locks prevent two actors holding one prop; seeded runs reproduce the same
decisions; direct input preempts ambient goals; room exit cancels all.

### 3.2 The button (`src/rooms/LivingRoom/button/`)

Typed machine (`buttonMachine.ts`, pure): states `calm → wary → bracing →
shielded → (open | repairing | hiding) → calm`, bounded vars `irritation`,
`trust`, `intensity` with time decay, cooldowns. Press rate raises intensity;
waiting decays it; gentle presses after calm raise trust.

Counterplay to the glass (≥2 real resolutions, none = spam):
1. **Slide the glass** (drag up / keyboard: "lift the glass" with arrow keys):
   the button notices and slaps it back unless trust is high → teaches.
2. **Loosen a bracket** (drag a bolt / keyboard): glass tilts and drops off;
   the button panics, hides behind the table, then repairs.
3. **Wait** (calm down): it lowers the glass itself, a little suspicious.
4. **Ask Dot** (Dot is attracted when the glass is up and Dot is free): Dot
   pries the glass off — Tick objects and puts it back (lock on `shield`).
Consequence stays in the relationship: trust/irritation remember the session.
The glass is a real element with its own hit target exactly over the button;
closed glass swallows presses (tested). Old `living.buttonPresses` +
`button` discovery chain kept (calm presses still count).

### 3.3 Incidents (`src/rooms/LivingRoom/incidents/`)

Each: eligibility, resources, steps on a timeline (ReactionControl.after),
visitor intervention points, outcomes, recovery, timeout.
- **Sofa** — Pim settles; Dot drags the cushion away; Pim looks, tries to
  reach; visitor can drag the cushion back (or Tick does it); outcomes: Pim
  comfy / Pim sulks / Dot naps on it.
- **Stolen teacup** — Dot takes the teacup off the side table; Tick notices
  and gives chase; visitor can grab the cup and put it back, or give it to
  Dot; outcomes vary; Tick remembers.
- **Spotlight** — Lumen turns its head and shines on someone (Pim shy,
  Dot performs, Tick objects); visitor can drag the beam elsewhere or switch
  Lumen off.

### 3.4 Infinite Rooms

Entry: the portrait now shows a tiny room in its sky; zoom into it (wheel /
pinch / + button / keyboard) and the miniature room grows until it is the
room. Six archetypes: Upside Down, Paper, Underwater, Wrong Scale, Forgotten
Gravity, Impossible Perspective (+ Clock Room, False Return as stretch).
Each has a portal object containing the next room's miniature. Controls:
wheel/pinch only inside the mode, +/− buttons, keys `+`/`−`/`Esc`, Home,
Zoom back; reduced motion → crossfades. Stress: 100 transitions without
growth.

### 3.5 Volley

Keep the throw-to-Bip toy; add **Dot plays**: Dot on our side, moved by
pointer/arrow keys/touch drag, swings on click/Space/tap; contact timing sets
the angle; Bip predicts (existing flight solver), reacts with bounded delay,
sometimes misjudges. Objects with real material differences (ball, balloon,
radish, soft cube, slipper). Start in < 10 s, rally counter, no menus.

### 3.6 Garden life

Bees/butterflies with steering (seek flower, wander, flee wind/rain); pollen
picked from blooms and carried; a flower visited with foreign pollen can turn
into a hybrid colour bloom (keepsake → Living Room vase). Seed Thief: a
sparrow-like Pip lands, eyes a seed; visitor can shoo, follow or let it.

### 3.7 Shadow theatre

A lamp you drag/rotate, 6–8 props (hand, hat, cup, Marguerite's head, fern,
kettle…), shadows projected on the attic wall by simple geometry (scale with
distance, offset by lamp angle). Loose rules (overlap, rotation, position)
turn some shapes alive (bird flies off, cat chases a dust bunny). Free play
always moves.

### 3.8 Atmospheres

Mood Room combinations (rain + tea → steam on a window you can draw on; wind +
paper → scraps fly; snow + blanket → shelter; rainbow + mirror → colour
patches). After Hours: connect stars → a synthesized phrase (y→pitch,
length→duration), visual pulses for sound-off, moth/moon react.

### 3.9 Continuity

Events → consequences: hybrid bloom in the vase; shadow bird visits other
rooms; Dot remembers a great rally; diary entries from real incidents.
Memory v4 (additive): `agents` (few notable outcomes), `button` (trust),
`garden.hybrids`; migration tests.

---

### 3.4 Infinite Rooms — creative spec (as built)

- **Entry**: a very small painting on the Living Room wall, of the Living Room. Press it, or scroll up over it; the first room grows out of the painting's own rectangle.
- **Rooms** (1000×625 each, ink + cut paper): Upside Down (portal: the bottom of a glass), Paper (an origami fold), Underwater (a bubble), Impossible (a window), Wrong Scale (a keyhole in a giant door), Forgotten Gravity (a floating clock), Clock Room (a big dial), and every 9th room **Nearly Home** (the Living Room, but the clock has no hands, the lamp shines up, Pim's portrait looks away, Dot on the sofa watching the little painting).
- **Variation**: seeded mirror, accent, wobble; cameos (Dot, Pim peeking, Inch, a dust bunny); déjà vu (a picture of the room you just left); rarely, Dot zips across a room ahead of you.
- **Seamless**: the next room is drawn inside the portal (clipped to its shape, the clip opening as you arrive), and the one after inside that; the frame around the portal fades in the last quarter; at p = 1 the next room fills the screen exactly and becomes the room you're in at p = 0.
- **Controls**: wheel and pinch (only inside the mode), + / − buttons, keys + − ↑ ↓ PageUp/Down, Esc / Home; pressing the portal goes through it. Reduced motion: each step is a crossfade. Zooming out of the first room shrinks back into the painting.
- **Limits**: three rooms drawn at most; scale rebased every room; rooms rebuilt from seed + depth (no history list).

## 4. Rules everywhere

Body before words (lines short, rare); quiet periods; ≤1 incident at a time;
essential controls never antagonistic; touch + keyboard + reduced motion for
everything; cleanup on room exit and hidden tab; no telemetry, no camera, no
LLM; paper-house art direction (ink outlines, hard shadows, cut paper —
the glass is an object in that world, not a site style).

## 5. Risks

| Risk | Mitigation |
| --- | --- |
| Autonomy becomes noise | one incident at a time, quiet periods, idle gating, anti-repetition |
| Incidents leave broken state | every step through ReactionControl (auto-cleared timers) + explicit cleanup restoring props; tests with ManualClock |
| Infinite zoom precision / leaks | rebase scale each handoff, ≤3 mounted scenes, stress test 100 transitions, listener counts |
| Scope (the brief is enormous) | P0 first (agents, button, incidents, infinite rooms core, volley), P1 slices after; each slice shippable |
| Playground refactor breaks volleyball | add Dot mode beside the existing toy; keep existing tests green |

## 6. Progress log

- 3.0 ☑ Baseline inspected; this plan written; `e2e/baseline.spec.ts` pins what every room already has (16 checks, desktop + Pixel 7, green).
- 3.1 ☑ Agent engine (`src/engine/agents`: needs, scoring with novelty, prop locks, session memory, director plugin on the World tick, incidents run as CHARACTER-priority scheduler reactions). Living Room goals: Tick straightens the portrait, Dot walks to the button and presses it, Pim dozes, Lumen shows off, Ferdinand leans. Verified: 11 unit tests (determinism, locks, cleanup on preempt/room exit, one incident + quiet spell, busy-visitor gating, interventions); in the browser, 30 s idle produced lumen.show-off, tick.straighten, dot.press-button, pim.doze; e2e forces Dot's errand on desktop + Pixel 7.
- 3.2 ☑ The button that fights back (`src/rooms/LivingRoom/button`): pure machine (calm → wary → bracing → shielded → open/lowering/hiding → repairing) with bounded irritation, trust, intensity, suspicion that decay; gentle presses build trust, impatience brings the glass; a wary button sometimes ducks. Resolutions: lift the glass once it has calmed (too soon: it slaps it back), loosen both bolts (glass falls, it hides; a press while it hides gets through but costs trust; otherwise it repairs), wait it out (it lowers the glass itself), ask Dot (click/Enter on Dot: he pries it off) and Tick puts it back. Suspicion makes it defend sooner next time. Glass is its own hit target (e2e: elementFromPoint over the button = the glass). Keyboard: arrows on the glass, Enter on bolts, Enter on Dot. World reset resets it. Old 5-press chain + 'button' discovery kept; protest/give-up lines retired. Verified: 11 machine/store tests, room test, 3 e2e on desktop + Pixel 7.
- 3.3 ☑ Living Room incidents (`src/rooms/LivingRoom/incidents`). Movable props layer (cushion, teacup on a new side table, Lumen's spotlight) positioned every frame from anchors/Dot; drag, or Enter to put back. **Sofa**: Pim settles, Dot takes the cushion; outcomes: visitor puts it back, Dot drops it when clicked, Tick makes him return it, Dot naps on it. **Teacup**: Dot hides it behind the plant (plant rustles); outcomes: visitor takes it / clicks Dot / clicks the plant, or Tick's alarm makes Dot return it. **Spotlight**: Lumen shines on 2–3 of Pim (hides), Dot (performs), Tick (objects), the button (squirms); drag/cycle the light, switch Lumen off to end it. Dot later tidies anything left out. One incident at a time, quiet spell after, cancelled on leaving (props put down, not lost). Bug found in browser: a pointer resting near Dot let his "catch" reaction cut incidents short → Dot now holds still when an incident starts. Verified: 8 incident unit tests (outcomes, settling on 6 seeds, cancellation), 3 e2e on desktop + Pixel 7, screenshots.
- 3.4 ☑ Infinite Rooms (A–D). Verified in the browser: seamless zoom from the painting through rooms (screenshots at rest, mid-zoom, after hand-over), all 8 rooms drawn and reviewed, mobile (tap + / Home), reduced motion (crossfade steps). Stress: 100 rooms in and 100 out → DOM 620→645→643 nodes, wheel to room 14, ~10 MB heap. Fixed along the way: flat masks that didn't match gradients (now the next room is clipped to the portal shape, opening as you arrive), a hover glow that scaled with the camera, the painting first placed under Dot's resting spot. Tests: 9 unit, 2 e2e (+1 desktop stress), axe clean on the overlay. Known limit: the overlay covers the site header while open (Home / Esc always visible and working).
- 3.5 ☑ Back-Fence Volley (`src/rooms/Playground/volley`), alongside the existing throw-to-Bip toy (kept). Pure model: materials (ball, balloon, radish, soft cube, slipper) with real differences in gravity/drag/flutter/power; fence collisions; landing/out; Dot's hit shaped by contact timing (early flat and fast, late high), forgiving over the fence; Bip predicts the landing, reacts after 0.16–0.32 s, dives for far balls, misreads ~7% (+ more when on a streak). UI: pointer/arrows/touch to move, click/Space/tap to swing and serve, materials between points, best rally kept, Bip practises while waiting. Verified: 8 model tests; e2e (serve immediately ~75 ms, a point is scored, swap material; desktop scripted player reaches a rally ≥ 2, earlier run reached 11). Bug found in browser: the page's wandering Dot walked onto the court → it stays off while the court is in use.
- 3.6 ☑ Garden ecosystem: two bees and a butterfly (steering to open flowers, bees favour the sunny ones; wind pushes; shelter in rain; home at night); pollen carried between kinds crosses a flower (new tint, pollen dots), and picking it puts a hybrid in the Living Room vase (stored as `hybrid:a:b`, fits the existing schema; crosses themselves are session-only until 3.9). Crumb the sparrow: lands on the fence for a newly planted seed, hops down, pecks; shoo it (seed safe), follow it after it took the seed (drops it in a free plot), or let it go (Bip gets a mystery seed). Bugs found in browser: Crumb's trigger was impossible in full sun (seeds outgrow "fresh" in ~2 s) and its first visit waited 20 s; the hybrid tint turned sunflowers green. Verified: 7 unit tests; e2e on desktop + Pixel 7 (cross → hybrid in the vase → Crumb → shoo/drop).
