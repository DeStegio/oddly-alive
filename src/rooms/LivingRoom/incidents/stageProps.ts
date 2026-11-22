import { create } from 'zustand';

/**
 * Things in the Living Room that characters (and the visitor) can move:
 * the sofa cushion, the teacup, and Lumen's spotlight. Where they are is
 * room-local state; the pixels are worked out every frame from anchors.
 */
export type PropId = 'cushion' | 'cup';
/** home = where it belongs; dot = Dot is carrying it; floor = put down somewhere; hidden = tucked behind the plant. */
export type Place = 'home' | 'dot' | 'floor' | 'hidden';
export type SpotTarget = 'pim' | 'dot' | 'tick' | 'button';
export const SPOT_TARGETS: SpotTarget[] = ['pim', 'dot', 'tick', 'button'];

export interface PropPos {
  place: Place;
  /** Stage fractions (0..1), used for floor. */
  x: number;
  y: number;
}

export interface Spot {
  on: boolean;
  target: SpotTarget | null;
}

interface StageProps {
  cushion: PropPos;
  cup: PropPos;
  spot: Spot;
  /** Since when a prop has been out of place (for "someone should tidy that"). */
  outSince: Partial<Record<PropId, number>>;
  move(id: PropId, place: Place, at?: { x: number; y: number }): void;
  setSpot(spot: Partial<Spot>): void;
  reset(): void;
}

const HOME: PropPos = { place: 'home', x: 0, y: 0 };

export const useStageProps = create<StageProps>()((set) => ({
  cushion: HOME,
  cup: HOME,
  spot: { on: false, target: null },
  outSince: {},
  move(id, place, at) {
    set((s) => ({
      [id]: { place, x: at?.x ?? s[id].x, y: at?.y ?? s[id].y },
      outSince: { ...s.outSince, [id]: place === 'home' ? undefined : (s.outSince[id] ?? Date.now()) },
    }));
  },
  setSpot(spot) {
    set((s) => ({ spot: { ...s.spot, ...spot } }));
  },
  reset() {
    set({ cushion: HOME, cup: HOME, spot: { on: false, target: null }, outSince: {} });
  },
}));

/** Who's carried by Dot right now. */
export const carriedByDot = (): PropId | null => {
  const s = useStageProps.getState();
  return s.cushion.place === 'dot' ? 'cushion' : s.cup.place === 'dot' ? 'cup' : null;
};

/** Where a dropped prop lands: near its home snaps back home; otherwise on the floor where it fell. */
export function landing(drop: { x: number; y: number }, home: { x: number; y: number } | null, snapPx: number): Place {
  if (home && Math.hypot(drop.x - home.x, drop.y - home.y) <= snapPx) return 'home';
  return 'floor';
}

/** The nearest spotlight target to a point, if one is close enough. */
export function nearestTarget(p: { x: number; y: number }, targets: Array<{ id: SpotTarget; x: number; y: number }>, maxPx: number): SpotTarget | null {
  let best: SpotTarget | null = null;
  let bestD = maxPx;
  for (const t of targets) {
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    if (d <= bestD) {
      bestD = d;
      best = t.id;
    }
  }
  return best;
}
