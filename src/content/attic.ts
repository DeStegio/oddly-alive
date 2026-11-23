/**
 * The attic (Phase 4): "What Marguerite Forgot". A small, gentle deduction
 * mystery. Marguerite the dress form has forgotten who wore her and who
 * lived here. Fifteen things up here belonged to five people across sixty
 * years; the player works out WHO owned WHAT and WHEN from evidence they
 * uncover: dust, photographs, pages torn from the house's old diary,
 * gramophone sleeves, and five memory scenes in the shadow theatre.
 *
 * Fairness is data: every answer lists the clues that support it (tested in
 * `src/rooms/Attic/mystery/mystery.test.ts`), and no single clue names an
 * owner next to their object.
 *
 * VOICE.md: Marguerite is a costume department head, dramatic about hats,
 * says "darling" once per visit. The old diary is the house writing plainly.
 */

// ---------------------------------------------------------------- the people

export type ResidentId = 'odile' | 'walter' | 'bea' | 'arthur' | 'june';
export interface Resident {
  id: ResidentId;
  name: string;
  /** Shown on the portrait card once revealed. */
  role: string;
  /** The clue that puts a name and a face to the silhouette. */
  revealedBy: string;
  act: 1 | 2 | 3;
  colour: string;
}

export const RESIDENTS: Resident[] = [
  { id: 'odile', name: 'Odile Marchetti', role: 'milliner', revealedBy: 'shop-sign', act: 1, colour: 'var(--coral)' },
  { id: 'walter', name: 'Walter Pryce', role: 'mended wirelesses', revealedBy: 'radio-card', act: 1, colour: 'var(--blue)' },
  { id: 'bea', name: 'Bea Pryce', role: 'drew on the walls', revealedBy: 'wall-name', act: 2, colour: 'var(--lavender)' },
  { id: 'arthur', name: 'Arthur Fenn', role: 'kept bees', revealedBy: 'bee-letter', act: 2, colour: 'var(--yellow-d1)' },
  { id: 'june', name: 'June Okafor', role: 'nurse, nights', revealedBy: 'rota', act: 3, colour: 'var(--mint-d1)' },
];
export const residentById = (id: string) => RESIDENTS.find((r) => r.id === id);

/** The decade dial on the board. */
export const DECADES = [1920, 1930, 1940, 1950, 1960, 1970, 1980] as const;
export type Decade = (typeof DECADES)[number];

// ---------------------------------------------------------------- the things

export interface Thing {
  id: string;
  name: string;
  /** What it looks like once the dust is off (for screen readers too). */
  looks: string;
  act: 1 | 2 | 3;
  owner: ResidentId;
  decade: Decade;
  /** Clues that support each half of the answer. */
  ownerClues: string[];
  decadeClues: string[];
}

export const THINGS: Thing[] = [
  // act 1: two people, five things
  { id: 'hat-block', name: 'Hat block', looks: 'A wooden head for shaping felt, stamped O.M. on the neck.', act: 1, owner: 'odile', decade: 1920, ownerClues: ['photo-shop', 'shop-sign'], decadeClues: ['shop-sign'] },
  { id: 'feather-tin', name: 'Tin of feathers', looks: 'A biscuit tin full of white ostrich feathers. A folded receipt inside.', act: 1, owner: 'odile', decade: 1930, ownerClues: ['feather-receipt', 'shop-sign'], decadeClues: ['feather-receipt'] },
  { id: 'pin-cushion', name: 'Wrist pin cushion', looks: 'A velvet pin cushion on an elastic band, still bristling.', act: 1, owner: 'odile', decade: 1920, ownerClues: ['scene-milliner', 'diary-1928'], decadeClues: ['diary-1928'] },
  { id: 'radio-valve', name: 'Wireless valve', looks: 'A glass valve in a cardboard box. Pencil on the box.', act: 1, owner: 'walter', decade: 1940, ownerClues: ['radio-card', 'photo-bench'], decadeClues: ['valve-box'] },
  { id: 'headphones', name: 'Headphones', looks: 'Bakelite headphones, the cord wrapped round twice.', act: 1, owner: 'walter', decade: 1950, ownerClues: ['photo-bench', 'scene-bird'], decadeClues: ['diary-1953'] },
  // act 2: four people, ten things
  { id: 'soldering-iron', name: 'Soldering iron', looks: 'A soldering iron with a paper tag tied round the handle.', act: 2, owner: 'walter', decade: 1940, ownerClues: ['iron-tag', 'radio-card'], decadeClues: ['diary-1948'] },
  { id: 'drawing', name: 'Crayon drawing', looks: 'A lavender blob with enormous eyes, sitting on a sofa. Very confident.', act: 2, owner: 'bea', decade: 1950, ownerClues: ['wall-name'], decadeClues: ['wall-name', 'diary-1949'] },
  { id: 'whistle', name: 'Tin whistle', looks: 'A tin whistle with teeth marks on the mouthpiece.', act: 2, owner: 'bea', decade: 1950, ownerClues: ['photo-bench', 'scene-rabbit'], decadeClues: ['photo-bench-back'] },
  { id: 'smoker', name: 'Bee smoker', looks: 'A tin can with bellows, the inside black with old smoke.', act: 2, owner: 'arthur', decade: 1960, ownerClues: ['photo-bees', 'record-foxtrot'], decadeClues: ['bee-letter', 'pressed-flower'] },
  { id: 'honey-jar', name: 'Honey jar', looks: 'An empty jar with a handwritten label.', act: 2, owner: 'arthur', decade: 1960, ownerClues: ['honey-label', 'bee-letter'], decadeClues: ['honey-label'] },
  // act 3: everyone, fifteen things
  { id: 'skipping-rope', name: 'Skipping rope', looks: 'A skipping rope with wooden handles, one painted red.', act: 3, owner: 'bea', decade: 1950, ownerClues: ['diary-1957', 'wall-name'], decadeClues: ['diary-1957'] },
  { id: 'veil', name: 'Bee veil', looks: 'A wide straw hat with a net hanging from the brim.', act: 3, owner: 'arthur', decade: 1960, ownerClues: ['scene-veil', 'photo-bees'], decadeClues: ['photo-bees'] },
  { id: 'fob-watch', name: 'Upside-down watch', looks: 'A small watch on a pin, made to be read upside down.', act: 3, owner: 'june', decade: 1970, ownerClues: ['scene-dawn', 'rota'], decadeClues: ['diary-1974'] },
  { id: 'sleep-mask', name: 'Sleep mask', looks: 'A satin sleep mask with stars sewn on.', act: 3, owner: 'june', decade: 1970, ownerClues: ['diary-dawn', 'rota'], decadeClues: ['diary-dawn'] },
  { id: 'cap-badge', name: 'Cap badge', looks: 'A small enamel badge in a box, from inside the trunk.', act: 3, owner: 'june', decade: 1980, ownerClues: ['badge-box', 'rota'], decadeClues: ['badge-box'] },
];
export const thingById = (id: string) => THINGS.find((t) => t.id === id);

// ---------------------------------------------------------------- the evidence

export type ClueSource = 'photo' | 'dust' | 'diary' | 'record' | 'scene' | 'trunk' | 'garden';
export interface Clue {
  id: string;
  source: ClueSource;
  /** Where it turns up (a spot in the attic), or how. */
  title: string;
  text: string;
  /** The act whose part of the attic it is in. */
  act: 1 | 2 | 3;
}

export const CLUES: Clue[] = [
  // act 1
  { id: 'photo-shop', source: 'photo', act: 1, title: 'A photograph that fell off a rafter', text: 'A young woman in a shop window, pressing felt over a wooden head. The block in her hands is stamped O.M. A small dog asleep on the hatboxes.' },
  { id: 'shop-sign', source: 'dust', act: 1, title: 'Painted on a board, under the dust', text: 'MODES · O. MARCHETTI · HATS MADE AND MENDED · EST. 1926' },
  { id: 'feather-receipt', source: 'dust', act: 1, title: 'A receipt, folded small', text: 'Ostrich, white, two dozen. For the shop. Paid with thanks, O.M., March ’37.' },
  { id: 'diary-1928', source: 'diary', act: 1, title: 'A page from the house’s old diary', text: '1928. The hat lady’s wrist pin cushion went missing for a week. It turned up in the sofa. She sat on it first.' },
  { id: 'radio-card', source: 'dust', act: 1, title: 'A trade card, tucked behind a beam', text: 'W. PRYCE. WIRELESS SETS REPAIRED. CALL ROUND THE BACK.' },
  { id: 'photo-bench', source: 'photo', act: 1, title: 'A photograph of a workbench', text: 'A man at a bench covered in glass valves, headphones round his neck. A very small girl at his knee with a tin whistle.' },
  { id: 'valve-box', source: 'dust', act: 1, title: 'Pencil on a cardboard box', text: 'Spare. Bench. Don’t sell. ’47.' },
  { id: 'diary-1953', source: 'diary', act: 1, title: 'A page from the house’s old diary', text: '1953. Everyone round the wireless for the coronation. The repairman had his new headphones on and missed the best bit, arguing with the static.' },
  { id: 'scene-milliner', source: 'scene', act: 1, title: 'A memory in the shadow theatre', text: 'A woman fitting a hat on a dress form, a cushion of pins at her wrist. The form is me. I’d know my own shoulders.' },
  { id: 'scene-bird', source: 'scene', act: 1, title: 'A memory in the shadow theatre', text: 'A man making a bird out of his hands on the wall, for a small girl. His headphones swing as he flaps.' },
  { id: 'record-waltz', source: 'record', act: 1, title: 'A record sleeve: a waltz', text: 'On the sleeve, in ink: “To work by, at the form. The hat stands on her head, never on the shelf.”' },
  // act 2
  { id: 'iron-tag', source: 'dust', act: 2, title: 'A paper tag on a handle', text: 'In a grown-up’s capitals: W.P. HOT. NOT FOR SMALL HANDS.' },
  { id: 'diary-1948', source: 'diary', act: 2, title: 'A page from the house’s old diary', text: '1948. A smell of hot solder all winter, from the back bedroom. Nobody minded. The wireless worked.' },
  { id: 'wall-name', source: 'dust', act: 2, title: 'Crayon on the attic wall, under the dust', text: 'A lavender blob with big eyes, drawn very low down. Next to it, in crayon: BEA, 6.' },
  { id: 'diary-1949', source: 'diary', act: 2, title: 'A page from the house’s old diary', text: '1949. A baby in the house. The repairman walked the landing with her all night, humming.' },
  { id: 'photo-bench-back', source: 'photo', act: 2, title: 'On the back of the workbench photograph', text: 'A date stamp from the chemist’s: SEPT 1954.' },
  { id: 'scene-rabbit', source: 'scene', act: 2, title: 'A memory in the shadow theatre', text: 'A small girl chasing a rabbit made of shadow, blowing a whistle at it. The rabbit is not impressed.' },
  { id: 'photo-bees', source: 'photo', act: 2, title: 'A photograph by the back fence', text: 'A man in a wide veiled hat by the hives, a smoker puffing in one hand. Sunflowers taller than him. Stamped 1964.' },
  { id: 'bee-letter', source: 'dust', act: 2, title: 'A letter, never sent back', text: 'Dear Mr Fenn, your bees have moved into my chimney again. I don’t mind. Please collect them by Sunday. Yours, next door. June 1962.' },
  { id: 'honey-label', source: 'dust', act: 2, title: 'A label in neat handwriting', text: 'Back garden. Sunflower and mint. A.F., ’65.' },
  { id: 'record-foxtrot', source: 'record', act: 2, title: 'A record sleeve: a foxtrot', text: 'On the sleeve, in pencil: “Hum this to them and they settle. A.” Underneath, smaller: “Works on Marguerite too.”' },
  { id: 'pressed-flower', source: 'garden', act: 2, title: 'Pressed between two diary pages', text: 'A flower nobody can name, half sunflower, half something else. On the back: “From his bees, the summer of ’66.”' },
  // act 3
  { id: 'diary-1957', source: 'diary', act: 3, title: 'A page from the house’s old diary', text: '1957. The little one skips on the landing every morning before school. The ceiling below has a crack from it now. Worth it.' },
  { id: 'scene-veil', source: 'scene', act: 3, title: 'A memory in the shadow theatre', text: 'Someone in a hat with a net down to the shoulders, smoke curling out of a pot. Very calm. Bees everywhere.' },
  { id: 'rota', source: 'dust', act: 3, title: 'A hospital rota, pinned to a beam', text: 'NIGHTS, from 1st May: Nurse J. Okafor. The year in the corner is torn: 19_1.' },
  { id: 'diary-moon', source: 'diary', act: 3, title: 'A page from the house’s old diary', text: 'Two summers after men walked on the moon, the night nurse moved into the back bedroom. The house went quiet in the daytime.' },
  { id: 'scene-dawn', source: 'scene', act: 3, title: 'A memory in the shadow theatre', text: 'A woman in a nurse’s cap at dawn, the kettle on, a little watch pinned upside down on her front so she can read it.' },
  { id: 'diary-1974', source: 'diary', act: 3, title: 'A page from the house’s old diary', text: '1974. The night nurse sets her watch by the milk float, and the milk float sets itself by her.' },
  { id: 'diary-dawn', source: 'diary', act: 3, title: 'A page from the house’s old diary', text: '1976. The one who came home at dawn hated the gramophone. She slept in a mask with stars on, and nobody played anything before two.' },
  { id: 'badge-box', source: 'trunk', act: 3, title: 'A small box, inside the trunk', text: 'A badge: SISTER. A card with it: “For eleven years of nights. 1982.”' },
];
export const clueById = (id: string) => CLUES.find((c) => c.id === id);

/** The five shadow-theatre memories, by which shape comes alive. */
export const SCENE_FOR: Record<'curtsy' | 'bird' | 'rabbit' | 'cat' | 'dragon', string> = {
  curtsy: 'scene-milliner',
  bird: 'scene-bird',
  rabbit: 'scene-rabbit',
  cat: 'scene-veil',
  dragon: 'scene-dawn',
};

/** Diary pages that hint at a shadow memory (not the answer, a nudge). */
export const SCENE_HINTS: Record<string, string> = {
  'scene-milliner': 'She always stood the hat on the form’s head, she said. Never on the shelf.',
  'scene-bird': 'Two hands, side by side, flapping. Every bedtime.',
  'scene-rabbit': 'One hand held up straight makes ears, if the lamp is right.',
  'scene-veil': 'A hat held just over a cup looks like someone in a veil, with smoke.',
  'scene-dawn': 'The kettle with something green behind it: that’s a morning, after a night shift.',
};

// ---------------------------------------------------------------- the trunk

/** The trunk's four dials: the year the night nurse moved in (19_1 from the rota; two summers after the moon). */
export const TRUNK_CODE = [1, 9, 7, 1] as const;
export const TRUNK_CLUES = ['rota', 'diary-moon'];
export const LOCK_LABEL = 'The trunk’s lock: four dials';
export const LOCK_LINES = {
  locked: 'four dials. a year, I’d say. somebody arriving.',
  open: 'it’s open. lavender and pencil shavings, and a little box.',
};

// ---------------------------------------------------------------- Marguerite remembering

export const MARGUERITE_OPEN = '…that one’s mine. I think. Who was I wearing?';
export const MARGUERITE_IDLE = ['don’t mind the pins.', 'I had a waist once. it was the fashion.', 'mind the third beam. everybody hits the third beam.', 'pin it up. the board helps me think.'];
export const MARGUERITE_WRONG = ['hm. not all of those are right. I couldn’t tell you which.', 'something on the board isn’t true. don’t ask me what.', 'no… it doesn’t come back. one of them’s wrong.'];
export const MARGUERITE_CLUE = ['oh. that rings a bell.', 'keep that. it means something.', 'I remember the smell of that.'];

/** What comes back when a group of three is right (in order, one per group). */
export const VIGNETTES: string[] = [
  'Odile. She made me, you know. Felt and pins and a radio playing waltzes. I wore every hat first.',
  'The wireless man took the back bedroom after the war. He mended things that weren’t broken, to see how they worked. That lamp downstairs was his. He talked to it.',
  'A little girl lived here. She drew a shy thing with big eyes on this very wall, and told everyone its name.',
  'The bee man grew sunflowers by the fence so the bees had somewhere to go. He hummed to them. He hummed to me.',
  'The night nurse slept in the daytime and sat up with the house at night. She set every clock. One of them still keeps her hours.',
];

/** The twist, when the whole board is pinned. */
export const TWIST: string[] = [
  'Bea came back, you know. Old, with a suitcase and a lot of opinions. She called herself Pim by then.',
  'Great-Aunt Pim. The little girl with the crayons. She put her drawing on the sofa downstairs and it sat up and looked at her.',
  'That’s what this house is, darling. Everybody who lived here left a bit of themselves behind, and the bits kept going.',
  'The lamp is Walter’s. The clock keeps June’s hours. Ferdinand grew from one of Arthur’s cuttings. And I was Odile’s.',
  'Somebody just has to remember them now and then. Thank you for remembering.',
];

export const ACT_LINES: Record<2 | 3, string> = {
  2: 'the skylight’s open. look at all that. there’s more back there.',
  3: 'the far end. behind the trunk. I haven’t been round there in years.',
};

// ---------------------------------------------------------------- hats (Marguerite still wears them)

export const HATS = ['beret', 'topper', 'sunhat', 'crown'] as const;
export type HatId = (typeof HATS)[number];
export const HAT_NAMES: Record<HatId, string> = {
  beret: 'a green beret',
  topper: 'a battered top hat',
  sunhat: 'a straw sun hat',
  crown: 'a paper crown',
};
/** She puts a hat on as she remembers (one per group locked). */
export const HAT_FOR_GROUP: HatId[] = ['topper', 'beret', 'crown', 'sunhat', 'topper'];

// ---------------------------------------------------------------- the house's own diary, and the way up

export const DUST_LINES = {
  start: 'rub the dust off. gently. there’s a lot of us under here.',
  clean: 'spotless. I haven’t seen the floor since 1974.',
  letter: 'an envelope, under the dust. her writing.',
};

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
