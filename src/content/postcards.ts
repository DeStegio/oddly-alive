import type { Phase, Script } from '../rooms/Weather/sim/run';
import { PLACES, W as VALLEY_W, columnCloud, pondFrozen, rainOn, rainbowEndsAt, rainbows, snowOn, totalCloud, vaneStrikes, type ToolId, type Valley } from '../rooms/Weather/sim/valley';

/**
 * Postcards through the letter slot: small weather jobs. Each is a goal on
 * the valley that must hold for a few seconds, the tools on the sill, and a
 * stored timed script that solves it (checked headlessly in
 * `src/rooms/Weather/sim/valley.test.ts`, which also checks that doing
 * nothing and the naive attempt don't).
 */
export type PostcardFrom = 'nimbus' | 'ferdinand' | 'pim' | 'fox' | 'tick' | 'lumen' | 'garden' | 'dot' | 'bip' | 'aunt';

export interface Postcard {
  id: string;
  from: PostcardFrom;
  text: string;
  thanks: string;
  /** Hint ladder (60 s, 120 s). Never the answer. */
  hints: [string, string];
  climate: number;
  humidity: number;
  vaneUp?: boolean;
  /** A steady breeze for this postcard (+ east). */
  breeze?: number;
  tools: ToolId[];
  nimbus: boolean;
  phases: Phase[];
  script: Script;
  naiveAttempt: Script;
  /** How long the headless checks run. */
  seconds: number;
}

const maxColumn = (v: Valley, xs?: readonly number[]) => Math.max(...(xs ?? Array.from({ length: VALLEY_W }, (_, x) => x)).map((x) => columnCloud(v, x)));
const fogOn = (v: Valley, xs: readonly number[], min: number) => xs.filter((x) => v.fog[x]! >= min).length;
const LOW = [...PLACES.field, ...PLACES.pond] as const;
const recentStrike = (v: Valley, secs: number) => v.strikes.some((s) => v.t - s.at <= secs * 10);

export const POSTCARDS: Postcard[] = [
  {
    id: 'a-cloud',
    from: 'nimbus',
    text: 'outlook: me, very small. could I have a cloud. a proper one.',
    thanks: 'a cloud. a real one. I’m filling up again. thank you.',
    hints: ['clouds start as steam. it has to go up into the cold.', 'something warm and wet, low down. the air does the rest.'],
    climate: 0,
    humidity: 0.35,
    tools: ['teacup'],
    nimbus: false,
    phases: [{ label: 'a tall cloud', check: (v) => maxColumn(v) >= 1.6, hold: 3 }],
    script: [[1, { type: 'place', tool: 'teacup', x: 11.5, y: 10.4 }]],
    naiveAttempt: [[1, { type: 'place', tool: 'teacup', x: 4.5, y: 0.5 }]],
    seconds: 40,
  },
  {
    id: 'roof',
    from: 'ferdinand',
    text: 'rain. my roof. not the washing.',
    thanks: 'roof wet. washing dry. good.',
    hints: ['clouds go where the air takes them. there’s a breeze.', 'the breeze blows towards the washing. something could blow back.'],
    climate: 0,
    humidity: 0.4,
    breeze: 0.1,
    tools: ['teacup', 'fan'],
    nimbus: false,
    phases: [{ label: 'rain on Ferdinand’s roof, none on the washing', check: (v) => rainOn(v, PLACES.ferdinand) > 0.006 && rainOn(v, PLACES.washing) < 0.001, hold: 4 }],
    script: [
      [1, { type: 'place', tool: 'teacup', x: 2.5, y: 9.4 }],
      [2, { type: 'place', tool: 'fan', x: 6, y: 9.5, dir: -1 }],
    ],
    naiveAttempt: [[1, { type: 'place', tool: 'teacup', x: 3.5, y: 9.4 }]],
    seconds: 60,
  },
  {
    id: 'hill-snow',
    from: 'pim',
    text: 'could it snow on the hill… but not freeze the pond. the ducks.',
    thanks: 'snow on the hill. ducks fine. I’m so pleased.',
    hints: ['it’s cold up high. what falls there comes down white.', 'the pond needs keeping warm while you do it.'],
    climate: -14,
    humidity: 0.4,
    tools: ['teacup', 'ice', 'lamp'],
    nimbus: false,
    phases: [{ label: 'snow falling on the hill, the pond not frozen', check: (v) => snowOn(v, PLACES.hill) > 0.002 && !pondFrozen(v), hold: 4 }],
    script: [
      [1, { type: 'place', tool: 'lamp', x: 11.5, y: 9.6 }],
      [2, { type: 'place', tool: 'teacup', x: 18.5, y: 3.5 }],
    ],
    naiveAttempt: [[1, { type: 'place', tool: 'teacup', x: 18.5, y: 3.5 }]],
    seconds: 60,
  },
  {
    id: 'fog',
    from: 'fox',
    text: 'fog. in the low bit. so I can cross without being looked at.',
    thanks: '(the fox crossed. it looked back once.)',
    hints: ['fog is a cloud that sits on the ground.', 'cold, wet and still. nothing stirring the air.'],
    climate: 0,
    humidity: 0.45,
    tools: ['ice', 'teacup', 'fan'],
    nimbus: false,
    phases: [{ label: 'fog over the field and the pond', check: (v) => fogOn(v, LOW, 0.4) >= 3, hold: 4 }],
    script: [
      [1, { type: 'place', tool: 'ice', x: 8.5, y: 9.6 }],
      [1, { type: 'place', tool: 'teacup', x: 8.5, y: 10.4 }],
    ],
    naiveAttempt: [
      [1, { type: 'place', tool: 'ice', x: 8.5, y: 9.6 }],
      [1, { type: 'place', tool: 'teacup', x: 8.5, y: 10.4 }],
      [1, { type: 'place', tool: 'fan', x: 6, y: 9.5, dir: 1 }],
    ],
    seconds: 60,
  },
  {
    id: 'lightning',
    from: 'tick',
    text: 'lightning on the weathervane. once. exactly once. then stop.',
    thanks: 'once. precisely once. I timed it.',
    hints: ['lightning wants a tall, wet cloud with warm air under it.', 'it hits the highest thing it can. things can be lowered.'],
    climate: 0,
    humidity: 0.4,
    tools: ['teacup', 'lamp', 'ice'],
    nimbus: false,
    phases: [
      { label: 'the weathervane struck', check: (v) => vaneStrikes(v) >= 1, hold: 0.1 },
      { label: 'the storm goes on, the vane is struck only once', check: (v) => vaneStrikes(v) === 1 && v.strikes.length >= 2, hold: 0.1 },
    ],
    script: [
      [1, { type: 'place', tool: 'teacup', x: 14.5, y: 9 }],
      [1, { type: 'place', tool: 'lamp', x: 18.5, y: 7 }],
      [1, { type: 'place', tool: 'ice', x: 14.5, y: 2.5 }],
      [16, { type: 'vane', up: false }],
    ],
    naiveAttempt: [
      [1, { type: 'place', tool: 'teacup', x: 14.5, y: 9 }],
      [1, { type: 'place', tool: 'lamp', x: 18.5, y: 7 }],
      [1, { type: 'place', tool: 'ice', x: 14.5, y: 2.5 }],
    ],
    seconds: 90,
  },
  {
    id: 'rainbow-well',
    from: 'lumen',
    text: 'a rainbow, ending at the well. I want to see where it lands.',
    thanks: 'it lands on the well. my light did that. well, partly.',
    hints: ['a rainbow sits opposite the light, wherever rain is falling.', 'move the lamp one way and the rainbow goes the other. lower makes it wider.'],
    climate: 0,
    humidity: 0.4,
    tools: ['teacup', 'lamp', 'fan'],
    nimbus: false,
    phases: [{ label: 'a rainbow ending at the well', check: (v) => rainbowEndsAt(v, PLACES.well[0]), hold: 2 }],
    script: [
      [1, { type: 'place', tool: 'teacup', x: 14.5, y: 9.4 }],
      [2, { type: 'place', tool: 'lamp', x: 3, y: 8.2 }],
    ],
    naiveAttempt: [
      [1, { type: 'place', tool: 'teacup', x: 14.5, y: 9.4 }],
      [2, { type: 'place', tool: 'lamp', x: 14, y: 3 }],
    ],
    seconds: 40,
  },
  {
    id: 'barrel',
    from: 'garden',
    text: 'the garden’s barrel is empty. it can see the field from here.',
    thanks: 'the barrel’s full of valley rain. the garden says ta.',
    hints: ['Nimbus is mostly water. he knows it.', 'hold him over the field and squeeze.'],
    climate: 0,
    humidity: 0.35,
    tools: [],
    nimbus: true,
    phases: [{ label: 'rain on the field', check: (v) => v.fieldRain >= 1.2, hold: 0.1 }],
    script: [[1, { type: 'nimbus', x: 8, squeezing: true }]],
    naiveAttempt: [[1, { type: 'nimbus', x: 2, squeezing: true }]],
    seconds: 40,
  },
  {
    id: 'snowball',
    from: 'dot',
    text: 'SNOWBALL FIGHT. in the village. the hill has to stay green, that’s the rule.',
    thanks: 'SNOW. village. hill green. I win. you also win.',
    hints: ['snow is rain that fell through cold air.', 'make it cold down in the village, and bring the cloud to it.'],
    climate: 0,
    humidity: 0.4,
    tools: ['ice', 'teacup', 'fan'],
    nimbus: false,
    phases: [{ label: 'snow lying in the village, none on the hill', check: (v) => PLACES.village.filter((x) => v.snow[x]! > 0.25).length >= 2 && PLACES.hill.every((x) => v.snow[x]! < 0.05), hold: 3 }],
    script: [
      [1, { type: 'place', tool: 'ice', x: 2, y: 9.2 }],
      [1, { type: 'place', tool: 'teacup', x: 6.5, y: 9.4 }],
      [2, { type: 'place', tool: 'fan', x: 9, y: 7.5, dir: -1 }],
    ],
    naiveAttempt: [[1, { type: 'place', tool: 'teacup', x: 2.5, y: 9.4 }]],
    seconds: 80,
  },
  {
    id: 'two-rainbows',
    from: 'bip',
    text: 'request: two rainbows. at the same time. I’ll count them.',
    thanks: 'one. two. two rainbows. beep beep.',
    hints: ['one light makes one rainbow.', 'the mirror sends the lamp’s light somewhere else.'],
    climate: 0,
    humidity: 0.4,
    tools: ['teacup', 'lamp', 'mirror', 'fan'],
    nimbus: false,
    phases: [{ label: 'two rainbows at once', check: (v) => rainbows(v).length >= 2, hold: 2 }],
    script: [
      [1, { type: 'place', tool: 'teacup', x: 11.5, y: 10.4 }],
      [1, { type: 'place', tool: 'lamp', x: 12, y: 5 }],
      [2, { type: 'place', tool: 'mirror', x: 10, y: 4 }],
    ],
    naiveAttempt: [
      [1, { type: 'place', tool: 'teacup', x: 11.5, y: 10.4 }],
      [1, { type: 'place', tool: 'lamp', x: 12, y: 5 }],
    ],
    seconds: 40,
  },
  {
    id: 'whole-day',
    from: 'aunt',
    text: 'A whole day, please: fog in the morning, sun at noon, a storm by evening, a clear night. In that order.',
    thanks: 'That was a proper day. Like the ones we used to have.',
    hints: ['One part at a time. Each one has to last a little while.', 'Clear the sky by taking things away, too.'],
    climate: 0,
    humidity: 0.45,
    tools: ['teacup', 'ice', 'fan', 'lamp', 'mirror'],
    nimbus: true,
    phases: [
      { label: 'morning fog', check: (v) => fogOn(v, LOW, 0.4) >= 2, hold: 3 },
      { label: 'noon sun', check: (v) => v.tools.some((t) => t.id === 'lamp') && fogOn(v, LOW, 0.2) === 0 && v.rain.every((r) => r < 0.001), hold: 3 },
      { label: 'an evening storm', check: (v) => recentStrike(v, 2), hold: 0.1 },
      { label: 'a clear night', check: (v) => !v.tools.some((t) => t.id === 'lamp') && maxColumn(v) < 2.2 && v.rain.every((r) => r < 0.001), hold: 3 },
    ],
    script: [
      [1, { type: 'place', tool: 'ice', x: 8.5, y: 9.6 }],
      [1, { type: 'place', tool: 'teacup', x: 8.5, y: 10.4 }],
      [12, { type: 'remove', tool: 'ice' }],
      [12, { type: 'remove', tool: 'teacup' }],
      [12, { type: 'place', tool: 'lamp', x: 9, y: 0.5 }],
      [30, { type: 'place', tool: 'teacup', x: 14.5, y: 9 }],
      [30, { type: 'place', tool: 'lamp', x: 18.5, y: 7 }],
      [30, { type: 'place', tool: 'ice', x: 14.5, y: 2.5 }],
      [55, { type: 'remove', tool: 'teacup' }],
      [55, { type: 'remove', tool: 'lamp' }],
      [55, { type: 'remove', tool: 'ice' }],
    ],
    naiveAttempt: [
      [1, { type: 'place', tool: 'teacup', x: 14.5, y: 9 }],
      [1, { type: 'place', tool: 'lamp', x: 18.5, y: 7 }],
      [1, { type: 'place', tool: 'ice', x: 14.5, y: 2.5 }],
    ],
    seconds: 120,
  },
];

/** Postcard ids in order (they arrive one at a time). */
export const postcardById = (id: string) => POSTCARDS.find((p) => p.id === id);
export { rainOn, snowOn, pondFrozen, rainbowEndsAt, rainbows, totalCloud, vaneStrikes, maxColumn, fogOn, LOW, recentStrike };
