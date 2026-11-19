import { ROOM_IDS, ROOMS, isRoomId, roomFromPath } from './rooms';

describe('rooms', () => {
  it('has metadata for every room id', () => {
    for (const id of ROOM_IDS) expect(ROOMS[id].id).toBe(id);
  });

  it('maps paths to rooms', () => {
    expect(roomFromPath('/')).toBe('living');
    expect(roomFromPath('/playground')).toBe('playground');
    expect(roomFromPath('/after-hours')).toBe('after-hours');
    expect(roomFromPath('/nope')).toBe('living');
  });

  it('validates room ids', () => {
    expect(isRoomId('mood')).toBe(true);
    expect(isRoomId('kitchen')).toBe(false);
    expect(isRoomId(3)).toBe(false);
  });
});
