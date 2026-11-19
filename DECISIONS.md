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
