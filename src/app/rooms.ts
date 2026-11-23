export const ROOM_IDS = [
  'living',
  'playground',
  'garden',
  'mood',
  'secret',
  'memory',
  'after-hours',
  'attic',
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
  /**
   * How the room shows in navigation before the visitor knows it:
   * 'mysterious' keeps a ??? label, 'unlockable' leaves it out entirely.
   * Either way the URL always works: nothing is ever gated.
   */
  reveal?: 'mysterious' | 'unlockable';
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
    blurb: 'Put things down. They won’t stay there.',
  },
  garden: {
    id: 'garden',
    path: '/garden',
    label: 'Garden',
    short: 'Garden',
    blurb: 'Out the back, past the fence Bip leans on.',
  },
  mood: {
    id: 'mood',
    path: '/mood',
    label: 'Weather Workshop',
    short: 'Weather',
    blurb: 'A valley in a glass box. The weather happens.',
  },
  secret: {
    id: 'secret',
    path: '/secret',
    label: 'Secret Space',
    short: '???',
    blurb: 'You were never here.',
    reveal: 'mysterious',
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
  attic: {
    id: 'attic',
    path: '/attic',
    label: 'Attic',
    short: 'Attic',
    blurb: 'Mind your head. Nobody has sorted the boxes.',
    reveal: 'unlockable',
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
