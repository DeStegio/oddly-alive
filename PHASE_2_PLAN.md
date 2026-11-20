# Phase 2 — "The House Has a Story"

Phase 1 (ROADMAP.md, phases 0–15) built a house that reacts. Phase 2 makes it
*hang together*: a voice that sounds like people wrote it, weather that matters
everywhere, two new rooms, a story that runs through every room, and
discoveries worth hunting for.

This file is the working plan. It is written for whoever implements it
(currently Claude, autonomously) and for the project owner reviewing progress.
Keep the **Progress log** at the bottom up to date after every step.

---

## 1. What Phase 2 is for

| Problem today | Phase 2 answer | Why it makes the project more attractive |
| --- | --- | --- |
| Copy reads like generated quirk ("It's not X. It's Y.", tidy triplets, every line a punchline). | A written **voice guide**, distinct voices per character, a full copy pass, and a copy-lint test. | Personality is the product. Human-sounding text is the cheapest, biggest upgrade. |
| The Mood Room only *mirrors* the mood; nothing you do there matters elsewhere. | **Weather becomes a house-wide system.** The Mood Room is where you read it, pin it, and collect it. Every room feels it. | One cause, visible effects in many rooms = the "living house" promise, kept. |
| Rooms are islands; secrets are one-offs. | **Great-Aunt Pim's letters**: one hidden per room, found by doing something meaningful there. All of them unlock a finale. | A reason to visit every room and come back. The thread that "ties it all together". |
| No reason to return tomorrow. | **The Garden** grows in real time (persisted), helped or hurt by the weather. | Return visits get a payoff that is about the visitor's own actions. |
| Lore has nowhere to live. | **The Attic**: unlockable, holds the letters' trunk, the House Diary (written from your real visit), dress-up and old things. | Story, memory and discoveries get a home; the Memory Room stays honest/technical. |
| Discoveries are mostly "click X N times". | ~22 new discoveries: cross-room, patience, gentleness, timing, weather and story ones, with layered hints. | Depth for curious visitors and for portfolio reviewers reading the code. |

### Guardrails (from PRODUCT_VISION / DECISIONS, still binding)

- No backend, analytics, accounts, LLM text, camera/mic. Memory stays local, versioned, erasable.
- Discoveries are **rewards for curiosity, never requirements**. They are shown as a cabinet of
  curiosities with cryptic hints, not a checklist UI. No mandatory gates: every room is reachable
  without any secret (the Attic unlock is a *gentle* condition with an always-available fallback).
- The site never claims to feel or to know the visitor. Characters joke about it.
- Every new behavior goes through the bus → behavior engine → scheduler. Components do direct
  manipulation; behaviors decide how the house responds (DECISIONS 10, 11).
- Reduced motion, keyboard access and a11y (axe) for everything new.
- Performance: no new per-frame work outside the shared rAF loop; physics stays Playground-only.
- The brand tagline ("It's not broken. It's just being itself.") stays — it is the owner's. The
  voice guide stops the *pattern* from repeating everywhere else.

---

## 2. Workstreams in detail

### 2.1 Voice: text that doesn't read as AI

Deliverable: `VOICE.md` + rewritten copy + `src/content/__tests__/copy.test.ts`.

Voice rules (summary — the full guide goes in VOICE.md):

1. **Specific over clever.** Name real domestic things (the radiator, the second drawer, the
   cushion with the coffee stain). Generic whimsy ("delightful", "magical", "whimsical") is banned.
2. **Not every line is a joke.** Mix plain statements, half-thoughts, non-sequiturs, silence ("…").
3. **No formula sentences.** Banned: "It's not X. It's Y.", "X, but make it Y", rhetorical triplets,
   "Who knew?", "Let's", motivational tone, explaining the joke.
4. **Each character has a fingerprint** (sheet in VOICE.md):
   - **Pim**: lowercase, short, trails off, apologises for things that aren't her fault.
   - **Dot**: excitable kid, run-on, repeats words, invents rules mid-game.
   - **Lumen**: theatrical, vain, speaks of himself in stage terms.
   - **Tick**: old, pedantic about time, grumbles, uses "in my day".
   - **Ferdinand**: slow, botanical, a little melancholy, says very little.
   - **Nimbus**: talks like a regional weather presenter who takes it personally.
   - **Bip**: sports commentator crossed with a kettle; counts things; beeps instead of swearing.
   - **Great-Aunt Pim** (letters): warm, specific, old-fashioned, a bit bossy, signs off differently each time.
   - **The house / UI copy**: plain, short, practical; no winking in buttons and labels.
5. **Callbacks and state.** Prefer lines that use what actually happened (counts, the room you came
   from, time of day, best rally, a plant you planted) over free-floating quips.
6. **Typography of speech.** Few em dashes in dialogue (max 1 per 20 lines); no exclamation stacking;
   real punctuation habits per character.

Copy lint (`copy.test.ts`) scans every exported string in `src/content/**` and room copy constants:
banned phrases/regexes (e.g. `/\bit'?s not\b.*\.\s*it'?s\b/i`, "whimsical", "delightful",
"just being itself" outside the tagline constant), em-dash budget, max line length for bubbles
(≤ 70 chars), and no duplicates across pools.

Copy pass scope: `content/lines.ts`, all `say(...)` arrays in `behaviors/*.ts`, room blurbs
(`app/rooms.ts`), room intro paragraphs, Field Notes, Bip, toasts, Memory Room explanations,
secret names/hints/found texts, ErrorBoundary/fallback. Grow line pools ~2× where repetition is
noticeable. Keep test-referenced strings in sync (grep `e2e/` and `*.test.tsx` before changing).

### 2.2 Memory schema v3 (foundation)

`engine/memory.ts`: v3 adds, with a v2→v3 migration and validation:

| Field | Type | Used by |
| --- | --- | --- |
| `garden` | `{ plots: Array<{ kind; plantedAt; wateredAt; harvested? } \| null>, vase: string[] }` | Garden, Living Room vase |
| `letters` | `string[]` (letter ids found) | Letters, Attic trunk |
| `almanac` | `string[]` (weather kinds seen) | Mood Room almanac |
| `diary` | `Array<{ at; kind; detail }>` capped (≤ 40) | Attic House Diary |
| `records` | `{ bestRally; tallestTower; … }` | Field Notes, diary, discoveries |
| `attic` | `{ unlocked: boolean; hats: string[] }` | Attic |

Semantics table in ARCHITECTURE.md gets updated: Reset World clears garden plots / attic dress-up;
Clear Local Memory clears everything. All new fields default safely; corrupt → defaults.

### 2.3 Weather: a house-wide system

New engine module `engine/weather.ts` (pure, tested):

- `Weather = 'clear' | 'sunny' | 'windy' | 'rain' | 'storm' | 'fog' | 'snow' | 'rainbow' | 'night'`.
- Derived from mood (mapping table), **or pinned** from the Mood Room barometer for 3 minutes
  (Nimbus can refuse once when annoyed — character, not friction).
- Lives in `worldStore` (`weather`, `weatherPinnedUntil`); `WEATHER_CHANGED` event; `html[data-weather]`.
- Every weather seen is added to the **almanac** (memory v3).

Effects per room (each is small, cheap and reversible):

| Weather | Living Room | Playground | Garden | After Hours / Attic |
| --- | --- | --- | --- | --- |
| sunny | window light patch moves | — | growth ×1.5 | — |
| windy | curtains/plant sway, Pim's lines | sideways force on shapes & flights (Bip's volleys drift) | leaves sway, seeds can blow away (catch them) | attic window rattles |
| rain | rain on the window, Ferdinand perks up | lower friction ("slippery"), puddle splashes | auto-watering | rain on roof (sound), clouds hide some stars |
| storm | lamp flickers slowly (≥400 ms, no strobe), Pim hides | occasional thunder hop | growth paused | — |
| fog | room slightly hazy, hints in Secret Space fade in | — | snails appear | — |
| snow | flakes in window | shapes get little snow caps (CSS) | growth ×0.5, frost | snow on roof |
| rainbow | rainbow on wall | gravity hiccups are gentler | flowers change colour | — |
| night | dimmer | Bip yawns | moonflower can grow | After Hours suggests itself |

Implementation pattern: a `useWeather()` hook + a shared `WeatherLayer` component per room
(CSS-only particles, capped counts, off for reduced motion), and behaviors gated on
`c.view.weather`. Physics effects via a small `PlaygroundSim.setEnvironment({ wind, friction })`.

### 2.4 Mood Room refine

Keep the window + Nimbus + windowsill (they work). Add purpose:

1. **Barometer dial** (keyboard operable, `role="slider"`): pin the house's weather for 3 minutes.
   Shows remaining time on the dial face; Nimbus comments; pinning affects every room (2.3).
2. **Almanac** (a small booklet under the window): one illustrated card per weather seen, each
   with a short handwritten-style note in Nimbus's voice, plus "seen first: Tuesday, 9:14".
   Completing it is a discovery.
3. **Send Nimbus**: "Nimbus, go visit the Garden/Playground" → Nimbus appears in that room for a
   while bringing its weather locally (cross-room cameo; returns on its own).
4. Windowsill objects stay as mood nudges and gain weather combos (tea + rain = "cosy" pin;
   horn during storm = Nimbus sulks; mirror + rainbow = the reflection talks).
5. The forecast line becomes useful: it predicts what pinning would do ("Pin rain and the garden
   gets a drink. Bip hates it.").

### 2.5 Navigation for eight rooms

- Generalise the "hidden until known" label (Secret Space) into room metadata
  (`hiddenUntil: (state) => boolean`), used by Secret Space and the Attic.
- Desktop: nav fits eight labels (shorten where needed, measure at 1100/1280/1440).
- Mobile dock: the first five rooms + a "more" sheet (accessible disclosure), or horizontal scroll
  with snap — pick by testing both at 360/412 px; e2e covers both.
- Update every `ROOMS` list in tests (e2e/a11y/smoke/perf).

### 2.6 New room: The Garden (`/garden`)

- **Spatial idea**: the back garden at ground level — three raised beds (6 plots), a fence that
  meets the Playground's (Bip waves over it), a rain barrel, a shed door, sky = house weather.
- **Plants** (seed packets with handwritten notes): sunflower, radish, moonflower (only grows in
  `night` weather or After Hours), snapdragon (snaps at the cursor when grown), mint (spreads to the
  next plot if left alone).
- **Growth**: stages 0–4 from real elapsed time × weather multiplier × watered. Persisted (v3), so a
  plant keeps growing between visits (capped, deterministic, tested with a fake clock).
- **Watering can** (drag or click), **harvest** fully grown plants: flowers go to the **vase in the
  Living Room** (persisted bouquet, Pim comments), radishes go to the **Playground** as a new shape
  kind that Bip can volley.
- **Residents**: Inch lives here (moves between plots, nibbles a leaf if ignored for long), snails
  in fog.
- **Discoveries**: Green Thumb (first bloom), Came Back For It (a plant grew ≥ 1 h while you were
  away), Night Shift (moonflower blooms), Full Bed (all six bloom at once), Radish Volley.
- Letter: hidden in a moonflower's seed head.

### 2.7 New room: The Attic (`/attic`)

- **Unlock**: a pull-cord appears in the Living Room ceiling after 3 discoveries *or* after 5
  minutes in the house (fallback, so it is never gated). Pulling it drops a ladder (animation),
  the nav shows "Attic" from then on. Persisted.
- **Spatial idea**: slanted roof beams, a round window showing the weather, a pool of warm light,
  boxes and a trunk.
- **Things**:
  - **Great-Aunt Pim's trunk**: holds the letters found so far (reading view, accessible).
  - **The House Diary**: a book whose pages are written from *your* memory (v3 `diary`): first visit,
    best rally, first bloom, the night you found the attic… Template-driven, human voice, honest
    ("The house wrote this from what it saw in this browser. Nothing else.").
  - **Marguerite**, a dress form with opinions: hats found in boxes (4) change her pose and voice.
  - **Boxes**: open one at a time; each holds an object with a tiny story (some are hats, one is a
    letter, one holds a dust bunny family).
  - **Gramophone**: plays a short synthesized waltz (opt-in sound only); characters in other rooms
    hum if you visit them while it plays.
- **Discoveries**: Up the Ladder, Dress Rehearsal (all hats), Needle Drop, Dear Diary (read 5 pages).

### 2.8 The thread: Great-Aunt Pim's letters

Eight letters, one per room, each found by doing something *meaningful* there (no pixel hunting):

| Room | How it appears |
| --- | --- |
| Living Room | Straighten the portrait completely and leave it alone for 10 s — it slips out of the frame. |
| Playground | Reach a rally of 5; Bip finds it stuck in the net. |
| Mood Room | Pin `rainbow` and hold up the mirror: the reflection hands it over. |
| Secret Space | Open the chest a second time (after the sock). |
| Memory Room | Visit on your 3rd day: it's "in the post". |
| After Hours | Connect a constellation that spells an initial. |
| Garden | Inside the moonflower seed head. |
| Attic | At the bottom of the last box. |

Letters are short (80–140 words), in Great-Aunt Pim's voice, and together tell why the house is
awake (she taught it to notice; she left it the instruction to "keep someone company"). Read them
in the Attic trunk. **All eight → the Finale**: next time After Hours is opened, everyone is on
the roof (all characters, Bip and Marguerite included), the portrait in the Living Room smiles
for good, and a final discovery "Family Reunion". Hints for missing letters appear in the trunk
("one is still in the garden").

### 2.9 Discoveries: more, and better

New entries in `content/secrets.ts` (glyphs added to `Glyph.tsx`), on top of the room-specific ones
above:

- **Patient** — stay completely still for 60 s in the Living Room: everyone creeps a little closer.
- **Gentle Hands** — hover Pim 10 times without clicking her once this visit: she shows you something.
- **Night Owl** — visit between 00:00 and 04:00 local time.
- **Tourist** — visit every room you know within 90 s.
- **Homebody** — 5 minutes in one room without leaving.
- **Almanac** — see every kind of weather.
- **Indoor Weather** — send Nimbus to another room.
- **Puddle Jumper** — volley with Bip in the rain.
- **Correspondent / The Whole Story / Family Reunion** — 1 letter / all letters / the finale.

Hint tiers: each discovery has `hint` (cryptic) and optional `nudge` that appears only after a
related discovery is found (layered, never a checklist). The Memory Room cabinet groups by room and
shows locked silhouettes with hints; toast copy rewritten per the voice guide.

### 2.10 Cross-room glue

- Bip waves over the Garden fence; radishes travel Garden → Playground; flowers Garden → Living Room.
- Dot comments on the weather in every room; Pim reacts to letters found elsewhere (gossip slot exists).
- Gramophone hum, Nimbus visits, weather everywhere, the finale on the roof.
- New combos in `behaviors/combos.ts` with INT ids from **INT-111** upward in INTERACTION_CATALOG.

---

## 3. Steps, branches and definition of done

Branching: integration branch **`phase-2`** off `main`. Each step: branch off `phase-2`, small
conventional commits, merge back with `--no-ff`. **Never push and never touch `main`** (pushing
`main` deploys to GitHub Pages) — the owner merges/pushes after reviewing `phase-2`.

| # | Branch | Scope | Depends on |
| --- | --- | --- | --- |
| 0 | `feat/p2-00-playground-volley` | Commit the Phase-1.5 polish already done (refresh fix, cursor clarity, Field Notes, Bip volleyball, achievements) + this plan. | — |
| 1 | `docs/p2-01-voice-guide` | VOICE.md + copy lint test (initially reporting, then enforcing after step 2). | 0 |
| 2 | `feat/p2-02-copy-pass` | Rewrite and expand all copy; enforce copy lint. | 1 |
| 3 | `feat/p2-03-memory-v3` | Schema v3, migration, validation, records (best rally/tower), diary log plumbing. | 0 |
| 4 | `feat/p2-04-weather-system` | `engine/weather.ts`, store, events, `useWeather`, `WeatherLayer`, almanac recording. | 3 |
| 5 | `feat/p2-05-mood-room` | Barometer pin, almanac, send Nimbus, combos, forecast; weather effects in Living Room, Playground, After Hours. | 4 |
| 6 | `feat/p2-06-nav-eight` | Hidden-room metadata, 8-room desktop nav, mobile "more"/scroll dock, test lists. | 0 |
| 7 | `feat/p2-07-garden` | Garden room complete (plants, growth, harvest, Inch, vase, radish shape, discoveries). | 3, 4, 6 |
| 8 | `feat/p2-08-attic` | Attic unlock, trunk, diary, Marguerite + hats, boxes, gramophone, discoveries. | 3, 6 |
| 9 | `feat/p2-09-letters` | Eight letters + triggers + reading UI + finale. | 5, 7, 8 |
| 10 | `feat/p2-10-discoveries` | Remaining discoveries, hint tiers, cabinet redesign, toasts. | 9 |
| 11 | `feat/p2-11-glue-polish` | Cross-room combos, Dot/Pim/Bip cameos, sound, motion & reduced-motion review. | 10 |
| 12 | `chore/p2-12-release` | Full QA (unit, e2e desktop+mobile, a11y, perf), docs (README, ARCHITECTURE, ROADMAP, DECISIONS, INTERACTION_CATALOG), screenshots, release notes. | all |

### Definition of done (every step)

1. `npm run check` green (typecheck, lint, unit) and new logic has unit tests (pure modules first).
2. Relevant e2e specs green on **desktop and mobile**; new rooms added to a11y/smoke/perf lists.
3. Visual check with Playwright screenshots at 1880, 1440, 1100 and Pixel 7, light and After Hours.
4. Reduced motion and keyboard paths checked for anything new.
5. Copy follows VOICE.md (copy lint green from step 2 on).
6. Docs touched where behavior changed; INTERACTION_CATALOG rows for new INT ids.
7. Commit(s) with `Co-Authored-By` trailer; merge `--no-ff` into `phase-2`; tick the progress log.

### How I work through it (notes to self)

- Start each step by re-reading this file's section for it and `git log phase-2 --oneline -5`.
- Pure logic first (engine/content + tests), then components, then behaviors, then visuals.
- Keep files from growing past ~600 lines: split rooms into components (Playground.tsx is already
  large — extract the volleyball code into `rooms/Playground/volley.ts` when touching it).
- Prefer data-driven content (`content/*.ts`) so copy and discoveries stay reviewable.
- Never change a test-referenced string without grepping `e2e/` and `src/**/*.test.tsx`.
- If a step uncovers a design question that only the owner can answer, note it under "Open
  questions" and continue with the most conservative option.
- Screenshots go to the session scratchpad, never into the repo (except README screenshots in step 12).

### Risks

| Risk | Mitigation |
| --- | --- |
| Scope creep (8 rooms, many systems) | Each step is shippable on its own; finale last; cut list below. |
| Weather effects become noise | One subtle effect per room per weather; reduced motion turns particles off. |
| Real-time growth is hard to test | Injectable clock; pure `growth(plot, now, weatherLog)` function with unit tests. |
| Memory migration bugs lose data | v2→v3 migration tests with fixtures; corrupt → safe defaults (existing pattern). |
| Mobile nav crowding | Measure at 360 px; e2e for the "more" sheet; keyboard and screen reader names. |
| Copy pass breaks tests | grep tests for every changed string; copy constants exported and reused in tests. |

**Cut list** (if time runs short, in this order): snails in fog, snapdragon, gramophone hum
cross-room, Marguerite's 4th hat, Tourist/Homebody discoveries.

---

## 4. Open questions for the owner

- Attic unlock fallback of 5 minutes — OK, or should it be fully hidden until 3 discoveries?
- Should Reset World also clear the garden (current plan: yes, like other room state)?

---

## 5. Progress log

| Step | Status | Notes |
| --- | --- | --- |
| 0 | done | Refresh fix, cursor clarity, Field Notes, Bip volleyball, rally discoveries, this plan. |
| 1 | done | VOICE.md (rules, character sheet, before/after) + copy lint test (banned formulas/words, bubble length, em-dash budget, duplicates). Fixed the 3 existing violations. |
| 2 | done | LINES rewritten per character voice and grown ~1.5×; 21 behavior pools rewritten (Nimbus as weather presenter, Dot as kid referee, Lumen as stage actor); Playground/Mood copy. New rooms will be written in-voice from the start. |
| 3 | done | Schema v3 (`world` keepsakes: garden, letters, almanac, diary ≤40, records, attic) with v2→v3 and v1→v3 migration and hostile-input cleaning; `state/keepsakes.ts`; diary lines for first visit, discoveries, rally/tower records; best rally persists; Memory Room "what is stored" updated honestly. |
| 4 | done | `engine/weather.ts` (9 weathers, mood map, 3-min pin; rain/snow pin-only), store + `WEATHER_CHANGED` + `view.weather`, `app/weatherSync.ts` (html[data-weather], almanac, re-entrancy safe), CSS-only `WeatherLayer` (pane/ambient, capped, static for reduced motion), `useWeather`. |
| 5 | done | Mood Room: Barometer (pin 8 weathers, countdown, effect caption, Nimbus refuses once when annoyed), Nimbus’s almanac (9 cards, first-seen dates), send Nimbus to Living Room/Playground (NimbusVisitor with local shower). House-wide effects: Living Room window (sky + curtains), weather remarks; Playground wind/slippery/snow caps/rainbow gravity/storm thunder + Bip lines, wind in flights; After Hours sky weather. Discoveries: The Almanac, Indoor Weather. INT catalog rows deferred to step 12. |
| 6 | done | Garden + Attic registered (stub rooms, routes, prefetch), `reveal` metadata (mysterious / unlockable), Attic unlisted until unlocked or visited (URL always works), short labels ≤1280px, mobile dock snap + keeps current room in view (without scrollIntoView, which moved the Tab start — caught by the keyboard e2e). All room lists in tests updated; new smoke test for the unlisted attic. |
| 7 | done | Garden: `growth.ts` (pure, real-time + away growth, weather rates, moonflower night-only), seed tin (5 packets in Great-Aunt Pim’s hand) + watering can, 6 plots in 3 beds, SVG stages, Bip over the fence, Inch commuting. Harvest: flowers → Living Room windowsill vase (persisted), radishes → Playground (new `radish` shape, appended to SHAPE_KINDS). Discoveries: Green Thumb, Came Back For It, Night Shift, Full Bloom, Root Vegetable Sports. Snails cut. |
| 8 | done | Living Room pull-cord (after 3 discoveries or 5 min; never a gate) drops a ladder → Attic. Attic: dim warm room (dark nav), round window with house weather, six boxes (4 hats, shoe, dust bunnies), Marguerite the dress form + hats (persisted), House Diary (paged, human dates, honest note), gramophone (original synth waltz), trunk placeholder for letters. Discoveries: Up the Ladder, Dress Rehearsal, Needle Drop, Dear Diary. Cross-room hum cut. |
| 9 | done | Eight letters in Great-Aunt Pim’s voice (`content/letters.ts`), `app/letters.ts` findLetter (keepsake, diary, toast, discoveries). Triggers: portrait after the keyhole; rally of 5; mirror under a rainbow; second look in the chest; third visit (Memory Room); constellation with the radio on; moonflower harvest; last attic box. Trunk reads them and hints at missing ones; LetterToast (bottom right). Finale: rooftop party in After Hours + Great-Aunt smiles for good in the Living Room. Discoveries: Correspondent, The Whole Story, Family Reunion. |
| 10 | done | Six discoveries: Patient (Living Room nods off), Gentle Hands (10 hovers, no pokes → Pim tells a secret), Night Owl (00–04 local), Tourist (every known room in 90 s), Homebody (5 min in one room), Puddle Jumper (volley in rain). `app/watchers.ts`. Layered hints (`after`) on 11 deeper secrets; cabinet grouped into one shelf per room with counts. Living letter now needs the key found (it was stepping on the keyhole moment). Found and fixed via e2e: Bip could miss on slow frames (hit check now per 16 ms slice) and could never reach a ball resting by the net. 43 secrets total. |
| 11 | done | Glue: garden flowers noticed in the Living Room (Ferdinand + Pim, via `living.vaseNew`), radishes greeted by Dot in the Playground, Dot’s weather opinions (Playground, Mood Room); existing gossip already covers discoveries in the new rooms. Reduced motion: global rule + per-component rules cover every new animation. Follow-up noted: Playground.tsx is ~840 lines; extracting the volleyball loop into a hook is a safe next refactor (not done here to avoid churn before release). |
| 12 | done | Docs: README (eight rooms, new screenshots for Playground, Mood Room, Garden, Attic; things to try; privacy lists keepsakes), ARCHITECTURE (Phase 2 modules), ROADMAP (Phase 2 table), DECISIONS 17–23, INTERACTION_CATALOG INT-111…136, PRODUCT_VISION room count. Final: 208 unit tests, 43 e2e (desktop + mobile, a11y, perf) green; production build OK. Not pushed: `phase-2` is ready for the owner to review and merge. |

---

# Phase 2.1 — "Hands-on" (refinement)

Owner feedback after release: the Garden and the Attic feel like menus of
buttons ("press it, see what it does"). The Playground works because you *do*
something with your hand (throw, aim, catch) and physics answers in a way that
isn't scripted. Both rooms get that treatment. Keyboard / screen-reader paths
stay complete (visually-hidden controls), but pointer play is physical.

## Garden: hands in the dirt

| Then | Now |
| --- | --- |
| click a packet, click a plot | pick a seed out of the tin and **throw** it; it arcs and grows where it lands. Grass: Inch eats it. Over the fence: Bip gets it. |
| click to water | **hold the watering can**: a stream of droplets with gravity; only drops that land on soil water a plant; moving fast sprays sideways |
| click a bloom to harvest | **pull** a ripe plant up against springy tension (let go early and it snaps back); then **throw** it: towards the house → vase; over the fence → Bip (radishes join his game, flowers he keeps) |
| static plants | plants lean as the pointer brushes past, sunflowers turn to follow it, snapdragons snap when you get close |

## Attic: the pile

| Then | Now |
| --- | --- |
| six "open box" buttons | a **physics pile** of boxes (Matter.js, lazy chunk shared with the Playground); drag them, pull one from the bottom and the pile topples |
| — | boxes **burst open** on a hard landing or a good shake; contents spill out as draggable objects (hats, the shoe, a dust puff, the letter fluttering down) |
| hat buttons | **drop or throw** hats onto Marguerite's head; a thrown hat that lands is a discovery ("Nice Shot") |
| play button | the record only plays while you **spin it by hand**: circular drag speed sets the tempo, spinning backwards plays the tune backwards; Marguerite sways in time |
| pager buttons | drag the diary page corner to turn it |

## Steps

| # | Branch | Scope |
| --- | --- | --- |
| R1 | `feat/p21-garden-hands` | Garden rewrite: seed throwing, pouring, pull + throw harvest, plants react; keyboard fallback; tests |
| R2 | `feat/p21-attic-pile` | Attic rewrite: physics pile, bursting boxes, physical items, hats on Marguerite (drop / throw), spin-to-play gramophone, page drag; tests |
| R3 | `chore/p21-release` | QA (unit, e2e desktop + mobile, a11y), docs, screenshots, merge to main, deploy |

## Progress log (2.1)

| Step | Status | Notes |
| --- | --- | --- |
| R1 | done | Garden rewritten by hand: `gardenSim.ts` (pure: seeds, drops, crops; soil / lawn / house / fence landings), seed throwing from the tin (Inch eats misses; over the fence to Bip), watering can stream (only soil drops water; stale hand speed decays), pull-with-tension harvest then throw (house → vase/Playground, fence → Bip), plants lean, sunflowers watch the pointer, snapdragons snap. Keyboard tools hidden until focused. New discoveries: Long Shot, A Bouquet for Bip. |
| R2 | done | Attic rewritten by hand: `pile.ts` (Matter.js stage with Marguerite on the left; boxes burst on a hard landing of their own or a good shake; settle period; no chain bursts), contents spill as draggable bodies (hats, shoe, dust puff, the letter from the last box), hats go on Marguerite when dropped on her head or thrown there (“Nice Shot”), `Gramophone.tsx` + `spin.ts` (record plays only while turned by hand; speed = tempo, backwards = backwards (“Scratch”); winds down), diary pages drag. Keyboard path: open next box, put hat on, give the record a spin. |
| R3 | todo | |

## Phase 2.1, revision 2 — three rooms, three languages

Owner feedback on the drag-based version: it is the Playground again
(grab, drag, throw), and the Garden and Attic feel like each other. Each room
now gets its own input language, and none is shared:

| Room | Language |
| --- | --- |
| Playground | grab, throw, catch (unchanged) |
| Garden | **you are the sun** (hover = light, height = time of day) and **drawing** (stroke shapes plant species; a quick slash cuts) |
| Attic | **scrub** away dust, **look** (hold still to replay a memory), **wheel** (Marguerite's hat carousel), **circle** (the record) |

| # | Branch | Scope |
| --- | --- | --- |
| R4 | `feat/p21-garden-sun` | Garden: light model, sun/sky/shadows/night from pointer, stroke recognizer (|, ○, 〰, ☾, @), slash to harvest, keyboard path |
| R5 | `feat/p21-attic-dust` | Attic: dust canvas + coverage, clean objects come alive, dwell memories on photos, wheel hats, record spin, letter under the dust, keyboard path |
| R6 | `chore/p21-release-2` | QA, docs, screenshots, deploy |
