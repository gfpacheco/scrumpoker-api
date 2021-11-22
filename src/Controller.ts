import { Request, Response } from 'express';
import EventStream from './EventStream';
import Room from './Room';
import ScrumPoker from './ScrumPoker';

declare global {
  namespace Express {
    interface Request {
      room: Room;
    }
  }
}

export class Controller {
  constructor(public scrumPoker: ScrumPoker) {}

  keepAliveTimeout: NodeJS.Timeout | undefined;

  sendRoomsToGuests() {
    this.scrumPoker.guests.forEach(g => EventStream.writeData(g.res, this.scrumPoker.rooms));
  }

  sendParticipantsAndEstimatesToRoom(room: Room) {
    room.spectators.forEach(s => EventStream.writeData(s.res, room.participants));
  }

  sendParticipantId(res: Response, id: number) {
    EventStream.writeData(res, id);
  }

  keepAlive() {
    if (!this.keepAliveTimeout) {
      this.keepAliveTimeout = setTimeout(() => {
        this.keepAliveTimeout = undefined;
        const everyone = this.scrumPoker.everyone;

        if (everyone.length) {
          everyone.forEach(({ res }) => res.write(':\n\n'));
          this.keepAlive();
        }
      }, 30000);
    }
  }

  sendEachParticipantTheirId(room: Room) {
    // Participants reset their estimate when they receive their id
    room.participants.forEach(p => this.sendParticipantId(p.res, p.id));
  }

  handleGuest = (req: Request, res: Response) => {
    const guest = this.scrumPoker.createGuest(res);
    EventStream.writeEventStreamHeaders(res);
    EventStream.writeData(res, this.scrumPoker.rooms);

    req.on('close', () => {
      this.scrumPoker.deleteGuest(guest);
    });

    this.keepAlive();
  };

  updateRoom(room: Room) {
    this.scrumPoker.deleteRoomIfEmpty(room);
    this.sendRoomsToGuests();
  }

  handleSpectator = (req: Request, res: Response) => {
    const spectator = this.scrumPoker.createSpectator(res, req.room);
    EventStream.writeEventStreamHeaders(res);
    EventStream.writeData(res, req.room.participants);
    this.sendRoomsToGuests();

    req.on('close', () => {
      this.scrumPoker.deleteSpectator(spectator, req.room);
      this.updateRoom(req.room);
    });

    this.keepAlive();
  };

  handleParticipant = (req: Request, res: Response) => {
    const { name } = req.query;

    if (typeof name !== 'string') {
      throw new Error('Invalid type for argument `name`');
    }

    const participant = this.scrumPoker.createParticipant(res, name, req.room);
    EventStream.writeEventStreamHeaders(res);
    this.sendParticipantId(res, participant.id);
    this.sendParticipantsAndEstimatesToRoom(req.room);
    this.sendRoomsToGuests();

    req.on('close', () => {
      this.scrumPoker.deleteParticipant(participant, req.room);
      this.sendParticipantsAndEstimatesToRoom(req.room);
      this.updateRoom(req.room);
    });

    this.keepAlive();
  };

  handleEstimation = (req: Request, res: Response) => {
    const { id, estimate } = req.body;

    if (typeof estimate !== 'number') {
      throw new Error('Invalid type for argument `value`');
    }

    this.scrumPoker.receiveParticipantEstimation(estimate, id, req.room);
    this.sendParticipantsAndEstimatesToRoom(req.room);
    res.sendStatus(200);
  };

  handleReset = (req: Request, res: Response) => {
    this.scrumPoker.resetEstimates(req.room);
    this.sendParticipantsAndEstimatesToRoom(req.room);
    this.sendEachParticipantTheirId(req.room);
    res.sendStatus(200);
  };
}
