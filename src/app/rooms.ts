export const ROOM_IDS = [
  'living',
  'playground',
  'mood',
  'secret',
  'memory',
  'after-hours',
] as const;

export type RoomId = (typeof ROOM_IDS)[number];

export interface RoomMeta {
  id: RoomId;
  path: string;
  /** Label in navigation. */
  label: string;
  /** Short label for compact (mobile) navigation. */
  short: string;
  /** One-line, in-character description used for accessible names and the door signs. */
  blurb: string;
}

export const ROOMS: Record<RoomId, RoomMeta> = {
  living: {
    id: 'living',
    path: '/',
    label: 'Living Room',
    short: 'Living',
    blurb: 'Where everyone pretends to be furniture.',
  },
  playground: {
    id: 'playground',
    path: '/playground',
    label: 'Playground',
    short: 'Play',
    blurb: 'Things fall over here on purpose.',
  },
  mood: {
    id: 'mood',
    path: '/mood',
    label: 'Mood Room',
    short: 'Mood',
    blurb: 'The weather in here is an opinion.',
  },
  secret: {
    id: 'secret',
    path: '/secret',
    label: 'Secret Space',
    short: '???',
    blurb: 'You were never here.',
  },
  memory: {
    id: 'memory',
    path: '/memory',
    label: 'Memory Room',
    short: 'Memory',
    blurb: 'What the house remembers, and how to make it forget.',
  },
  'after-hours': {
    id: 'after-hours',
    path: '/after-hours',
    label: 'After Hours',
    short: 'Night',
    blurb: 'The house after everyone pretends to sleep.',
  },
};

export const ROOM_LIST: RoomMeta[] = ROOM_IDS.map((id) => ROOMS[id]);

export function roomFromPath(pathname: string): RoomId {
  const match = ROOM_LIST.find((r) => r.path !== '/' && pathname.startsWith(r.path));
  return match ? match.id : 'living';
}

export function isRoomId(value: unknown): value is RoomId {
  return typeof value === 'string' && (ROOM_IDS as readonly string[]).includes(value);
}
