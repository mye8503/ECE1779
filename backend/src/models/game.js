import {pool} from "../config/sql.js"
import { WebSocket } from 'ws';
import { 
    updateGameVolley,
    getGameStocks,
    getStocksReference,
} from "../db/db.js";

class Game {
    constructor(id, tickInterval = 2000, current_volley = 0, players_data = []) {
        this.id = id;
        this.players = new Set(); // websocket connections
        this.tickInterval = tickInterval;
        this.current_volley = current_volley;
        this.players_data = players_data;
        this.tick_count = 0;
        this.started = false;
        this.buys = []; // tracks buys within this volley
        this.sells = []; // tracks sells within this volley
        this.timer = setInterval(() => this.tick(), this.tickInterval);
        this.max_volleys = 300; 

        // get the stocks and assign them to a map
        this.stocks = new Map();
        const result = getStocksReference();
        let pos = 0;
        for (const row of result.rows) {
            this.stocks.set(row.ticker, { cur_price: row.stock_value, hist_price: row.stock_value, pos: pos });
            pos++;
            this.buys.push(0);
            this.sells.push(0);
        }
    }

    async tick() {
        if (this.started === false) {
            return;
        }
        this.tick_count++;
        this.current_volley++;

        // TO-DO:
        // do math for the next volley based on current result
        const stock_updates = [];
        // retrieve stock price updates

        this.broadcast({ type: "tick", tick: this.tick_count, stock_updates});

        // TO-DO:
        // sync DB
        updateGameVolley(this.id, this.current_volley, stock_updates);

        // if tick count exceeds limit, end game
        if (this.tick_count >= this.max_volleys) {
            this.started = false;
            this.broadcast({ type: "game_end", message: "The game has ended!" });
            this.stop();
        }
    }

    broadcast(payload) {
        const msg = JSON.stringify(payload);
        for (const client of this.players) {
            try {
                if (client && client.readyState === WebSocket.OPEN) {
                    client.send(msg);
                }
            } catch (err) {
                // if a send fails, remove the client to avoid leaking sockets
                console.warn('Failed to send to client, removing', err && err.message);
                this.removePlayer(client);
            }
        }
    }

    addPlayer(ws, user) {
        ws.user = user;
        this.players.add(ws);

        // TO-DO:
        // update DB to add the new player
    }

    start() {
        this.started = true;
        this.broadcast({ type: "game_start", message: "The game has started!" });
    }

    removePlayer(ws) {
        this.players.delete(ws);

        // TO-DO:
        // update DB to remove the old player
    }

    handleMessage(ws, rawMsg) {
        // TO-DO:
        // handle the action message
        let msg;
        try {
            msg = JSON.parse(rawMsg);
        } catch (err) {
            console.warn('Invalid message JSON', err && err.message);
            return;
        }
        // process msg
        // msg format
        // { action: 'buy'|'sell', ticker: string, volume: number }
        const userId = ws.user.id;
        console.log(`Received message from user ${userId}:`, msg);

        switch (msg.action) {
            case 'buy': {
                const stock = this.stocks.get(msg.ticker);
                this.buys[stock.pos] += msg.volume;
                const price = -stock.cur_price * msg.volume;
                ws.send(JSON.stringify({ type: 'transaction', ticker: msg.ticker, volume: msg.volume, price: price }));

                break;
            }
            case 'sell': {
                const stock = this.stocks.get(msg.ticker);
                this.sells[stock.pos] += msg.volume;
                const price = stock.cur_price * msg.volume;
                ws.send(JSON.stringify({ type: 'transaction', ticker: msg.ticker, volume: msg.volume, price: price }));
                break;
            }
            default:
                console.warn(`Unknown action: ${msg.action}`);
        }
    }

    stop() {
        // clear the game timer and player maps
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        for (const client of this.players) {
            try { client.close(); } catch (e) {}
        }
        this.players.clear();
    }
}

export {Game};