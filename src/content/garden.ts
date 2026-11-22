import type { PlantKind } from '../rooms/Garden/growth';
import type { Shape } from '../rooms/Garden/strokes';

/**
 * Garden copy. The planting card comes from Great-Aunt Pim's old seed tin, so
 * its notes are in her handwriting (VOICE.md: warm, bossy, specific).
 */
export const PACKETS: Record<PlantKind, { name: string; note: string }> = {
  sunflower: { name: 'Sunflower', note: 'One straight line, upwards. It will want to see over the fence.' },
  radish: { name: 'Radish', note: 'A circle. Close it properly or it sulks.' },
  moonflower: { name: 'Moonflower', note: 'A crescent. Only grows after dark. Don’t sit up waiting.' },
  snapdragon: { name: 'Snapdragon', note: 'A spiral, round and round. Not too close to the face.' },
  mint: { name: 'Mint', note: 'A zigzag. Will take over the bed if you let it. Let it.' },
};

/** What each shape drawn in the soil grows. */
export const SHAPE_PLANT: Partial<Record<Shape, PlantKind>> = {
  line: 'sunflower',
  loop: 'radish',
  zigzag: 'mint',
  crescent: 'moonflower',
  spiral: 'snapdragon',
};

/** The little drawing of each shape on Pim's card (SVG path, 24×24 box). */
export const SHAPE_GLYPH: Record<PlantKind, string> = {
  sunflower: 'M12 21 V 3',
  radish: 'M12 4 a 8 8 0 1 0 0.01 0',
  mint: 'M3 7 L 8 17 L 12 7 L 16 17 L 21 7',
  moonflower: 'M15 3 a 9 9 0 1 0 0 18 a 7 7 0 1 1 0 -18',
  snapdragon: 'M12 12 m 0 -1 a 1.5 1.5 0 1 1 -1 2 a 4 4 0 1 1 5 -3 a 7 7 0 1 1 -9 6',
};

/** The last line on the card: the sky takes drawings too. */
export const CARD_SKY = 'A curl in the sky for rain';
export const CLOUD_GLYPH = 'M6 17 a 4 4 0 0 1 0 -8 a 5 5 0 0 1 9.5 -1.5 a 4 4 0 0 1 3 9.5 Z';

/** The card's heading, in Pim's hand. */
export const CARD_TITLE = 'Draw it in the soil';

/** Inch, who lives along the bed edges (a commuter: busy, polite). */
export const INCH_GARDEN = ['morning. well. you decide, apparently.', 'just going round the radishes. back in a bit.', 'don’t mind me. I’ve a leaf to see about.', 'the mint’s spreading again. not my department.'];

/** Bip, leaning on the fence from next door. */
export const BIP_FENCE = ['hello, neighbour. beep.', 'nice radishes. very aerodynamic.', 'you’re holding the sun. is that allowed?', 'I can see your garden from here. it’s green.'];

/** Small comments when something happens in the beds. */
export const GARDEN_LINES = {
  plant: ['in you go.', 'pat it down. there.', 'now give it some sun.'],
  unclear: ['what was that meant to be?', 'Pim’s card is by the back door. have a look.', 'the soil didn’t follow that one.'],
  taken: ['that plot’s busy.', 'someone already lives there.'],
  tap: ['draw a shape in the soil. Pim’s card has five.', 'not a poke. a drawing.'],
  notRipe: ['not ready yet. it wants more light.', 'leave it be. it’s still going.'],
  harvestVase: ['into the vase on the Living Room windowsill.', 'Pim will like that one.'],
  harvestRadish: ['radish for the Playground. Bip will be thrilled.', 'one radish, off to be thrown about.'],
  moonWaiting: ['the moonflower is waiting for dark.', 'not yet. it wants the night.'],
  dusk: ['getting late.', 'the shadows are long. you did that.'],
  bipNight: ['it’s dark. good thing my eyes are lights.', 'night already? I’d only just got here.'],
  thirsty: ['that one’s parched. draw it a cloud.', 'the soil’s cracking. a bit of rain, maybe?'],
  rain: ['oh, proper rain. lovely.', 'there. that’ll soak in.'],
  bipRainbow: ['a rainbow! I’ve only ever read about those.', 'look over here. no, higher. a rainbow.'],
  snap: ['the snapdragon’s after the fireflies again.', 'leave them be, you.'],
  cross: ['the bees have been mixing things. look at that one.', 'pollen everywhere. something new is coming.'],
  hybrid: ['that’s not any flower I know. into the vase.', 'half one thing, half the other. Pim would love it.'],
  thiefTook: ['the sparrow’s got your seed!', 'oi. that was planted.'],
  thiefShooed: ['off you go, Crumb.', 'seed’s safe. sparrow’s sulking.'],
  thiefDropped: ['it dropped it. not where you put it, mind.', 'there. replanted, by a sparrow.'],
  bipSparrow: ['a sparrow just dropped a seed in my garden. beep.', 'something’s been planted over here. not by me.'],
  thiefLabel: 'Crumb the sparrow, after your seed. Press to shoo it, or to make it drop the seed.',
  bipMorning: ['morning again. that was quick.', 'you put the sun back. thank you.'],
} as const;
