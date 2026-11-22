/**
 * Attic copy. Everything up here is under years of dust. Marguerite is a
 * dress form who used to run a costume department and has not stopped
 * (VOICE.md). The photographs are Great-Aunt Pim's, and so are the memories.
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
export const MARGUERITE_BARE = 'nothing on. very modern.';
export const MARGUERITE_NO_HATS = 'nothing to try on yet. there are hats under all this dust.';
export const MARGUERITE_IDLE = ['don’t mind the pins.', 'I had a waist once. it was the fashion.', 'roll the wheel at me. I’ll change.', 'mind the third beam. everybody hits the third beam.'];
export const MARGUERITE_DUSTY = ['could somebody dust me? I can’t reach.', 'I’m under here. somewhere.'];
export const MARGUERITE_ALL = 'all four. we’ll open on Thursday.';
/** When a hat comes out from under the dust. */
export const HAT_FOUND: Record<HatId, string> = {
  beret: 'a beret on the floor. pass it here.',
  topper: 'my top hat. it was on the trunk the whole time.',
  sunhat: 'the sun hat, on its hook. bring it, bring it.',
  crown: 'a paper crown on the shelf. I’ll take it.',
};

export interface Memory {
  id: 'sea' | 'dance' | 'garden';
  title: string;
  /** Told one line at a time, while you keep still. */
  lines: string[];
  /** Written on the back, in pencil: one digit of the trunk's combination. */
  back: string;
  digit: number;
}

export const MEMORIES: Memory[] = [
  {
    id: 'sea',
    title: 'The seaside, a long time ago',
    lines: ['We took the early train because I insisted.', 'It rained until eleven, and then it stopped all at once.', 'Four of us on one towel. Somebody counted. Not me.'],
    back: '4 on a towel',
    digit: 4,
  },
  {
    id: 'dance',
    title: 'The Palais, the night the lights went',
    lines: ['The power went out and the band kept playing in the dark.', 'Seven songs. He stood on my foot in every one of them.', 'I married him anyway. Not for the dancing.'],
    back: '7 songs in the dark',
    digit: 7,
  },
  {
    id: 'garden',
    title: 'The back garden, the first spring',
    lines: ['Radishes, a row of mint, and a sunflower taller than the shed.', 'I put it by the fence so it could see over. It did.', 'It looked at next door all summer. So did I, a bit. Two of us.'],
    back: '2 of us',
    digit: 2,
  },
];
export const MEMORY_HINT = 'Keep still over a clean photograph. It takes a moment to remember.';

/** The trunk and its lock. */
export const LOCK_LABEL = 'The trunk’s combination lock';
export const LOCK_LINES = {
  locked: 'the trunk has a lock. three numbers. the photos might know.',
  open: 'it’s open. lavender and pencil shavings.',
};

/** The dust, and the dust bunnies who live in it. */
export const DUST_LINES = {
  start: 'everything’s under dust. rub it off, gently.',
  bunny: ['a dust bunny. it went that way.', 'they hide in the thick bits. mind your sleeves.'],
  cornered: 'nowhere left to hide. say hello, all seven of you.',
  clean: 'spotless. I haven’t seen the floor since 1974.',
  letter: 'an envelope, under the dust. her writing.',
};

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
