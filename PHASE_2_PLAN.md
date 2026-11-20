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
| 5 | todo | |
| 6 | todo | |
| 7 | todo | |
| 8 | todo | |
| 9 | todo | |
| 10 | todo | |
| 11 | todo | |
| 12 | todo | |
