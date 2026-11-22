import type { Creature, PropKind } from '../rooms/Attic/shadows/geometry';

/** The attic's shadow theatre (VOICE.md: plain, a little theatrical where Marguerite is concerned). */
export const SHADOWS = {
  title: 'The shadow theatre',
  start: 'An old sheet, a lamp, and some things to hold up to the light. Move them about.',
  lamp: 'The lamp. Drag it, or use the arrow keys, to move the light.',
  turn: (what: string) => `Turn the ${what.toLowerCase()}`,
  prop: {
    handL: 'Left hand',
    handR: 'Right hand',
    hat: 'Top hat',
    cup: 'Teacup',
    kettle: 'Kettle',
    fern: 'Fern',
    bust: 'Marguerite’s spare head',
  } satisfies Record<PropKind, string>,
  creature: {
    bird: 'a bird! and off it goes.',
    rabbit: 'a rabbit. it’s been waiting for its cue.',
    cat: 'a cat, and something small and fluffy running for it.',
    dragon: 'a dragon. a small, domestic dragon.',
    curtsy: 'the shadow curtsies. so does Marguerite.',
  } satisfies Record<Creature, string>,
  marguerite: 'that’s my good side. take a bow, darling.',
};
