-- creating stocks table
CREATE TABLE IF NOT EXISTS stocks (
    stock_id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    stock_timestamp TIME NOT NULL,
    stock_value REAL NOT NULL
);

-- creating games table
CREATE TYPE game_status AS ENUM ('waiting', 'active', 'completed');
CREATE TABLE IF NOT EXISTS games (
    game_id SERIAL PRIMARY KEY,
    status game_status NOT NULL,
    current_volley REAL NOT NULL,
    max_volleys REAL,
    start_time TIMESTAMP NOT NULL,
    cur_time TIMESTAMP NOT NULL,
    players_data JSONB NOT NULL,
    winner INTEGER
);

-- creating gamestockprices table
CREATE TABLE IF NOT EXISTS gamestockprices (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    cur_price REAL NOT NULL,
    cur_volley REAL NOT NULL,
    hist_price REAL NOT NULL
);

-- creating transactions table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    action JSONB NOT NULL
);

-- create users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(255),
    balance REAL,
    game_stats JSONB,
    password_hash TEXT NOT NULL
);