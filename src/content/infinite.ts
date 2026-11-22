import type { Archetype } from '../rooms/LivingRoom/InfiniteRooms/sceneGenerator';

/** Infinite Rooms copy: plain, short, a little dry (VOICE.md). */
export const INFINITE = {
  title: 'Infinite Rooms',
  /** The little picture in the Living Room. */
  entry: 'A very small painting of a room. Look closer.',
  entryHint: 'there’s a room in that picture. there’s always a room.',
  controls: 'Zoom controls',
  zoomIn: 'Zoom in, into the next room',
  zoomOut: 'Zoom back out',
  home: 'Home',
  depth: (n: number) => (n === 1 ? 'One room in.' : `${n} rooms in.`),
  portal: {
    upside: 'Go through the bottom of the glass',
    paper: 'Go through the fold',
    water: 'Go through the bubble',
    impossible: 'Go through the window',
    scale: 'Go through the keyhole',
    float: 'Go through the clock',
    clock: 'Go through the big clock face',
    false: 'Go through the little picture',
  } satisfies Record<Archetype, string>,
};
