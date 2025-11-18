import express from "express";
import { createGame, 
    getGameById, 
    finishGame,
    updateGameVolley,
    createUser,
    getUserById } from "./db/db.js";
import { authMiddleware } from "./middleware/auth.js";
import { wsConnect } from "./controllers/wssController.js";

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Simple in-memory queue. For production move to Redis or DB-backed queue.
const queue = [];
const QUEUE_SIZE = parseInt(process.env.QUEUE_SIZE || "2", 10);

// POST /create-user: create a new user
app.post("/create-user", async (req, res) => {
    try {
        const { username, email } = req.body;
        if (!username) {
            return res.status(400).json({ error: "Username is required" });
        }
        const userId = await createUser(username, email);
        res.status(201).json({ userId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET /profile: Fetch user profile by userId
app.get("/profile", async (req, res) => {
    try {
        // Fetch user profile by userId query parameter
        const userId = req.query.userId;
        const result = await getUserById(userId);
        if (!result) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /queue: add authenticated user to matchmaking queue
// Requires `Authorization: Bearer <jwt>` header. When enough players are queued,
// a new game row is created and the endpoint responds with the `gameId` and
// a WebSocket URL clients should connect to (pass JWT in `Sec-WebSocket-Protocol`).
app.post("/queue", authMiddleware, async (req, res) => {
    try {
        const userId = req.body.userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const user = await getUserById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Prevent duplicate queue entries
        if (queue.some((u) => u.id === user.user_id)) {
            return res.status(400).json({ error: "Already queued" });
        }

        queue.push({ id: user.user_id, username: user.username });

        // If we have enough players, create a game and return game info
        if (queue.length >= QUEUE_SIZE) {
            const players = queue.splice(0, QUEUE_SIZE);
            const players_data = players.map((p) => ({ id: p.id, username: p.username }));

            const gameId = await createGame('active', 0, players_data);

            // Return the game id and websocket connection info
            const wsBase = process.env.WS_URL || `ws://localhost:${process.env.SERVER_PORT || 3000}`;
            return res.json({ queued: true, started: true, gameId, wsUrl: `${wsBase}?gameId=${gameId}` });
        }

        return res.json({ queued: true, position: queue.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

export {app};

