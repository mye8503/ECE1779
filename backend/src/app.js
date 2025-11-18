import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import path from "path";

const app = express();

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

// Get current stock prices (from GameStockPrices table)
app.get("/api/stocks/prices", async (req, res) => {
  try {
    // Get current game info
    const gameResult = await pool.query(`
      SELECT game_id, current_volley, status 
      FROM games 
      WHERE game_id = $1
    `, [demoGameId]);
    
    const currentGame = gameResult.rows[0];
    
    // Get prices from the latest demo game or use initial prices
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
    `, [demoGameId]);
    
    res.json({
      success: true,
      prices: result.rows,
      game_id: currentGame?.game_id,
      current_volley: currentGame?.current_volley,
      game_status: currentGame?.status,
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

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "Stock Game Backend API", 
    endpoints: {
      health: "/api/health",
      stocks: "/api/stocks",
      prices: "/api/stocks/prices",
      frontend: "http://localhost:5174"
    }
  });
});

let demoGameId = null;
let currentVolley = 0;
let priceUpdateInterval = null;

// Create a demo game for testing price updates
async function createDemoGame() {
  try {
    const result = await pool.query(`
      INSERT INTO games (status, current_volley, max_volleys, start_time)
      VALUES ('active', 0, 300, CURRENT_TIMESTAMP)
      RETURNING game_id
    `);
    demoGameId = result.rows[0].game_id;
    console.log(`Created demo game with ID: ${demoGameId}`);
    
    // Initialize prices with initial stock prices
    await initializeDemoPrices();
  } catch (error) {
    console.error('Error creating demo game:', error);
  }
}

// Initialize demo game prices from initial stock prices
async function initializeDemoPrices() {
  try {
    const stocks = await pool.query('SELECT stock_id, initial_price FROM stocks');
    
    for (const stock of stocks.rows) {
      await pool.query(`
        INSERT INTO gamestockprices (game_id, stock_id, volley, price, historical_delta, player_impact)
        VALUES ($1, $2, $3, $4, 0, 0)
      `, [demoGameId, stock.stock_id, currentVolley, stock.initial_price]);
    }
    
    console.log('Demo game prices initialized');
  } catch (error) {
    console.error('Error initializing demo prices:', error);
  }
}

// Update stock prices with random fluctuations for demo game
async function updateStockPrices() {
  if (!demoGameId) return;
  
  try {
    currentVolley++;
    
    // Check if game should end (300 volleys max)
    if (currentVolley >= 300) {
      console.log('Demo game completed after 300 volleys (10 minutes)');
      await pool.query(
        'UPDATE games SET status = $1, end_time = CURRENT_TIMESTAMP WHERE game_id = $2',
        ['completed', demoGameId]
      );
      clearInterval(priceUpdateInterval);
      console.log('Price update interval stopped');
      return; // Stop updating prices
    }
    
    // Update game volley
    await pool.query(
      'UPDATE games SET current_volley = $1 WHERE game_id = $2',
      [currentVolley, demoGameId]
    );
    
    const stocks = await pool.query('SELECT stock_id FROM stocks');
    
    for (const stock of stocks.rows) {
      // Get previous price
      const prevResult = await pool.query(`
        SELECT price FROM gamestockprices 
        WHERE game_id = $1 AND stock_id = $2 AND volley = $3
      `, [demoGameId, stock.stock_id, currentVolley - 1]);
      
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
      `, [demoGameId, stock.stock_id, currentVolley, newPrice.toFixed(2), historicalDelta.toFixed(2)]);
    }
    
    console.log(`Updated prices for volley ${currentVolley}`);
  } catch (error) {
    console.error('Error updating stock prices:', error);
  }
}

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  
  // Create demo game for price testing
  await createDemoGame();
  
  // Update prices every 2 seconds (as per proposal)
  priceUpdateInterval = setInterval(updateStockPrices, 2000);
  console.log('Demo game price update system started (every 2 seconds - 300 volleys = 10 minutes)');
});

export { app };
