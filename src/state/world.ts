import { create } from 'zustand';

/**
 * Persistent-in-session object state of the rooms (what the house looks
 * like right now). "Reset World" restores these defaults.
 */
export interface LivingObjects {
  lampOn: boolean;
  buttonPresses: number;
  pictureTilt: number;
  pictureNudges: number;
  keyholeRevealed: boolean;
  clockSpins: number;
  plantBloom: boolean;
}

export const LIVING_DEFAULTS: LivingObjects = {
  lampOn: true,
  buttonPresses: 0,
  pictureTilt: -3,
  pictureNudges: 0,
  keyholeRevealed: false,
  clockSpins: 0,
  plantBloom: false,
};

export interface WorldObjectsState {
  living: LivingObjects;
  setLiving: (
    patch: Partial<LivingObjects> | ((s: LivingObjects) => Partial<LivingObjects>),
  ) => void;
  resetObjects: () => void;
}

export const useObjects = create<WorldObjectsState>()((set) => ({
  living: { ...LIVING_DEFAULTS },
  setLiving: (patch) =>
    set((s) => ({
      living: { ...s.living, ...(typeof patch === 'function' ? patch(s.living) : patch) },
    })),
  resetObjects: () => set({ living: { ...LIVING_DEFAULTS } }),
}));
