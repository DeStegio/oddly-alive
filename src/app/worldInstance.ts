import { allBehaviors } from '../behaviors';
import { World } from '../engine/world';

let instance: World | null = null;

/** The single world of the running app (tests create their own instances). */
export function getWorld(): World {
  if (!instance) {
    instance = new World({ behaviors: allBehaviors() });
  }
  return instance;
}

/** Test helper. */
export function __setWorld(w: World | null) {
  instance = w;
}

/** Access the world (emit events, read engine state) from any component. */
export const useWorld = (): World => getWorld();
