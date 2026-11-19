import { baseExpression } from '../engine/characterMood';
import type { ActorId } from '../engine/types';
import { useWorldStore } from '../state/worldStore';
import { useCharacter, type CharacterHandle } from './useCharacter';

/**
 * A character connected to the world: its resting face follows the shared
 * mood through its own temperament; reactions arrive via the actor channel.
 */
export function useActor(id: ActorId): CharacterHandle {
  const mood = useWorldStore((s) => s.mood);
  // bucketed so trust drifting doesn't re-render every tick
  const trust = useWorldStore((s) => (s.vars.trust < 0.32 ? 0.2 : 0.6));
  return useCharacter(id, baseExpression(id, mood, trust));
}
