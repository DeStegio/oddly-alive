import { bloomsOf, countOf, hybridSeeds, inBloom, marked, plants, type LevelLayout } from '../rooms/Garden/sim/core';
import type { Move } from '../rooms/Garden/sim/replay';
import type { GardenState, RuleId, Species } from '../rooms/Garden/sim/types';

/**
 * The garden's commissions: twelve small jobs from the house, in a deliberate
 * curve. Each one is data: who asks, what they want (a pure predicate on the
 * bed), what's in the tin, the layout, the days you get, a STORED reference
 * solution and the obvious naive attempt. `src/rooms/Garden/sim/commissions.test.ts`
 * replays every solution and checks that idling and the naive attempt fail.
 *
 * Coordinates: x 0 (west, the house side) … 6 (east); y 0 (by the fence) … 3.
 */
export type Asker = 'pim' | 'lumen' | 'tick' | 'dot' | 'ferdinand' | 'bip' | 'inch' | 'aunt';

export interface Commission {
  id: string;
  asker: Asker;
  /** The request, in the asker's voice. */
  ask: string;
  /** What they say when it's done. */
  thanks: string;
  /** What they say when the days run out and it isn't (funny, never a scolding). */
  fail: string;
  /** Hint ladder: 60 s vague, 120 s specific. Never the answer. */
  hints: [string, string];
  /** Where the asker glances at 30 s (a cell, or 'sun' / 'barrel' / 'tin'). */
  glance: [number, number] | 'sun' | 'barrel' | 'tin';
  layout: LevelLayout;
  days: number;
  check: 'any' | 'end';
  goal: (s: GardenState) => boolean;
  /** A line describing the goal state, for screen readers and the job card. */
  card: string;
  solution: Move[];
  /** Other known solutions (the finale must have more than one). */
  altSolutions?: Move[][];
  naiveAttempt: Move[];
  /** Herbarium rules this commission is meant to teach (for the tests and the sketchbook). */
  teaches: RuleId[];
}

const sunflowerFacing = (s: GardenState, f: 'east' | 'south' | 'west') => plants(s).some(({ p }) => p.kind === 'sunflower' && p.stage === 3 && p.facing === f);

export const COMMISSIONS: Commission[] = [
  {
    id: 'facing',
    asker: 'pim',
    ask: 'could something with a face… look at me. at the house, I mean.',
    thanks: 'oh. it’s looking right at me. hello.',
    fail: 'it’s looking somewhere else. that’s fine. it’s fine.',
    hints: ['sunflowers look wherever the sun was.', 'the house is on the west side. where would the sun need to be on the last day?'],
    glance: 'sun',
    layout: { map: ['.......', '.......', '.......', '.......'], water: 3, seeds: { sunflower: 1 }, barrel: 0 },
    days: 4,
    check: 'any',
    goal: (s) => sunflowerFacing(s, 'west'),
    card: 'A sunflower in bloom, facing the house (west).',
    solution: ['plant sunflower 3 1', 'day noon', 'day noon', 'day evening'],
    naiveAttempt: ['plant sunflower 3 1', 'day noon', 'day noon', 'day noon', 'day noon'],
    teaches: ['sun-face'],
  },
  {
    id: 'night-flower',
    asker: 'lumen',
    ask: 'I require a flower that opens only at night. for the second act.',
    thanks: 'it opened for me. my public. at last.',
    fail: 'it would not open. it simply would not.',
    hints: ['moonflowers hate the sun. even a little shade will do.', 'tall things throw shade away from the sun. the shed is tall.'],
    glance: [1, 0],
    layout: { map: ['S......', 'S......', '.......', '.......'], water: 2, seeds: { moonflower: 1, sunflower: 1 }, barrel: 0 },
    days: 5,
    check: 'any',
    goal: (s) => bloomsOf(s, 'moonflower') >= 1,
    card: 'A moonflower, open (it only opens on a night).',
    solution: ['plant moonflower 1 0', 'day evening', 'day evening', 'day night'],
    naiveAttempt: ['plant moonflower 3 1', 'day noon', 'day noon', 'day noon', 'day night', 'day night'],
    teaches: ['moon-shade', 'moon-night', 'moon-wilt'],
  },
  {
    id: 'four-mint',
    asker: 'tick',
    ask: 'four mint. exactly four. not five. I shall count them on day four.',
    thanks: 'four. one, two, three, four. correct. well done. in my day…',
    fail: 'that is not four. I have counted twice.',
    hints: ['mint spreads where the soil is wet, every day it can.', 'dry soil, a snapdragon, or a rock in the way: all of them stop mint.'],
    glance: [1, 1],
    layout: { map: ['...#...', '...#...', '####...', '.......'], water: 3, plants: ['mint 0 0 1'], seeds: { sunflower: 2, snapdragon: 1 }, barrel: 0 },
    days: 4,
    check: 'end',
    goal: (s) => countOf(s, 'mint') === 4,
    card: 'Exactly four mint plants at the end of day 4.',
    solution: ['plant sunflower 1 1', 'plant sunflower 2 1', 'day noon', 'day noon', 'day noon', 'day noon'],
    naiveAttempt: ['day noon', 'day noon', 'day noon', 'day noon'],
    teaches: ['mint-spread', 'mint-dry', 'snap-eat'],
  },
  {
    id: 'radish-party',
    asker: 'dot',
    ask: 'RADISH PARTY. three ripe ones. three. go go go.',
    thanks: 'THREE RADISHES. party party. I’m keeping score.',
    fail: 'that’s not a party. that’s a meeting.',
    hints: ['radishes won’t grow on their own. they like company.', 'each radish wants two plants right next to it. count the neighbours.'],
    glance: 'tin',
    layout: { map: ['.......', '.......', '.......', '.......'], water: 3, plants: ['mint 6 0 1'], seeds: { radish: 3, sunflower: 1 }, barrel: 1 },
    days: 5,
    check: 'any',
    goal: (s) => countOf(s, 'radish', 3) >= 3,
    card: 'Three ripe radishes at once.',
    solution: ['plant radish 1 1', 'plant radish 2 1', 'plant radish 1 2', 'plant sunflower 2 2', 'day noon', 'day noon', 'day noon'],
    naiveAttempt: ['plant radish 1 1', 'plant radish 2 1', 'plant radish 3 1', 'day noon', 'day noon', 'day noon', 'day noon', 'day noon'],
    teaches: ['radish-company', 'radish-lonely'],
  },
  {
    id: 'same-night',
    asker: 'ferdinand',
    ask: 'sun flower. moon flower. one night.',
    thanks: 'both. together. good.',
    fail: 'not both.',
    hints: ['a moonflower needs shade. something tall could make some.', 'a sunflower gets tall on its second day. what if the moonflower went in after that?'],
    glance: 'tin',
    layout: { map: ['.......', '.......', '.......', '.......'], water: 3, seeds: { moonflower: 1, sunflower: 1 }, barrel: 1 },
    days: 6,
    check: 'any',
    goal: (s) => s.night && bloomsOf(s, 'moonflower') >= 1 && bloomsOf(s, 'sunflower') >= 1,
    card: 'A sunflower and a moonflower in bloom on the same night.',
    solution: ['plant sunflower 3 1', 'day noon', 'plant moonflower 2 1', 'day noon', 'day morning', 'day morning', 'day night'],
    naiveAttempt: ['plant sunflower 3 1', 'plant moonflower 2 1', 'day noon', 'day noon', 'day noon', 'day noon', 'day night', 'day night'],
    teaches: ['tall-shade', 'moon-shade', 'moon-wilt'],
  },
  {
    id: 'crumb',
    asker: 'pim',
    ask: 'three sunflowers, please. and… there’s a sparrow. watching.',
    thanks: 'three. all of them. Crumb’s sulking on the fence.',
    fail: 'not three. I don’t blame you. I blame the sparrow.',
    hints: ['Crumb only takes seeds that are on their own.', 'tall sunflowers shade each other when the sun is low.'],
    glance: [3, 0],
    layout: { map: ['.......', '.......', '.......', '.......'], water: 3, seeds: { sunflower: 3 }, barrel: 1, crumb: true },
    days: 4,
    check: 'any',
    goal: (s) => countOf(s, 'sunflower', 3) >= 3,
    card: 'Three sunflowers in bloom (Crumb takes lone seeds on day 1).',
    solution: ['plant sunflower 2 1', 'plant sunflower 3 1', 'plant sunflower 4 1', 'day noon', 'day noon', 'day noon'],
    naiveAttempt: ['plant sunflower 1 1', 'plant sunflower 3 1', 'plant sunflower 5 1', 'day noon', 'day noon', 'day noon', 'day noon'],
    teaches: ['crumb', 'tall-shade'],
  },
  {
    id: 'new-plant',
    asker: 'bip',
    ask: 'request: a plant nobody has seen. not even me. beep.',
    thanks: 'unknown plant detected. logging it. it’s lovely. beep.',
    fail: 'nothing new. still logging. still hopeful.',
    hints: ['the bees cross two different flowers that are open side by side.', 'both have to be in bloom at the end of the same day, and both need the sun.'],
    glance: 'tin',
    layout: { map: ['.......', '.......', '.......', '.......'], water: 3, seeds: { sunflower: 1, snapdragon: 1 }, barrel: 1 },
    days: 5,
    check: 'any',
    goal: (s) => hybridSeeds(s).length > 0,
    card: 'A new kind of seed in the tin.',
    solution: ['plant sunflower 3 1', 'plant snapdragon 4 1', 'day noon', 'day noon', 'day morning'],
    naiveAttempt: ['plant sunflower 3 1', 'plant snapdragon 3 2', 'day noon', 'day noon', 'day noon', 'day noon', 'day noon'],
    teaches: ['bee-cross', 'tall-shade'],
  },
  {
    id: 'mint-invasion',
    asker: 'inch',
    ask: 'mint’s got loose. the radish row is my commute. four days, please.',
    thanks: 'row’s clear. I can get to work. much obliged.',
    fail: 'it’s all mint now. I’ll go round.',
    hints: ['mint can only swallow seeds. something that has sprouted is safe.', 'snapdragons eat mint. and mint can’t spread out of dry soil.'],
    glance: [1, 3],
    layout: { map: ['.......', '.......', '.......', '.......'], water: [1, 1, 2, 3], plants: ['mint 1 1 2', 'mint 5 1 2', 'radish 1 3 0', 'radish 2 3 0', 'radish 3 3 0', 'radish 4 3 0', 'radish 5 3 0'], seeds: { snapdragon: 2 }, barrel: 0 },
    days: 4,
    check: 'end',
    goal: (s) => countOf(s, 'radish') >= 5,
    card: 'All five radishes still in the row at the end of day 4.',
    solution: ['plant snapdragon 0 3', 'plant snapdragon 6 3', 'day noon', 'day noon', 'day noon', 'day noon'],
    naiveAttempt: ['day noon', 'day noon', 'day noon', 'day noon'],
    teaches: ['mint-smother', 'snap-eat'],
  },
  {
    id: 'creeper',
    asker: 'ferdinand',
    ask: 'that corner. behind the rocks. thirsty.',
    thanks: 'water. there. thank you.',
    fail: 'still dry.',
    hints: ['the barrel’s water stops at rock. something else will have to carry it.', 'a creeper climbs over rock, towards the light, and shares its water.'],
    glance: [5, 3],
    layout: { map: ['.......', '.......', '.....#.', '.....*.'], water: [2, 2, 1, 0], seeds: { creeper: 1, radish: 1 }, barrel: 2 },
    days: 6,
    check: 'any',
    goal: (s) => marked(s).every(({ c }) => c.water >= 2),
    card: 'Water (2 or more) in the corner behind the rocks.',
    solution: ['plant creeper 4 3', 'plant radish 4 2', 'water 4', 'day noon', 'water 4', 'day noon'],
    naiveAttempt: ['plant creeper 4 3', 'water 6', 'day noon', 'day noon', 'day noon', 'day noon', 'day noon', 'day noon'],
    teaches: ['creeper-climb', 'creeper-water', 'rock-stop'],
  },
  {
    id: 'long-shadows',
    asker: 'tick',
    ask: 'three cells in shade at once. I have marked them. one sunflower. punctually.',
    thanks: 'shade, all three, at once. at the right time, for once.',
    fail: 'the marked cells were in the sun. I marked them for a reason.',
    hints: ['shadows are short at noon and long when the sun is low.', 'the shed throws shade too, but only away from the sun.'],
    glance: [5, 1],
    layout: { map: ['.......', '....**.', 'S......', 'S.*....'], water: 3, seeds: { sunflower: 1 }, barrel: 0 },
    days: 4,
    check: 'any',
    goal: (s) => !s.night && s.shade.length > 0 && marked(s).every(({ x, y }) => s.shade[y * s.w + x]),
    card: 'All three marked cells in shade on the same day.',
    solution: ['plant sunflower 3 1', 'day noon', 'day noon', 'day evening'],
    naiveAttempt: ['plant sunflower 4 0', 'day noon', 'day noon', 'day noon', 'day noon'],
    teaches: ['tall-shade', 'damp-shade'],
  },
  {
    id: 'sunmint',
    asker: 'bip',
    ask: 'specific request: a Sunmint, in flower. I read about it. beep.',
    thanks: 'Sunmint confirmed. it’s exactly as described. I’m emotional.',
    fail: 'no Sunmint. I’ll keep the page open.',
    hints: ['a Sunmint is a cross. you know who does the crossing.', 'a Sunmint spreads only into the light, and only from wet soil.'],
    glance: 'tin',
    layout: { map: ['.......', '.......', '.......', '.......'], water: 3, seeds: { sunflower: 1, mint: 1 }, barrel: 2 },
    days: 8,
    check: 'any',
    goal: (s) => bloomsOf(s, 'hybrid:mint:sunflower') >= 1,
    card: 'A Sunmint (sunflower × mint) in bloom.',
    solution: ['plant sunflower 3 1', 'plant mint 4 1', 'day noon', 'day noon', 'day noon', 'plant hybrid:mint:sunflower 1 3', 'water 1', 'day noon', 'day noon', 'water 1', 'day noon'],
    naiveAttempt: ['plant sunflower 1 1', 'plant mint 5 2', 'day noon', 'day noon', 'day noon', 'day noon', 'day noon', 'day noon', 'day noon', 'day noon'],
    teaches: ['bee-cross'],
  },
  {
    id: 'picture',
    asker: 'aunt',
    ask: 'Make me the picture on the card. I drew it the summer the fence went up.',
    thanks: 'That’s it. That’s exactly how it was. Thank you, dear.',
    fail: 'Not quite how I remember it. Try again, there’s no hurry.',
    hints: ['Everything in the picture happens on one night.', 'The moonflower in the sketch is in the big flower’s shadow.'],
    glance: 'tin',
    layout: { map: ['.......', '.......', '.......', '.......'], water: 2, seeds: { sunflower: 1, moonflower: 1, radish: 4 }, barrel: 3 },
    days: 8,
    check: 'any',
    goal: (s) => pictureMatches(s),
    card: 'On one night: a sunflower in bloom in the two western columns, a moonflower open right beside it, three ripe radishes in a row in the front two rows.',
    solution: ['plant sunflower 1 2', 'plant radish 2 3', 'plant radish 3 3', 'plant radish 4 3', 'plant radish 4 2', 'day noon', 'plant moonflower 2 2', 'day noon', 'water 2', 'day evening', 'water 3', 'day evening', 'day night'],
    altSolutions: [['plant sunflower 0 2', 'plant radish 0 3', 'plant radish 1 3', 'plant radish 2 3', 'plant radish 3 3', 'day noon', 'plant moonflower 1 2', 'day noon', 'water 1', 'day evening', 'day evening', 'day night']],
    naiveAttempt: ['plant sunflower 0 1', 'plant moonflower 1 1', 'plant radish 2 3', 'plant radish 3 3', 'plant radish 4 3', 'day noon', 'day noon', 'day noon', 'day noon', 'day night'],
    teaches: ['tall-shade', 'moon-night', 'radish-company'],
  },
];

/** Great-Aunt Pim's sketch (commission 12): checked on a night. */
export function pictureMatches(s: GardenState): boolean {
  if (!s.night) return false;
  const all = plants(s);
  const sun = all.find(({ x, p }) => p.kind === 'sunflower' && p.stage === 3 && x <= 1);
  if (!sun) return false;
  const moon = all.find(({ x, y, p }) => p.kind === 'moonflower' && inBloom(s, p) && y === sun.y && x === sun.x + 1);
  if (!moon) return false;
  for (let y = 2; y < s.h; y++)
    for (let x = 0; x + 2 < s.w; x++) {
      const row = [0, 1, 2].map((k) => s.cells[y * s.w + x + k]!.plant);
      if (row.every((p) => p && p.kind === 'radish' && p.stage === 3)) return true;
    }
  return false;
}

export const commissionById = (id: string) => COMMISSIONS.find((c) => c.id === id);

/** What the seed packets say (in Great-Aunt Pim's hand; shown only once a rule is known). */
export const SEED_NAMES: Record<string, string> = {
  sunflower: 'Sunflower',
  moonflower: 'Moonflower',
  mint: 'Mint',
  snapdragon: 'Snapdragon',
  radish: 'Radish',
  creeper: 'Creeper',
};

/**
 * The Herbarium: the only place the rules are written down, and only after
 * the player has caused them. One page per rule.
 */
export const HERBARIUM: Partial<Record<RuleId, { title: string; note: string }>> = {
  'sun-face': { title: 'Sunflowers look at the sun', note: 'Whatever the light was on its last day, that’s where it faces.' },
  'tall-shade': { title: 'Tall things make shade', note: 'A grown sunflower shades one cell at noon, two when the sun is low. Always away from the sun.' },
  'dry-sun': { title: 'The sun dries the soil', note: 'One step drier for every day in the light.' },
  'damp-shade': { title: 'Shade keeps the damp', note: 'Soil in shade, or at night, keeps its water.' },
  thirsty: { title: 'Nothing grows in dust', note: 'Dry soil and everything stops. The barrel tips into one column a day.' },
  'moon-shade': { title: 'Moonflowers grow in shade', note: 'They grow on shaded days, and only open on a night.' },
  'moon-night': { title: 'Moonflowers open at night', note: 'Grown up in the shade, they open when you put the sun behind the fence.' },
  'moon-wilt': { title: 'Too much sun', note: 'Two lit days running and a moonflower gives up.' },
  'mint-spread': { title: 'Mint spreads', note: 'Every day and night, from wet soil, into the wettest empty cell next to it.' },
  'mint-smother': { title: 'Mint swallows seeds', note: 'A seed that hasn’t sprouted yet is fair game. A sprout is safe.' },
  'mint-dry': { title: 'Dry mint stays put', note: 'Mint can’t spread out of dry soil.' },
  'snap-eat': { title: 'Snapdragons eat mint', note: 'One neighbouring mint a day, once they’ve sprouted.' },
  'snap-bite': { title: 'Snapdragons bite each other', note: 'Two side by side and neither grows.' },
  'radish-company': { title: 'Radishes like company', note: 'Two planted neighbours, or a radish won’t grow.' },
  'radish-lonely': { title: 'A lonely radish sulks', note: 'Fewer than two neighbours: no growing.' },
  'creeper-climb': { title: 'Creepers climb', note: 'One cell a day from the newest end: into the light if it can, otherwise north, east, south, west. Rock is no bother.' },
  'creeper-water': { title: 'Creepers carry water', note: 'Every cell a creeper covers gets as wet as its wettest cell.' },
  'bee-cross': { title: 'The bees make new seeds', note: 'Two different flowers open side by side at the end of a day: a new seed in the tin.' },
  crumb: { title: 'Crumb takes lone seeds', note: 'A seed with nobody next to it, on the first day. Plant in company.' },
  'rock-stop': { title: 'Rock stops water', note: 'The barrel’s water runs down a column until it meets rock.' },
};

/** Lines from the house while you garden (by the asker or Inch). */
export const GARDEN_LINES = {
  welcome: 'there’s a job on the fence. Pim left it.',
  freePlay: 'all the jobs are done. the tin’s yours. do what you like.',
  sandbox: 'the whole tin. no job. just the garden.',
  noSeed: 'none of those left in the tin.',
  occupied: 'something’s already growing there.',
  rock: 'that’s rock. nothing goes in rock.',
  limit: 'that’s all the days for this one. take the sun back a bit?',
  watered: 'the barrel’s had its go today.',
  barrelEmpty: 'the barrel’s empty. rain fills it.',
  picked: 'picked. it’s gone indoors.',
  notRipe: 'not ripe yet.',
  dug: 'back in the tin.',
  rewound: 'yesterday again.',
  crumb: 'Crumb! that was a seed.',
  cross: 'the bees have made something. look in the tin.',
  sketchbook: 'a new page in the herbarium.',
};

export const ASKER_NAMES: Record<Asker, string> = {
  pim: 'Pim',
  lumen: 'Lumen',
  tick: 'Tick',
  dot: 'Dot',
  ferdinand: 'Ferdinand',
  bip: 'Bip',
  inch: 'Inch',
  aunt: 'Great-Aunt Pim',
};

/** Inch, who lives along the bed edges (a commuter: busy, polite). */
export const INCH_GARDEN = ['morning. well. you decide, apparently.', 'just going round the radishes. back in a bit.', 'don’t mind me. I’ve a leaf to see about.', 'the mint’s spreading again. not my department.'];

/** Bip, leaning on the fence from next door. */
export const BIP_FENCE = ['hello, neighbour. beep.', 'nice radishes. very aerodynamic.', 'you’re holding the sun. is that allowed?', 'I can see your garden from here. it’s green.'];

/** The species a commission's tin can hold, for the free-play tin. */
export const FREE_PLAY_SEEDS: Record<Species, number> = { sunflower: 9, moonflower: 9, mint: 9, snapdragon: 9, radish: 9, creeper: 9 } as Record<Species, number>;
