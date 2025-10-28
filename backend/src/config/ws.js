const WebSocket = require("ws");
import pool from "../config/sql.js";
import authMiddleware from "../middleware/auth.js";
import Game from "../models/game.js";

// create websocket server, attach later in app.js
const wss = new WebSocket.Server({noServer: true});

// create live games game_id -> game instance
const games = new Map(); 

wss.on("connection", async (ws, req) => {
    console.log("Client connected");
    const params = new URLSearchParams(req.url.replace("/?", ""));
    const game_id = params.get("game_id");
    const token = req.headers["sec-websocket-protocol"];

    // decode token to authenticate user, redundant, could comment out, already handled in wssController
    const decoded = authMiddleware(token);
    if (!decoded) {
        ws.close(4001, "Invalid token!")
        return;
    }

    // check memory for current game
    let game = games.get(game_id)
    if (!game) {
        const db_game = await pool.query("SELECT * FROM games WHERE game_id=$1 AND status='active'", [game_id]);

        if (db_game.rowCount === 0) {
            ws.close(4002, "Game not found or inactive!");
            return;
        }

        const row = db_game.rows[0];
        game = new Game(row.game_id, 2000, row.current_volley, row.players_data);
        games.set(game_id, game);
    }

    game.addPlayer(ws, decoded);

    ws.on("message", (msg) => game.handleMessage(ws, msg));
    ws.on("close", () => game.removePlayer(ws));
});

export {wss, games};