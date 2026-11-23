import { create } from 'zustand';
import { GARDEN_PLOTS, MAX_BONUS_BARREL, MAX_DIARY, MAX_STORY, cleanWorld, emptyWorldMemory, type StoredPlot, type WorldMemory } from '../engine/memory';

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
  /** Note that something notable just happened (for later callbacks). */
  remember: (key: string, at?: number) => void;
  setButton: (trust: number, suspicion: number) => void;
  /** Phase 4: the garden's jobs and Herbarium. */
  solveGarden: (id: string) => boolean;
  learnRule: (id: string) => boolean;
  /** Valley rain into the garden's barrel (capped); negative to use it. */
  addBarrel: (n: number) => void;
  solvePostcard: (id: string) => boolean;
  saveSandbox: (data: string) => void;
  setBoard: (patch: Partial<WorldMemory['board']>) => void;
}

const snapshot = (s: KeepsakesState): WorldMemory => ({ garden: s.garden, letters: s.letters, almanac: s.almanac, diary: s.diary, records: s.records, attic: s.attic, story: s.story, button: s.button, garden2: s.garden2, workshop: s.workshop, board: s.board });

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
  remember: (key, at = Date.now()) =>
    set((s) => {
      const story = { ...s.story, [key]: at };
      const keys = Object.keys(story).sort((a, b) => story[b]! - story[a]!);
      return { story: Object.fromEntries(keys.slice(0, MAX_STORY).map((k) => [k, story[k]!])) };
    }),
  setButton: (trust, suspicion) => set({ button: { trust: Math.max(0, Math.min(1, trust)), suspicion: Math.max(0, Math.min(1, suspicion)) } }),
  solveGarden: (id) => {
    if (get().garden2.solved.includes(id)) return false;
    set((s) => ({ garden2: { ...s.garden2, solved: [...s.garden2.solved, id] } }));
    return true;
  },
  learnRule: (id) => {
    if (get().garden2.herbarium.includes(id)) return false;
    set((s) => ({ garden2: { ...s.garden2, herbarium: [...s.garden2.herbarium, id] } }));
    return true;
  },
  addBarrel: (n) => set((s) => ({ garden2: { ...s.garden2, barrel: Math.max(0, Math.min(MAX_BONUS_BARREL, s.garden2.barrel + n)) } })),
  solvePostcard: (id) => {
    if (get().workshop.solved.includes(id)) return false;
    set((s) => ({ workshop: { ...s.workshop, solved: [...s.workshop.solved, id] } }));
    return true;
  },
  saveSandbox: (data) => set((s) => ({ workshop: { ...s.workshop, sandbox: data.length <= 6000 ? data : '' } })),
  setBoard: (patch) => set((s) => ({ board: { ...s.board, ...patch } })),
}));

export const keepsakesSnapshot = () => snapshot(useKeepsakes.getState());
