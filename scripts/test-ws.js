const WebSocket = require('ws');

const SERVER = process.env.SERVER_URL || 'ws://localhost:3000';
const gameId = process.argv[2];
const token = process.env.API_KEY || 'dev-key';
const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};

if (!gameId) {
  console.error('Usage: node scripts/test-ws.js <gameId>');
  process.exit(1);
}

const url = `${SERVER}/?gameId=${encodeURIComponent(gameId)}`;
console.log('Connecting to', url, 'with token', token);

const ws = new WebSocket(url, token);

ws.on('open', () => console.log('WS opened'));
ws.on('message', (msg) => console.log('WS message:', msg.toString()));
ws.on('close', (code, reason) => console.log('WS closed', code, reason && reason.toString()));
ws.on('error', (err) => console.error('WS error', err));

// send a ping every 10s to keep alive
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
}, 10000);
