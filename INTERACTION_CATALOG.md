# Interaction Catalog

The master plan lists 110 ideas (INT-001 … INT-110). This file tracks every
one of them.

**Status legend**

- `verified`: built *and* exercised by an automated test (Vitest or Playwright). The test is named in the Evidence column.
- `implemented`: built and checked by hand in the running app (screenshots taken during development), with no automated test of its own.
- `deferred`: not built.

Behavior definitions carry an `implements: ['INT-0xx']` tag in
`src/behaviors/*.ts`, so you can grep any ID straight to its code. Each
behavior states its trigger (`on`), its preconditions (`rooms`, `when`), and
its cooldown and priority. It also says what it changes: actor commands,
`effects.setFlag`, `discover` and `nudge`. Cleanup is the function returned
from `run`; the scheduler calls it on finish, cancel and room exit. Keyboard
or touch alternatives are noted where they differ from the pointer.

**Totals:** 110 of 110 are built: 55 `verified`, 55 `implemented`, 0 `deferred`.
That is 125 registered behaviors in all, plus presentation-level reactions
in components. Several ideas are deliberately small, e.g. INT-033. The
"Notes" column calls out anything that is lighter than its name suggests.

Paths are relative to `src/`. `T:` lists the tests.

## A. Pointer and cursor

| ID | Behavior | Status | Where | Evidence / notes |
| --- | --- | --- | --- | --- |
| INT-001 | Eyes follow the cursor | implemented | `characters/Eye.tsx` | Pim, Dot, Tick, Nimbus share one imperative eye; settles and stops working when idle |
| INT-002 | Looks away when stared at | implemented | `behaviors/living.ts` `pim.stared`, `behaviors/mood.ts` | Stare = pointer still within radius for 2.2 s (`useProximity`) |
| INT-003 | Blinks on cursor approach | implemented | `living.ts` `pim.hover.blink` | |
| INT-004 | Text reacts to cursor proximity | implemented | `components/LivingTitle.tsx` | Letters dodge; a fast shove makes Pim comment (`title.shoved`) |
| INT-005 | Decorative object hides from cursor | implemented | `characters/DustBunny.tsx`, `bunny.hide` | |
| INT-006 | Object follows cursor with spring | implemented | `characters/Dot.tsx` | Off for touch and for reduced motion |
| INT-007 | Rapid pointer motion makes object dizzy | implemented | `dot.dizzy` | Frenzy detection in Dot's frame loop |
| INT-008 | Slow approach → shy | implemented | `pim.hover.shy` / `pim.hover.startled` | Fast approach startles instead |
| INT-009 | Repeated hover changes response | implemented | `pim.hover.familiar`, `pim.hover.friendly` | Hover counts per object |
| INT-010 | Small object mimics cursor path | implemented | `Dot.tsx` (mimic), `combos.ts` `dot.mimic.comment` | Dot retraces long strokes after the pointer stops (35%) |
| INT-011 | Optional cursor trail in select scenes | implemented | `components/StarTrail.tsx` | After Hours only; pooled; off for touch and for reduced motion |
| INT-012 | Remembers last cursor location temporarily | implemented | `Eye.tsx` | Eyes hold the last position for 3.5 s after the pointer leaves the page |
| INT-013 | Dragging moves nearby objects | implemented | `rooms/Playground/physics.ts` | A dragged body pushes neighbours through the solver |
| INT-014 | Character tries catching cursor | implemented | `Dot.tsx` lunge, `dot.caught` | |
| INT-015 | Repeated cursor circles → hidden response | verified | `characters/useSense.ts`, `pim.circled` | T: `behaviors/__tests__/living.test.ts` |

## B. Clicks and object interaction

| ID | Behavior | Status | Where | Evidence / notes |
| --- | --- | --- | --- | --- |
| INT-016 | Button response evolves over clicks | verified | `rooms/LivingRoom`, `button.*` | T: `LivingRoom.test.tsx`, `living.test.ts` |
| INT-017 | Object splits into smaller pieces | implemented | `bunny.split` | Dust bunny scatters into three and regroups |
| INT-018 | Shape changes personality when clicked | implemented | `Scenery.tsx` `Picture` | Great-Aunt goes stern → smiling → winking |
| INT-019 | Clicking one object triggers another | verified | `chain.dark` | Lamp off → Pim startled, Dot hides. T: `living.test.ts` |
| INT-020 | Harmless fake button protests | verified | `button.protest` | T: `living.test.ts` |
| INT-021 | Character suspicious of excessive clicks | verified | `pim.click.suspicious` | T: `living.test.ts` |
| INT-022 | Object changes behavior after drag | verified | Playground faces, `pg.throw.fast` | Fast throws leave shapes dizzy. T: `Playground.test.tsx` |
| INT-023 | Refuses once, then cooperates | verified | `tick.refuse`, `tick.spin` | T: `living.test.ts` |
| INT-024 | Clicking empty space → tiny surprise | implemented | `LivingRoom.tsx` poof, `wall.click` | |
| INT-025 | Secret revealed by action sequence | verified | `picture.nudge` (keyhole) | T: `living.test.ts`, `e2e/experience.spec.ts` |
| INT-026 | Characters react to each other's interactions | implemented | `dot.reacts.pim`, `pim.reacts.dot` | |
| INT-027 | Multi-object chain reaction | verified | `button.chain` | T: `living.test.ts` |
| INT-028 | Temporary stickers on surfaces | implemented | `LivingRoom.tsx` | Double-click the wall; max 6, fade after 30 s; pointer only (decorative) |
| INT-029 | Reversible mini-incident rearranges room | verified | `dot.zoomies` | Relaxes back on its own or with "Tidy up". T: `living.test.ts` |
| INT-030 | Object transforms several times | verified | `combos.ts` `pim.transform` | Outfits cycle; mood-dependent. T: `combos.test.ts` |

## C. Scroll and navigation

| ID | Behavior | Status | Where | Evidence / notes |
| --- | --- | --- | --- | --- |
| INT-031 | Headline reacts to scroll velocity | implemented | `components/ScrollThread.tsx` (`--skew`) | |
| INT-032 | Character accompanies you between sections | implemented | Dot in Living, Playground, Mood; `pg.welcome` | |
| INT-033 | Decorative scroll response, never blocks scroll | implemented | `plant.breeze`, passive listeners | Small by design |
| INT-034 | Scrolling upward triggers a reaction | implemented | `scroll.up` | |
| INT-035 | Revisiting an area changes the greeting | verified | `room.revisit`, `*.welcome` | T: `living.test.ts` |
| INT-036 | Environment shifts with scroll depth | implemented | `Basement.module.css` (`--depth`) | |
| INT-037 | Hidden mini-scene at a location | implemented | `Basement.tsx` mouse hole | Decorative |
| INT-038 | Object reacts at end of page | implemented | `scroll.end` | |
| INT-039 | Playful progress indicator | implemented | `ScrollThread.tsx` | A bead that smiles at the bottom |
| INT-040 | Navigation transition responds to mood | implemented | `app/Shell.module.css` | Bounce / fade / huff / peek / tilt |

## D. Keyboard

| ID | Behavior | Status | Where | Evidence / notes |
| --- | --- | --- | --- | --- |
| INT-041 | Harmless keys trigger effects | verified | `title.poke` | Typed title letters hop. T: `living.test.ts` |
| INT-042 | Secret key sequence | verified | `seq.hello` | T: `living.test.ts`, `e2e/experience.spec.ts` |
| INT-043 | Space makes a selected character jump | implemented | native button activation → click behaviors | "Selected" = focused; Space/Enter never hijacked globally |
| INT-044 | Arrows animate the selected object | verified | Playground shapes, Dot | T: `Playground.test.tsx`, E2E keyboard flow |
| INT-045 | Simple rhythm interaction | implemented | `seq.dance` | |
| INT-046 | Key combination reveals hidden message | implemented | `seq.wonk` | |
| INT-047 | Escape cancels nonessential effects | implemented | `engine/sensors.ts` → `world.calm()`; toasts and share sheet | |

## E. Environment

| ID | Behavior | Status | Where | Evidence / notes |
| --- | --- | --- | --- | --- |
| INT-048 | Background changes with mood | implemented | `engine/characterMood.ts`, `WorldProvider` | Tint + type axes |
| INT-049 | Objects react to nearby movement | implemented | `plant.rustle` | |
| INT-050 | After Hours ambience | verified | `rooms/AfterHours`, `night.ts` | T: `e2e/experience.spec.ts`, `AfterHours.test.tsx` |
| INT-051 | Sleepy after inactivity | verified | `idle.long` | T: `engine/__tests__/world.test.ts` |
| INT-052 | Reacts to return from another tab | implemented | `tab.return` | |
| INT-053 | Objects relax back | verified | `picture.nudge` cleanup, zoomies | T: `living.test.ts` |
| INT-054 | World grows more playful with discoveries | verified | `plant.grow`, leaves = 7 + discoveries | T: `living.test.ts` |
| INT-055 | Reversible scene transformation | verified | `mood.nap` | T: `MoodRoom.test.tsx` |
| INT-056 | New small character enters | verified | `rare.inch` + `RareLayer` | T: `secrets.test.ts` |
| INT-057 | Two characters interact independently | implemented | `dot.boops.pim`, `argue.time` | |
| INT-058 | Multiple objects react to a rare event | implemented | `rare.everyone-looks` | |
| INT-059 | Occasional original thought | implemented | `ambient.thought` | Line-level repetition control |
| INT-060 | Notices repeated visits to a room | verified | `room.revisit` | T: `living.test.ts` |

## F. Physics-inspired

| ID | Behavior | Status | Where | Evidence / notes |
| --- | --- | --- | --- | --- |
| INT-061 | Draggable objects have momentum | verified | `physics.ts` | T: `physics.test.ts` |
| INT-062 | Bounce at scene boundaries | verified | `physics.ts` walls | T: `physics.test.ts` |
| INT-063 | Pile responds to input | implemented | Shake, poke empty floor | |
| INT-064 | Collision feedback | implemented | squash + pooled sparks + sound | |
| INT-065 | Stackable objects | verified | `stackHeight()`, `pg.tower` | T: `physics.test.ts` |
| INT-066 | Unstable piles fall | implemented | Matter.js solver | |
| INT-067 | Gentle vs fast drag reactions | verified | `pg.throw.*` | T: `Playground.test.tsx` |
| INT-068 | Physics chain reactions | verified | ramp → dominoes | T: `physics.test.ts` |
| INT-069 | Weight / movement varies by object | verified | `SHAPES` table, buoyant balloon | T: `physics.test.ts` |
| INT-070 | Reset returns to stable state | verified | `PlaygroundSim.reset` | T: `physics.test.ts`, `Playground.test.tsx`, E2E |

## G. Personality and mood

| ID | Behavior | Status | Where | Evidence / notes |
| --- | --- | --- | --- | --- |
| INT-071 | Mood changes reaction timing | implemented | `moodTempo`, `helpers.tempo` | |
| INT-072 | Same action, mood-specific results | verified | `pim.click.*`, `mood.horn*` | T: `MoodRoom.test.tsx`, `combos.test.ts` |
| INT-073 | Reacts to being ignored | verified | `idle.short`, `plant.droop` | T: `world.test.ts` |
| INT-074 | Reacts to excessive attention | verified | `mood.annoyed`, `lamp.sulk` | T: `world.test.ts` |
| INT-075 | Characters disagree visually | verified | `argue.time` | T: `combos.test.ts` |
| INT-076 | Shy character opens up with time | verified | trust growth, `pim.hover.friendly` | T: `personality.test.ts` |
| INT-077 | Playful character initiates | implemented | `dot.initiate` | |
| INT-078 | Annoyed character recovers | verified | `mood.recover` | T: `personality.test.ts`, `world.test.ts` |
| INT-079 | Mood visible in environment | implemented | tint, weather window, type axes | |
| INT-080 | Mood influences another room | verified | shared personality; cross-room chains | T: `world.test.ts`, `MoodRoom.test.tsx`, `combos.test.ts` |

## H. Secrets

| ID | Behavior | Status | Where | Evidence / notes |
| --- | --- | --- | --- | --- |
| INT-081 | Hidden clickable object | verified | chest, candle, floorboard | T: `secrets.test.ts` |
| INT-082 | Secret character appearance | verified | Great-Aunt Pim (`secret.combo.right`) | T: `secrets.test.ts` |
| INT-083 | Rare reaction for a discoverable combo | verified | `mood.mirror.wink`, `mood.moodswing` | T: `MoodRoom.test.tsx` |
| INT-084 | Hidden typography variation | implemented | `seq.wonk` (Fraunces WONK axis) | |
| INT-085 | Playful visual inside joke | implemented | Great-Aunt Pim portrait ↔ cabinet | |
| INT-086 | Secret-space interaction | verified | torch, token puzzle | T: `secrets.test.ts` |
| INT-087 | Harmless fake error that self-resolves | verified | `rare.fake-error` | Labelled "not a real error". T: `secrets.test.ts` |
| INT-088 | Character pretends to sleep | implemented | `night.pim.click`, `idle.long` | |
| INT-089 | Background prop becomes main character | implemented | `lamp.spotlight`, `rare.picture-swing` | |
| INT-090 | Return visit triggers a surprise | verified | `return.surprise` | T: `memory.test.ts` |
| INT-091 | Footer Easter egg | implemented | `floorboard` | |
| INT-092 | Combine objects → scene transformation | verified | `mood.nap`, constellation | T: `MoodRoom.test.tsx`, `AfterHours.test.tsx` |
| INT-093 | Multi-character visual gag | implemented | `seq.hello`, `rare.everyone-looks` | |
| INT-094 | Rare event changes environment temporarily | implemented | shooting star, gravity hiccup | |
| INT-095 | Secret linked to an earlier discovery | verified | keyhole → key → chest; gossip | T: `e2e/experience.spec.ts`, `combos.test.ts` |

## I. Memory

| ID | Behavior | Status | Where | Evidence / notes |
| --- | --- | --- | --- | --- |
| INT-096 | Recognize return visits locally | verified | `app/memorySync.ts` | T: `memory.test.ts` |
| INT-097 | Remember discoveries | verified | `memorySync.ts` | T: `memory.test.ts`, E2E reload |
| INT-098 | Playful locally generated nickname | verified | `content/nickname.ts` | T: `memory.test.ts`, `MemoryRoom.test.tsx` |
| INT-099 | Favourite object influences response | implemented | `return.favorite` | |
| INT-100 | Remember last explored room | implemented | Living Room link, Memory Room | |
| INT-101 | View local discoveries | verified | Memory Room, Secret cabinet | T: `MemoryRoom.test.tsx` |
| INT-102 | Forget Me / clear memory | verified | `clearMemory` | T: `memory.test.ts`, E2E |
| INT-103 | Restore visual customizations | implemented | motion, After Hours restored | Sound is deliberately never restored |
| INT-104 | No behavioral data to analytics | implemented | by design | The codebase has no network calls |
| INT-105 | Persist only minimal continuity data | verified | `engine/memory.ts` validation | T: `memory.test.ts` |

## J. Shareability

| ID | Behavior | Status | Where | Evidence / notes |
| --- | --- | --- | --- | --- |
| INT-106 | Shareable scene snapshot | verified | `app/postcard.ts` | T: `app/share.test.ts` |
| INT-107 | Export a playful postcard image | verified | `renderPostcard`, Share sheet | T: `share.test.ts` (SVG); PNG export checked in Chromium |
| INT-108 | Reproducible scene seed | verified | `app/share.ts` `sceneVariant` | T: `share.test.ts`, E2E |
| INT-109 | Share a visual arrangement | verified | `rooms/Playground/share.ts` | T: `Playground.test.tsx` |
| INT-110 | Copyable scene link, no accounts | verified | `components/ShareSheet.tsx` | T: E2E share-link test |
