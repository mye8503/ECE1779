const express = require("express");
const { Pool } = require("pg");
const path = require("path"); // Import path module
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Define a route for the home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html")); // Serve the HTML file
});

export { app };
