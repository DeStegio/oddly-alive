import type { RoomId } from '../app/rooms';

/**
 * Great-Aunt Pim's letters: one hidden in every room, found by doing
 * something that room is about. Together they say why the house pays
 * attention. Her voice (VOICE.md): warm, bossy, specific, a different
 * sign-off every time, no modern slang.
 */
export interface Letter {
  id: RoomId;
  /** Where it was found, for the trunk. */
  place: string;
  /** Shown in the trunk while it's still missing. */
  hint: string;
  body: string[];
  signoff: string;
}

export const LETTERS: Letter[] = [
  {
    id: 'living',
    place: 'behind the portrait',
    hint: 'Once the key behind the portrait has been found, look behind it again.',
    body: [
      'If you are reading this, you have been poking at my picture, which I will allow because nobody else has dusted it since the spring.',
      'This was my house for forty-one years. The sofa was mine, the lamp was mine, the clock was a wedding present I never wanted. I talked to all of them. Eventually, I am sorry to say, they started talking back.',
      'Sit down. Put your feet up. Not on the cushion with the stain.',
    ],
    signoff: 'Yours, from the frame, P.',
  },
  {
    id: 'playground',
    place: 'stuck in Bip’s net',
    hint: 'Bip keeps finding things in the net during a long rally.',
    body: [
      'The back room was for games. I was terrible at all of them and played every one.',
      'The thing I taught this house, before anything else, was to send things back. You throw a ball at a wall, the wall returns it. That is the whole of manners, really.',
      'The neighbours’ robot learned it from watching me through the fence. He was a toaster then. Don’t ask.',
    ],
    signoff: 'Five in a row is respectable. Ten is showing off. P.',
  },
  {
    id: 'mood',
    place: 'in the mirror’s rainbow',
    hint: 'In the glass valley, hold the mirror up to the lamp while it rains.',
    body: [
      'The rainbow is upside down because I hung the mirror wrong in 1987 and the weather has copied it ever since. I have decided this is charming.',
      'Moods are weather. They come in, they sit on the roof for a bit, they go. Nimbus knows this. Nimbus takes it all very personally, but he knows.',
      'Make a pot of tea when it rains. That is not advice, it is an instruction.',
    ],
    signoff: 'Showers clearing later, P.',
  },
  {
    id: 'secret',
    place: 'under the sock in the chest',
    hint: 'The chest had a sock in it. Have another look.',
    body: [
      'The sock is your great-uncle’s. The other one is in the garden somewhere, I buried it after an argument about a hedge. We made up. The sock did not.',
      'Every house has a cupboard where it keeps the things it doesn’t know what to do with. This is ours. I put my keys in here for thirty years and found them every single time, which is more than I can say for the kitchen drawer.',
    ],
    signoff: 'Discreetly, P.',
  },
  {
    id: 'memory',
    place: 'in the post, on your third visit',
    hint: 'This one comes by post. Come back on another day. And another.',
    body: [
      'You came back. Good.',
      'I asked the house to remember people a little, and only a little. Remembering everything is not kindness, it is filing. Remember what someone liked, roughly when they came, and forget the rest. That is how I kept friends for sixty years.',
      'If you ever want to be forgotten, say so, and the house will do it properly. I taught it that too.',
    ],
    signoff: 'Fondly, and not in too much detail, P.',
  },
  {
    id: 'after-hours',
    place: 'among the stars, with the radio on',
    hint: 'Join up some stars on the roof while the radio is playing.',
    body: [
      'We used to sit up here on summer nights, the clock complaining about the hour, the lamp complaining about the dark. The moon came in close to listen. It still does.',
      'I made up the constellations. The Saucepan is real. The Saucepan has always been real.',
      'Leave the porch light on for the moth. He means well.',
    ],
    signoff: 'Goodnight, P.',
  },
  {
    id: 'garden',
    place: 'in a moonflower’s seed head',
    hint: 'One of the seeds in my tin only opens after dark.',
    body: [
      'Moonflowers were my favourite because they wait. Everything else in the garden is in a hurry to be looked at. The moonflower opens when nobody is watching and does not mind if you miss it.',
      'Water the beds on Wednesdays. Let the mint win. Tell Ferdinand he is doing very well, he never believes it.',
    ],
    signoff: 'Muddy knees, P.',
  },
  {
    id: 'attic',
    place: 'under the dust on the attic floor',
    hint: 'Somewhere on the attic floor, under years of dust.',
    body: [
      'Last one. I left it under everything, dust included, because I knew you would get to the bottom of things.',
      'When I moved out, I gave the house one job: keep someone company. Not watch them. Not keep score. Just notice that they came in, and be pleased about it.',
      'It has been doing that badly and enthusiastically ever since. If you have found all eight of these, you have been everywhere I liked. Go up on the roof tonight. They will all be there.',
    ],
    signoff: 'With love, and a list of chores, your Great-Aunt Pim.',
  },
];

export const LETTER_IDS = LETTERS.map((l) => l.id);
export const letterById = (id: string) => LETTERS.find((l) => l.id === id);

/** The little note that shows up when a letter turns up. */
export const LETTER_TOAST = 'A letter from Great-Aunt Pim';
export const LETTER_TOAST_HINT = 'It’s in her trunk in the attic now.';
