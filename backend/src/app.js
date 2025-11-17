import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import path from "path"; // Import path module
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Define a route for the home page
app.get("/", (req, res) => {
  res.sendFile(path.join(path.dirname(new URL(import.meta.url).pathname), "../index.html"));
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export { app };
