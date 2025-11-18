import http from "http";
import { wsConnect } from './controllers/wssController.js';
import {app} from "./app.js";

const PORT = process.env.SERVER_PORT || 3000;
const server = http.createServer(app);

// let wsConnect handle whatever upgrade request
wsConnect(server);

// listen to the server
server.listen(PORT, () => console.log('Server running on', PORT));
