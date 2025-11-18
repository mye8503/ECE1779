import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import path from "path"; // Import path module
const app = express();
// import '../test.css';

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static frontend build assets
app.use(express.static(path.join(path.dirname(new URL(import.meta.url).pathname), "../../frontend/dist")));

// GET /stats: Retrieve cached task count
app.get("/stats", async (req, res) => {
  try {
    console.log("Received request for /stats");
    res.status(200).json({ taskCount: 3 });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Serve the built index.html for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(path.dirname(new URL(import.meta.url).pathname), "../index.html"));
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export { app };
