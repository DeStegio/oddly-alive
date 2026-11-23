import { create } from 'zustand';

export type MotionPreference = 'full' | 'reduced';

export interface SettingsState {
  motion: MotionPreference;
  /** True when the user explicitly chose a motion level (overrides the OS). */
  motionExplicit: boolean;
  sound: boolean;
  afterHours: boolean;
  /** Local memory on/off. Off = nothing written to localStorage. */
  memoryEnabled: boolean;
  /** Stuck-hints from the characters (Phase 4 hint ladder). */
  hints: boolean;
  setHints: (on: boolean) => void;
  setMotion: (m: MotionPreference) => void;
  setSound: (on: boolean) => void;
  setAfterHours: (on: boolean) => void;
  setMemoryEnabled: (on: boolean) => void;
  hydrate: (
    partial: Partial<
      Pick<SettingsState, 'motion' | 'motionExplicit' | 'sound' | 'afterHours' | 'memoryEnabled' | 'hints'>
    >,
  ) => void;
}

export function systemPrefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export const useSettings = create<SettingsState>()((set) => ({
  motion: systemPrefersReducedMotion() ? 'reduced' : 'full',
  motionExplicit: false,
  sound: false, // never autoplay; the visitor opts in
  afterHours: false,
  memoryEnabled: true,
  hints: true,
  setHints: (hints) => set({ hints }),
  setMotion: (motion) => set({ motion, motionExplicit: true }),
  setSound: (sound) => set({ sound }),
  setAfterHours: (afterHours) => set({ afterHours }),
  setMemoryEnabled: (memoryEnabled) => set({ memoryEnabled }),
  hydrate: (partial) => set(partial),
}));

export function isReducedMotion(): boolean {
  return useSettings.getState().motion === 'reduced';
}
