import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authMiddleware } from "./middleware/auth.js";

const app = express();

// JWT secret from environment or default
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

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
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
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
    const result = await pool.query('SELECT user_id, username, created_at FROM users ORDER BY user_id');
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
    console.log(`[LOGIN] Attempt - Username: ${username}`);

    // Fetch user from database
    const result = await pool.query(
      'SELECT user_id, username, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log(`[LOGIN] Failed - User not found: ${username}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    const user = result.rows[0];

    // Compare password with hashed password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      console.log(`[LOGIN] Failed - Invalid password for user: ${username}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`[LOGIN] Success - User ID: ${user.user_id}, Username: ${username}, Token generated`);
    res.json({
      success: true,
      user_id: user.user_id,
      username: user.username,
      token: token
    });
  }
  catch (error) {
    console.error('[LOGIN] Error during login:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Handle user registration
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Use email if provided, otherwise generate a placeholder
    const userEmail = email || `${username}@stock-game.local`;

    // Check if user already exists
    const checkResult = await pool.query(
      'SELECT user_id FROM users WHERE username = $1 OR email = $2',
      [username, userEmail]
    );

    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const insertResult = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, username, email',
      [username, userEmail, hashedPassword]
    );

    res.json({
      success: true,
      user: insertResult.rows[0]
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
    console.log(`[GUEST_LOGIN] Attempt - Creating guest session`);

    const insertResult = await pool.query(`
      INSERT INTO guests (session_token, expires_at)
      VALUES ($1, $2)
      RETURNING guest_id
    `, [`guest_${Date.now()}_${Math.random()}`, new Date(Date.now() + 24*60*60*1000)]);

    const guest_id = insertResult.rows[0].guest_id;

    // Generate JWT token for guest
    const token = jwt.sign(
      { guest_id: guest_id, username: `Guest_${guest_id}` },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`[GUEST_LOGIN] Success - Guest ID: ${guest_id}, Token generated`);
    res.json({
      success: true,
      guest_id: guest_id,
      token: token
    });
  }
  catch (error) {
    console.error('[GUEST_LOGIN] Error during guest registration:', error);
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
        ) as current_price,
        COALESCE(
          (SELECT player_impact FROM gamestockprices gsp
           WHERE gsp.stock_id = s.stock_id AND gsp.game_id = $1
           ORDER BY volley DESC LIMIT 1),
          0
        ) as player_impact,
        COALESCE(
          (SELECT transaction_type FROM transactions
           WHERE game_id = $1 AND stock_id = s.stock_id AND volley = $2
           LIMIT 1),
          NULL
        ) as last_transaction_type
      FROM stocks s
      ORDER BY s.ticker
    `, [gameId, currentGame.current_volley]);

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
// Get all available games (waiting status)
app.get("/api/games/available", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        g.game_id,
        g.status,
        g.created_at,
        COUNT(gp.participant_id) as player_count,
        5 as max_players
      FROM games g
      LEFT JOIN gameparticipants gp ON g.game_id = gp.game_id
      WHERE g.status = 'waiting'
      GROUP BY g.game_id
      ORDER BY g.created_at DESC
    `);

    res.json({
      success: true,
      games: result.rows
    });
  } catch (error) {
    console.error('Error fetching available games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available games'
    });
  }
});

// Create a new game (for lobby)
app.post("/api/games/create", authMiddleware, async (req, res) => {
  try {
    const { playerName = 'Player' } = req.body;
    const user = req.user; // From JWT token

    // Create new game in waiting status
    const gameResult = await pool.query(`
      INSERT INTO games (status, current_volley, max_volleys, created_at)
      VALUES ('waiting', 0, 10, CURRENT_TIMESTAMP)
      RETURNING game_id
    `);
    const gameId = gameResult.rows[0].game_id;

    let participantResult;

    // Check if user_id or guest_id in token
    if (user.user_id) {
      // Authenticated user - add as user
      participantResult = await pool.query(`
        INSERT INTO gameparticipants (game_id, user_id, starting_balance)
        VALUES ($1, $2, 1000.00)
        RETURNING participant_id
      `, [gameId, user.user_id]);
    } else {
      // Guest user - add as guest
      const guestResult = await pool.query(`
        INSERT INTO guests (session_token, expires_at)
        VALUES ($1, $2)
        RETURNING guest_id
      `, [`guest_${Date.now()}_${Math.random()}`, new Date(Date.now() + 24*60*60*1000)]);
      const guestId = guestResult.rows[0].guest_id;

      participantResult = await pool.query(`
        INSERT INTO gameparticipants (game_id, guest_id, starting_balance)
        VALUES ($1, $2, 1000.00)
        RETURNING participant_id
      `, [gameId, guestId]);
    }
    const participantId = participantResult.rows[0].participant_id;

    // Initialize stock prices for this game
    const stocks = await pool.query('SELECT stock_id, initial_price FROM stocks');
    for (const stock of stocks.rows) {
      await pool.query(`
        INSERT INTO gamestockprices (game_id, stock_id, volley, price, historical_delta, player_impact)
        VALUES ($1, $2, 0, $3, 0, 0)
      `, [gameId, stock.stock_id, stock.initial_price]);
    }

    res.json({
      success: true,
      game_id: gameId,
      participant_id: participantId,
      starting_balance: 1000.00,
      message: `Created game ${gameId} as ${playerName}`
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create game'
    });
  }
});

// Join an existing game
app.post("/api/games/:gameId/join", authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerName = 'Player' } = req.body;
    const user = req.user; // From JWT token

    // Check if game exists and is in waiting status
    const gameResult = await pool.query(`
      SELECT game_id, status FROM games WHERE game_id = $1
    `, [gameId]);

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    if (gameResult.rows[0].status !== 'waiting') {
      return res.status(400).json({ success: false, error: 'Game is not available to join' });
    }

    let participantResult;

    // Check if user_id or guest_id in token
    if (user.user_id) {
      // Authenticated user - add as user
      participantResult = await pool.query(`
        INSERT INTO gameparticipants (game_id, user_id, starting_balance)
        VALUES ($1, $2, 1000.00)
        RETURNING participant_id
      `, [gameId, user.user_id]);
    } else {
      // Guest user - add as guest
      const guestResult = await pool.query(`
        INSERT INTO guests (session_token, expires_at)
        VALUES ($1, $2)
        RETURNING guest_id
      `, [`guest_${Date.now()}_${Math.random()}`, new Date(Date.now() + 24*60*60*1000)]);
      const guestId = guestResult.rows[0].guest_id;

      participantResult = await pool.query(`
        INSERT INTO gameparticipants (game_id, guest_id, starting_balance)
        VALUES ($1, $2, 1000.00)
        RETURNING participant_id
      `, [gameId, guestId]);
    }
    const participantId = participantResult.rows[0].participant_id;

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

// Start a game (transition from waiting to active)
app.post("/api/games/:gameId/start", authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.params;

    // Update game status to active and set start time
    const result = await pool.query(`
      UPDATE games
      SET status = 'active', start_time = CURRENT_TIMESTAMP
      WHERE game_id = $1 AND status = 'waiting'
      RETURNING game_id
    `, [gameId]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Game not found or already started' });
    }

    // Start price updates for this game
    startGamePriceUpdates(gameId);

    res.json({
      success: true,
      game_id: gameId,
      message: `Game ${gameId} started`
    });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start game'
    });
  }
});

// Legacy endpoint: join creates a new game (kept for backward compatibility)
app.post("/api/games/join", async (req, res) => {
  try {
    const { playerName = 'Guest Player' } = req.body;

    // Create new game in waiting status
    const gameResult = await pool.query(`
      INSERT INTO games (status, current_volley, max_volleys, created_at)
      VALUES ('waiting', 0, 10, CURRENT_TIMESTAMP)
      RETURNING game_id
    `);
    const gameId = gameResult.rows[0].game_id;

    // Create guest player (since no auth yet)
    const guestResult = await pool.query(`
      INSERT INTO guests (session_token, expires_at)
      VALUES ($1, $2)
      RETURNING guest_id
    `, [`guest_${Date.now()}_${Math.random()}`, new Date(Date.now() + 24*60*60*1000)]);
    const guestId = guestResult.rows[0].guest_id;

    // Add participant to game
    const participantResult = await pool.query(`
      INSERT INTO gameparticipants (game_id, guest_id, starting_balance)
      VALUES ($1, $2, 1000.00)
      RETURNING participant_id
    `, [gameId, guestId]);
    const participantId = participantResult.rows[0].participant_id;

    // Initialize stock prices for this game
    const stocks = await pool.query('SELECT stock_id, initial_price FROM stocks');
    for (const stock of stocks.rows) {
      await pool.query(`
        INSERT INTO gamestockprices (game_id, stock_id, volley, price, historical_delta, player_impact)
        VALUES ($1, $2, 0, $3, 0, 0)
      `, [gameId, stock.stock_id, stock.initial_price]);
    }

    // Automatically start the game after a 3 second delay (for testing)
    // In production, you'd wait for minimum players or player action
    setTimeout(() => {
      pool.query(`UPDATE games SET status = 'active', start_time = CURRENT_TIMESTAMP WHERE game_id = $1`, [gameId])
        .then(() => startGamePriceUpdates(gameId))
        .catch(err => console.error('Error auto-starting game:', err));
    }, 3000);

    res.json({
      success: true,
      game_id: gameId,
      participant_id: participantId,
      guest_id: guestId,
      starting_balance: 1000.00,
      message: `Created game ${gameId} as ${playerName}`
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join game'
    });
  }
});

// Get all participants in a game with their current stats
app.get("/api/games/:gameId/participants", async (req, res) => {
  try {
    const { gameId } = req.params;

    const participantsResult = await pool.query(`
      SELECT
        gp.participant_id,
        gp.user_id,
        gp.guest_id,
        gp.starting_balance,
        COALESCE(u.username, CONCAT('Guest ', g.guest_id)) as player_name
      FROM gameparticipants gp
      LEFT JOIN users u ON gp.user_id = u.user_id
      LEFT JOIN guests g ON gp.guest_id = g.guest_id
      WHERE gp.game_id = $1
      ORDER BY gp.participant_id
    `, [gameId]);

    // For each participant, calculate their current balance and portfolio value
    const participantsWithStats = await Promise.all(
      participantsResult.rows.map(async (participant) => {
        // Get cash remaining
        const cashResult = await pool.query(`
          SELECT SUM(CASE WHEN transaction_type = 'buy' THEN -total_value ELSE total_value END) as net_cash_change
          FROM transactions
          WHERE participant_id = $1 AND game_id = $2
        `, [participant.participant_id, gameId]);

        const startingBalance = parseFloat(participant.starting_balance);
        const netCashChange = parseFloat(cashResult.rows[0]?.net_cash_change || 0);
        const currentBalance = startingBalance + netCashChange;

        // Get current stock holdings and calculate portfolio value
        const portfolioResult = await pool.query(`
          SELECT
            s.stock_id,
            SUM(CASE WHEN t.transaction_type = 'buy' THEN t.quantity ELSE -t.quantity END) as quantity
          FROM transactions t
          JOIN stocks s ON t.stock_id = s.stock_id
          WHERE t.participant_id = $1 AND t.game_id = $2
          GROUP BY s.stock_id
          HAVING SUM(CASE WHEN t.transaction_type = 'buy' THEN t.quantity ELSE -t.quantity END) > 0
        `, [participant.participant_id, gameId]);

        // Calculate portfolio value
        let portfolioValue = 0;
        for (const holding of portfolioResult.rows) {
          const priceResult = await pool.query(`
            SELECT price FROM gamestockprices
            WHERE game_id = $1 AND stock_id = $2
            ORDER BY volley DESC
            LIMIT 1
          `, [gameId, holding.stock_id]);

          const currentPrice = parseFloat(priceResult.rows[0]?.price || 0);
          portfolioValue += currentPrice * holding.quantity;
        }

        const totalValue = currentBalance + portfolioValue;

        return {
          participant_id: participant.participant_id,
          player_name: participant.player_name,
          starting_balance: startingBalance,
          current_balance: currentBalance,
          portfolio_value: portfolioValue,
          total_value: totalValue
        };
      })
    );

    res.json({
      success: true,
      participants: participantsWithStats
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participants'
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

// Get game results - all participants and their final portfolio values
app.get("/api/games/:gameId/results", async (req, res) => {
  try {
    const { gameId } = req.params;

    // Get game info
    const gameResult = await pool.query(`
      SELECT game_id, status, current_volley, max_volleys, start_time, end_time
      FROM games WHERE game_id = $1
    `, [gameId]);

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const game = gameResult.rows[0];

    // Get all participants in this game with their portfolio values
    const participantsResult = await pool.query(`
      SELECT
        gp.participant_id,
        gp.guest_id,
        gp.user_id,
        gp.starting_balance,
        g.session_token as guest_name,
        u.username as user_name
      FROM gameparticipants gp
      LEFT JOIN guests g ON gp.guest_id = g.guest_id
      LEFT JOIN users u ON gp.user_id = u.user_id
      WHERE gp.game_id = $1
      ORDER BY gp.participant_id
    `, [gameId]);

    // For each participant, calculate their final portfolio value
    const participantsWithValues = await Promise.all(
      participantsResult.rows.map(async (participant) => {
        // Get current stock holdings and prices
        const portfolioResult = await pool.query(`
          SELECT
            s.ticker,
            s.stock_id,
            SUM(CASE WHEN t.transaction_type = 'buy' THEN t.quantity ELSE -t.quantity END) as quantity
          FROM transactions t
          JOIN stocks s ON t.stock_id = s.stock_id
          WHERE t.participant_id = $1 AND t.game_id = $2
          GROUP BY s.ticker, s.stock_id
          HAVING SUM(CASE WHEN t.transaction_type = 'buy' THEN t.quantity ELSE -t.quantity END) > 0
        `, [participant.participant_id, gameId]);

        // Get cash remaining
        const cashResult = await pool.query(`
          SELECT SUM(CASE WHEN transaction_type = 'buy' THEN -total_value ELSE total_value END) as net_cash_change
          FROM transactions
          WHERE participant_id = $1 AND game_id = $2
        `, [participant.participant_id, gameId]);

        const startingBalance = parseFloat(participant.starting_balance);
        const netCashChange = parseFloat(cashResult.rows[0]?.net_cash_change || 0);
        const cashRemaining = startingBalance + netCashChange;

        // Calculate portfolio value (sum of current stock prices × quantities)
        let portfolioValue = 0;
        for (const holding of portfolioResult.rows) {
          // Get current price for this stock in this game
          const priceResult = await pool.query(`
            SELECT price FROM gamestockprices
            WHERE game_id = $1 AND stock_id = $2
            ORDER BY volley DESC
            LIMIT 1
          `, [gameId, holding.stock_id]);

          const currentPrice = parseFloat(priceResult.rows[0]?.price || 0);
          portfolioValue += currentPrice * holding.quantity;
        }

        const totalValue = cashRemaining + portfolioValue;

        // Determine player name - prefer user name, fall back to guest
        let playerName = 'Unknown';
        if (participant.user_name) {
          playerName = participant.user_name;
        } else if (participant.guest_name) {
          playerName = `Guest ${participant.guest_id}`;
        }

        return {
          participant_id: participant.participant_id,
          guest_id: participant.guest_id,
          user_id: participant.user_id,
          player_name: playerName,
          starting_balance: startingBalance,
          cash_remaining: cashRemaining,
          portfolio_value: portfolioValue,
          total_value: totalValue
        };
      })
    );

    // Sort by total value descending and add ranks
    participantsWithValues.sort((a, b) => b.total_value - a.total_value);
    const resultsWithRanks = participantsWithValues.map((p, index) => ({
      ...p,
      rank: index + 1
    }));

    res.json({
      success: true,
      game: {
        game_id: game.game_id,
        status: game.status,
        current_volley: game.current_volley,
        max_volleys: game.max_volleys,
        start_time: game.start_time,
        end_time: game.end_time
      },
      participants: resultsWithRanks
    });
  } catch (error) {
    console.error('Error fetching game results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game results'
    });
  }
});

// Buy/Sell stock transaction
app.post("/api/transactions", authMiddleware, async (req, res) => {
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

    // Impact coefficient - controls how much player trading affects prices
    // Lower values = smaller impact per share (more realistic)
    // A value of 0.1 means each net share traded creates 0.1 point of impact
    const IMPACT_COEFFICIENT = 0.1;

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

      // Calculate player impact from transactions in the current volley (transactions that just happened)
      const buyResult = await pool.query(`
        SELECT COALESCE(SUM(quantity), 0) as total_buy_volume
        FROM transactions
        WHERE game_id = $1 AND stock_id = $2 AND volley = $3 AND transaction_type = 'buy'
      `, [gameId, stock.stock_id, currentVolley]);

      const sellResult = await pool.query(`
        SELECT COALESCE(SUM(quantity), 0) as total_sell_volume
        FROM transactions
        WHERE game_id = $1 AND stock_id = $2 AND volley = $3 AND transaction_type = 'sell'
      `, [gameId, stock.stock_id, currentVolley]);

      const totalBuyVolume = parseFloat(buyResult.rows[0].total_buy_volume);
      const totalSellVolume = parseFloat(sellResult.rows[0].total_sell_volume);

      // Generate random historical delta (±5%)
      const historicalDelta = (Math.random() - 0.5) * 0.1 * prevPrice;

      // Calculate player impact from net trading volume
      // player_impact = (buy_volume - sell_volume) × impact_coefficient
      // This creates realistic price pressure: buying pushes up, selling pushes down
      const netVolume = totalBuyVolume - totalSellVolume;
      const playerImpact = netVolume * IMPACT_COEFFICIENT;

      // Calculate new price: previous + historical_delta + player_impact
      const newPrice = Math.max(0.01, parseFloat(prevPrice) + historicalDelta + playerImpact);

      // Insert new price record
      await pool.query(`
        INSERT INTO gamestockprices (game_id, stock_id, volley, price, historical_delta, player_impact)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [gameId, stock.stock_id, nextVolley, newPrice.toFixed(2), historicalDelta.toFixed(2), playerImpact.toFixed(2)]);
    }

    console.log(`Game ${gameId}: Updated prices for volley ${nextVolley}`);
  } catch (error) {
    console.error(`Error updating prices for game ${gameId}:`, error);
  }
}

// Cleanup function to mark stale games as completed on startup
async function cleanupStaleGames() {
  try {
    console.log('Checking for stale games that should have ended...');

    // Mark games as completed if they were started more than 10 minutes ago and are still active
    const result = await pool.query(`
      UPDATE games
      SET status = 'completed', end_time = CURRENT_TIMESTAMP
      WHERE status = 'active'
        AND start_time < NOW() - INTERVAL '10 minutes'
      RETURNING game_id, start_time, current_volley
    `);

    if (result.rows.length > 0) {
      console.log(`Cleaned up ${result.rows.length} stale games:`);
      result.rows.forEach(game => {
        console.log(`  - Game ${game.game_id}: started at ${game.start_time}, volley ${game.current_volley}`);
      });
    } else {
      console.log('No stale games found.');
    }
  } catch (error) {
    console.error('Error during stale games cleanup:', error);
  }
}

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);

  // Run cleanup on startup
  await cleanupStaleGames();

  console.log('Game server ready - waiting for players to join games');
});

export { app };
