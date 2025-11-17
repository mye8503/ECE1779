import wsConnect from "./controllers/wssController.js";
import app from "./app.js";

const server = http.createServer(app);
// let wsConnect handle whatever upgrade request
wsConnect(server);

// listen to the server
server.listen(process.send.SERVER_PORT, () => console.log("Server running on $1", {SERVER_PORT}));