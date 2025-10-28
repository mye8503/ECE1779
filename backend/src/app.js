const express = require("express");
const { Pool } = require("pg");
const app = express();
const port = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

export {app};

