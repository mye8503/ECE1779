import pool from '../config/sql.js';
import {priceUpdate} from '../utils/priceUpdate.js';

async function createGame(status = 'active', current_volley = 0, players_data = []) {
    const result = await pool.query(
        "INSERT INTO games (status, current_volley, players_data, start_time, cur_time) VALUES ($1,$2,$3,now(),now()) RETURNING game_id",
        [status, current_volley, JSON.stringify(players_data)]
    );

    const default_prices = await pool.query(
        "SELECT stock_id, stock_value FROM stocks WHERE stock_volley=0"
    );

    for (const row of default_prices.rows) {
        await pool.query(
            "INSERT INTO gamestockprices (game_id, stock_id, cur_price, cur_volley, hist_price) VALUES ($1, $2, $3, $4, $5)",
            [result.rows[0].game_id, row.stock_id, row.stock_value, 0, row.stock_value]
        );
    }

    return result.rows[0].game_id;
}

async function getGameById(game_id) {
    const result = await pool.query(
        "SELECT * FROM games WHERE game_id = $1",
        [game_id]
    );

    if (result.rowCount === 0) {
        return null;
    }
    return result.rows[0];
}

async function finishGame(game_id, winner_id = null) {
    await pool.query(
        "UPDATE games SET status='finished', winner_id=$2 WHERE game_id = $1",
        [game_id, winner_id]
    );
}

async function updateGameVolley(game_id, current_volley, stock_updates = []) {
    try {
        await pool.query(
            "UPDATE games SET current_volley=$2 WHERE game_id = $1",
            [game_id, current_volley]
        );
    } catch (error) {
        console.error('Error updating game volley:', error);
    }
}

async function createUser(username, balance = 1000, email = null) {
    const result = await pool.query(
        "INSERT INTO users (username, balance, email, game_stats) VALUES ($1, $2, $3, $4) RETURNING user_id",
        [username, balance, email, JSON.stringify({})]
    );
    return result.rows[0].user_id;
}

async function getUserById(user_id) {
    const result = await pool.query(
        "SELECT * FROM users WHERE user_id = $1",
        [user_id]
    );
    if (result.rowCount === 0) {
        return null;
    }
    return result.rows[0];
}


// **correct**
/**
 * gets game stock prices for a given volley
 * @param {number} volley - The volley number to retrieve stock prices for.
 * @returns {JSON} - the stock id and prices for the given volley.
 */
async function getGameStocks(volley = 0) {
    const result = await pool.query(
        "SELECT stock_id, price FROM gamestockprices WHERE volley=$1",
        [volley]
    );
    return result.rows;
}

// **correct**
/**
 * gets reference stock prices
 * @returns {JSON} - the stock id, ticker, company name, and initial price.
 */
async function getStocksReference() {
    const result = await pool.query(
        "SELECT stock_id, ticker, company_name, initial_price FROM stocks",
    );
    return result.rows;
}

async function updateTradeHistory(game_id, participant_id, stock_id, volley, transaction_type, quantity, price_per_share, total_value, create_time) {
    try {
        console.log(`[DB] Recording transaction: game_id=${game_id}, participant_id=${participant_id}, stock_id=${stock_id}, volley=${volley}, type=${transaction_type}, qty=${quantity}, price=${price_per_share}, total=${total_value}`);
        const result = await pool.query(
            `INSERT INTO transactions
            (game_id, participant_id, stock_id, volley, transaction_type, quantity, price_per_share, total_value, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [game_id, participant_id, stock_id, volley, transaction_type, quantity, price_per_share, total_value, create_time]
        );
        console.log(`[DB] Transaction recorded successfully`);
    } catch (err) {
        console.error(`[DB] Error recording transaction:`, err);
        throw err;
    }
}

async function addGameParticipant(game_id, user_id, guest_id, starting_balance = 1000) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if participant already exists (with lock)
        let checkQuery;
        let checkParams;

        if (user_id) {
            checkQuery = `SELECT participant_id FROM gameparticipants
                         WHERE game_id = $1 AND user_id = $2 FOR UPDATE`;
            checkParams = [game_id, user_id];
        } else if (guest_id) {
            checkQuery = `SELECT participant_id FROM gameparticipants
                         WHERE game_id = $1 AND guest_id = $2 FOR UPDATE`;
            checkParams = [game_id, guest_id];
        } else {
            console.error('Error adding game participant: neither user_id nor guest_id provided');
            await client.query('ROLLBACK');
            return null;
        }

        const existing = await client.query(checkQuery, checkParams);

        if (existing.rows.length > 0) {
            await client.query('COMMIT');
            return existing.rows[0].participant_id;
        }

        // Insert new participant
        const insertResult = await client.query(
            `INSERT INTO gameparticipants (game_id, user_id, guest_id, starting_balance)
             VALUES ($1, $2, $3, $4)
             RETURNING participant_id`,
            [game_id, user_id || null, guest_id || null, starting_balance]
        );

        await client.query('COMMIT');
        return insertResult.rows[0]?.participant_id;
    } catch (error) {
        await client.query('ROLLBACK');

        // Handle unique constraint violation (duplicate participant)
        if (error.code === '23505') {
            console.log(`[DB] Participant already exists for game_id=${game_id}, user_id=${user_id}, guest_id=${guest_id}. Retrieving existing participant.`);

            // Query for the existing participant
            try {
                let query;
                let params;

                if (user_id) {
                    query = `SELECT participant_id FROM gameparticipants WHERE game_id = $1 AND user_id = $2`;
                    params = [game_id, user_id];
                } else {
                    query = `SELECT participant_id FROM gameparticipants WHERE game_id = $1 AND guest_id = $2`;
                    params = [game_id, guest_id];
                }

                const result = await pool.query(query, params);
                if (result.rows.length > 0) {
                    return result.rows[0].participant_id;
                }
            } catch (queryError) {
                console.error('Error retrieving existing participant:', queryError);
            }
        }

        console.error('Error adding game participant:', error);
        return null;
    } finally {
        client.release();
    }
}

async function removeGameParticipant(game_id, participant_id) {
    try {
        await pool.query(
            `DELETE FROM gameparticipants WHERE game_id = $1 AND participant_id = $2`,
            [game_id, participant_id]
        );
    } catch (error) {
        console.error('Error removing game participant:', error);
    }
}

async function updateGameStatus(game_id, status) {
    try {
        await pool.query(
            `UPDATE games SET status = $1 WHERE game_id = $2`,
            [status, game_id]
        );
    } catch (error) {
        console.error('Error updating game status:', error);
    }
}

export {
    createGame,
    getGameById,
    finishGame,
    updateGameVolley,
    createUser,
    getUserById,
    getGameStocks,
    updateTradeHistory,
    getStocksReference,
    addGameParticipant,
    removeGameParticipant,
    updateGameStatus,
};
