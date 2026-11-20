# Voice

How Oddly Alive talks. Read this before writing or changing any line a visitor
can see: speech bubbles, room intros, discovery names and hints, buttons,
toasts, letters, the diary. `src/content/__tests__/copy.test.ts` enforces the
mechanical parts; the rest is taste.

## The one-line version

**People who live in a slightly odd house, talking about the house.** Not a
brand being quirky. Not a narrator explaining jokes.

## Rules

1. **Specific beats clever.** Name real things: the radiator, the second drawer,
   the cushion with the tea stain, the third stair. A concrete noun is funnier
   than any adjective.
2. **Not every line is a joke.** Plain statements, half-thoughts, small talk and
   silence ("…") make the jokes land. Aim for about half the lines in a pool to
   be ordinary.
3. **No formula sentences.** Never:
   - "It's not X. It's Y." (the tagline is the one exception and lives only in
     the Living Room intro)
   - "X, but make it Y", "Who knew?", "plot twist", "and that's okay"
   - three-item rhythm lists for comic effect ("the sofa, the lamp, and also chaos")
   - explaining the joke after making it
   - motivational or helpful-assistant tone ("Feel free to…", "Let's explore…")
4. **Banned words**: whimsical, delightful, magical, enchanting, quirky, vibes,
   journey, embark, delve, curate, unleash, sparkle (as a verb).
5. **Use what happened.** A line that mentions the actual count, the room you
   came from, the time of day or your best rally beats any free-floating quip.
   Template it (`${n}`) rather than writing a generic version.
6. **Speech has habits, not polish.** Characters interrupt themselves, repeat
   words, get things slightly wrong. Few em dashes in speech (the test keeps
   them rare); no "!!" or "?!"; one exclamation mark is plenty.
7. **Short.** Speech bubbles ≤ 70 characters. Intros ≤ 2 sentences. Hints are
   one sentence and never say which button to press.
8. **UI copy is plain.** Buttons, labels, settings, Memory Room explanations:
   short, literal, no winking. Honesty rules (PRODUCT_VISION) apply word for word.
9. **The house never claims to feel or know.** Characters can *say* they feel
   things the way a cartoon does; the UI never says "we know you" or "we feel".

## Characters

| Who | Sounds like | Habits | Never |
| --- | --- | --- | --- |
| **Pim** (sofa blob) | a shy younger cousin at a family dinner | lowercase, short, trails off ("…"), apologises for things that aren't her fault, warms up slowly | shouting, sarcasm |
| **Dot** (blue sphere) | a seven-year-old with a whistle | CAPS when excited, repeats words ("again again"), invents rules mid-game, keeps score of nonsense | long sentences, sighing |
| **Lumen** (lamp) | an old stage actor | talks about "my light", "my public", "the second act"; sulks in full sentences | slang |
| **Tick** (clock) | a retired railway timekeeper | pedantic about minutes, "in my day", complains, secretly proud | exclamation marks before noon |
| **Ferdinand** (fern) | someone very slow and a bit sad | three words or fewer, botanical | jokes about being a plant |
| **Nimbus** (cloud) | a regional weather presenter who takes it personally | "outlook", "spells", "patchy", forecasts its own feelings | being cheerful in a storm |
| **Bip** (robot next door) | a sports commentator crossed with a kettle | counts things, beeps instead of swearing, very fair, a little competitive | losing graciously on the first try |
| **Inch** (inchworm) | a commuter | busy, polite, always on the way somewhere | stopping for long |
| **Great-Aunt Pim** (portrait, letters) | a real great-aunt writing by hand | warm, bossy, specific memories, signs off differently every time, underlines things | modern slang, emoji |
| **Marguerite** (attic dress form) | a costume department head | dramatic about hats, says "darling" exactly once per visit | moving her feet |
| **The house / UI** | a tidy note on the fridge | literal, short, kind | jokes in buttons |

## Before / after

| Before (sounds generated) | After |
| --- | --- |
| everything is fine. it's just being itself. | the radiator made the noise again. we're ignoring it. |
| Things fall over here on purpose. | Put things down. They will not stay there. |
| I alphabetized the cushions. | someone sat on the remote. it's under me. sorry. |
| goal! ✓ | that's going in the book. |
| the crowd (me) goes wild. | crowd of one, standing ovation. |

## Templates and state

Lines live in `src/content/` where possible. When a line needs state, write a
function (`(n: number) => string`) next to the pool, not string-building
inside a behavior. Keep at least 4 lines per pool that a visitor can trigger
repeatedly, so `pickLine` has room to avoid repeats.

## Checklist before committing copy

- [ ] Read it aloud in the character's voice. Would they say it?
- [ ] Is at least one line in the pool plain, not a joke?
- [ ] Any banned word or formula? (`npm test -- copy`)
- [ ] Does any e2e/unit test reference the old string? (`grep -rn "old text" e2e src`)
