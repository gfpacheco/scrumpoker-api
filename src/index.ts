import cors from 'cors';
import express, { Request, Response } from 'express';
import Estimation from './Estimation';
import Participant from './Participant';
import Spectator from './Spectator';

const { PORT = 3001 } = process.env;

let spectators: Spectator[] = [];
let participants: Participant[] = [];
let estimations: Estimation[] = [];
let keepAliveTimeout: NodeJS.Timeout | undefined;

function writeEventStreamHeaders(res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  });
}

function writeEstimations(res: Response) {
  res.write(`data: ${JSON.stringify(estimations)}\n\n`);
}

function sendEstimations() {
  spectators.forEach(({ res }) => writeEstimations(res));
}

function writeId(res: Response, id: number) {
  res.write(`data: ${JSON.stringify(id)}\n\n`);
}

function keepAlive() {
  if (!keepAliveTimeout) {
    keepAliveTimeout = setTimeout(() => {
      keepAliveTimeout = undefined;
      const all = [...participants, ...spectators];

      if (all.length) {
        all.forEach(({ res }) => res.write(':\n\n'));
        keepAlive();
      }
    }, 30000);
  }
}

function sendIds() {
  participants.forEach(({ id, res }) => writeId(res, id));
}

function handleSpectator(req: Request, res: Response) {
  const id = Date.now();
  spectators.push(new Spectator(id, res));

  writeEventStreamHeaders(res);
  writeEstimations(res);

  req.on('close', () => {
    spectators = spectators.filter(spectator => spectator.id !== id);
  });

  keepAlive();
}

function handleParticipant(req: Request, res: Response) {
  const id = Date.now();
  const { name } = req.query;

  if (typeof name !== 'string') {
    throw new Error('Invalid type for argument `name`');
  }

  const participant = new Participant(id, name, res);
  participants.push(participant);
  estimations.push(new Estimation(participant));

  writeEventStreamHeaders(res);
  writeId(res, id);
  sendEstimations();

  req.on('close', () => {
    participants = participants.filter(participant => participant.id !== id);
    estimations = estimations.filter(estimation => estimation.participant.id !== id);
    sendEstimations();
  });

  keepAlive();
}

function handleReset(_: Request, res: Response) {
  estimations.forEach(estimation => {
    estimation.value = undefined;
  });

  sendEstimations();
  sendIds();
  res.sendStatus(200);
}

function handleEstimation(req: Request, res: Response) {
  const { id, value } = req.body;

  if (typeof value !== 'number') {
    throw new Error('Invalid type for argument `value`');
  }

  estimations.some(estimation => {
    if (estimation.participant.id === id) {
      estimation.value = value;
      return true;
    }
  });

  sendEstimations();
  res.sendStatus(200);
}

const app = express();
app.use(cors());
app.use(express.json());
app.get('/spectator', handleSpectator);
app.get('/participant', handleParticipant);
app.post('/reset', handleReset);
app.post('/estimation', handleEstimation);
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
