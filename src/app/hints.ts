import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '../state/settings';

/**
 * The hint ladder (Phase 4, L7). While a puzzle is open and the player makes
 * no progress: at 30 s the asker glances at the important thing, at 60 s says
 * something vague, at 120 s something specific. Never the answer. Progress
 * (anything that changed the puzzle) resets the clock. Hints can be turned
 * off in the Memory Room (`settings.hints`).
 */
export const HINT_STEPS_MS = [30_000, 60_000, 120_000] as const;
export type HintRung = 0 | 1 | 2 | 3;

/** Pure: which rung of the ladder `idleMs` of no progress reaches. */
export function hintRung(idleMs: number): HintRung {
  if (idleMs >= HINT_STEPS_MS[2]) return 3;
  if (idleMs >= HINT_STEPS_MS[1]) return 2;
  if (idleMs >= HINT_STEPS_MS[0]) return 1;
  return 0;
}

/**
 * `key` names the puzzle (a new key starts a new ladder); `active` is false
 * when there is nothing to hint at (solved, free play). Returns the current
 * rung and `progress()` to call on every meaningful action.
 */
export function useHintLadder(key: string, active: boolean): { rung: HintRung; progress: () => void } {
  const enabled = useSettings((s) => s.hints);
  const [rung, setRung] = useState<HintRung>(0);
  const since = useRef(Date.now());
  const progress = useCallback(() => {
    since.current = Date.now();
    setRung(0);
  }, []);

  useEffect(() => {
    since.current = Date.now();
    setRung(0);
    if (!active || !enabled) return;
    const t = window.setInterval(() => {
      const r = hintRung(Date.now() - since.current);
      setRung((cur) => (cur === r ? cur : r));
    }, 1000);
    return () => window.clearInterval(t);
  }, [key, active, enabled]);

  return { rung: active && enabled ? rung : 0, progress };
}
