import { ROOMS } from '../../app/rooms';
import { RoomStub } from '../RoomStub';

export default function SecretSpace() {
  return <RoomStub room={ROOMS['secret']} />;
}
