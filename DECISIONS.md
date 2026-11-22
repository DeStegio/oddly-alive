# Decisions

Short architecture/design decision log. Newest at the bottom.

1. **Hash router.** GitHub Pages has no SPA rewrites; `#/playground` URLs work
   everywhere without a 404 trick.
2. **No animation library for character motion.** Characters animate via CSS
   keyframes keyed by `data-anim` / `data-expression` attributes set
   imperatively from the actor channel, plus a ~40-line spring helper for
   followers. This keeps per-frame work out of React and avoids mixing Motion
   and GSAP.
3. **Zustand** for low-frequency shared state (room, mood, discoveries,
   settings). High-frequency state (pointer, physics) is never in the store.
4. **Matter.js only in the Playground chunk.** Stacking/toppling piles is where a
   real solver earns its weight; everywhere else motion is authored.
5. **Fonts self-hosted** via Fontsource (Fraunces, Instrument Sans; SIL OFL) so
   the site makes zero third-party requests.
6. **Personality = 6 variables + 2 transient signals.** `repetition` and
   `confusion` decay within seconds; they let *annoyed* and *confused* exist
   without polluting the long-lived variables.
7. **Mood hysteresis.** A new mood must beat the current one by a margin and
   the current mood must have lasted ≥ 4 s, except reactive moods (annoyed,
   excited) which can preempt. Prevents flicker between moods.
8. **Memory defaults on, local only, with a visible off switch.** The brief
   asks for optional, transparent memory; the Memory Room explains exactly
   what is kept. Turning memory off deletes stored data and keeps everything
   in RAM for the session.
9. **References were not browsed.** Design is original; see DESIGN_DIRECTION.
10. **Behaviors say how, components do the direct manipulation.** Flipping
    the lamp, pressing the button and nudging the portrait change state
    immediately in the component. The engine only decides how the house
    responds. A dropped reaction can therefore never swallow a click.
11. **One reaction per actor channel, DIRECT cancels ambient.** This is how
    priority and "don't distract the reader" are enforced in one place (the
    scheduler), not in each behavior.
12. **Sound is never restored on a new visit.** Restoring "sound on" would
    effectively be autoplay. Every visit starts silent.
13. **Dot never intercepts clicks while following** and doesn't follow touch.
    E2E tests found that a cursor companion steals the clicks meant for what
    is under the cursor.
14. **Forget me latches.** After clearing, nothing is written until something
    new is discovered. Otherwise the store change made by clearing would
    re-save memory a moment later; an E2E test caught this.
15. **Performance claims are comparative.** The perf probe compares the app
    with a blank page under identical synthetic input, and tracing is off for
    that spec (its screencast alone halved the frame rate).
16. **Deployment via a `gh-pages` branch**, built with `BASE_PATH`. Hash
    routing means no SPA rewrites are needed.

## Phase 2

17. **Weather is derived, not stored.** It follows the mood unless the Mood
    Room barometer pins it for three minutes. Rain and snow only come from a
    pin, which gives the barometer a reason to exist.
18. **Flights outside the trays are hand-integrated, not Matter.** A thrown
    shape leaves the physics world and flies on a small, tested integrator
    (`flight.ts`) that Bip also uses to predict where it will come down;
    it rejoins Matter when it lands back in the tray. Sub-stepping keeps
    slow frames from tunnelling through the net or Bip's reach.
19. **Keepsakes are the only new persistence.** Memory v3 adds one validated
    `world` section (garden, letters, almanac, a 40-line diary, personal
    bests, attic) with v1/v2 migration. Reset World tidies garden beds and
    attic dress-up; letters, almanac, diary and bests stay.
20. **The garden catches up on the way in.** Growth is a pure function of
    elapsed time; time away is applied once when the Garden opens, at half
    speed and capped, so a return visit has a payoff without a timer
    running in the background.
21. **Nothing new is gated.** The Attic is unlisted until its cord is pulled,
    but its address always works; the cord appears after three discoveries
    or five minutes.
22. **The voice is tested where it can be.** `copy.test.ts` rejects formula
    sentences, banned words, long bubbles, em-dash habits and duplicates;
    `VOICE.md` covers the rest.
23. **Discoveries are a cabinet, not a checklist.** Deeper secrets keep their
    hint folded until a related find; shelves are grouped by room.

## Phase 2.1

24. **Rooms are played by hand.** The Garden and the Attic were menus of
    buttons; they now work like the Playground: throw, pour, pull, shake,
    spin. Every action keeps a keyboard / screen-reader equivalent (tools
    hidden until focused) so nothing depends on a pointer.
25. **Matter.js is used in the Attic too** (amends 4). The pile of boxes
    needs a real solver for stacking and toppling; it shares the lazily
    loaded physics chunk with the Playground. The Garden's seeds, water and
    thrown crops use a small hand-written integrator (`gardenSim.ts`),
    like the Playground's flights.
26. **Boxes burst only from their own impact.** A box opens when it lands
    hard itself or is shaken; a toppling neighbour doesn't count, and a
    freshly built pile has a settling period, so the pile never chain-
    reacts open by accident.
