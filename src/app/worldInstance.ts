import { allBehaviors } from '../behaviors';
import { SECRET_IDS } from '../content/secrets';
import { createRng } from '../engine/rng';
import { SurpriseDirector } from '../engine/surpriseDirector';
import { AgentDirector } from '../engine/agents/director';
import { CAST } from '../engine/agents/cast';
import { World } from '../engine/world';
import { setWorldState } from '../state/worldStore';
import { readInitialSeed } from './share';

let instance: World | null = null;
let director: SurpriseDirector | null = null;
let agents: AgentDirector | null = null;

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
    // characters with something on their mind (Phase 3)
    agents = new AgentDirector(createRng(world.seed ^ 0xa9e7));
    agents.addAgents(...CAST);
    world.use(agents);
    instance = world;
    // a small window for tests: what the characters decided, and a way to nudge them
    if (typeof window !== 'undefined') {
      const a = agents;
      Object.defineProperty(window, '__oddly', {
        configurable: true,
        value: {
          agentLog: () => a.log.slice(),
          force: (goalId: string) => {
            const g = a.goal(goalId);
            return g ? a.start(g, world) : false;
          },
        },
      });
    }
  }
  return instance;
}

export function getDirector(): SurpriseDirector | null {
  getWorld();
  return director;
}

export function getAgents(): AgentDirector {
  getWorld();
  return agents!;
}

/** Test helper. */
export function __setWorld(w: World | null) {
  instance = w;
}

/** Access the world (emit events, read engine state) from any component. */
export const useWorld = (): World => getWorld();
