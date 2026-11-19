import { ROOMS } from '../../app/rooms';
import { RoomStub } from '../RoomStub';

export default function LivingRoom() {
  return <RoomStub room={ROOMS['living']} />;
}
