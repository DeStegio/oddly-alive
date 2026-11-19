import { SEQUENCE_IDS, type SequenceId } from './events';

/** Detects typed words anywhere in the page (never inside form fields). */
export function createSequenceDetector(sequences: readonly SequenceId[] = SEQUENCE_IDS, maxLen = 12) {
  let buffer = '';
  return {
    feed(key: string): SequenceId | null {
      if (key.length !== 1) return null;
      buffer = (buffer + key.toLowerCase()).slice(-maxLen);
      for (const seq of sequences) {
        if (buffer.endsWith(seq)) {
          buffer = '';
          return seq;
        }
      }
      return null;
    },
    reset() {
      buffer = '';
    },
  };
}

/** True when keystrokes belong to the user typing somewhere, not to us. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}
