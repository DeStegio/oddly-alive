import { ROOMS } from '../../app/rooms';
import { RoomStub } from '../RoomStub';

export default function MoodRoom() {
  return <RoomStub room={ROOMS['mood']} />;
}
