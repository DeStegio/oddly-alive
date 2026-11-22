import { create } from 'zustand';
import { initialButton, step, type ButtonInput, type ButtonOutcome, type ButtonState } from './buttonMachine';

/**
 * The button's feelings for this session. Lives outside the room so leaving
 * and coming back doesn't wipe the relationship (it calms down meanwhile:
 * decay runs on the next input).
 */
interface ButtonStore {
  s: ButtonState;
  dispatch(input: ButtonInput): ButtonOutcome;
  reset(now?: number): void;
  /** Pick up where the last visit left off (feelings only; the glass starts down). */
  restore(trust: number, suspicion: number): void;
}

export const useButton = create<ButtonStore>()((set, get) => ({
  s: initialButton(Date.now()),
  dispatch(input) {
    const r = step(get().s, input);
    if (r.state !== get().s) set({ s: r.state });
    return r.outcome;
  },
  reset(now = Date.now()) {
    set({ s: initialButton(now) });
  },
  restore(trust, suspicion) {
    set((st) => ({ s: { ...st.s, trust, suspicion } }));
  },
}));
