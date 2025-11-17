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

// Get current stock prices (for now, just return initial prices)
app.get("/api/stocks/prices", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        stock_id,
        ticker,
        company_name,
        initial_price as current_price
      FROM stocks 
      ORDER BY ticker
    `);
    res.json({
      success: true,
      prices: result.rows,
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

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export { app };
