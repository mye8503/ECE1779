import {pool} from "../config/sql.js"

class Game {
    constructor(id, tickInterval = 2000, current_volley = 0, players_data = []) {
        this.id = id;
        this.players = new Set(); // websocket connections
        this.tickInterval = tickInterval;
        this.current_volley = current_volley;
        this.players_data = players_data;
        this.tick_count = 0;
        this.actions = new Map();
        this.timer = setInterval(() => this.tick(), this.tickInterval);
    }

    async tick() {
        this.tick_count++;
        this.current_volley++;

        // TO-DO:
        // do math for the next volley based on current result
        const stock_updates = [];
        this.broadcast({ type: "tick", tick: this.tick_count, stock_updates});

        // TO-DO:
        // sync DB

    }

    broadcast(payload) {
        const msg = JSON.stringify(payload);
        for (const ws in this.players) {
            if (ws.readyState === ws.OPEN) {
                ws.send(msg);
            }
        }
    }

    addPlayer(ws, user) {
        ws.user = user;
        this.players.add(ws);
        this.actions.set(ws, []);

        // TO-DO:
        // update DB to add the new player
    }

    removePlayer(ws) {
        this.players.delete(ws);
        this.actions.delete(ws);

        // TO-DO:
        // update DB to remove the old player
    }

    handleMessage(ws, rawMsg) {
        // TO-DO:
        // handle the action message
    }

    stop() {
        // TO-DO
        // clear the game
    }
}

export {Game};