/**
 * Diary lines for things that really happened on the page (honest: no
 * invented achievements) and the odd callback later. VOICE.md: the house
 * writing its own diary, plainly.
 */
export const DIARY = {
  incident: {
    sofa: (o: string) =>
      o === 'visitor returned it' ? 'Dot made off with the sofa cushion. You put it back. Pim was grateful.' : o === 'dot napped on it' ? 'Dot took the sofa cushion and fell asleep on it. Pim sulked.' : o === 'tick made dot return it' ? 'Dot took the sofa cushion. Tick had a word. It came back.' : 'Dot took the sofa cushion, then dropped it.',
    teacup: (o: string) =>
      o === 'found behind the plant' ? 'Pim’s teacup went missing. You found it behind the fern.' : o === 'tick rang until dot brought it back' ? 'Dot hid Pim’s teacup. Tick rang until it came back.' : 'Dot tried to steal Pim’s teacup. It didn’t get far.',
    spotlight: (o: string) => (o === 'lights out' ? 'Lumen put on a show. You turned the lights off.' : o.startsWith('redirected') ? 'Lumen put on a show, and you chose who got the spotlight.' : 'Lumen put on a little show for everyone.'),
  } as Record<string, (outcome: string) => string>,
  button: {
    shielded: 'The button built itself a glass box. It had its reasons.',
    fell: 'Someone loosened the bolts on the button’s glass. It hid under the table.',
    opened: 'The button let you lift its glass. Trust, of a sort.',
    caught: 'The button got pressed while it was hiding. It has not forgotten.',
    pried: 'Dot prised the glass off the button. Tick put it back.',
  } as Record<string, string>,
  infinite: (n: number) => `Went ${n} rooms deep into the little painting, and came back.`,
  rally: (n: number) => `Dot and Bip kept a rally going for ${n}.`,
  hybrid: 'The bees made a new kind of flower. It’s in the vase.',
  shadow: (c: string) => `A shadow on the attic sheet came alive: a ${c === 'curtsy' ? 'curtsy' : c}.`,
  thief: (o: string) => (o === 'shooed' ? 'A sparrow went for a new seed. It was shooed off.' : o === 'dropped' ? 'A sparrow took a seed and dropped it in another plot.' : 'A sparrow flew off with a seed. Bip got a surprise.'),
  tune: 'Somebody played the stars like an instrument.',
};

/** Characters remembering. */
export const CALLBACKS = {
  dotBrag: (n: number) => `remember that rally? ${n}. me and Bip.`,
  tickCup: ['the cup stays there. I’m watching.', 'the teacup is where it belongs. for now.'],
  pimHum: ['♪ mm-hm-hm…', '♪ …'],
};
