const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const { PORT = 3001 } = process.env;

let spectators = [];
let participants = [];
let estimations = [];

function writeEventStreamHeaders(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  });
}

function writeEstimations(res) {
  res.write(`data: ${JSON.stringify(estimations)}\n\n`);
}

function sendEstimations() {
  spectators.forEach(({ res }) => writeEstimations(res));
}

function writeId(res, id) {
  res.write(`data: ${JSON.stringify(id)}\n\n`);
}

function sendIds() {
  participants.forEach(({ id, res }) => writeId(res, id));
}

function handleSpectator(req, res) {
  const id = Date.now();
  spectators.push({ id, res });

  writeEventStreamHeaders(res);
  writeEstimations(res);

  req.on('close', () => {
    spectators = spectators.filter(spectator => spectator.id !== id);
  });
}

function handleParticipant(req, res) {
  const id = Date.now();
  const { name } = req.query;
  participants.push({ id, name, res });
  estimations.push({ participant: { id, name } });

  writeEventStreamHeaders(res);
  writeId(res, id);
  sendEstimations();

  req.on('close', () => {
    participants = participants.filter(participant => participant.id !== id);
    estimations = estimations.filter(estimation => estimation.participant.id !== id);
    sendEstimations();
  });
}

function handleReset(req, res) {
  estimations = participants.map(({ id, name }) => ({ participant: { id, name } }));
  sendEstimations();
  sendIds();
}

function handleEstimation(req, res) {
  const { id, value } = req.body;
  estimations.forEach(estimation => {
    if (estimation.participant.id === id) {
      estimation.value = value;
    }
  });
  sendEstimations();
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
