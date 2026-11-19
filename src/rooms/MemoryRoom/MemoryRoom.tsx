import { ROOMS } from '../../app/rooms';
import { RoomStub } from '../RoomStub';

export default function MemoryRoom() {
  return <RoomStub room={ROOMS['memory']} />;
}
