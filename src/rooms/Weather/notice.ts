import { findLetter } from '../../app/letters';
import type { World } from '../../engine/world';
import { PLACES, rainbows, vaneStrikes, type Valley } from './sim/valley';

/**
 * What the house notices about the valley between two moments: secrets,
 * a letter, sounds. Called about once a second by the Workshop.
 */
export function noticeValley(world: World, prev: Valley, next: Valley) {
  const bows = rainbows(next).length;
  if (bows && !rainbows(prev).length) world.discover('rainbow-maker');
  if (bows >= 2) {
    world.discover('mirror');
    // Great-Aunt Pim's letter turns up in the mirror's rainbow
    findLetter(world, 'mood');
  }
  if ([...PLACES.field, ...PLACES.pond].filter((x) => next.fog[x]! > 0.4).length >= 2) world.discover('window-drawing');
  if (vaneStrikes(next) > vaneStrikes(prev)) world.discover('paper-chase');
  if (next.snowfall.some((s) => s > 0.001)) world.discover('snowed-in');
  if (next.strikes.length > prev.strikes.length) {
    world.effects.sound('pop');
    world.emit('OBJECT_STATE_CHANGED', { target: 'valley', key: 'lightning', value: next.strikes.at(-1)!.target });
  }
}
