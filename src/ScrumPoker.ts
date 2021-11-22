import { Response } from 'express';
import Guest from './Guest';
import Participant from './Participant';
import Room from './Room';
import Spectator from './Spectator';

export default class ScrumPoker {
  guests: Guest[] = [];
  rooms: Room[] = [];

  get everyone(): (Guest | Spectator | Participant)[] {
    return this.rooms.reduce(
      (partial, room) => [...partial, ...room.participants, ...room.spectators],
      this.guests,
    );
  }

  getOrCreateRoom(roomId: number) {
    const existingRoom = this.rooms.find(r => r.id === roomId);

    if (existingRoom) {
      return existingRoom;
    }

    const newRoom = new Room(roomId);
    this.rooms.push(newRoom);
    return newRoom;
  }

  deleteRoomIfEmpty(room: Room) {
    if (!room.spectators.length && !room.participants.length) {
      this.rooms = this.rooms.filter(r => r.id !== room.id);
    }
  }

  createGuest(res: Response) {
    const guest = new Guest(res);
    this.guests.push(guest);
    return guest;
  }

  deleteGuest(guest: Guest) {
    this.guests = this.guests.filter(g => g.id !== guest.id);
  }

  createSpectator(res: Response, room: Room) {
    const spectator = new Spectator(res);
    room.spectators.push(spectator);
    return spectator;
  }

  deleteSpectator(spectator: Spectator, room: Room) {
    room.spectators = room.spectators.filter(s => s.id !== spectator.id);
  }

  createParticipant(res: Response, name: string, room: Room) {
    const participant = new Participant(name, res);
    room.participants.push(participant);
    return participant;
  }

  deleteParticipant(participant: Participant, room: Room) {
    room.participants = room.participants.filter(p => p.id !== participant.id);
  }

  receiveParticipantEstimation(estimate: number, participantId: number, room: Room) {
    room.participants.some(participant => {
      if (participant.id === participantId) {
        participant.estimate = estimate;
        return true;
      }
    });
  }

  resetEstimates(room: Room) {
    room.participants.forEach(participant => {
      participant.estimate = undefined;
    });
  }
}
