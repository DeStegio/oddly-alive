import { create } from 'zustand';

/**
 * What the rooms look like right now. "Reset World" restores these defaults.
 * Behaviors read/write them through string flags like 'living.lampOn'.
 */
export interface LivingObjects {
  lampOn: boolean;
  buttonPresses: number;
  pictureTilt: number;
  pictureNudges: number;
  keyholeRevealed: boolean;
  clockSpins: number;
  plantBloom: boolean;
  /** Stickers placed on the wall (INT-028): bounded list. */
  stickers: number;
  /** "Mini-incident": the room is rearranged until tidied (INT-029). */
  rearranged: boolean;
  /** Pim's transformation stage (INT-030). */
  pimForm: number;
  /** A secret found elsewhere that Pim hasn't gossiped about yet. */
  gossip: string;
}

export interface MoodObjects {
  lastUsed: string;
  teaPoured: number;
  /** Nimbus is napping under the blanket (tea + blanket combination). */
  napping: boolean;
  mirrorLooks: number;
}

export interface SecretObjects {
  /** Token ids placed into the three slots of the cabinet. */
  slots: string;
  chestOpen: boolean;
  candleLit: boolean;
  /** The golden key was delivered to the lost-and-found in the Playground. */
  keyFound: boolean;
}

export interface AfterHoursObjects {
  radioOn: boolean;
  lightOn: boolean;
  constellations: number;
}

export interface PlaygroundObjects {
  /** Comma-separated ids of the Field Notes goals reached this session. */
  goals: string;
  /** Radishes harvested in the Garden, waiting to be dropped into the tray. */
  radishes: number;
}

export interface ObjectsState {
  living: LivingObjects;
  mood: MoodObjects;
  secret: SecretObjects;
  after: AfterHoursObjects;
  playground: PlaygroundObjects;
}

export const OBJECT_DEFAULTS: ObjectsState = {
  living: {
    lampOn: true,
    buttonPresses: 0,
    pictureTilt: -3,
    pictureNudges: 0,
    keyholeRevealed: false,
    clockSpins: 0,
    plantBloom: false,
    stickers: 0,
    rearranged: false,
    pimForm: 0,
    gossip: '',
  },
  mood: { lastUsed: '', teaPoured: 0, napping: false, mirrorLooks: 0 },
  secret: { slots: '', chestOpen: false, candleLit: false, keyFound: false },
  after: { radioOn: false, lightOn: false, constellations: 0 },
  playground: { goals: '', radishes: 0 },
};

type SliceKey = keyof ObjectsState;

export interface WorldObjectsState extends ObjectsState {
  setLiving: (patch: Partial<LivingObjects> | ((s: LivingObjects) => Partial<LivingObjects>)) => void;
  setSlice: <K extends SliceKey>(key: K, patch: Partial<ObjectsState[K]>) => void;
  resetObjects: () => void;
  hydrateObjects: (state: Partial<ObjectsState>) => void;
}

const fresh = (): ObjectsState => JSON.parse(JSON.stringify(OBJECT_DEFAULTS)) as ObjectsState;

export const useObjects = create<WorldObjectsState>()((set) => ({
  ...fresh(),
  setLiving: (patch) =>
    set((s) => ({ living: { ...s.living, ...(typeof patch === 'function' ? patch(s.living) : patch) } })),
  setSlice: (key, patch) => set((s) => ({ [key]: { ...s[key], ...patch } }) as Partial<WorldObjectsState>),
  resetObjects: () => set(fresh()),
  hydrateObjects: (state) =>
    set((s) => {
      const next: Partial<ObjectsState> = {};
      for (const key of Object.keys(OBJECT_DEFAULTS) as SliceKey[]) {
        const incoming = state[key];
        if (incoming && typeof incoming === 'object') {
          (next as Record<string, unknown>)[key] = { ...s[key], ...sanitize(OBJECT_DEFAULTS[key], incoming) };
        }
      }
      return next;
    }),
}));

/** Keep only known keys whose type matches the default. */
function sanitize<T extends object>(defaults: T, incoming: object): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(defaults) as Array<keyof T>) {
    const v = (incoming as Record<string, unknown>)[k as string];
    if (v !== undefined && typeof v === typeof defaults[k]) out[k] = v as T[keyof T];
  }
  return out;
}

export function getFlag(path: string): boolean | number | string | undefined {
  const [slice, field] = path.split('.') as [string, string | undefined];
  const state = useObjects.getState() as unknown as Record<string, Record<string, unknown>>;
  const v = field ? state[slice]?.[field] : undefined;
  return typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string' ? v : undefined;
}

export function setFlag(path: string, value: boolean | number | string) {
  const [slice, field] = path.split('.') as [string, string | undefined];
  if (!field || !(slice in OBJECT_DEFAULTS)) return;
  const def = (OBJECT_DEFAULTS as unknown as Record<string, Record<string, unknown>>)[slice];
  if (!def || typeof def[field] !== typeof value) return;
  useObjects.getState().setSlice(slice as SliceKey, { [field]: value } as never);
}

/** Serializable snapshot (for memory persistence). */
export function snapshotObjects(): ObjectsState {
  const s = useObjects.getState();
  return { living: s.living, mood: s.mood, secret: s.secret, after: s.after, playground: s.playground };
}
