import type { AnyBehavior } from '../engine/behaviorEngine';
import { characterBehaviors } from './character';
import { comboBehaviors } from './combos';
import { livingBehaviors } from './living';
import { moodBehaviors } from './mood';
import { memoryBehaviors } from './memory';
import { nightBehaviors } from './night';
import { playgroundBehaviors } from './playground';
import { rareBehaviors } from './rare';
import { secretBehaviors } from './secret';

/** Every behavior in the world, registered once at startup. */
export function allBehaviors(): AnyBehavior[] {
  return [...characterBehaviors, ...livingBehaviors, ...playgroundBehaviors, ...moodBehaviors, ...secretBehaviors, ...rareBehaviors, ...memoryBehaviors, ...nightBehaviors, ...comboBehaviors];
}
