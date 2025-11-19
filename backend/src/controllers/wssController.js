import Game from "../models/game.js";
import wss from "../config/ws.js";
import authMiddleware from "../middleware/auth.js";

const wsConnect = async (server) => {
    server.on("upgrade", async (req, socket, head) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const gameId = url.searchParams.get("gameId");
            const token = req.headers["sec-websocket-protocol"]; // token passed as subprotocol header

            if (!gameId || !token) {
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            const decoded = authMiddleware(token);
            if (!decoded) {
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            const result = await pool.query(
                `SELECT * FROM games
                WHERE game_id = $1 AND status = 'active'
                AND players_data @> $2::jsonb`,
                [gameId, JSON.stringify([{ id: decoded.id }])]
            );

            if (result.rowCount === 0) {
                socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
                socket.destroy();
                return;
            }
            wss.handleUpgrade(req, socket, head, (ws) => {
                ws.user = user;
                wss.emit("connection", ws, req);
            });
        } catch (err) {
            console.error("Upgrade error:", err);
            socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
            socket.destroy();
        }
    });
}

export {wsConnect};