import pool from "../config/sql.js"
import { WebSocket } from 'ws';
import {
    updateGameVolley,
    getGameStocks,
    getStocksReference,
    updateTradeHistory,
    addGameParticipant,
    removeGameParticipant,
} from "../db/db.js";
import { priceUpdate } from "../utils/priceUpdate.js";

class Game {
    constructor(id, tickInterval = 2000, current_volley = 0, players_data = []) {
        this.id = id;
        this.players = new Set();
        this.playerMap = new Map();
        this.tickInterval = tickInterval;
        this.current_volley = current_volley;
        this.players_data = players_data;
        this.tick_count = 0;
        this.started = false;
        this.buys = [];
        this.sells = []; 
        this.stocks = new Map();
        this.max_volleys = 90;  // 3 minutes: 180 seconds / 2 seconds per volley = 90 volleys
        this.stocksReady = false;

        this.timer = null;

        this.init();
    }

    async init() {
        await this.ensureGameExists();
        this.initializeStocks();
    }

    async ensureGameExists() {
        try {
            const result = await pool.query('SELECT game_id FROM games WHERE game_id = $1', [this.id]);

            if (result.rows.length === 0) {
                await pool.query(
                    'INSERT INTO games (game_id, status, current_volley, max_volleys, created_at) VALUES ($1, $2, $3, $4, NOW())',
                    [this.id, 'waiting', 0, this.max_volleys]
                );
                console.log(`Game ${this.id} created in database`);
            }
        } catch (err) {
            console.error(`Error ensuring game ${this.id} exists:`, err);
        }
    }

    async initializeStocks() {
        try {
            const result = await getStocksReference();
            let pos = 0;
            for (const row of result) {
                const price = parseFloat(row.initial_price);
                this.stocks.set(row.ticker, {
                    stock_id: row.stock_id,
                    cur_price: price,
                    hist_price: price,
                    pos: pos
                });
                pos++;
                this.buys.push(0);
                this.sells.push(0);
            }

            this.stocksReady = true;

            console.log(`Game ${this.id} initialized with ${this.stocks.size} stocks`);
        } catch (err) {
            console.error(`Error initializing stocks for game ${this.id}:`, err);
        }
    }

    async tick() {
        if (this.started === false) {
            return;
        }
        this.tick_count++;
        this.current_volley++;

        const stock_updates = [];
        let pos = 0;
        for (const [ticker, stock] of this.stocks) {
            const new_price = await priceUpdate(
                stock.cur_price,
                this.buys[pos],
                this.sells[pos],
                stock.hist_price
            );

            stock.hist_price = stock.cur_price;
            stock.cur_price = new_price;

            stock_updates.push({
                ticker: ticker,
                cur_price: new_price,
                hist_price: stock.hist_price
            });
            pos++;
        }

        this.buys = this.buys.map(() => 0);
        this.sells = this.sells.map(() => 0);

        this.broadcast({ type: "tick", tick: this.tick_count, stock_updates: stock_updates });

        try {
            for (const update of stock_updates) {
                const stock = this.stocks.get(update.ticker);
                if (stock) {
                    await pool.query(`
                        INSERT INTO gamestockprices (game_id, stock_id, volley, price, historical_delta, player_impact)
                        VALUES ($1, $2, $3, $4, 0, 0)
                    `, [this.id, stock.stock_id, this.current_volley, update.cur_price]);
                }
            }
        } catch (err) {
            console.error('Failed to persist price history:', err);
        }

        try {
            await updateGameVolley(this.id, this.current_volley, stock_updates);
        } catch (err) {
            console.error('Failed to update game volley in DB:', err);
        }

        if (this.tick_count >= this.max_volleys) {
            this.started = false;
            this.broadcast({ type: "game_end", message: "The game has ended!" });
            this.stop();
        }
    }

    broadcast(payload, excludeWs = null) {
        const msg = JSON.stringify(payload);
        for (const client of this.players) {
            try {
                if (client && client !== excludeWs && client.readyState === WebSocket.OPEN) {
                    client.send(msg);
                }
            } catch (err) {
                console.warn('Failed to send to client, removing', err && err.message);
                this.removePlayer(client);
            }
        }
    }

    async addPlayer(ws, user) {
        ws.user = user;

        // Check if this user is already in the game from another connection
        for (const [existingWs, existingPlayer] of this.playerMap.entries()) {
            if ((user.id && existingPlayer.userId === user.id) ||
                (user.guest_id && existingPlayer.guestId === user.guest_id)) {
                // Same user already connected, close the old connection
                console.log(`Player ${user.username} reconnected, closing old connection`);
                this.players.delete(existingWs);
                this.playerMap.delete(existingWs);
                try {
                    existingWs.close(1000, 'Reconnected from another device');
                } catch (e) {
                    // Connection already closed
                }
            }
        }

        // Add the new connection
        this.players.add(ws);

        let participantId = null;
        // Add player to game participants in database
        try {
            participantId = await addGameParticipant(this.id, user.id, user.guest_id, 1000);
        } catch (err) {
            console.error(`Error adding player ${user.id || user.guest_id} to game ${this.id}:`, err);
        }

        this.playerMap.set(ws, {
            userId: user.id,
            guestId: user.guest_id,
            participantId: participantId,
            username: user.username,
            balance: 1000,
            portfolio: {}
        });
    }

    start() {
        this.started = true;
        this.broadcast({ type: "game_start", message: "The game has started!" });
    }

    async removePlayer(ws) {
        const playerData = this.playerMap.get(ws);

        this.players.delete(ws);
        this.playerMap.delete(ws);

        // Note: Don't delete participant records from database - they're needed for historical data and results
        // Participant records stay in the database as a permanent record of game participation
    }

    async handleMessage(ws, rawMsg) {
        let msg;
        try {
            msg = JSON.parse(rawMsg);
        } catch (err) {
            console.warn('Invalid message JSON', err && err.message);
            return;
        }

        if (!this.stocksReady) {
            ws.send(JSON.stringify({ type: 'error', message: 'Game not yet initialized' }));
            return;
        }

        const playerData = this.playerMap.get(ws);
        if (!playerData) {
            ws.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
            return;
        }


        const userId = ws.user.id;
        console.log(`Received message from user ${userId}:`, msg);

        switch (msg.action) {
            case 'buy': {
                const stock = this.stocks.get(msg.ticker);
                if (!stock) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Stock not found' }));
                    break;
                }

                const totalCost = stock.cur_price * msg.volume;

                if (playerData.balance < totalCost) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: `Insufficient funds. Need $${totalCost.toFixed(2)}, have $${playerData.balance.toFixed(2)}`
                    }));
                    break;
                }

                playerData.balance -= totalCost;
                playerData.portfolio[msg.ticker] = (playerData.portfolio[msg.ticker] || 0) + msg.volume;

                this.buys[stock.pos] += msg.volume;

                const response = {
                    type: 'transaction',
                    ticker: msg.ticker,
                    volume: msg.volume,
                    price: -totalCost,
                    newBalance: playerData.balance,
                    newHoldings: playerData.portfolio[msg.ticker]
                };

                ws.send(JSON.stringify(response));
                console.log(`Player ${userId} bought ${msg.volume} ${msg.ticker} shares for $${totalCost.toFixed(2)}, balance: $${playerData.balance.toFixed(2)}`);

                const broadcastMsg = {
                    type: 'player_transaction',
                    player: playerData.username,
                    action: 'buy',
                    ticker: msg.ticker,
                    volume: msg.volume,
                    timestamp: new Date().toISOString()
                };
                this.broadcast(broadcastMsg, ws);

                if (playerData.participantId !== undefined && playerData.participantId !== null) {
                    try {
                        console.log(`[GAME] Recording buy transaction - participant_id: ${playerData.participantId}, stock_id: ${stock.stock_id}`);
                        await updateTradeHistory(
                            this.id,
                            playerData.participantId,
                            stock.stock_id,
                            this.current_volley,
                            'buy',
                            msg.volume,
                            stock.cur_price,
                            totalCost,
                            new Date()
                        );
                        console.log(`[GAME] Buy transaction recorded successfully`);
                    } catch (err) {
                        console.error(`Failed to record buy trade history for user ${userId}:`, err);
                    }
                } else {
                    console.warn(`[GAME] Skipping transaction record for user ${userId} - participantId is ${playerData.participantId}`);
                }
                break;
            }
            case 'sell': {
                const stock = this.stocks.get(msg.ticker);
                if (!stock) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Stock not found' }));
                    break;
                }

                const currentHoldings = playerData.portfolio[msg.ticker] || 0;

                if (currentHoldings < msg.volume) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: `Insufficient shares. Need ${msg.volume}, have ${currentHoldings}`
                    }));
                    break;
                }

                const totalProceeds = stock.cur_price * msg.volume;

                playerData.balance += totalProceeds;
                playerData.portfolio[msg.ticker] -= msg.volume;

                this.sells[stock.pos] += msg.volume;

                const response = {
                    type: 'transaction',
                    ticker: msg.ticker,
                    volume: msg.volume,
                    price: totalProceeds,
                    newBalance: playerData.balance,
                    newHoldings: playerData.portfolio[msg.ticker]
                };

                ws.send(JSON.stringify(response));
                console.log(`Player ${userId} sold ${msg.volume} ${msg.ticker} shares for $${totalProceeds.toFixed(2)}, balance: $${playerData.balance.toFixed(2)}`);

                const broadcastMsg = {
                    type: 'player_transaction',
                    player: playerData.username,
                    action: 'sell',
                    ticker: msg.ticker,
                    volume: msg.volume,
                    timestamp: new Date().toISOString()
                };
                this.broadcast(broadcastMsg, ws);

                if (playerData.participantId !== undefined && playerData.participantId !== null) {
                    try {
                        console.log(`[GAME] Recording sell transaction - participant_id: ${playerData.participantId}, stock_id: ${stock.stock_id}`);
                        await updateTradeHistory(
                            this.id,
                            playerData.participantId,
                            stock.stock_id,
                            this.current_volley,
                            'sell',
                            msg.volume,
                            stock.cur_price,
                            totalProceeds,
                            new Date()
                        );
                        console.log(`[GAME] Sell transaction recorded successfully`);
                    } catch (err) {
                        console.error(`Failed to record sell trade history for user ${userId}:`, err);
                    }
                } else {
                    console.warn(`[GAME] Skipping transaction record for user ${userId} - participantId is ${playerData.participantId}`);
                }
                break;
            }
            default:
                console.warn(`Unknown action: ${msg.action}`);
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.tickIntervalId) {
            clearInterval(this.tickIntervalId);
            this.tickIntervalId = null;
        }
        for (const client of this.players) {
            try {
                client.close();
            } catch (e) {}
        }
        this.players.clear();
    }
}

export { Game };