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
  { id: 'almanac', name: 'The Almanac', room: 'mood', glyph: 'cloud', hint: 'Nimbus keeps a page for every kind of sky. The valley can make most of them.', found: 'Filled every page of Nimbus’s almanac.', after: 'rainbow-maker' },
  { id: 'indoor-weather', name: 'Indoor Weather', room: 'mood', glyph: 'cloud', hint: 'Nimbus is mostly water. Hold him.', found: 'Wrung Nimbus out over the valley.' },
  { id: 'green-thumb', name: 'Green Thumb', room: 'garden', glyph: 'flower', hint: 'There are jobs pinned to the garden fence.', found: 'Finished a job for the house in the garden.' },
  { id: 'came-back', name: 'Second Thoughts', room: 'garden', glyph: 'clock', hint: 'The sun goes backwards too, if you ask it.', found: 'Took the sun back and had yesterday again.', after: 'green-thumb' },
  { id: 'night-shift', name: 'Night Shift', room: 'garden', glyph: 'moon', hint: 'One packet in the tin only opens after dark.', found: 'Got a moonflower to open.', after: 'green-thumb' },
  { id: 'full-bed', name: 'Every Job on the Fence', room: 'garden', glyph: 'flower', hint: 'Twelve jobs on the fence. All of them.', found: 'Did every job pinned to the garden fence.', after: 'green-thumb' },
  { id: 'pims-hand', name: 'In Pim’s Hand', room: 'garden', glyph: 'aunt', hint: 'Great-Aunt Pim drew the garden once. Make it look like that.', found: 'Made the garden look like Great-Aunt Pim’s sketch.', after: 'green-thumb' },
  { id: 'sundown', name: 'Sundown', room: 'garden', glyph: 'moon', hint: 'You can put the sun anywhere. Even behind the fence.', found: 'Let a night go by in the garden.' },
  { id: 'make-it-rain', name: 'Make It Rain', room: 'garden', glyph: 'cloud', hint: 'The barrel by the beds tips over, if there’s anything in it.', found: 'Tipped the rain barrel over a row of the garden.', after: 'green-thumb' },
  { id: 'rainbow-maker', name: 'Rainbow Maker', room: 'mood', glyph: 'rainbow', hint: 'Light behind you, rain in front. In a valley in a glass box.', found: 'Made a rainbow in the Weather Workshop.' },
  { id: 'night-light', name: 'Same Night', room: 'garden', glyph: 'star', hint: 'A sunflower and a moonflower, both open at once.', found: 'Had a sunflower and a moonflower in bloom on the same night.', after: 'night-shift' },
  { id: 'cross-pollinated', name: 'The Birds and the Bees', room: 'garden', glyph: 'flower', hint: 'Two different flowers open side by side, and the bees get ideas.', found: 'The bees made a new kind of seed.', after: 'green-thumb' },
  { id: 'hybrid-bloom', name: 'New Variety', room: 'garden', glyph: 'flower', hint: 'Grow one of the bees’ new seeds all the way, then pick it.', found: 'Picked a flower nobody had seen before and put it in the vase.', after: 'cross-pollinated' },
  { id: 'seed-saver', name: 'Seed Saver', room: 'garden', glyph: 'heart', hint: 'Crumb the sparrow only takes seeds that are on their own.', found: 'Planted so that Crumb went away with nothing.' },
  { id: 'radish-volley', name: 'Root Vegetable Sports', room: 'playground', glyph: 'ball', hint: 'Bip will hit back anything. Anything.', found: 'Played volleyball with a radish.', after: 'green-thumb' },
  { id: 'attic', name: 'Up the Ladder', room: 'attic', glyph: 'ladder', hint: 'Look up in the Living Room. There’s always been a cord.', found: 'Found the attic.' },
  { id: 'dress-rehearsal', name: 'Dress Rehearsal', room: 'attic', glyph: 'hat', hint: 'Marguerite would wear anything, given the chance. Four things, in fact.', found: 'Tried every hat from the boxes on Marguerite.', after: 'attic' },
  { id: 'needle-drop', name: 'Needle Drop', room: 'attic', glyph: 'music', hint: 'There’s a record on the gramophone. It only plays if somebody turns it.', found: 'Played Great-Aunt Pim’s record.', after: 'attic' },
  { id: 'spring-clean', name: 'Spring Clean', room: 'attic', glyph: 'star', hint: 'Under all that dust there is an attic. All of it, if you keep going.', found: 'Rubbed every last bit of dust off the attic.', after: 'attic' },
  { id: 'memory-lane', name: 'Memory Lane', room: 'attic', glyph: 'aunt', hint: 'Pim’s photographs remember things, if you keep still long enough.', found: 'Sat through all three of Great-Aunt Pim’s memories.', after: 'attic' },
  { id: 'dust-bunnies', name: 'Nowhere to Hide', room: 'attic', glyph: 'moth', hint: 'Something lives in the dust. It runs to wherever the dust is thickest.', found: 'Cornered all seven dust bunnies.', after: 'attic' },
  { id: 'combination', name: 'The Combination', room: 'attic', glyph: 'chest', hint: 'The trunk wants three numbers. Pencil on the back of something, maybe.', found: 'Opened Pim’s trunk with the numbers from her photographs.', after: 'memory-lane' },
  { id: 'night-music', name: 'Night Music', room: 'after-hours', glyph: 'music', hint: 'Every star up there has a note. Join five and listen.', found: 'Played a constellation as a tune.' },
  { id: 'window-drawing', name: 'Fox Crossing', room: 'mood', glyph: 'cloud', hint: 'Cold, wet and still, down on the low ground.', found: 'Made fog on the valley floor.' },
  { id: 'paper-chase', name: 'Lightning Rod', room: 'mood', glyph: 'wave', hint: 'The weathervane is the tallest thing on the hill.', found: 'Got lightning to strike the weathervane.' },
  { id: 'snowed-in', name: 'Snowed In', room: 'mood', glyph: 'cloud', hint: 'Rain that falls through cold air arrives differently.', found: 'Made it snow in the valley.' },
  { id: 'shadow-play', name: 'Shadow Play', room: 'attic', glyph: 'candle', hint: 'Hold things up to the lamp by the old sheet. Some shapes have a life of their own.', found: 'Made a shadow come alive on the attic sheet.', after: 'attic' },
  { id: 'menagerie', name: 'Menagerie', room: 'attic', glyph: 'moth', hint: 'Five creatures live in the shadow theatre. Hands, hats, cups, kettles, ferns.', found: 'Brought all five shadow creatures to life.', after: 'shadow-play' },
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
  { id: 'nap', name: 'Nap O’Clock', room: 'mood', glyph: 'moon', hint: 'Wring Nimbus right out. All the way.', found: 'Squeezed Nimbus until he needed a lie-down.', after: 'indoor-weather' },
  { id: 'mirror', name: 'Seeing Double', room: 'mood', glyph: 'mirror', hint: 'The mirror has its own idea about where the lamp’s light goes.', found: 'Made two rainbows at once with the lamp and the mirror.', after: 'rainbow-maker' },
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
