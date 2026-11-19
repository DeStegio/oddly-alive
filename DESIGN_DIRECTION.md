# Design Direction

## Concept: "The Paper House Is Awake"

Every room is composed like a spread in an independent print magazine that has
been cut out of coloured paper and propped up on a stage. Flat colour fields,
thick ink outlines, hard offset shadows (never blurry glows), a faint paper
grain, and very large editorial type that is itself a character.

Key visual moves:

1. **Hard print shadows.** Objects cast a solid ink shadow offset by 3–6 px.
   Pressing an object physically closes the gap. This gives a tactile,
   letterpress feel without glassmorphism.
2. **Ink line.** Characters and props share one 2.5 px ink stroke with round
   joins, so a lamp, a blob and a clock read as the same hand-made world.
3. **Living type.** The display face is *Fraunces* (variable, SIL OFL), whose
   `SOFT` and `WONK` axes are driven by mood: mischief makes it wonky,
   affection makes it soft, annoyance makes it heavy. The UI face is
   *Instrument Sans* (SIL OFL), self-hosted via Fontsource — no font CDN calls.
4. **Asymmetry and air.** Compositions sit off-centre with a deliberate empty
   area where reactions can happen (thought bubbles, visitors, weather).
5. **Each room has its own spatial idea**, not a template:
   - Living Room — a cosy stage set seen head-on: wall, horizon line, floorboards.
   - Playground — an empty paper tray seen from above-ish, objects tumble in.
   - Mood Room — a tall window whose weather *is* the mood.
   - Secret Space — a dark cabinet of curiosities, lit by a pool of light.
   - Memory Room — a pinned scrapbook / corkboard.
   - After Hours — a rooftop at night with a moon that is slightly too close.

## Palette (tokens)

| Token | Day | After Hours | Use |
| --- | --- | --- | --- |
| `--canvas` | `#F6F1E8` | `#1D1B26` | page background |
| `--canvas-deep` | `#EDE4D3` | `#15141C` | floors, recessed areas |
| `--ink` | `#24232B` | `#F3EDE2` | text, outlines |
| `--ink-soft` | `#5B5866` | `#A9A3B4` | secondary text (AA on canvas) |
| `--coral` | `#F57963` | `#FF8C76` | warmth, lamp, alerts that are jokes |
| `--blue` | `#657BE8` | `#8496FF` | Dot, links, focus ring |
| `--yellow` | `#F5D873` | `#F2D46B` | light, discoveries |
| `--mint` | `#A6D7B3` | `#7FBF97` | plants, calm |
| `--lavender` | `#B9A5DB` | `#9D88C7` | Pim, shyness |

Restraint rule: a room uses canvas + ink + **at most two** dominant accents;
the others appear only as small details. Text is always `--ink` or
`--ink-soft` on canvas (contrast ≥ 4.5:1). Focus ring: 3 px `--blue` + 2 px
canvas offset, visible in both themes.

Mood tints the canvas by a few percent (`--mood-tint`) — the room's air changes,
not a big dashboard colour swap.

## Typography

- Display: Fraunces Variable, optical size high, weights 300–900,
  `font-variation-settings: "SOFT" var(--soft), "WONK" var(--wonk)`.
- UI/body: Instrument Sans, 15–18 px base, 1.5 line-height.
- Mono: system monospace, only for the Memory Room's ledger and the fake error.
- Scale (clamp-based, fluid): 13 / 15 / 18 / 24 / 36 / 56 / 96 / 160.

## Characters

| Name | Shape | Lives | Temperament |
| --- | --- | --- | --- |
| **Pim** | lavender pebble-blob with big eyes | sofa, Living Room | shy, opens up as trust grows; looks away if stared at |
| **Dot** | small blue sphere, one eye | everywhere (follows you between rooms) | playful, mischievous, imitates your path, tries to catch the cursor |
| **Lumen** | coral floor lamp | Living Room | proud, sulks when switched too often, briefly becomes the main character |
| **Ferdinand** | fern in a yellow pot | Living Room | grows one leaf per discovery, droops when ignored |
| **Tick** | wall clock with a face | Living Room | sleepy, gets dizzy when spun |
| **Inch** | mint inchworm | rare visitor, any room | cameo character, crosses the floor |
| **Nimbus** | a small cloud | Mood Room | is the weather; mirrors the house's mood |
| **The Moth** | pale moth | After Hours | drawn to any light you turn on |
| **The Title** | the words *Oddly Alive* | top of every room | letters dodge, lean, get wonky |

Expressive vocabulary (shared by Pim, Dot, Tick, Nimbus): eyelids (open / half
/ closed), pupils (position + size), brows (flat / raised / angled), mouth
(line / smile / o / squiggle / smirk), cheeks (blush), body squash & stretch.

## Motion

- Easing tokens: `--ease-spring` (overshoot), `--ease-out`, `--ease-in-out`.
- Durations: 120 (tap), 240 (UI), 480 (character), 900 (scene).
- Squash & stretch on press; settle with a single small overshoot.
- Never flash or strobe. Lamp "flickers" are slow dims (≥ 400 ms).
- `prefers-reduced-motion` → `data-motion="reduced"`: no follow springs, no
  ambient loops, transitions become cross-fades. User can override in settings.

## Iconography

No icon library as identity. The few UI glyphs (sound, motion, moon, map) are
hand-drawn inline SVG in the same ink stroke.

## Reference research — limitation

The brief lists neal.fun, bruno-simon.com, patatap.com, memorabl.es and
Awwwards. These were **not browsed** during this build; nothing was copied.
General principles used from common knowledge of the genre: an instant hook in
the first second, affordances that are visible before they are explained,
pacing surprises so they feel earned, and one strong composition per screen.
All visuals, characters, mechanics and sounds here are original.
