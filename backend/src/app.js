import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import path from "path"; // Import path module
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend API is running", timestamp: new Date().toISOString() });
});

// Serve static files (if needed)
app.get("/", (req, res) => {
  res.json({ message: "Stock Game Backend API", frontend: "http://localhost:5173" });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export { app };
