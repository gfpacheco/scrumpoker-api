import cors from 'cors';
import express from 'express';
import { Controller } from './Controller';
import Room from './Room';
import RoomMiddleware from './RoomMiddleware';
import ScrumPoker from './ScrumPoker';

declare global {
  namespace Express {
    interface Request {
      room: Room;
    }
  }
}

const { PORT = 3001 } = process.env;
const scrumPoker = new ScrumPoker();
const { addRoomToContext } = new RoomMiddleware(scrumPoker);
const controller = new Controller(scrumPoker);

const app = express();
app.use(cors());
app.use(express.json());
app.get('/guest', controller.handleGuest);
app.get('/:roomId/spectator', addRoomToContext, controller.handleSpectator);
app.get('/:roomId/participant', addRoomToContext, controller.handleParticipant);
app.post('/:roomId/estimation', addRoomToContext, controller.handleEstimation);
app.post('/:roomId/reset', addRoomToContext, controller.handleReset);
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
