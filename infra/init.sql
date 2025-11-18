-- Stock Trading Game Database Schema

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    -- email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    balance DECIMAL(10,2) DEFAULT 1000.00,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    total_profit DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS guests (
    guest_id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);


CREATE TYPE game_status AS ENUM ('waiting', 'active', 'completed');
CREATE TABLE IF NOT EXISTS games (
    game_id SERIAL PRIMARY KEY,
    status game_status NOT NULL DEFAULT 'waiting',
    current_volley INTEGER DEFAULT 0,
    max_volleys INTEGER DEFAULT 300,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    winner_user_id INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS stocks (
    stock_id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    initial_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS gamestockprices (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    stock_id INTEGER NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    volley INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    historical_delta DECIMAL(10,2) DEFAULT 0.00,
    player_impact DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, stock_id, volley) -- Ensures one price record per stock per volley
);

CREATE TABLE IF NOT EXISTS gameparticipants (
    participant_id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    guest_id INTEGER REFERENCES guests(guest_id) ON DELETE SET NULL,
    is_ai BOOLEAN DEFAULT FALSE,
    starting_balance DECIMAL(10,2) DEFAULT 1000.00,
    final_portfolio_value DECIMAL(10,2),
    rank INTEGER,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Check constraint: exactly one of user_id, guest_id, or is_ai must be true
    CHECK (
        (user_id IS NOT NULL AND guest_id IS NULL AND is_ai = FALSE) OR
        (user_id IS NULL AND guest_id IS NOT NULL AND is_ai = FALSE) OR
        (user_id IS NULL AND guest_id IS NULL AND is_ai = TRUE)
    )
);

CREATE TYPE transaction_type AS ENUM ('buy', 'sell');
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES gameparticipants(participant_id) ON DELETE CASCADE,
    stock_id INTEGER NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    volley INTEGER NOT NULL,
    transaction_type transaction_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_share DECIMAL(10,2) NOT NULL CHECK (price_per_share > 0),
    total_value DECIMAL(10,2) NOT NULL CHECK (total_value > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_gamestockprices_game_volley ON gamestockprices(game_id, volley);
CREATE INDEX IF NOT EXISTS idx_transactions_game_volley ON transactions(game_id, volley);
CREATE INDEX IF NOT EXISTS idx_gameparticipants_game ON gameparticipants(game_id);

INSERT INTO stocks (ticker, company_name, initial_price) VALUES
('AAPL', 'Apple Inc.', 175.00),
('GOOGL', 'Alphabet Inc.', 140.00),
('MSFT', 'Microsoft Corporation', 380.00),
('TSLA', 'Tesla, Inc.', 250.00),
('AMZN', 'Amazon.com, Inc.', 145.00),
('NVDA', 'NVIDIA Corporation', 480.00),
('META', 'Meta Platforms, Inc.', 350.00),
('NFLX', 'Netflix, Inc.', 450.00)
ON CONFLICT (ticker) DO NOTHING;