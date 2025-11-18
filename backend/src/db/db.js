import {pool} from '../config/sql.js';
import {priceUpdate} from '../utils/priceUpdate.js';
// TO-DO:
// add transactions tracking  with transactions table

async function createGame(status = 'active', current_volley = 0, players_data = []) {
    // insert new game row
    const result = await pool.query(
        "INSERT INTO games (status, current_volley, players_data, start_time, cur_time) VALUES ($1,$2,$3,now(),now()) RETURNING game_id",
        [status, current_volley, JSON.stringify(players_data)]
    );

    // initialize stock prices for the game from default prices
    const default_prices = await pool.query(
        "SELECT stock_id, stock_value FROM stocks WHERE stock_volley=0"
    );

    // insert initial stock prices for the game
    for (const row of default_prices.rows) {
        await pool.query(
            "INSERT INTO gamestockprices (game_id, stock_id, cur_price, cur_volley, hist_price) VALUES ($1, $2, $3, $4, $5)",
            [result.rows[0].game_id, row.stock_id, row.stock_value, 0, row.stock_value]
        );
    }

    // return the new game id
    return result.rows[0].game_id;
}

async function getGameById(game_id) {
    // fetch game row by id
    const result = await pool.query(
        "SELECT * FROM games WHERE game_id = $1",
        [game_id]
    );

    // return game data or null if not found
    if (result.rowCount === 0) {
        return null;
    }
    return result.rows[0];
}

async function finishGame(game_id, winner_id = null) {
    // update game status to finished and set winner_id
    await pool.query(
        "UPDATE games SET status='finished', winner_id=$2 WHERE game_id = $1",
        [game_id, winner_id]
    );
}

async function updateGameVolley(game_id, current_volley, changes = {}) {
    // add row to gamestockprices for the new volley based on changes
    for (const [stock_id, buy_volume, sell_volume] of Object.entries(changes)) {
        // get last volley price
        const last_price_res = await pool.query(
            "SELECT cur_price FROM gamestockprices WHERE game_id=$1 AND stock_id=$2 AND cur_volley=$3",
            [game_id, stock_id, current_volley - 1]
        );

        // get history price from last volley, calculate new price
        const hist_price = await pool.query(
            "SELECT stock_value FROM stocks WHERE stock_id=$1 AND stock_volley=$2",
            [stock_id, current_volley - 1]
        );
        const last_price = last_price_res.rowCount > 0 ? last_price_res.rows[0].cur_price : null;
        const new_price_val = priceUpdate(last_price, buy_volume, sell_volume, hist_price.rows[0].stock_value);

        // insert new price row for current volley
        await pool.query(
            "INSERT INTO gamestockprices (game_id, stock_id, cur_price, cur_volley, hist_price) VALUES ($1, $2, $3, $4, $5)",
            [game_id, stock_id, new_price_val, current_volley, last_price]
        );
    };

    // update current_volley in games table
    await pool.query(
        "UPDATE games SET current_volley=$2, cur_time=now() WHERE game_id = $1",
        [game_id, current_volley]
    );

}

async function createUser(username, balance = 1000, email = null) {
    // insert new user row
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

export {
    createGame,
    getGameById,
    finishGame,
    updateGameVolley,
    createUser,
    getUserById
};