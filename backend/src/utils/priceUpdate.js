import pool from "../config/sql.js";

/**
 * Calculate new stock price based on:
 * 1. Player trading impact (buy/sell volume)
 * 2. Random volatility (market noise)
 * 3. Mean reversion (prices tend to return to historical average)
 *
 * @param {number} old_price - Current price
 * @param {number} buy_volume - Number of shares bought this volley
 * @param {number} sell_volume - Number of shares sold this volley
 * @param {number} hist_price - Previous volley price (for trend calculation)
 * @returns {number} New price after all factors applied
 */
async function priceUpdate(old_price, buy_volume, sell_volume, hist_price, current_volley, ticker) {
    // 1. TRADING IMPACT: Net buying pressure affects price
    // More aggressive scaling: high volume creates bigger price swings
    const net_volume = buy_volume - sell_volume;
    const volume_ratio = net_volume / Math.max(1, buy_volume + sell_volume);
    const trade_impact = volume_ratio * 0.08 * old_price; // 8% max impact per volley

    // 2. VOLATILITY: Random market noise (±3% per volley)
    const volatility_magnitude = (Math.random() - 0.5) * 0.06 * old_price;

    // 3. MEAN REVERSION: Prices naturally drift back toward historical average
    // Weaker effect than trading impact (prevents runaway price changes)
    const price_deviation = old_price - hist_price;
    const mean_reversion = -price_deviation * 0.15; // Pull back 15% of deviation

    // Combine all factors
    const total_change = trade_impact + volatility_magnitude + mean_reversion;

    const historical_data = await pool.query(
    'SELECT historical_prices FROM stocks WHERE ticker = $1',
    [ticker]
    );

    const prices = historical_data.rows[0].historical_prices;

    // current_volley goes from 1..90 so convert to 0-based index:
    const index = current_volley - 1;

    // Safety check
    if (!prices[index]) {
    throw new Error(`No historical price for volley ${current_volley}`);
    }

    const his_price = prices[index];

    // Use open price as reference unless undefined
    const ref_price =
    his_price.open !== undefined ? his_price.open : old_price;

    const new_price = ref_price + total_change;

    // Price floor at $0.01 to prevent negative prices
    return Math.max(new_price, 0.01);
}

export {priceUpdate};
