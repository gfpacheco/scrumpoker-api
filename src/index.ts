import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import Guest from './Guest';
import Participant from './Participant';
import Room from './Room';
import Spectator from './Spectator';

declare global {
  namespace Express {
    interface Request {
      room: Room;
    }
  }
}

const { PORT = 3001 } = process.env;

let guests: Guest[] = [];
let rooms: Room[] = [];
let keepAliveTimeout: NodeJS.Timeout | undefined;

function writeEventStreamHeaders(res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  });
}

function writeData(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function sendRooms() {
  guests.forEach(g => writeData(g.res, rooms));
}

function sendParticipants(room: Room) {
  room.spectators.forEach(s => writeData(s.res, room.participants));
}

function writeId(res: Response, id: number) {
  writeData(res, id);
}

function keepAlive() {
  if (!keepAliveTimeout) {
    keepAliveTimeout = setTimeout(() => {
      keepAliveTimeout = undefined;
      const all = rooms.reduce(
        (partial, room) => [...partial, ...room.participants, ...room.spectators],
        guests,
      );

      if (all.length) {
        all.forEach(({ res }) => res.write(':\n\n'));
        keepAlive();
      }
    }, 30000);
  }
}

function sendIds(room: Room) {
  room.participants.forEach(p => writeId(p.res, p.id));
}

function handleGuest(req: Request, res: Response) {
  const guest = new Guest(res);
  guests.push(guest);

  writeEventStreamHeaders(res);
  writeData(res, rooms);

  req.on('close', () => {
    guests = guests.filter(g => g.id !== guest.id);
  });

  keepAlive();
}

function useRoom(req: Request, res: Response, next: NextFunction) {
  const roomId = parseInt(req.params.roomId);
  const existingRoom = rooms.find(r => r.id === roomId);
  req.room = existingRoom ?? new Room(roomId);

  if (!existingRoom) {
    rooms.push(req.room);
  }

  next();
}

function closeRoomIfNecessary(room: Room) {
  if (!room.spectators.length && !room.participants.length) {
    rooms = rooms.filter(r => r.id !== room.id);
  }

  sendRooms();
}

function handleSpectator(req: Request, res: Response) {
  const spectator = new Spectator(res);
  req.room.spectators.push(spectator);

  writeEventStreamHeaders(res);
  writeData(res, req.room.participants);
  sendRooms();

  req.on('close', () => {
    req.room.spectators = req.room.spectators.filter(s => s.id !== spectator.id);
    closeRoomIfNecessary(req.room);
  });

  keepAlive();
}

function handleParticipant(req: Request, res: Response) {
  const { name } = req.query;

  if (typeof name !== 'string') {
    throw new Error('Invalid type for argument `name`');
  }

  const participant = new Participant(name, res);
  req.room.participants.push(participant);

  writeEventStreamHeaders(res);
  writeId(res, participant.id);
  sendParticipants(req.room);
  sendRooms();

  req.on('close', () => {
    req.room.participants = req.room.participants.filter(p => p.id !== participant.id);
    sendParticipants(req.room);
    closeRoomIfNecessary(req.room);
  });

  keepAlive();
}

function handleEstimation(req: Request, res: Response) {
  const { id, estimate } = req.body;

  if (typeof estimate !== 'number') {
    throw new Error('Invalid type for argument `value`');
  }

  req.room.participants.some(participant => {
    if (participant.id === id) {
      participant.estimate = estimate;
      return true;
    }
  });

  sendParticipants(req.room);
  res.sendStatus(200);
}

function handleReset(req: Request, res: Response) {
  req.room.participants.forEach(participant => {
    participant.estimate = undefined;
  });

  sendParticipants(req.room);
  sendIds(req.room);
  res.sendStatus(200);
}

const app = express();
app.use(cors());
app.use(express.json());
app.get('/guest', handleGuest);
app.get('/:roomId/spectator', useRoom, handleSpectator);
app.get('/:roomId/participant', useRoom, handleParticipant);
app.post('/:roomId/estimation', useRoom, handleEstimation);
app.post('/:roomId/reset', useRoom, handleReset);
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
