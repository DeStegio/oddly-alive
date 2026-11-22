import type { RoomId } from '../app/rooms';

export interface SecretDef {
  id: string;
  name: string;
  room: RoomId | 'anywhere';
  /** A cryptic nudge shown before discovery — never a mandatory gate. */
  hint: string;
  /** What happened, shown after discovery. */
  found: string;
  /**
   * Layered hints: this hint stays folded until the named discovery is found
   * (so the cabinet never reads like a checklist of everything at once).
   */
  after?: string;
  /** A small glyph for the cabinet shelf. */
  glyph: 'key' | 'eye' | 'spiral' | 'button' | 'clock' | 'wave' | 'letter' | 'music' | 'board' | 'tower' | 'moon' | 'mirror' | 'rainbow' | 'chest' | 'aunt' | 'candle' | 'worm' | 'glitch' | 'star' | 'moth' | 'heart' | 'ball' | 'cloud' | 'flower' | 'ladder' | 'hat' | 'book' | 'map' | 'chair';
}

/**
 * Every secret in the house. Secrets are rewards for curiosity, never
 * requirements: every room and feature is reachable without any of them.
 */
export const SECRETS: SecretDef[] = [
  { id: 'keyhole', name: 'The Keyhole', room: 'living', glyph: 'key', hint: 'Great-Aunt Pim hangs crooked for a reason.', found: 'Nudged the portrait until it gave up its keyhole.' },
  { id: 'circles', name: 'Round and Round', room: 'living', glyph: 'spiral', hint: 'Some blobs get dizzy if you draw around them.', found: 'Circled Pim three times. Pim needs a moment.' },
  { id: 'button', name: 'Pressed Anyway', room: 'living', glyph: 'button', hint: 'Persistence changes some minds.', found: 'Wore down the do-not-press button. It does everything now.' },
  { id: 'midnight', name: 'Every O’Clock', room: 'living', glyph: 'clock', hint: 'Wind the sleepy clock a full day round.', found: 'Spun Tick twelve times.' },
  { id: 'hello', name: 'Hello, House', room: 'anywhere', glyph: 'wave', hint: 'Manners matter. Type them.', found: 'Typed hello. Everyone waved back.' },
  { id: 'wonk', name: 'Feral Typography', room: 'anywhere', glyph: 'letter', hint: 'The display font has a secret axis. Spell it.', found: 'Typed wonk. The letters went wonky.' },
  { id: 'dance', name: 'House Party', room: 'anywhere', glyph: 'music', hint: 'Everyone knows the steps. Ask them to.', found: 'Typed dance. The furniture has rhythm.' },
  { id: 'floorboard', name: 'The Creaky One', room: 'living', glyph: 'board', hint: 'Go all the way down. Mind the floorboards.', found: 'Found the loose floorboard and its tenant.' },
  { id: 'tower', name: 'Architecture', room: 'playground', glyph: 'tower', hint: 'Things stand taller together.', found: 'Stacked five shapes into a tower.' },
  { id: 'volley', name: 'Over the Net', room: 'playground', glyph: 'ball', hint: 'Someone next door plays a mean game of volleyball.', found: 'Kept a rally of three going with Bip.' },
  { id: 'rally', name: 'Rally Legend', room: 'playground', glyph: 'ball', hint: 'Ten in a row, and never let it touch the floor.', found: 'Kept a rally of ten going with Bip. Bip is exhausted.', after: 'volley' },
  { id: 'key', name: 'Lost & Found', room: 'playground', glyph: 'key', hint: 'Something golden turns up once a keyhole is known.', found: 'Delivered the golden key to the lost-and-found.' },
  { id: 'almanac', name: 'The Almanac', room: 'mood', glyph: 'cloud', hint: 'Nimbus keeps a page for every kind of sky. Some only come if you ask.', found: 'Filled every page of Nimbus’s almanac.', after: 'indoor-weather' },
  { id: 'indoor-weather', name: 'Indoor Weather', room: 'mood', glyph: 'cloud', hint: 'Clouds can go visiting too.', found: 'Sent Nimbus to rain on another room.' },
  { id: 'green-thumb', name: 'Green Thumb', room: 'garden', glyph: 'flower', hint: 'Great-Aunt Pim left a tin of seeds by the back door.', found: 'Grew something all the way to flowering.' },
  { id: 'came-back', name: 'Came Back For It', room: 'garden', glyph: 'flower', hint: 'Some things grow better when nobody’s watching.', found: 'Came back to find the garden had grown without you.' },
  { id: 'night-shift', name: 'Night Shift', room: 'garden', glyph: 'moon', hint: 'One packet in the tin only works after dark.', found: 'Got a moonflower to open.', after: 'green-thumb' },
  { id: 'full-bed', name: 'Full Bloom', room: 'garden', glyph: 'flower', hint: 'Six plots. All at once.', found: 'Had every plot in the garden in flower at the same time.', after: 'green-thumb' },
  { id: 'pims-hand', name: 'In Pim’s Hand', room: 'garden', glyph: 'flower', hint: 'Pim’s card has five shapes on it. The soil knows them all.', found: 'Planted all five kinds, one shape at a time.' },
  { id: 'sundown', name: 'Sundown', room: 'garden', glyph: 'moon', hint: 'You can put the sun anywhere. Even behind the fence.', found: 'Took the sun down for the night and brought the morning back.' },
  { id: 'make-it-rain', name: 'Make It Rain', room: 'garden', glyph: 'cloud', hint: 'The soil isn’t the only thing in the garden that takes a drawing.', found: 'Drew a cloud in the sky, and it rained.', after: 'green-thumb' },
  { id: 'rainbow-maker', name: 'Rainbow Maker', room: 'garden', glyph: 'rainbow', hint: 'Sun on one side. Rain on the other. Stand back.', found: 'Put the rain opposite the sun and got a rainbow.', after: 'make-it-rain' },
  { id: 'night-light', name: 'Night Light', room: 'garden', glyph: 'star', hint: 'After dark, something in the garden follows you about.', found: 'Led the fireflies to a moonflower.', after: 'sundown' },
  { id: 'cross-pollinated', name: 'The Birds and the Bees', room: 'garden', glyph: 'flower', hint: 'Grow two different flowers side by side in the sun, and watch who visits.', found: 'A bee carried pollen from one kind of flower to another.', after: 'green-thumb' },
  { id: 'hybrid-bloom', name: 'New Variety', room: 'garden', glyph: 'flower', hint: 'A flower the bees have been at comes up as something else when picked.', found: 'Picked a hybrid bloom and put it in the vase.', after: 'cross-pollinated' },
  { id: 'seed-saver', name: 'Seed Saver', room: 'garden', glyph: 'heart', hint: 'Somebody small and feathered has an eye on new seeds.', found: 'Shooed Crumb the sparrow off a seed you had just planted.' },
  { id: 'radish-volley', name: 'Root Vegetable Sports', room: 'playground', glyph: 'ball', hint: 'Bip will hit back anything. Anything.', found: 'Played volleyball with a radish.', after: 'green-thumb' },
  { id: 'attic', name: 'Up the Ladder', room: 'attic', glyph: 'ladder', hint: 'Look up in the Living Room. There’s always been a cord.', found: 'Found the attic.' },
  { id: 'dress-rehearsal', name: 'Dress Rehearsal', room: 'attic', glyph: 'hat', hint: 'Marguerite would wear anything, given the chance. Four things, in fact.', found: 'Tried every hat from the boxes on Marguerite.', after: 'attic' },
  { id: 'needle-drop', name: 'Needle Drop', room: 'attic', glyph: 'music', hint: 'There’s a record on the gramophone. It only plays if somebody turns it.', found: 'Played Great-Aunt Pim’s record.', after: 'attic' },
  { id: 'spring-clean', name: 'Spring Clean', room: 'attic', glyph: 'star', hint: 'Under all that dust there is an attic. All of it, if you keep going.', found: 'Rubbed every last bit of dust off the attic.', after: 'attic' },
  { id: 'memory-lane', name: 'Memory Lane', room: 'attic', glyph: 'aunt', hint: 'Pim’s photographs remember things, if you keep still long enough.', found: 'Sat through all three of Great-Aunt Pim’s memories.', after: 'attic' },
  { id: 'dust-bunnies', name: 'Nowhere to Hide', room: 'attic', glyph: 'moth', hint: 'Something lives in the dust. It runs to wherever the dust is thickest.', found: 'Cornered all seven dust bunnies.', after: 'attic' },
  { id: 'combination', name: 'The Combination', room: 'attic', glyph: 'chest', hint: 'The trunk wants three numbers. Pencil on the back of something, maybe.', found: 'Opened Pim’s trunk with the numbers from her photographs.', after: 'memory-lane' },
  { id: 'scratch', name: 'Scratch', room: 'attic', glyph: 'music', hint: 'Records turn both ways if you make them.', found: 'Played Great-Aunt Pim’s waltz backwards.', after: 'needle-drop' },
  { id: 'dear-diary', name: 'Dear Diary', room: 'attic', glyph: 'book', hint: 'The house keeps a diary. It needs a few things to write about first.', found: 'Read a diary the house wrote about your visits.', after: 'attic' },
  { id: 'correspondent', name: 'Correspondent', room: 'anywhere', glyph: 'letter', hint: 'Great-Aunt Pim left letters around the house. Each room hides one in its own way.', found: 'Found one of Great-Aunt Pim’s letters.' },
  { id: 'whole-story', name: 'The Whole Story', room: 'attic', glyph: 'letter', hint: 'Eight rooms, eight letters. Her trunk will tell you which are missing.', found: 'Found all eight of Great-Aunt Pim’s letters.', after: 'correspondent' },
  { id: 'infinite-rooms', name: 'Look Closer', room: 'living', glyph: 'mirror', hint: 'One of the pictures in the Living Room is of the Living Room.', found: 'Went into the little painting, and found a room in it.' },
  { id: 'deep-end', name: 'The Deep End', room: 'living', glyph: 'spiral', hint: 'There is always another room. Ten is a good number.', found: 'Went ten rooms deep into the little painting.', after: 'infinite-rooms' },
  { id: 'false-return', name: 'Nearly Home', room: 'living', glyph: 'clock', hint: 'One of the rooms in there looks very like this one. Check the clock.', found: 'Found the room that pretends to be the Living Room.', after: 'infinite-rooms' },
  { id: 'family-reunion', name: 'Family Reunion', room: 'after-hours', glyph: 'star', hint: 'Her last letter says where everyone will be.', found: 'Went up on the roof after the last letter. Everyone was there.', after: 'whole-story' },
  { id: 'patient', name: 'Patient', room: 'living', glyph: 'clock', hint: 'Sit with them a while. Don’t touch anything.', found: 'Sat so quietly the whole Living Room nodded off.' },
  { id: 'gentle-hands', name: 'Gentle Hands', room: 'living', glyph: 'heart', hint: 'Pim likes company more than poking.', found: 'Kept Pim company without poking her once. She told you a secret.' },
  { id: 'night-owl', name: 'Night Owl', room: 'anywhere', glyph: 'moon', hint: 'The house is different in the small hours. Your clock, not ours.', found: 'Came by between midnight and four in the morning.' },
  { id: 'tourist', name: 'Tourist', room: 'anywhere', glyph: 'map', hint: 'Every room you know, quick as you can.', found: 'Went through every room you know in a minute and a half.' },
  { id: 'homebody', name: 'Homebody', room: 'anywhere', glyph: 'chair', hint: 'Pick a room. Stay in it.', found: 'Spent five minutes in one room without leaving.' },
  { id: 'puddle-jumper', name: 'Puddle Jumper', room: 'playground', glyph: 'cloud', hint: 'Bip doesn’t stop for weather.', found: 'Played volleyball with Bip in the rain.', after: 'volley' },
  { id: 'back-fence', name: 'Back-Fence Champion', room: 'playground', glyph: 'ball', hint: 'Down the bottom of the Playground, Dot plays Bip over the fence. Ten in a row.', found: 'Kept a ten-hit rally going as Dot.' },
  { id: 'odd-ball', name: 'Odd Ball', room: 'playground', glyph: 'ball', hint: 'Bip is good with balls. Less so with vegetables and footwear.', found: 'Won a point off Bip with a radish or a slipper.', after: 'back-fence' },
  { id: 'nap', name: 'Nap O’Clock', room: 'mood', glyph: 'moon', hint: 'A warm drink, then something soft.', found: 'Tea and a blanket put Nimbus to sleep.' },
  { id: 'mirror', name: 'The Other Cloud', room: 'mood', glyph: 'mirror', hint: 'Look long enough and something looks back.', found: 'Caught Nimbus’s reflection winking.' },
  { id: 'moodswing', name: 'Changeable Weather', room: 'anywhere', glyph: 'rainbow', hint: 'See the house in many moods in one visit.', found: 'Witnessed six kinds of weather in one visit.' },
  { id: 'chest', name: 'The Chest', room: 'secret', glyph: 'chest', hint: 'It needs a key that went missing in the Playground.', found: 'Opened the chest. Inside: one sock, extremely lost.' },
  { id: 'aunt', name: 'Great-Aunt Pim', room: 'secret', glyph: 'aunt', hint: 'First the night, then the green, then the thing you shouldn’t press.', found: 'Put the tokens in order. Great-Aunt Pim came to visit.' },
  { id: 'candle', name: 'Invisible Ink', room: 'secret', glyph: 'candle', hint: 'Some words only show up in candlelight.', found: 'Lit the candle and read the wall.' },
  { id: 'inch', name: 'Inch by Inch', room: 'anywhere', glyph: 'worm', hint: 'A small visitor crosses the floor now and then. Say hi.', found: 'Caught Inch on one of his walks.' },
  { id: 'glitch', name: 'Error 418', room: 'anywhere', glyph: 'glitch', hint: 'Sometimes the house feels a bit sideways. Wait for it.', found: 'Witnessed a completely harmless fake error.' },
  { id: 'returning', name: 'A Regular', room: 'anywhere', glyph: 'heart', hint: 'Come back. Then come back again.', found: 'Visited the house three times.' },
  { id: 'constellation', name: 'Join the Dots', room: 'after-hours', glyph: 'star', hint: 'After hours, the stars can be connected.', found: 'Drew a constellation on the night sky.' },
  { id: 'moth', name: 'Moth to a Flame', room: 'after-hours', glyph: 'moth', hint: 'Turn a light on after hours and see who visits.', found: 'Switched on a light; the moth arrived immediately.' },
];

export const SECRET_IDS: ReadonlySet<string> = new Set(SECRETS.map((s) => s.id));
export const secretById = (id: string) => SECRETS.find((s) => s.id === id);
