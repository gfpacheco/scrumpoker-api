import Participant from './Participant';
import Spectator from './Spectator';

export default class Room {
  spectators: Spectator[] = [];
  participants: Participant[] = [];

  constructor(public id: string) {}
}
