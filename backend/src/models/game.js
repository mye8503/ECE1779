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

/**
 * Game
 *
 * Represents a single running game instance:
 * - Manages connected players over WebSockets
 * - Tracks per-tick stock prices and player buy/sell activity
 * - Persists game/price/trade data to the database
 * - Broadcasts updates to all connected clients
 */
class Game {
    /**
     * @param {number|string} id               Unique game identifier (matches DB game_id)
     * @param {number}        tickInterval     Interval in ms between price updates (volleys)
     * @param {number}        current_volley   Starting volley index (usually 0 for new games)
     * @param {Array}         players_data     Optional pre-existing player data (unused currently)
     */
    constructor(id, tickInterval = 2000, current_volley = 0, players_data = []) {
        this.id = id;

        // Set of all active WebSocket connections in this game
        this.players = new Set();

        /**
         * Map from WebSocket -> player metadata:
         * {
         *   userId,
         *   guestId,
         *   participantId,
         *   username,
         *   balance,
         *   portfolio: { [ticker]: volume }
         * }
         */
        this.playerMap = new Map();

        // How often to run a tick (in ms)
        this.tickInterval = tickInterval;

        // Volley index (acts like game time step / round number)
        this.current_volley = current_volley;

        // Placeholder for any initial player info (not used much here)
        this.players_data = players_data;

        // How many ticks have been executed since start()
        this.tick_count = 0;

        // Whether the game is currently running
        this.started = false;

        // Per-stock aggregated trading activity for this volley
        this.buys = [];
        this.sells = []; 

        /**
         * Map from ticker -> {
         *   stock_id,
         *   cur_price,
         *   hist_price,
         *   pos    // index used to map into this.buys / this.sells arrays
         * }
         */
        this.stocks = new Map();

        // 3 minutes: 180 seconds / 2 seconds per volley = 90 volleys
        this.max_volleys = 90;

        // Ensures we don't process messages before stocks are loaded
        this.stocksReady = false;

        // Optional timer for ticks (not fully wired in here, but reserved)
        this.timer = null;

        // Kick off async initialization
        this.init();
    }

    /**
     * Initialize game:
     * - Ensure there is a corresponding row in the `games` table
     * - Load stock reference data into memory
     */
    async init() {
        await this.ensureGameExists();
        this.initializeStocks();
    }

    /**
     * Ensure this game exists in the database.
     * If no row is found in `games`, insert a new one with status "waiting".
     */
    async ensureGameExists() {
        try {
            const result = await pool.query(
                'SELECT game_id FROM games WHERE game_id = $1',
                [this.id]
            );

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

    /**
     * Load initial stock data from the database and populate:
     * - this.stocks
     * - this.buys / this.sells arrays with matching indices
     */
    async initializeStocks() {
        try {
            const result = await getStocksReference();
            let pos = 0;

            for (const row of result) {
                const price = parseFloat(row.initial_price);

                // Each stock entry holds both current and previous (historical) price
                this.stocks.set(row.ticker, {
                    stock_id: row.stock_id,
                    cur_price: price,
                    hist_price: price,
                    pos: pos,
                });

                pos++;

                // Initialize per-stock buy/sell trackers for this volley
                this.buys.push(0);
                this.sells.push(0);
            }

            this.stocksReady = true;

            console.log(`Game ${this.id} initialized with ${this.stocks.size} stocks`);
        } catch (err) {
            console.error(`Error initializing stocks for game ${this.id}:`, err);
        }
    }

    /**
     * Single game tick:
     * - Skips if the game hasn't started
     * - Increments volley / tick counters
     * - Computes new prices for each stock based on the last volley’s buy/sell volume
     * - Broadcasts price updates to clients
     * - Persists price history and game volley state in the DB
     * - Stops the game after reaching max_volleys
     */
    async tick() {
        if (this.started === false) {
            return;
        }

        this.tick_count++;
        this.current_volley++;

        const stock_updates = [];
        let pos = 0;

        // For each stock, compute a new price given this volley’s activity
        for (const [ticker, stock] of this.stocks) {
            const new_price = await priceUpdate(
                stock.cur_price,
                this.buys[pos],
                this.sells[pos],
                stock.hist_price,
                this.current_volley,
                ticker
            );

            // Shift current price into historical price
            stock.hist_price = stock.cur_price;
            stock.cur_price = new_price;

            stock_updates.push({
                ticker: ticker,
                cur_price: new_price,
                hist_price: stock.hist_price,
            });

            pos++;
        }

        // Reset per-volley buy/sell counters for the next tick
        this.buys = this.buys.map(() => 0);
        this.sells = this.sells.map(() => 0);

        // Send new prices to all connected players
        this.broadcast({
            type: "tick",
            tick: this.tick_count,
            stock_updates: stock_updates,
        });

        // Persist price history for each stock for analytics/leaderboards/etc.
        try {
            for (const update of stock_updates) {
                const stock = this.stocks.get(update.ticker);
                if (stock) {
                    await pool.query(
                        `
                        INSERT INTO gamestockprices (game_id, stock_id, volley, price, historical_delta, player_impact)
                        VALUES ($1, $2, $3, $4, 0, 0)
                        `,
                        [this.id, stock.stock_id, this.current_volley, update.cur_price]
                    );
                }
            }
        } catch (err) {
            console.error('Failed to persist price history:', err);
        }

        // Persist the game’s current volley and state
        try {
            await updateGameVolley(this.id, this.current_volley, stock_updates);
        } catch (err) {
            console.error('Failed to update game volley in DB:', err);
        }

        // End game once we've hit the configured number of volleys
        if (this.tick_count >= this.max_volleys) {
            this.started = false;
            this.broadcast({ type: "game_end", message: "The game has ended!" });
            this.stop();
        }
    }

    /**
     * Broadcast a JSON-serializable payload to all connected players.
     *
     * @param {object} payload     Data to send to every client
     * @param {WebSocket|null} excludeWs  Optional client to exclude (e.g. sender)
     */
    broadcast(payload, excludeWs = null) {
        const msg = JSON.stringify(payload);

        for (const client of this.players) {
            try {
                // Only send to open sockets, and optionally skip one
                if (client && client !== excludeWs && client.readyState === WebSocket.OPEN) {
                    client.send(msg);
                }
            } catch (err) {
                console.warn('Failed to send to client, removing', err && err.message);
                this.removePlayer(client);
            }
        }
    }

    /**
     * Add a player to this game.
     * - Ensures only one active connection per user (kicks old one if reconnecting)
     * - Inserts a game participant record in the DB (for tracking/results)
     * - Stores balance/portfolio in memory
     *
     * @param {WebSocket} ws   WebSocket connection for this player
     * @param {object} user    User info; expected fields: id, guest_id, username
     */
    async addPlayer(ws, user) {
        // Attach user info to the WebSocket instance
        ws.user = user;

        // If this user is already connected from another WebSocket,
        // remove and close the old connection.
        for (const [existingWs, existingPlayer] of this.playerMap.entries()) {
            if (
                (user.id && existingPlayer.userId === user.id) ||
                (user.guest_id && existingPlayer.guestId === user.guest_id)
            ) {
                console.log(`Player ${user.username} reconnected, closing old connection`);
                this.players.delete(existingWs);
                this.playerMap.delete(existingWs);
                try {
                    existingWs.close(1000, 'Reconnected from another device');
                } catch (e) {
                    // Ignore if already closed
                }
            }
        }

        // Track this new connection
        this.players.add(ws);

        let participantId = null;

        // Create a participant record in the database
        // (Used for later analytics / leaderboards / history)
        try {
            participantId = await addGameParticipant(
                this.id,
                user.id,
                user.guest_id,
                1000 // starting balance
            );
        } catch (err) {
            console.error(
                `Error adding player ${user.id || user.guest_id} to game ${this.id}:`,
                err
            );
        }

        // Store the player’s in-memory game state
        this.playerMap.set(ws, {
            userId: user.id,
            guestId: user.guest_id,
            participantId: participantId,
            username: user.username,
            balance: 1000,
            portfolio: {},  // ticker -> quantity
        });
    }

    /**
     * Mark the game as started and notify clients.
     * (Assumes external code is calling tick() on an interval.)
     */
    start() {
        this.started = true;
        this.broadcast({ type: "game_start", message: "The game has started!" });
    }

    /**
     * Remove a player from this game.
     * - Disconnects references from in-memory structures
     * - Does NOT delete the participant record from DB
     *   (historical data is preserved)
     *
     * @param {WebSocket} ws
     */
    async removePlayer(ws) {
        const playerData = this.playerMap.get(ws);

        this.players.delete(ws);
        this.playerMap.delete(ws);

        // Note: We intentionally keep the participant row in the DB
        // for historical/analytics purposes.
        // If you wanted to remove them entirely, you'd call removeGameParticipant here.
        // (Right now it's only imported but not used.)
    }

    /**
     * Handle a single incoming WebSocket message from a player.
     * Supports:
     *  - action: 'buy'
     *  - action: 'sell'
     *
     * Validates:
     *  - game initialized
     *  - player exists
     *  - sufficient funds / holdings
     *
     * Updates:
     *  - in-memory balance + portfolio
     *  - per-volley buy/sell counters (for priceUpdate)
     *  - trade history in the database
     *
     * @param {WebSocket} ws
     * @param {string} rawMsg  Raw JSON string from client
     */
    async handleMessage(ws, rawMsg) {
        let msg;
        try {
            msg = JSON.parse(rawMsg);
        } catch (err) {
            console.warn('Invalid message JSON', err && err.message);
            return;
        }

        // Game isn't ready (stocks not loaded yet)
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

                // Ensure user has enough balance
                if (playerData.balance < totalCost) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: `Insufficient funds. Need $${totalCost.toFixed(2)}, have $${playerData.balance.toFixed(2)}`
                    }));
                    break;
                }

                // Deduct balance and credit holdings
                playerData.balance -= totalCost;
                playerData.portfolio[msg.ticker] =
                    (playerData.portfolio[msg.ticker] || 0) + msg.volume;

                // Track this buy for the current volley (affects priceUpdate)
                this.buys[stock.pos] += msg.volume;

                // Confirmation message to the buyer
                const response = {
                    type: 'transaction',
                    ticker: msg.ticker,
                    volume: msg.volume,
                    price: -totalCost,              // negative = spent money
                    newBalance: playerData.balance,
                    newHoldings: playerData.portfolio[msg.ticker],
                };

                ws.send(JSON.stringify(response));
                console.log(
                    `Player ${userId} bought ${msg.volume} ${msg.ticker} shares for $${totalCost.toFixed(
                        2
                    )}, balance: $${playerData.balance.toFixed(2)}`
                );

                // Broadcast a simplified transaction summary to other players
                const broadcastMsg = {
                    type: 'player_transaction',
                    player: playerData.username,
                    action: 'buy',
                    ticker: msg.ticker,
                    volume: msg.volume,
                    timestamp: new Date().toISOString(),
                };
                this.broadcast(broadcastMsg, ws);

                // Persist trade history if participantId is known
                if (playerData.participantId !== undefined && playerData.participantId !== null) {
                    try {
                        console.log(
                            `[GAME] Recording buy transaction - participant_id: ${playerData.participantId}, stock_id: ${stock.stock_id}`
                        );
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
                        console.error(
                            `Failed to record buy trade history for user ${userId}:`,
                            err
                        );
                    }
                } else {
                    console.warn(
                        `[GAME] Skipping transaction record for user ${userId} - participantId is ${playerData.participantId}`
                    );
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

                // Ensure the user has enough shares to sell
                if (currentHoldings < msg.volume) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: `Insufficient shares. Need ${msg.volume}, have ${currentHoldings}`
                    }));
                    break;
                }

                const totalProceeds = stock.cur_price * msg.volume;

                // Credit balance and reduce holdings
                playerData.balance += totalProceeds;
                playerData.portfolio[msg.ticker] -= msg.volume;

                // Track this sell for the current volley
                this.sells[stock.pos] += msg.volume;

                // Confirmation back to the seller
                const response = {
                    type: 'transaction',
                    ticker: msg.ticker,
                    volume: msg.volume,
                    price: totalProceeds,        // positive = received money
                    newBalance: playerData.balance,
                    newHoldings: playerData.portfolio[msg.ticker],
                };

                ws.send(JSON.stringify(response));
                console.log(
                    `Player ${userId} sold ${msg.volume} ${msg.ticker} shares for $${totalProceeds.toFixed(
                        2
                    )}, balance: $${playerData.balance.toFixed(2)}`
                );

                // Broadcast a simplified transaction summary to other players
                const broadcastMsg = {
                    type: 'player_transaction',
                    player: playerData.username,
                    action: 'sell',
                    ticker: msg.ticker,
                    volume: msg.volume,
                    timestamp: new Date().toISOString(),
                };
                this.broadcast(broadcastMsg, ws);

                // Persist trade history if participantId is known
                if (playerData.participantId !== undefined && playerData.participantId !== null) {
                    try {
                        console.log(
                            `[GAME] Recording sell transaction - participant_id: ${playerData.participantId}, stock_id: ${stock.stock_id}`
                        );
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
                        console.error(
                            `Failed to record sell trade history for user ${userId}:`,
                            err
                        );
                    }
                } else {
                    console.warn(
                        `[GAME] Skipping transaction record for user ${userId} - participantId is ${playerData.participantId}`
                    );
                }
                break;
            }

            default:
                console.warn(`Unknown action: ${msg.action}`);
        }
    }

    /**
     * Stop the game:
     * - Clears any running timers
     * - Closes all player WebSocket connections
     * - Empties the player set
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        // tickIntervalId appears to be an alternate timer handle; clear if used
        if (this.tickIntervalId) {
            clearInterval(this.tickIntervalId);
            this.tickIntervalId = null;
        }

        // Close all sockets cleanly
        for (const client of this.players) {
            try {
                client.close();
            } catch (e) {
                // Ignore if already closed
            }
        }

        this.players.clear();
    }
}

export { Game };
