import { allBehaviors } from '../behaviors';
import { SECRET_IDS } from '../content/secrets';
import { createRng } from '../engine/rng';
import { SurpriseDirector } from '../engine/surpriseDirector';
import { World } from '../engine/world';
import { setWorldState } from '../state/worldStore';
import { readInitialSeed } from './share';

let instance: World | null = null;
let director: SurpriseDirector | null = null;

/** The single world of the running app (tests create their own instances). */
export function getWorld(): World {
  if (!instance) {
    const seed = readInitialSeed();
    const world = new World({ behaviors: allBehaviors(), seed });
    setWorldState({ seed });
    // only registered secrets can be discovered
    world.discoverHandler = (id) => SECRET_IDS.has(id);
    director = new SurpriseDirector(createRng(world.seed ^ 0x5eed), world.clock.now());
    world.use(director);
    instance = world;
  }
  return instance;
}

export function getDirector(): SurpriseDirector | null {
  getWorld();
  return director;
}

/** Test helper. */
export function __setWorld(w: World | null) {
  instance = w;
}

/** Access the world (emit events, read engine state) from any component. */
export const useWorld = (): World => getWorld();
