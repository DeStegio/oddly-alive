import type { Weather } from '../engine/weather';

/**
 * Weather copy. Nimbus talks like a regional weather presenter who takes it
 * personally (VOICE.md); the effect lines are plain, they explain what pinning
 * does around the house.
 */

/** One almanac page per weather: what Nimbus wrote down the first time. */
export const ALMANAC: Record<Weather, { title: string; note: string }> = {
  clear: { title: 'Clear', note: 'Nothing to report. I reported it anyway.' },
  sunny: { title: 'Sunny spells', note: 'Lumen sulked all afternoon. Too much competition.' },
  windy: { title: 'Breezy', note: 'Lost a leaf off Ferdinand. He hasn’t mentioned it. He’s thinking about it.' },
  rain: { title: 'Rain', note: 'Steady from the west. The garden said thank you, in its way.' },
  storm: { title: 'Thunder', note: 'Pim under the cushion. Tick pretending he wasn’t.' },
  fog: { title: 'Fog', note: 'Couldn’t see the fence. Bip shouted hello into it.' },
  snow: { title: 'Snow', note: 'First snow. Dot tried to catch every single one.' },
  rainbow: { title: 'Rainbow', note: 'Upside down, as usual. I’ve written to someone about it.' },
  night: { title: 'Clear night', note: 'The moon came in close again. Nobody minds.' },
};

/** What pinning a weather does, in plain words (shown on the barometer). */
export const PIN_EFFECTS: Record<Weather, string> = {
  clear: 'Nothing changes. A quiet day.',
  sunny: 'The Living Room gets a patch of sun. Lumen won’t like it.',
  windy: 'Things in the Playground drift with the wind, and so do throws to Bip.',
  rain: 'Rain on every window. The Playground floor gets slippery.',
  storm: 'Thunder now and then. The Playground jumps when it rolls in.',
  fog: 'Everything goes soft and grey. Hard to see next door.',
  snow: 'Snow on every window, and on top of whatever’s in the Playground.',
  rainbow: 'A rainbow over the house. Gravity gets odd in the Playground.',
  night: 'The house goes dim, the way it does after hours.',
};

/** Nimbus, when you pin a weather from the barometer. */
export const NIMBUS_PIN: Record<Weather, string[]> = {
  clear: ['clearing nicely. no further news.', 'clear. I’ll take a break, then.'],
  sunny: ['sunny spells, spreading to all rooms.', 'sun’s out. lumen’s furious.'],
  windy: ['gusts from the west. hold onto your hats.', 'breezy. very breezy. my hair.'],
  rain: ['rain, moving in. you asked for it.', 'outbreaks of rain, heavy at times.'],
  storm: ['thunder. I want it on record I said no.', 'storm warning. everyone, cushions.'],
  fog: ['fog, rolling in off the garden.', 'visibility poor. I can’t see my own edges.'],
  snow: ['SNOW. sorry. snow, settling.', 'snow showers. dot is beside himself.'],
  rainbow: ['a rainbow. upside down. I don’t do them on purpose.', 'colourful spells, odd angles.'],
  night: ['early night across the house.', 'dark now. moon’s close again.'],
};

/** Nimbus refusing once when the house is grumpy. */
export const NIMBUS_REFUSE = ['not in this mood, no. ask me again.', 'I am not taking requests right now.'];

/** Nimbus when sent out, and the rooms he visits. */
export const NIMBUS_AWAY = ['back in a minute. bringing an umbrella.', 'right. field report. don’t touch my window.'];
export const NIMBUS_VISIT = ['just passing through. it might drizzle.', 'outside broadcast, live from in here.', 'don’t mind me. local showers.'];

/** Housemates noticing the weather turn (Living Room / Playground). */
export const WEATHER_REMARKS: Partial<Record<Weather, { who: 'pim' | 'ferdinand' | 'lumen' | 'tick' | 'dot'; lines: string[] }>> = {
  rain: { who: 'ferdinand', lines: ['rain. good.', 'ah. water.'] },
  storm: { who: 'pim', lines: ['I don’t like thunder. I’m not hiding. I’m sitting low.', 'was that the sky or the radiator.'] },
  snow: { who: 'pim', lines: ['it’s snowing. I’ve never touched snow.', 'look. the window’s gone all white at the corners.'] },
  sunny: { who: 'lumen', lines: ['the sun is upstaging me. in my own room.', 'oh, wonderful. a rival.'] },
  fog: { who: 'pim', lines: ['can’t see the fence any more.', 'it’s all soft outside.'] },
  windy: { who: 'tick', lines: ['draughty. in my day windows closed.', 'that window rattles every eleven seconds.'] },
  rainbow: { who: 'dot', lines: ['RAINBOW. upside down. still counts.', 'I’m going to find the end of it. later.'] },
  night: { who: 'pim', lines: ['getting dark early.', 'is it bedtime. it feels like bedtime.'] },
};

/** Bip, about playing in the weather. */
export const BIP_WEATHER: Partial<Record<Weather, string[]>> = {
  rain: ['wet ball. beep.', 'slippery conditions. advantage: nobody.'],
  windy: ['wind’s up. adjusting for drift.', 'crosswind from the west. beep.'],
  snow: ['snow on the court. play continues.', 'cold hands. I don’t have hands. still cold.'],
  storm: ['play suspended. no, wait. play on.', 'thunder. beep. beep.'],
  fog: ['can’t see your side. throw it anyway.', 'fog delay. I’m still here.'],
  night: ['floodlights would be nice.', 'late game. love a late game.'],
};
