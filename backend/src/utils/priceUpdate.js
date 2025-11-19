// TO-DO:
// update with better logic

/**
 * calculates stock price based on buy/sell volume and historical price
 * @param {number} old_price - The current price of the stock at the previous volley.
 * @param {number} buy_volume - The volume of buy orders.
 * @param {number} sell_volume - The volume of sell orders.
 * @param {number} hist_price - The historical price of the stock at the previous volley.
 * @returns {number} - the updated stock price.
 */
async function priceUpdate(old_price, buy_volume, sell_volume, hist_price) {
    // simple price update logic based on buy/sell volume
    const total_volume = buy_volume + sell_volume;
    if (total_volume === 0) {
        return old_price; // no change
    } else {
        const price_change = (buy_volume - sell_volume) / total_volume * 0.05 * old_price; // max 5% change
        const new_price = hist_price + price_change;
        return Math.max(new_price, 0.01); // price floor at 0.01
    }
}

export {priceUpdate};