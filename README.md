# Oddly Alive

> A website with a mind of its own. *It's not broken. It's just being itself.*

![The Living Room](docs/screenshots/living-room.png)

Oddly Alive is an interactive house of eight rooms. The whole site behaves like
one character with moods. It notices what you do on the page and answers
through behavior:
- title letters lean away from your pointer
- a shy blob looks away if you stare
- a lamp sulks if you flick it too often
- a fern grows a leaf for every secret you find
- the weather follows the house's mood, and every room feels it
- a robot next door plays volleyball with whatever you throw over the fence
- Great-Aunt Pim left a letter in every room

There is no goal, score, tutorial or chatbot. The activity is the website itself.

**Live demo:** https://destegio.github.io/oddly-alive/. Every push to `main` builds it to the `gh-pages` branch; GitHub Pages has to be pointed at that branch once (see "Deployment").

## The rooms

| | |
| --- | --- |
| **Living Room**: Pim the shy blob, Dot the follower, Lumen the lamp, Tick the clock, Ferdinand the fern, a dust bunny, and characters with plans of their own: Tick straightens the crooked portrait, Dot pinches the sofa cushion or Pim's teacup (put them back, or don't), Lumen stages a spotlight show. The do-not-press button has feelings: go at it and it builds a glass box over itself; lift the glass once it has calmed down, loosen its bolts, wait it out, or ask Dot. A very small painting on the wall is of this room: zoom into it for **Infinite Rooms**, a seemingly endless run of impossible living rooms, each with a way into the next. | ![Living Room on a phone](docs/screenshots/mobile-living-room.png) |
| **Playground**: Matter.js shapes with faces. They have momentum, stack and collide, and the room opens with a ramp-and-domino chain reaction. Throw something hard enough and it leaves the tray: over the fence, Bip volleys it back. Further down, **Back-Fence Volley**: you are Dot, Bip is over the fence; timing your swing shapes the shot; play with a ball, a balloon, a radish, a soft cube or (once the attic is found) a slipper. Field Notes keep score. | ![Playground](docs/screenshots/playground.png) |
| **Mood Room**: a tall window onto the house weather. Six objects on the sill nudge the mood; a barometer pins the weather; and the weather has consequences: rain and tea steam the window up (draw in it), wind takes the papers off the sill, snow and the blanket make Nimbus a tent, a rainbow and the mirror throw colour round the room. Nimbus breathes on the glass and blows the odd gust himself. | ![Mood Room](docs/screenshots/mood-room.png) |
| **Secret Space**: a dark cabinet lit by a torch that follows your pointer. It shows every secret, with optional hints, plus a chest, a token puzzle and invisible ink. | ![Secret Space](docs/screenshots/secret-space.png) |
| **Memory Room**: everything the house remembers about this browser: visits, secrets, favourite things to poke and a silly nickname. It also has Reset Session, Reset World and Forget me. | ![Memory Room](docs/screenshots/memory-room.png) |
| **After Hours**: a rooftop at night with a moon that's too close, a radio, a porch light and a moth. The stars are an instrument: every star has a note, and a constellation plays as a tune (the stars light as they sound, so it works with the sound off). | ![After Hours](docs/screenshots/after-hours.png) |
| **Garden**: you are the sun. Move over the sky and the light follows: plants grow where it falls, lean after it, and their shadows swing round; sink it behind the fence for night, fireflies and moonflowers. Draw shapes in the soil to plant (a line, a circle, a zigzag, a crescent, a spiral), swipe across anything ripe to pick it. Strong sun dries the beds, so draw a cloud in the sky for rain; rain opposite the sun makes a rainbow. Bees and a butterfly carry pollen from flower to flower and sometimes cross them into a new variety for the vase; Crumb the sparrow comes for newly planted seeds. | ![Garden](docs/screenshots/garden.png) |
| **Attic**: up a ladder from the Living Room, under years of dust. Rub it off and dust bunnies run for whatever dust is left. Keep still over a clean photograph and it remembers one of Great-Aunt Pim's stories, with a number in pencil on the back; the trunk's lock wants all three. The wheel changes Marguerite's hat, the record plays while you turn it, and something is lying on the floor. By the old sheet, a **shadow theatre**: a lamp and things to hold up to it; some shapes come alive. | ![Attic](docs/screenshots/attic.png) |

Phase 3 in pictures (the button behind its glass, Infinite Rooms, Back-Fence Volley, the shadow theatre):

![The button behind glass](docs/screenshots/button-glass.png) ![Infinite Rooms](docs/screenshots/infinite-rooms.png)
![Back-Fence Volley](docs/screenshots/volley.png) ![Shadow theatre](docs/screenshots/shadow-theatre.png)

You can share any scene as a link or as a generated postcard:

![A postcard](docs/screenshots/postcard.png)

## Things to try (mild spoilers)

- Hover slowly near Pim, then stare. Then draw three circles around Pim.
- Press the button that says *do not press*. Keep going.
- Nudge Great-Aunt Pim's portrait. Then visit the Playground.
- Type `hello`, `wonk` or `dance` anywhere.
- In the Mood Room, pour tea and then unfold the blanket.
- Find something in one room, then go back to the Living Room and listen.
- Throw a pebble hard over the fence in the Playground. Catch it when it comes back.
- Pin rain in the Mood Room, then visit the Garden. Pin a rainbow and hold up the mirror.
- Draw a crescent in the Garden soil, sink the sun, and lead the fireflies to it.
- In the attic, keep very still in front of a photograph. Spin the record backwards.
- Look up in the Living Room once you have found a few things.
- Press the button three times, quickly. Then wait. Or don't.
- Leave the Living Room alone for a minute and watch.
- Zoom into the very small painting next to the clock. Keep going; check the clocks.
- Cross your two hands in front of the attic lamp.
- Join five stars after hours, with the sound on.

There are 67 secrets and eight letters. None of them is required for anything.

## How it works

Every interaction goes through one typed, event-driven engine. There is no
pile of click handlers.

```
DOM input ─► typed WorldEvent ─► personality (6 bounded variables → 10 moods)
                               ─► counters / memory / discoveries (plugins)
                               ─► behavior engine: eligible behaviors → cooldowns → predicates
                                  → seeded weighted pick (recent repeats down-weighted)
                               ─► reaction scheduler: priorities, one reaction per actor,
                                  ambient cap, guaranteed cleanup/cancellation
                               ─► actor channel ─► characters (imperative, no global re-render)
```

- **125 behaviors** cover all 110 catalogue ideas
  ([`INTERACTION_CATALOG.md`](INTERACTION_CATALOG.md)). Each lists its
  trigger, preconditions, priority, cooldown and cleanup in
  `src/behaviors/*.ts`.
- **The personality is honest.** It is six numbers and explicit rules, with
  hysteresis so moods don't flicker. The site never claims to feel anything,
  and the copy says so.
- **High-frequency state stays out of React.** The pointer, springs, eyes,
  letters and physics run in one shared `requestAnimationFrame` loop. That
  loop pauses when the tab is hidden and skips work when nothing moves.
- **Determinism:** the RNG is seeded, the clock injectable and the scheduler
  testable. A shared link's seed reproduces the scene's variations.

More detail: [`ARCHITECTURE.md`](ARCHITECTURE.md), [`DECISIONS.md`](DECISIONS.md),
[`DESIGN_DIRECTION.md`](DESIGN_DIRECTION.md), [`PRODUCT_VISION.md`](PRODUCT_VISION.md).

## Privacy

- The site only observes events inside this page. There is no camera,
  microphone, history or fingerprinting.
- There are no analytics, no backend and no network calls. Fonts are
  self-hosted.
- Memory is a small, versioned record in `localStorage`:
  - visits
  - discoveries
  - per-object counts
  - a trust number
  - a few settings
  - keepsakes: the garden, letters found, weather seen, personal bests, and a
    short diary (40 lines at most) with the date of a few big moments

  The Memory Room shows the raw data and can delete it. Memory can also be
  switched off.
- Shared links carry only the room, a scene seed, the night switch and (in
  the Playground) where the shapes are.

## Accessibility

- Every interactive prop is a real `<button>` with a label. Every behavior can
  be reached by keyboard, or has a keyboard equivalent: arrows push shapes and
  move Dot; stars connect with Enter.
- There is a skip link and a persistent nav that never animates away. Escape
  calms all effects.
- `prefers-reduced-motion` is respected and can be toggled in the nav. Nothing
  flashes; the neon sign hums slowly.
- Sound is opt-in and synthesized, with no audio files. It is never restored
  on a new visit and is suspended in hidden tabs.
- axe-core reports 0 serious or critical WCAG A/AA violations in every room,
  on desktop and mobile. See [`TESTING.md`](TESTING.md) for what that does
  and doesn't prove.

## Stack

React 18 · TypeScript (strict) · Vite · Zustand · CSS Modules · Matter.js
(Playground only, lazy-loaded) · Web Audio · Vitest + Testing Library ·
Playwright + axe-core. Fonts: Fraunces and Instrument Sans (SIL OFL), via
Fontsource.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # typecheck + lint + unit tests
npx playwright install chromium && npm run e2e
npm run build        # production build in dist/
```

Results of the last full run, with measured performance and known gaps, are
in [`TESTING.md`](TESTING.md).

## Deployment

`.github/workflows/deploy.yml` runs the checks, builds with
`BASE_PATH=/oddly-alive/` and publishes `dist/` to the `gh-pages` branch. The
app uses hash routing, so deep links work on static hosting with no rewrites.

One-time setup: **Settings → Pages → Build and deployment → Source: Deploy
from a branch → `gh-pages` / `(root)`**.

## Limitations

- There has been no usability testing with real people yet. The
  experience targets are hypotheses.
- Only Chromium was tested automatically.
- Mobile performance has not been measured on real devices.
- Audio levels have not been tuned by ear.

## Credits

Concept, design, characters, code and copy are original to this project.
Inspiration sites listed in the brief were not browsed or copied. Fraunces
and Instrument Sans are used under the SIL Open Font License.
