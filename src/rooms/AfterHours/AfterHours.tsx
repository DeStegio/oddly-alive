import { ROOMS } from '../../app/rooms';
import { RoomStub } from '../RoomStub';

export default function AfterHours() {
  return <RoomStub room={ROOMS['after-hours']} />;
}
