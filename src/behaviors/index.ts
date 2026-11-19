import type { AnyBehavior } from '../engine/behaviorEngine';
import { characterBehaviors } from './character';
import { livingBehaviors } from './living';

/** Every behavior in the world, registered once at startup. */
export function allBehaviors(): AnyBehavior[] {
  return [...characterBehaviors, ...livingBehaviors];
}
