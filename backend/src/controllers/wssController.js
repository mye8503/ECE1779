import {Game} from "../models/game.js";
import {wss} from "../config/ws.js";
import jwt from 'jsonwebtoken';
import {pool} from "../config/sql.js";

const wsConnect = async (server) => {
    server.on("upgrade", async (req, socket, head) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const gameId = url.searchParams.get("gameId");
            const token = req.headers["sec-websocket-protocol"]; // token passed as subprotocol header

            if (!gameId || !token) {
                console.warn('Upgrade rejected: missing gameId or token', { gameId, tokenPresent: !!token });
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            // verify JWT subprotocol
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
                console.warn('Upgrade rejected: jwt.verify failed', err && err.message);
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            // In development skip DB membership checks to allow local testing without a running DB
            if (process.env.NODE_ENV === 'development') {
                console.log('Development mode: skipping DB checks and allowing websocket upgrade');
                wss.handleUpgrade(req, socket, head, (ws) => {
                    ws.user = decoded;
                    wss.emit("connection", ws, req);
                });
                return;
            }

            // double check that the user is part of the active game in DB (production)
            const result = await pool.query(
                `SELECT * FROM games
                WHERE game_id = $1 AND status = 'active'
                AND players_data @> $2::jsonb`,
                [gameId, JSON.stringify([{ id: decoded.id }])]
            );

            if (result.rowCount === 0) {
                console.warn('DB check: no matching active game or player entry', { gameId, userId: decoded.id });
                socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
                socket.destroy();
                return;
            }

            wss.handleUpgrade(req, socket, head, (ws) => {
                ws.user = decoded;
                wss.emit("connection", ws, req);
            });
        } catch (err) {
            console.error("Upgrade error:", err);
            socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
            socket.destroy();
        }
    });
};


export {wsConnect};