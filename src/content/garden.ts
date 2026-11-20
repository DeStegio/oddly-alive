import type { PlantKind } from '../rooms/Garden/growth';

/**
 * Garden copy. The seed packets come from Great-Aunt Pim's old seed tin, so
 * their notes are in her handwriting (VOICE.md: warm, bossy, specific).
 */
export const PACKETS: Record<PlantKind, { name: string; note: string }> = {
  sunflower: { name: 'Sunflower', note: 'Plant by the fence so it can see over. It will want to.' },
  radish: { name: 'Radish', note: 'Quick, round, a bit rude. Good for throwing, apparently.' },
  moonflower: { name: 'Moonflower', note: 'Only opens after dark. Don’t sit up waiting, it knows.' },
  snapdragon: { name: 'Snapdragon', note: 'Squeeze it gently and it talks back. Not too close.' },
  mint: { name: 'Mint', note: 'Will take over the whole bed if you let it. Let it.' },
};

/** What the seed tin's lid says. */
export const TIN_LABEL = 'Great-Aunt Pim’s seeds. Hands off, Tick.';

/** Inch, who lives along the bed edges (a commuter: busy, polite). */
export const INCH_GARDEN = ['morning. well. some time of day.', 'just going round the radishes. back in a bit.', 'don’t mind me. I’ve a leaf to see about.', 'the mint’s spreading again. not my department.'];

/** Bip, leaning on the fence from next door. */
export const BIP_FENCE = ['hello, neighbour. beep.', 'nice radishes. very aerodynamic.', 'throw me one sometime.', 'I can see your garden from here. it’s green.'];

/** Small comments when something happens in the beds. */
export const GARDEN_LINES = {
  plant: ['in you go.', 'pat it down. there.', 'see you in a few minutes.'],
  water: ['there. a good drink.', 'it’s had enough, I think.'],
  bloom: ['oh. it’s out.', 'look at that.', 'that one opened while we weren’t looking.'],
  harvestVase: ['into the vase on the Living Room windowsill.', 'Pim will like that one.'],
  harvestRadish: ['radish for the Playground. Bip will be thrilled.', 'one radish, off to be thrown about.'],
  moonWaiting: ['the moonflower is waiting for dark.', 'not yet. it wants the night.'],
} as const;
