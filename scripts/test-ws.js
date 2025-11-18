const path = require('path');
const { createRequire } = require('module');

// Load backend dependencies so this script can run from either repo root or backend folder.
const backendRequire = createRequire(path.resolve(__dirname, '../backend/package.json'));
const WebSocket = backendRequire('ws');
const jwt = backendRequire('jsonwebtoken');
const dotenv = backendRequire('dotenv');

// Load backend environment defaults (falls back to repo root .env if desired).
const envPath = process.env.BACKEND_ENV || path.resolve(__dirname, '../backend/.env');
dotenv.config({ path: envPath });

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection', err);
  process.exit(1);
});

const args = process.argv.slice(2);
const options = args.reduce(
  (acc, arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.replace(/^--/, '').split('=');
      acc[key] = value === undefined ? true : value;
    } else {
      acc._.push(arg);
    }
    return acc;
  },
  { _: [] }
);

const gameId = options.gameId || options._[0] || process.env.GAME_ID || 'dev-game';
const playerId = options.user || process.env.TEST_USER_ID || 'dev-user-1';
const playerName = options.name || process.env.TEST_USER_NAME || 'Dev Tester';
const wsBase = process.env.WS_URL || `ws://localhost:${process.env.SERVER_PORT || 3000}`;

// Determine JWT: if a token is provided use it, otherwise sign one using backend secret.
const providedToken = options.token || process.env.WS_TOKEN || process.env.API_KEY;
const secret = process.env.JWT_SECRET || 'your_jwt_secret_key';
const token = providedToken && providedToken.split('.').length === 3
  ? providedToken
  : jwt.sign({ id: playerId, name: playerName }, secret);

const wsUrl = `${wsBase}?gameId=${encodeURIComponent(gameId)}`;
console.log(`Connecting to ${wsUrl}`);
console.log(`Using player id=${playerId}, name=${playerName}`);

const ws = new WebSocket(wsUrl, token);

ws.on('open', () => {
  console.log('WS opened');
  ws.send(JSON.stringify({ type: 'hello', ts: Date.now(), from: 'test-ws.js' }));
});

ws.on('message', (msg) => console.log('WS message:', msg.toString()));
ws.on('close', (code, reason) => {
  console.log('WS closed', code, reason && reason.toString());
  process.exit(0);
});
ws.on('error', (err) => console.error('WS error', err));
ws.on('unexpected-response', (req, res) => {
  console.error('Unexpected HTTP response', res.statusCode, res.statusMessage);
  res.on('data', (chunk) => console.error('Response body:', chunk.toString()));
});

// Keep connection alive with ping every 10s.
const heartbeat = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
  }
}, 10_000);

// Close the WebSocket connection after 10 seconds.
setTimeout(() => {
  console.log('Closing WebSocket connection after 10 seconds');
  ws.close();
}, 10_000);

process.on('exit', () => clearInterval(heartbeat));
