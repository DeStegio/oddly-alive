import { create } from 'zustand';
import { GARDEN_PLOTS, MAX_DIARY, cleanWorld, emptyWorldMemory, type StoredPlot, type WorldMemory } from '../engine/memory';

/**
 * What the house keeps between visits (memory v3, `world`): the garden, the
 * letters, the weather almanac, a short diary and personal bests. Lives here
 * during a visit; memorySync loads and saves it with the rest of memory.
 */
export interface KeepsakesState extends WorldMemory {
  hydrate: (w: unknown) => void;
  reset: () => void;
  /** Reset World: tidy the rooms (garden beds, attic dress-up). Letters, almanac, diary and records stay. */
  tidy: () => void;
  /** Keep the higher of the stored and the new value. Returns true for a new record. */
  record: (key: string, value: number) => boolean;
  /** Add a diary line (at most once per `kind` when `once`). */
  note: (kind: string, detail: string, opts?: { once?: boolean; at?: number }) => void;
  setPlot: (index: number, plot: StoredPlot | null) => void;
  addToVase: (kind: string) => void;
  addLetter: (id: string) => boolean;
  seeWeather: (kind: string, at?: number) => boolean;
  unlockAttic: () => void;
  addHat: (id: string) => void;
}

const snapshot = (s: KeepsakesState): WorldMemory => ({ garden: s.garden, letters: s.letters, almanac: s.almanac, diary: s.diary, records: s.records, attic: s.attic });

export const useKeepsakes = create<KeepsakesState>()((set, get) => ({
  ...emptyWorldMemory(),
  hydrate: (w) => set(cleanWorld(w)),
  reset: () => set(emptyWorldMemory()),
  tidy: () => set((s) => ({ garden: { ...s.garden, plots: Array.from({ length: GARDEN_PLOTS }, () => null) }, attic: { ...s.attic, hats: [] } })),
  record: (key, value) => {
    const prev = get().records[key] ?? 0;
    if (!(value > prev)) return false;
    set((s) => ({ records: { ...s.records, [key]: Math.floor(value) } }));
    return true;
  },
  note: (kind, detail, opts) => {
    const s = get();
    if (opts?.once && s.diary.some((e) => e.kind === kind)) return;
    set({ diary: [...s.diary, { at: opts?.at ?? Date.now(), kind, detail }].slice(-MAX_DIARY) });
  },
  setPlot: (index, plot) =>
    set((s) => {
      if (index < 0 || index >= GARDEN_PLOTS) return {};
      const plots = s.garden.plots.slice();
      plots[index] = plot;
      return { garden: { ...s.garden, plots } };
    }),
  addToVase: (kind) => set((s) => ({ garden: { ...s.garden, vase: [...s.garden.vase, kind].slice(-12) } })),
  addLetter: (id) => {
    if (get().letters.includes(id)) return false;
    set((s) => ({ letters: [...s.letters, id] }));
    return true;
  },
  seeWeather: (kind, at = Date.now()) => {
    if (kind in get().almanac) return false;
    set((s) => ({ almanac: { ...s.almanac, [kind]: at } }));
    return true;
  },
  unlockAttic: () => set((s) => ({ attic: { ...s.attic, unlocked: true } })),
  addHat: (id) => set((s) => (s.attic.hats.includes(id) ? {} : { attic: { ...s.attic, hats: [...s.attic.hats, id] } })),
}));

export const keepsakesSnapshot = () => snapshot(useKeepsakes.getState());
