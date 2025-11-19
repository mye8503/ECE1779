// import {pool} from "../config/sql.js"
import { WebSocket } from 'ws';
import { 
    getStocksReference,
} from "../db/db.js";
import { priceUpdate } from "../utils/priceUpdate.js";
// **correct**
/**
 * gets game stock prices for a given volley
 * @param {number} volley - The volley number to retrieve stock prices for.
 * @returns {JSON} - the stock id and prices for the given volley.
 */
class Game {
    constructor(id, tickInterval = 2000, current_volley = 0, players_data = {}) {
        this.id = id;
        this.players = new Set(); // websocket connections
        this.tickInterval = tickInterval;
        this.current_volley = current_volley;
        this.players_data = players_data;
        this.started = false;
        this.buys = []; // tracks buys within this volley
        this.sells = []; // tracks sells within this volley
        this.timer = setInterval(() => this.tick(), this.tickInterval);
        this.max_volleys = 300; 
        this.max_players = 2;

        // get the stocks and assign them to a map
        this.stocks = new Map();
        const result = getStocksReference();
        let pos = 0;
        for (const row of result.rows) {
            this.stocks.set(row.ticker, { cur_price: row.initial_price, historical_price: row.historical_data, pos: pos });
            pos++;
            this.buys.push(0);
            this.sells.push(0);
        }
    }

    async tick() {
        if (this.started === false) {
            return;
        }

        // TO-DO:
        // do math for the next volley based on current result
        const stock_updates = {};
        // retrieve stock price updates
        for (const [ticker, stock] of this.stocks) {
            // simple price update logic: price changes based on buys/sells, referencing historical price (of volley+1)
            const new_price = await priceUpdate(
                stock.cur_price,
                this.buys[stock.pos],
                this.sells[stock.pos],
                stock.historical_price[this.current_volley+1]
            );
            // update stock price
            stock.cur_price = new_price;
            // reset buys/sells for next volley
            this.buys[stock.pos] = 0;
            this.sells[stock.pos] = 0;
            stock_updates[ticker] = new_price;
        }

        // increment volley count and broadcast updates
        this.current_volley++;
        this.broadcast({ type: "tick", tick: this.current_volley, stock_updates});

        // TO-DO:
        // sync DB
        // updateGameVolley(this.id, this.current_volley, stock_updates);

        // if tick count exceeds limit, end game
        if (this.current_volley >= this.max_volleys) {
            this.started = false;
            this.forceSellAllPlayers();
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
        this.players_data[user.id] = { cash: 1000, holdings: {} };

        // auto-start when max players reached
        if (this.players.size === this.max_players) {
            this.start();
        }

        // TO-DO:
        // update DB to add the new player
    }

    start() {
        this.started = true;
        const initialData = {};
        for (const [ticker, stock] of this.stocks) {
            initialData[ticker] = stock.cur_price;
        }
        this.broadcast({ type: "game_start", message: initialData });
    }

    removePlayer(ws) {
        this.players.delete(ws);

        // TO-DO:
        // update DB to remove the old player
    }

    forceSellAllPlayers() {
        for (const client of this.players) {
            // TO-DO:
            // deduct from each player's holdings and credit cash based on current stock prices
            // update the player by sending a message
            const userId = client.user.id;
            for (const [ticker, stock] of this.stocks) {
                const volume = this.players_data[userId].holdings[ticker] || 0;
                if (volume > 0) {
                    const price = stock.cur_price * volume;
                    this.players_data[userId].cash += price;
                    this.players_data[userId].holdings[ticker] = 0;
                    // forces client to sell message
                    client.send(JSON.stringify({ type: 'force_sell', ticker: ticker, volume: volume, price: price }));
                }
            }
        }
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
                this.players_data[userId].cash += price;
                this.players_data[userId].holdings[msg.ticker] = (this.players_data[userId].holdings[msg.ticker] || 0) + msg.volume;
                ws.send(JSON.stringify({ type: 'transaction', ticker: msg.ticker, volume: msg.volume, price: price }));

                break;
            }
            case 'sell': {
                const stock = this.stocks.get(msg.ticker);
                this.sells[stock.pos] += msg.volume;
                const price = stock.cur_price * msg.volume;
                this.players_data[userId].cash += price;
                this.players_data[userId].holdings[msg.ticker] = (this.players_data[userId].holdings[msg.ticker] || 0) - msg.volume;
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