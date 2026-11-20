import { LETTER_IDS, letterById } from '../content/letters';
import type { World } from '../engine/world';
import { useKeepsakes } from '../state/keepsakes';
import { setWorldState } from '../state/worldStore';

/**
 * A letter from Great-Aunt Pim turns up. Keeps it (memory v3), writes it in
 * the diary, tells the world and shows a small note. Returns false if it had
 * already been found.
 */
export function findLetter(world: World, id: string): boolean {
  const letter = letterById(id);
  const k = useKeepsakes.getState();
  if (!letter || !k.addLetter(id)) return false;
  const count = useKeepsakes.getState().letters.length;
  k.note(`letter:${id}`, `Found a letter from Great-Aunt Pim ${letter.place}.`, { once: true });
  setWorldState({ lastLetter: { id, at: Date.now() } });
  world.emit('OBJECT_STATE_CHANGED', { target: 'letter', key: 'found', value: id });
  world.discover('correspondent');
  if (count >= LETTER_IDS.length) {
    world.discover('whole-story');
    useKeepsakes.getState().note('letters:all', 'Read all eight of Great-Aunt Pim’s letters. She said to go up on the roof.', { once: true });
  }
  return true;
}

export const allLettersFound = (letters: readonly string[]) => LETTER_IDS.every((id) => letters.includes(id));
