import type { RoomId } from '../app/rooms';

export interface SecretDef {
  id: string;
  name: string;
  room: RoomId | 'anywhere';
  /** A cryptic nudge shown before discovery — never a mandatory gate. */
  hint: string;
  /** What happened, shown after discovery. */
  found: string;
  /** A small glyph for the cabinet shelf. */
  glyph: 'key' | 'eye' | 'spiral' | 'button' | 'clock' | 'wave' | 'letter' | 'music' | 'board' | 'tower' | 'moon' | 'mirror' | 'rainbow' | 'chest' | 'aunt' | 'candle' | 'worm' | 'glitch' | 'star' | 'moth' | 'heart' | 'ball' | 'cloud' | 'flower' | 'ladder' | 'hat' | 'book';
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
  { id: 'rally', name: 'Rally Legend', room: 'playground', glyph: 'ball', hint: 'Ten in a row, and never let it touch the floor.', found: 'Kept a rally of ten going with Bip. Bip is exhausted.' },
  { id: 'key', name: 'Lost & Found', room: 'playground', glyph: 'key', hint: 'Something golden turns up once a keyhole is known.', found: 'Delivered the golden key to the lost-and-found.' },
  { id: 'almanac', name: 'The Almanac', room: 'mood', glyph: 'cloud', hint: 'Nimbus keeps a page for every kind of sky. Some only come if you ask.', found: 'Filled every page of Nimbus’s almanac.' },
  { id: 'indoor-weather', name: 'Indoor Weather', room: 'mood', glyph: 'cloud', hint: 'Clouds can go visiting too.', found: 'Sent Nimbus to rain on another room.' },
  { id: 'green-thumb', name: 'Green Thumb', room: 'garden', glyph: 'flower', hint: 'Great-Aunt Pim left a tin of seeds by the back door.', found: 'Grew something all the way to flowering.' },
  { id: 'came-back', name: 'Came Back For It', room: 'garden', glyph: 'flower', hint: 'Some things grow better when nobody’s watching.', found: 'Came back to find the garden had grown without you.' },
  { id: 'night-shift', name: 'Night Shift', room: 'garden', glyph: 'moon', hint: 'One packet in the tin only works after dark.', found: 'Got a moonflower to open.' },
  { id: 'full-bed', name: 'Full Bloom', room: 'garden', glyph: 'flower', hint: 'Six plots. All at once.', found: 'Had every plot in the garden in flower at the same time.' },
  { id: 'radish-volley', name: 'Root Vegetable Sports', room: 'playground', glyph: 'ball', hint: 'Bip will hit back anything. Anything.', found: 'Played volleyball with a radish.' },
  { id: 'attic', name: 'Up the Ladder', room: 'attic', glyph: 'ladder', hint: 'Look up in the Living Room. There’s always been a cord.', found: 'Found the attic.' },
  { id: 'dress-rehearsal', name: 'Dress Rehearsal', room: 'attic', glyph: 'hat', hint: 'Marguerite would wear anything, given the chance. Four things, in fact.', found: 'Tried every hat from the boxes on Marguerite.' },
  { id: 'needle-drop', name: 'Needle Drop', room: 'attic', glyph: 'music', hint: 'There’s a record still on the gramophone.', found: 'Played Great-Aunt Pim’s record.' },
  { id: 'dear-diary', name: 'Dear Diary', room: 'attic', glyph: 'book', hint: 'The house keeps a diary. It needs a few things to write about first.', found: 'Read a diary the house wrote about your visits.' },
  { id: 'correspondent', name: 'Correspondent', room: 'anywhere', glyph: 'letter', hint: 'Great-Aunt Pim left letters around the house. Each room hides one in its own way.', found: 'Found one of Great-Aunt Pim’s letters.' },
  { id: 'whole-story', name: 'The Whole Story', room: 'attic', glyph: 'letter', hint: 'Eight rooms, eight letters. Her trunk will tell you which are missing.', found: 'Found all eight of Great-Aunt Pim’s letters.' },
  { id: 'family-reunion', name: 'Family Reunion', room: 'after-hours', glyph: 'star', hint: 'Her last letter says where everyone will be.', found: 'Went up on the roof after the last letter. Everyone was there.' },
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
