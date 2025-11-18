import http from "http";
import dotenv from 'dotenv';
import { wsConnect } from './controllers/wssController.js';
import {app} from "./app.js";

// load env from backend/.env when running from backend working dir
dotenv.config();

const PORT = process.env.SERVER_PORT || 3000;
const server = http.createServer(app);

// let wsConnect handle whatever upgrade request
wsConnect(server);

// listen to the server
server.listen(PORT, () => console.log('Server running on', PORT));
