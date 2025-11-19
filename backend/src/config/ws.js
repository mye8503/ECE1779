import { WebSocketServer} from "ws";
import {pool} from "../config/sql.js";
// import authMiddleware from "../middleware/auth.js";
import {Game} from "../models/game.js";

// create websocket server, attach later in app.js
const wss = new WebSocketServer({noServer: true});

// create live games game_id -> game instance
const games = new Map(); 

wss.on("connection", async (ws, req) => {
    console.log("Client connected");
    const params = new URLSearchParams(req.url.replace("/?", ""));
    const gameId = params.get("gameId");
    const token = req.headers["sec-websocket-protocol"];

    // decode token to authenticate user, redundant, already handled in wssController
    // const decoded = authMiddleware(token);
    // if (!decoded) {
    //     ws.close(4001, "Invalid token!")
    //     return;
    // }

    // check memory for current game
    let game = games.get(gameId);
    if (!game) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`Development mode: creating in-memory game ${gameId}`);
            game = new Game(gameId, 2000, 0, []);
            games.set(gameId, game);
        } else {
            try {
                const db_game = await pool.query("SELECT * FROM games WHERE game_id=$1 AND status='active'", [gameId]);

                if (db_game.rowCount === 0) {
                    ws.close(4002, "Game not found or inactive!");
                    return;
                }

                const row = db_game.rows[0];
                game = new Game(row.game_id, 2000, row.current_volley, row.players_data);
                games.set(gameId, game);
            } catch (err) {
                console.error('Failed to load game from DB', err);
                ws.close(1011, "Internal server error");
                return;
            }
        }
    }

    // ws.user is set during upgrade (see wssController)
    game.addPlayer(ws, ws.user);

    ws.on("start", () => { game.start(); });
    ws.on("message", (msg) => game.handleMessage(ws, msg));
    ws.on("close", () => game.removePlayer(ws));
});

export {wss, games};