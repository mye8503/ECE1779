import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import path from "path";

const app = express();

// hash function for password hashing
// const crypto = require('crypto');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'game_user',
  password: process.env.DB_PASSWORD || 'game_password',
  database: process.env.DB_NAME || 'stock_game',
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
  } else {
    console.log('Connected to PostgreSQL database');
    release();
  }
});

// Middleware to parse JSON request bodies
app.use(express.json());

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend API is running", timestamp: new Date().toISOString() });
});

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, username, password created_at FROM users ORDER BY user_id');
    res.json({
      success: true,
      users: result.rows
    });
  }
  catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Get all guests
app.get("/api/guests", async (req, res) => {
  try {
    const result = await pool.query('SELECT guest_id, session_token, created_at FROM guests ORDER BY guest_id');
    res.json({
      success: true,
      users: result.rows
    });
  }
  catch (error) {
    console.error('Error fetching guests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch guests'
    });
  }
});

// Handle user login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // // encrypt password
    // const hash = crypto.createHash('sha256');
    // hash.update(password);
    // const pass_hash = hash.digest('hex')

    const result = await pool.query(
      'SELECT user_id, username FROM users WHERE username = $1 AND password_hash = $2',
      [username, pass_hash]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      })
    }
    res.json({
      success: true,
      user_id: result.rows[0].user_id,
      username: result.rows[0].username
    });
  }
  catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});


// Handle user registration
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // // encrypt password
    // const hash = crypto.createHash('sha256');
    // hash.update(password);
    // const pass_hash = hash.digest('hex')

    const result = await pool.query(
      'SELECT user_id, username FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      const insertResult = await pool.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING user_id, username',
        [username, pass_hash]
      );
      return res.json({
        success: true,
        user: insertResult.rows[0]
      })
    }
    res.json({
      success: false,
      error: 'User already exists'
    });
  }
  catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Handle guest registration
app.post("/api/guests/register", async (req, res) => {
  try {
    const insertResult = await pool.query(`
      INSERT INTO guests (session_token, expires_at)
      VALUES ($1, $2)
      RETURNING guest_id
    `, [`guest_${Date.now()}_${Math.random()}`, new Date(Date.now() + 24*60*60*1000)]);

    res.json({
      success: true,
      guest_id: insertResult.rows[0].guest_id
    });
  }
  catch (error) {
    console.error('Error during guest registration:', error);
    res.status(500).json({
      success: false,
      error: 'Guest registration failed'
    });
  }
});

// Get all available stocks
app.get("/api/stocks", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stocks ORDER BY ticker');
    res.json({
      success: true,
      stocks: result.rows
    });
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stocks'
    });
  }
});

// Get current stock prices for a specific game
app.get("/api/stocks/prices", async (req, res) => {
  try {
    const { gameId } = req.query;
    
    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: 'Game ID required'
      });
    }
    
    // Get current game info
    const gameResult = await pool.query(`
      SELECT game_id, current_volley, status 
      FROM games 
      WHERE game_id = $1
    `, [gameId]);
    
    if (gameResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const currentGame = gameResult.rows[0];
    
    // Get prices from the specified game or use initial prices
    const result = await pool.query(`
      SELECT 
        s.stock_id,
        s.ticker,
        s.company_name,
        COALESCE(
          (SELECT price FROM gamestockprices gsp 
           WHERE gsp.stock_id = s.stock_id AND gsp.game_id = $1
           ORDER BY volley DESC LIMIT 1), 
          s.initial_price
        ) as current_price
      FROM stocks s
      ORDER BY s.ticker
    `, [gameId]);
    
    res.json({
      success: true,
      prices: result.rows,
      game_id: currentGame.game_id,
      current_volley: currentGame.current_volley,
      game_status: currentGame.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stock prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock prices'
    });
  }
});

// Get specific stock by ticker
app.get("/api/stocks/:ticker", async (req, res) => {
  try {
    const { ticker } = req.params;
    const result = await pool.query('SELECT * FROM stocks WHERE ticker = $1', [ticker.toUpperCase()]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Stock not found'
      });
    }

    res.json({
      success: true,
      stock: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock'
    });
  }
});

// Create and join a new game (single player for now)
app.post("/api/games/join", async (req, res) => {
  try {
    const {isGuest, playerId, playerName } = req.body;
    
    // Create new game
    const gameResult = await pool.query(`
      INSERT INTO games (status, current_volley, max_volleys, start_time)
      VALUES ('active', 0, 300, CURRENT_TIMESTAMP)
      RETURNING game_id
    `);
    const gameId = gameResult.rows[0].game_id;
    
    // Add participant to game
    let participantId;
    if (isGuest) {
      const participantResult = await pool.query(`
        INSERT INTO gameparticipants (game_id, guest_id, starting_balance)
        VALUES ($1, $2, 1000.00)
        RETURNING participant_id
      `, [gameId, playerId]);
      participantId = participantResult.rows[0].participant_id;
    }

    else {
      const participantResult = await pool.query(`
        INSERT INTO gameparticipants (game_id, user_id, starting_balance)
        VALUES ($1, $2, 1000.00)
        RETURNING participant_id
      `, [gameId, playerId]);
      participantId = participantResult.rows[0].participant_id;      
    }
    
    // Initialize stock prices for this game
    const stocks = await pool.query('SELECT stock_id, initial_price FROM stocks');
    for (const stock of stocks.rows) {
      await pool.query(`
        INSERT INTO gamestockprices (game_id, stock_id, volley, price, historical_delta, player_impact)
        VALUES ($1, $2, 0, $3, 0, 0)
      `, [gameId, stock.stock_id, stock.initial_price]);
    }
    
    // Start price updates for this specific game
    startGamePriceUpdates(gameId);
    
    res.json({
      success: true,
      game_id: gameId,
      participant_id: participantId,
      starting_balance: 1000.00,
      message: `Joined game ${gameId} as ${playerName}`
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join game'
    });
  }
});

// Get current game state for a participant
app.get("/api/games/:gameId/state/:participantId", async (req, res) => {
  try {
    const { gameId, participantId } = req.params;
    
    // Get game info
    const gameResult = await pool.query(`
      SELECT game_id, status, current_volley, max_volleys, start_time
      FROM games WHERE game_id = $1
    `, [gameId]);
    
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    
    // Get participant info and calculate portfolio
    const participantResult = await pool.query(`
      SELECT participant_id, starting_balance
      FROM gameparticipants WHERE participant_id = $1 AND game_id = $2
    `, [participantId, gameId]);
    
    if (participantResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Participant not found' });
    }
    
    // Calculate current portfolio from transactions
    const portfolioResult = await pool.query(`
      SELECT 
        s.ticker,
        SUM(CASE WHEN t.transaction_type = 'buy' THEN t.quantity ELSE -t.quantity END) as quantity,
        SUM(CASE WHEN t.transaction_type = 'buy' THEN -t.total_value ELSE t.total_value END) as cash_impact
      FROM transactions t
      JOIN stocks s ON t.stock_id = s.stock_id
      WHERE t.participant_id = $1 AND t.game_id = $2
      GROUP BY s.ticker
      HAVING SUM(CASE WHEN t.transaction_type = 'buy' THEN t.quantity ELSE -t.quantity END) > 0
    `, [participantId, gameId]);
    
    const totalCashSpent = await pool.query(`
      SELECT SUM(CASE WHEN transaction_type = 'buy' THEN -total_value ELSE total_value END) as net_cash_change
      FROM transactions
      WHERE participant_id = $1 AND game_id = $2
    `, [participantId, gameId]);
    
    const startingBalance = parseFloat(participantResult.rows[0].starting_balance);
    const netCashChange = parseFloat(totalCashSpent.rows[0]?.net_cash_change || 0);
    const currentBalance = startingBalance + netCashChange;
    
    res.json({
      success: true,
      game: gameResult.rows[0],
      participant: participantResult.rows[0],
      portfolio: portfolioResult.rows.reduce((acc, row) => {
        acc[row.ticker] = parseInt(row.quantity);
        return acc;
      }, {}),
      balance: currentBalance
    });
  } catch (error) {
    console.error('Error fetching game state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game state'
    });
  }
});

// Buy/Sell stock transaction
app.post("/api/transactions", async (req, res) => {
  try {
    const { gameId, participantId, ticker, transactionType, quantity } = req.body;
    
    // Validate inputs
    if (!gameId || !participantId || !ticker || !transactionType || !quantity) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    if (!['buy', 'sell'].includes(transactionType)) {
      return res.status(400).json({ success: false, error: 'Invalid transaction type' });
    }
    
    // Get stock info
    const stockResult = await pool.query('SELECT stock_id FROM stocks WHERE ticker = $1', [ticker.toUpperCase()]);
    if (stockResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Stock not found' });
    }
    const stockId = stockResult.rows[0].stock_id;
    
    // Get current game info
    const gameResult = await pool.query('SELECT current_volley, status FROM games WHERE game_id = $1', [gameId]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    
    const currentVolley = gameResult.rows[0].current_volley;
    const gameStatus = gameResult.rows[0].status;
    
    if (gameStatus !== 'active') {
      return res.status(400).json({ success: false, error: 'Game is not active' });
    }
    
    // Get current stock price
    const priceResult = await pool.query(`
      SELECT price FROM gamestockprices 
      WHERE game_id = $1 AND stock_id = $2 AND volley = $3
    `, [gameId, stockId, currentVolley]);
    
    let currentPrice;
    if (priceResult.rows.length === 0) {
      // Fallback to initial price if no price data for current volley
      const initialResult = await pool.query('SELECT initial_price FROM stocks WHERE stock_id = $1', [stockId]);
      currentPrice = parseFloat(initialResult.rows[0].initial_price);
    } else {
      currentPrice = parseFloat(priceResult.rows[0].price);
    }
    
    const totalValue = currentPrice * quantity;
    
    // For sell transactions, verify the participant owns enough shares
    if (transactionType === 'sell') {
      const holdingResult = await pool.query(`
        SELECT COALESCE(SUM(CASE WHEN transaction_type = 'buy' THEN quantity ELSE -quantity END), 0) as total_shares
        FROM transactions
        WHERE participant_id = $1 AND game_id = $2 AND stock_id = $3
      `, [participantId, gameId, stockId]);
      
      const currentShares = parseInt(holdingResult.rows[0].total_shares);
      if (currentShares < quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Insufficient shares. You own ${currentShares} shares, trying to sell ${quantity}` 
        });
      }
    }
    
    // For buy transactions, verify the participant has enough cash
    if (transactionType === 'buy') {
      const balanceResult = await pool.query(`
        SELECT 
          gp.starting_balance,
          COALESCE(SUM(CASE WHEN t.transaction_type = 'buy' THEN -t.total_value ELSE t.total_value END), 0) as net_cash_change
        FROM gameparticipants gp
        LEFT JOIN transactions t ON gp.participant_id = t.participant_id
        WHERE gp.participant_id = $1 AND gp.game_id = $2
        GROUP BY gp.starting_balance
      `, [participantId, gameId]);
      
      if (balanceResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Participant not found' });
      }
      
      const startingBalance = parseFloat(balanceResult.rows[0].starting_balance);
      const netCashChange = parseFloat(balanceResult.rows[0].net_cash_change);
      const currentBalance = startingBalance + netCashChange;
      
      if (currentBalance < totalValue) {
        return res.status(400).json({ 
          success: false, 
          error: `Insufficient funds. Balance: $${currentBalance.toFixed(2)}, Cost: $${totalValue.toFixed(2)}` 
        });
      }
    }
    
    // Create the transaction
    const transactionResult = await pool.query(`
      INSERT INTO transactions (game_id, participant_id, stock_id, volley, transaction_type, quantity, price_per_share, total_value)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING transaction_id
    `, [gameId, participantId, stockId, currentVolley, transactionType, quantity, currentPrice, totalValue]);
    
    const transactionId = transactionResult.rows[0].transaction_id;
    
    // Log the transaction
    console.log(`🔄 TRANSACTION [Game ${gameId}] - Participant ${participantId} ${transactionType.toUpperCase()} ${quantity} ${ticker} @ $${currentPrice.toFixed(2)} (Total: $${totalValue.toFixed(2)}) [Volley ${currentVolley}] [TX#${transactionId}]`);
    
    res.json({
      success: true,
      transaction_id: transactionId,
      ticker,
      transaction_type: transactionType,
      quantity,
      price_per_share: currentPrice,
      total_value: totalValue,
      volley: currentVolley
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction'
    });
  }
});

// Get price history for a specific stock (for charts)
app.get("/api/stocks/:ticker/history", async (req, res) => {
  try {
    const { ticker } = req.params;
    const { gameId } = req.query;
    const limit = parseInt(req.query.limit) || 50; // Default last 50 volleys
    
    if (!gameId) {
      return res.status(400).json({ success: false, error: 'Game ID required' });
    }
    
    // Get stock info
    const stockResult = await pool.query('SELECT stock_id FROM stocks WHERE ticker = $1', [ticker.toUpperCase()]);
    if (stockResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Stock not found' });
    }
    const stockId = stockResult.rows[0].stock_id;
    
    // Get recent price history for the specified game
    const historyResult = await pool.query(`
      SELECT volley, price, historical_delta, player_impact, created_at
      FROM gamestockprices 
      WHERE stock_id = $1 AND game_id = $2
      ORDER BY volley DESC 
      LIMIT $3
    `, [stockId, gameId, limit]);
    
    // Reverse to get chronological order
    const history = historyResult.rows.reverse();
    
    res.json({
      success: true,
      ticker: ticker.toUpperCase(),
      history: history
    });
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock history'
    });
  }
});

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "Stock Game Backend API", 
    endpoints: {
      health: "/api/health",
      stocks: "/api/stocks",
      prices: "/api/stocks/prices",
      history: "/api/stocks/:ticker/history",
      frontend: "http://localhost:5174"
    }
  });
});

// Store active games and their intervals
const activeGameIntervals = new Map(); // gameId -> intervalId

// Start price updates for a specific game
function startGamePriceUpdates(gameId) {
  console.log(`Starting price updates for game ${gameId}`);
  
  const intervalId = setInterval(async () => {
    await updateGamePrices(gameId);
  }, 2000);
  
  activeGameIntervals.set(gameId, intervalId);
}

// Update stock prices for a specific game
async function updateGamePrices(gameId) {
  try {
    // Get current game state
    const gameResult = await pool.query(
      'SELECT current_volley, max_volleys, status FROM games WHERE game_id = $1',
      [gameId]
    );
    
    if (gameResult.rows.length === 0 || gameResult.rows[0].status !== 'active') {
      // Game doesn't exist or is not active, stop updates
      const intervalId = activeGameIntervals.get(gameId);
      if (intervalId) {
        clearInterval(intervalId);
        activeGameIntervals.delete(gameId);
        console.log(`Stopped price updates for inactive game ${gameId}`);
      }
      return;
    }
    
    const currentVolley = gameResult.rows[0].current_volley;
    const maxVolleys = gameResult.rows[0].max_volleys;
    const nextVolley = currentVolley + 1;
    
    // Check if game should end
    if (nextVolley >= maxVolleys) {
      console.log(`Game ${gameId} completed after ${maxVolleys} volleys (10 minutes)`);
      await pool.query(
        'UPDATE games SET status = $1, end_time = CURRENT_TIMESTAMP WHERE game_id = $2',
        ['completed', gameId]
      );
      
      // Stop this game's price updates
      const intervalId = activeGameIntervals.get(gameId);
      if (intervalId) {
        clearInterval(intervalId);
        activeGameIntervals.delete(gameId);
        console.log(`Game ${gameId} price updates stopped`);
      }
      return;
    }
    
    // Update game volley
    await pool.query(
      'UPDATE games SET current_volley = $1 WHERE game_id = $2',
      [nextVolley, gameId]
    );
    
    const stocks = await pool.query('SELECT stock_id FROM stocks');
    
    for (const stock of stocks.rows) {
      // Get previous price
      const prevResult = await pool.query(`
        SELECT price FROM gamestockprices 
        WHERE game_id = $1 AND stock_id = $2 AND volley = $3
      `, [gameId, stock.stock_id, currentVolley]);
      
      let prevPrice = prevResult.rows[0]?.price;
      if (!prevPrice) {
        // Fallback to initial price
        const initialResult = await pool.query(
          'SELECT initial_price FROM stocks WHERE stock_id = $1',
          [stock.stock_id]
        );
        prevPrice = initialResult.rows[0].initial_price;
      }
      
      // Generate random historical delta (±2% to ±5%)
      const historicalDelta = (Math.random() - 0.5) * 0.1 * prevPrice; // ±5%
      const newPrice = Math.max(0.01, parseFloat(prevPrice) + historicalDelta);
      
      // Insert new price record
      await pool.query(`
        INSERT INTO gamestockprices (game_id, stock_id, volley, price, historical_delta, player_impact)
        VALUES ($1, $2, $3, $4, $5, 0)
      `, [gameId, stock.stock_id, nextVolley, newPrice.toFixed(2), historicalDelta.toFixed(2)]);
    }
    
    console.log(`Game ${gameId}: Updated prices for volley ${nextVolley}`);
  } catch (error) {
    console.error(`Error updating prices for game ${gameId}:`, error);
  }
}

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  console.log('Game server ready - waiting for players to join games');
});

export { app };
