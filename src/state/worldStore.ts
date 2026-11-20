import { create } from 'zustand';
import type { RoomId } from '../app/rooms';
import { BASELINE } from '../engine/personality';
import type { Mood, PersonalityVars } from '../engine/types';
import type { Weather, WeatherPin } from '../engine/weather';

export interface Caption {
  id: number;
  text: string;
}

/**
 * Low-frequency shared world state. Components select narrow slices so a
 * mood change re-renders only what depends on mood.
 */
export interface WorldStoreState {
  room: RoomId;
  mood: Mood;
  vars: PersonalityVars;
  /** Session interaction counts per object id. */
  counts: Record<string, number>;
  /** Moods witnessed this session, in order of first appearance. */
  moodsSeen: Mood[];
  /** The house weather (follows mood unless pinned in the Mood Room). */
  weather: Weather;
  weatherPin: WeatherPin | null;
  /** Nimbus out on a visit to another room (Mood Room "send Nimbus"). */
  nimbusVisit: { room: RoomId; until: number } | null;
  /** Secret id → first discovery timestamp. */
  discoveries: Record<string, number>;
  /** Most recently discovered secret (for the discovery toast). */
  lastDiscovery: { id: string; at: number } | null;
  visits: number;
  returning: boolean;
  firstVisit: number;
  roomVisits: Partial<Record<RoomId, number>>;
  eventTotals: Record<string, number>;
  lastRoom: RoomId | null;
  caption: Caption | null;
  seed: number;
  /** Interaction counts from previous visits (local memory). */
  pastCounts: Record<string, number>;
  pastRoomVisits: Partial<Record<RoomId, number>>;
  pastEventTotals: Record<string, number>;
  memoryStatus: 'fresh' | 'restored' | 'migrated' | 'corrupt' | 'unavailable' | 'disabled';
  lastVisitRoom: RoomId | null;
}

export const initialWorldState = (): WorldStoreState => ({
  room: 'living',
  mood: 'neutral',
  vars: { ...BASELINE },
  counts: {},
  moodsSeen: ['neutral'],
  weather: 'clear',
  weatherPin: null,
  nimbusVisit: null,
  discoveries: {},
  lastDiscovery: null,
  visits: 1,
  returning: false,
  firstVisit: Date.now(),
  roomVisits: {},
  eventTotals: {},
  lastRoom: null,
  caption: null,
  seed: 1,
  pastCounts: {},
  pastRoomVisits: {},
  pastEventTotals: {},
  memoryStatus: 'fresh',
  lastVisitRoom: null,
});

export const useWorldStore = create<WorldStoreState>()(() => initialWorldState());

export const getWorldState = () => useWorldStore.getState();
export const setWorldState = (patch: Partial<WorldStoreState> | ((s: WorldStoreState) => Partial<WorldStoreState>)) =>
  useWorldStore.setState(patch);
