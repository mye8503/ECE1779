-- creating stocks table
CREATE TABLE IF NOT EXISTS stocks (
    stock_id SERIAL PRIMARY KEY,
    ticker TEXT NOT NULL,
    company_name TEXT NOT NULL,
    stock_volley INTEGER NOT NULL,
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
    winner TEXT[]
);

-- creating gamestockprices table
CREATE TABLE IF NOT EXISTS gamestockprices (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL
    stock_id INTEGER NOT NULL,
    cur_price REAL NOT NULL,
    cur_volley REAL NOT NULL,
    hist_price REAL NOT NULL,
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
    username TEXT,
    email TEXT,
    balance REAL,
    game_stats JSONB
);