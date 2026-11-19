import { ROOMS } from '../../app/rooms';
import { RoomStub } from '../RoomStub';

export default function Playground() {
  return <RoomStub room={ROOMS['playground']} />;
}
