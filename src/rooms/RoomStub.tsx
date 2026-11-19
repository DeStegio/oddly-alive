import type { RoomMeta } from '../app/rooms';

/** Temporary scaffold used only during Phase 1; replaced room by room. */
export function RoomStub({ room }: { room: RoomMeta }) {
  return (
    <section
      style={{ padding: 'calc(var(--nav-h) + 8vh) var(--gutter)' }}
      aria-labelledby={'title-' + room.id}
    >
      <h1 id={'title-' + room.id} style={{ fontSize: 'var(--fs-3xl)' }}>
        {room.label}
      </h1>
      <p style={{ marginTop: 16, color: 'var(--ink-soft)' }}>{room.blurb}</p>
      <p style={{ marginTop: 8, fontSize: 'var(--fs-sm)' }}>This room is still being built.</p>
    </section>
  );
}
