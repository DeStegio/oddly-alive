# Oddly Alive — Product Vision

> A website with a mind of its own.
> *It's not broken. It's just being itself.*

## What it is

Oddly Alive is a small interactive world built out of a website. Six rooms of one
slightly too-awake house share a single, consistent fictional personality. The
house notices what you do *inside the page* — where your pointer goes, what you
click, how fast you scroll, when you wander off — and it answers through
behavior: characters change expression, props sulk, typography leans away from
you, a plant grows a leaf every time you discover something.

There is no goal, no score, no tutorial and no chatbot. The activity is the
website itself.

## Who it is for

- Visitors who arrive curious and want to poke at something charming for one to
  five minutes, then maybe come back.
- Reviewers of a frontend portfolio, who should be able to read the code and see
  an event-driven behavior system rather than a pile of click handlers.

## Pillars

| Pillar | What it means in practice |
| --- | --- |
| **Awareness** | Reacts to pointer, click, drag, scroll, keys, idleness, tab switches and return visits. Only events that happen inside the page. |
| **Personality** | Six bounded internal variables derive ten fictional moods. Mood changes timing, wording and which reactions are eligible. |
| **Surprise** | Chain reactions between objects, a rare-event director, secrets linked across rooms. |
| **Persistence** | A tiny, versioned, local-only memory (visits, discoveries, favourite objects, a silly nickname), viewable and erasable at any time. |

## Honesty rules

- The site never claims to be conscious, to feel, or to "know" the visitor.
  Copy is written as an in-character joke, and the Memory Room says plainly what
  is stored and where.
- Nothing is transmitted. No analytics, no accounts, no backend.
- No camera, microphone, browsing history or fingerprinting.

## Experience targets (hypotheses to test, not guarantees)

| Window | Target |
| --- | --- |
| 5 s | The title letters lean away from the pointer and Pim the shy blob glances at you, then away. One clear, gentle, unusual response. |
| 30 s | At least three obvious affordances: eyes that follow, a lamp that switches, a button that says *do not press*, letters that dodge. |
| 2 min | A chain reaction (lamp → Pim → plant), a mood shift, one surprise, and a door into another room. |
| 5 min | Rare events, secrets that point to other rooms, After Hours, the Memory Room reflecting what you did. |

## Non-goals

- Levels, quests, achievements framed as a checklist, mandatory puzzles.
- A mascot doing all the work. Personality is distributed across objects, text,
  shapes and space.
- 3D, accounts, server, LLM-generated reactions.
