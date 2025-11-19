import http from "http";
import wsConnect from "./controllers/wssController.js";
import { app } from "./app.js";

const port = process.env.PORT || process.env.SERVER_PORT || 3000;
const server = http.createServer(app);

// let wsConnect handle upgrade requests for WebSocket connections
wsConnect(server);

// listen to the server
server.listen(port, () => console.log(`Server running on ${port}`));