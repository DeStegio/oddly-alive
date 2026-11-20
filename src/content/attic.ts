/**
 * Attic copy. Marguerite is a dress form who used to run a costume
 * department and has not stopped (VOICE.md). The boxes hold small things with
 * small stories; four of them hold hats.
 */
export const HATS = ['beret', 'topper', 'sunhat', 'crown'] as const;
export type HatId = (typeof HATS)[number];

export const HAT_NAMES: Record<HatId, string> = {
  beret: 'a green beret',
  topper: 'a battered top hat',
  sunhat: 'a straw sun hat',
  crown: 'a paper crown',
};

/** Marguerite, trying each hat on. */
export const MARGUERITE_HATS: Record<HatId, string> = {
  beret: 'a beret. I feel I should be painting something.',
  topper: 'the top hat. act three, the ballroom. darling.',
  sunhat: 'straw. it’s June somewhere, I suppose.',
  crown: 'paper, but it’s the thought. hold the curtain.',
};
export const MARGUERITE_IDLE = ['don’t mind the pins.', 'I had a waist once. it was the fashion.', 'bring me something to wear. I’m going spare up here.', 'mind the third beam. everybody hits the third beam.'];
export const MARGUERITE_ALL = 'all four. we’ll open on Thursday.';

export interface BoxFind {
  id: string;
  label: string;
  /** What's inside: a hat, or a thing with a line about it. */
  hat?: HatId;
  title: string;
  story: string;
}

export const BOXES: BoxFind[] = [
  { id: 'box-xmas', label: 'A box marked XMAS (it isn’t)', hat: 'crown', title: 'A paper crown', story: 'Pulled out of a cracker at least twenty years ago. Still wearable.' },
  { id: 'box-shoes', label: 'A shoebox with string round it', title: 'One brown shoe', story: 'Nobody remembers the other one. Tick says it walked off.' },
  { id: 'box-holiday', label: 'A suitcase with a broken clasp', hat: 'sunhat', title: 'A straw sun hat', story: 'Sand still in the brim. Somebody had a good week once.' },
  { id: 'box-dust', label: 'A box that’s mostly dust', title: 'A family of dust bunnies', story: 'Seven of them. They were here first, they’d like you to know.' },
  { id: 'box-theatre', label: 'A hatbox with a theatre ticket stuck on', hat: 'topper', title: 'A battered top hat', story: 'Lumen claims he wore it in a play. Lumen is a lamp.' },
  { id: 'box-art', label: 'A crate of paint tins', hat: 'beret', title: 'A green beret', story: 'Underneath: one painting of the sofa, unfinished. Pim is in it, blurry.' },
];

/** The gramophone. */
export const GRAMOPHONE = ['the needle’s down. mind the crackle.', 'one of hers. she wouldn’t say what it was called.'];

/** The house diary: a plain note about where it came from (honesty rules). */
export const DIARY_NOTE = 'The house writes this from what it saw in this browser. Nothing else, and nothing leaves.';
export const DIARY_EMPTY = 'Nothing written yet. Give it a day.';

/** Small human dates for diary lines: "today, late morning", "last Tuesday, evening". */
export function diaryDate(at: number, now = Date.now()): string {
  const d = new Date(at);
  const h = d.getHours();
  const part = h < 5 ? 'in the small hours' : h < 9 ? 'early morning' : h < 12 ? 'late morning' : h < 14 ? 'lunchtime' : h < 18 ? 'afternoon' : h < 22 ? 'evening' : 'late at night';
  const day = (x: number) => Math.floor((x - new Date(x).getTimezoneOffset() * 60_000) / 86_400_000);
  const ago = day(now) - day(at);
  if (ago <= 0) return `today, ${part}`;
  if (ago === 1) return `yesterday, ${part}`;
  if (ago < 7) return `${d.toLocaleDateString(undefined, { weekday: 'long' })}, ${part}`;
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}, ${part}`;
}

/** The Living Room ceiling cord that drops the ladder. */
export const CORD_LINES = ['there’s a cord. there’s always been a cord.', 'pull it. gently. the ladder’s old.'];
export const LADDER_LINES = ['the ladder came down. mind your head up there.', 'oh. we have an attic. I forgot we had an attic.'];
