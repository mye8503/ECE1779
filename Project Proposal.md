---
title: Project Proposal

---

# Project Proposal

## 1. Motivation

The real stock market is high-stakes and intimidating to beginners. One of the best ways to gain day-trading experience without financial risk is through simulated trading. However, existing paper trading platforms fail to capture the competitive and time-sensitive nature of real world trading. As a result, users cannot effectively practice decision making or risk management skills under realistic market pressure.

Popular simulators such as [Investopedia](https://www.investopedia.com/simulator/) and [TradingView](https://www.tradingview.com/chart/?trade-now=Paper) provide safe environments for practice but primarily target single-player, long-term investors. They lack real-time competition, urgency, and stakes, as their virtual currencies can be freely adjusted and often carry no tangible consequences or rewards. This leads to a less engaging and less educational experience for aspiring traders.

Our project addresses this gap by creating a fast-paced, multiplayer stock-trading simulation game where players compete in short, ten-minute sessions using virtual currency. By introducing accelerated market conditions, real-time price updates, and direct competition, the game recreates the urgency and excitement of day-trading, without any financial risk. Features such as leaderboards, account progression, and rewards make learning about trading interactive and motivating.

The primary target users are beginner investors and students who want to explore day-trading but lack the financial freedom to do so in real markets. Secondary users include competitive gamers who enjoy strategy-based multiplayer experiences and want to test their skills in a financially simulated environment.

---

## 2. Objective and Key Features

### Project Objective
The objective of this project is to develop a browser-based multiplayer game where users can simulate trading stocks in real time within a competitive environment. Each match lasts approximately ten minutes, pairing each user with four to five opponents. When insufficient human players are available, artificial opponents will fill the remaining slots.

During gameplay, users can buy and sell stocks from a curated list of companies. Stock prices update every two seconds, reflecting simulated or real-world market movements. At the end of the session, the player with the highest portfolio value is declared the winner. Each stock is represented by its name, ticker, and a live candlestick chart of price versus time.

Initially, stock data will be randomly generated to focus on core gameplay and synchronization mechanics. Once the MVP is stable, we will integrate historical or live stock data from APIs such as Yahoo Finance or CCXT to enhance realism. Players can join games either as guests or through registered accounts. Logged-in users will have their stats, scores, and leaderboard rankings saved persistently.

---

### Core Technical Requirements

#### Orchestration Approach
We will use Kubernetes for clustering and orchestration, enabling automatic load balancing across multiple game servers. This ensures scalability and fault tolerance as concurrent user traffic increases.

#### Backend and API Integration
- The backend will be built with Node.js, chosen over Python for its better WebSocket support and non-blocking I/O architecture.  
- The backend will be Dockerized and orchestrated with Docker Compose for multi-container development.  
- Python scripts will be used for auxiliary tasks, such as fetching external stock data via APIs.

#### Database and Persistent Storage
**PostgreSQL Database:**
PostgreSQL will serve as our relational database, storing all persistent application data including user accounts, game sessions, stock transactions, and leaderboard rankings.

**Persistent Storage with DigitalOcean Volumes:**
To ensure data survives container restarts and redeployments, we will attach a DigitalOcean Volume to the PostgreSQL container. The volume will be mounted to `/var/lib/postgresql/data`, which is PostgreSQL's default data directory. This ensures that all database tables, indexes, and transaction logs are stored on the persistent volume rather than the ephemeral container filesystem.

**Volume Configuration:**
- The volume will be provisioned with at least 10GB of storage (scalable as needed)
- It will be attached to the PostgreSQL pod/container via Kubernetes PersistentVolume (PV) and PersistentVolumeClaim (PVC) resources
- In case of pod failure or scheduled maintenance, Kubernetes will automatically remount the same volume to a new PostgreSQL instance, preserving all data

This approach guarantees that user accounts, game history, and leaderboard data remain intact across deployments, crashes, or infrastructure changes.


**Database Schema and Relationships**

Our database consists of seven core tables that manage user accounts, game sessions, stock data, and real-time transactions:

Users Table:
Stores registered player information including `user_id` (primary key), `username`, `email`, `password_hash`, account `balance`, and gameplay statistics (`games_played`, `games_won`, `total_profit`). This table tracks persistent player data across all game sessions.

Guests Table:
Manages temporary guest players with `guest_id` (primary key), `session_token` for identification, and expiration timestamps. Guest records are automatically cleaned up after expiration, allowing non-registered users to play without affecting long-term leaderboards.

Games Table:
Records each game session with `game_id` (primary key), `status` (waiting/active/completed), `current_volley` (increments every 2 seconds), `max_volleys` (default 300 for 10-minute games), timestamps, and `winner_user_id` (foreign key to Users). The `current_volley` field is critical for synchronizing real-time price updates and transaction processing.

Stocks Table:
Contains reference data for tradeable stocks including `stock_id` (primary key), `ticker` symbol, `company_name`, and `initial_price`. This table serves as a static catalog of available stocks across all games.

GameStockPrices Table:
Implements the time-series price evolution for each stock within each game. Contains `game_id` (foreign key to Games), `stock_id` (foreign key to Stocks), `volley` number, computed `price`, `historical_delta` (change from API data), and `player_impact` (calculated from volley transactions). The composite unique constraint on (game_id, stock_id, volley) ensures one price record per stock per volley. This table enables the cumulative pricing model where prices evolve based on both historical market data and player trading activity.

GameParticipants Table:
Junction table linking players to game sessions. Contains `game_id` (foreign key to Games), `user_id` (foreign key to Users), `guest_id` (foreign key to Guests), `is_ai` flag for bot players, `starting_balance`, `final_portfolio_value`, and `rank`. Check constraints ensure each participant is exactly one type (registered user, guest, or AI). This table tracks per-game performance separately from lifetime user statistics.

Transactions Table:
Records every buy/sell order with `transaction_id` (primary key), `game_id` (foreign key to Games), `participant_id` (foreign key to GameParticipants), `stock_id` (foreign key to Stocks), `volley` number, `transaction_type` (buy/sell), `quantity`, `price_per_share`, and `total_value`. Transactions are indexed by (game_id, volley) for efficient aggregation during price calculations every 2 seconds.

**Key Relationships**

- **Users → GameParticipants** (one-to-many): A registered user can participate in multiple games, with each participation tracked separately.
- **Guests → GameParticipants** (one-to-many): Similar to users, but guest records expire after game completion.
- **Games → GameParticipants** (one-to-many): Each game has 4-5 participants (mix of users, guests, and AI).
- **Games → GameStockPrices** (one-to-many): Each game maintains independent price histories for all stocks across all volleys.
- **Games → Transactions** (one-to-many): All trades within a game are linked via game_id.
- **GameParticipants → Transactions** (one-to-many): Each participant's trades are tracked through participant_id.
- **Stocks → GameStockPrices** (one-to-many): Each stock has price records across multiple games and volleys.
- **Stocks → Transactions** (one-to-many): Each transaction references which stock was traded.

**Volley-Based Price Calculation System**

This schema supports our volley-based gameplay mechanism, where a volley represents a discrete 2-second time interval during which player actions are batched and processed. The `current_volley` field in the Games table increments from 0 to 300 over the 10-minute game duration.

At each volley increment, the system: (1) aggregates all transactions from the current volley to calculate total buy/sell volumes per stock, (2) computes `player_impact = (Total_Buy_Volume - Total_Sell_Volume) × Impact_Coefficient` where the coefficient determines how strongly trading affects prices, (3) fetches the `historical_delta` from APIs to capture real market movements, (4) calculates the new price as `Price(volley N) = Price(volley N-1) + historical_delta + player_impact`, and (5) writes the result to GameStockPrices. This cumulative model ensures both real market trends and player decisions compound over time, creating realistic market momentum. By batching transactions into 2-second intervals, we reduce database operations while ensuring synchronized price updates for all players.

#### Deployment Provider
We will deploy on DigitalOcean, which we chose over Fly.io due to its fixed pricing (more predictable for a short-term course project), infrastructure transparency, and managed Kubernetes services. Additionally, DigitalOcean offers more control over configuration and resource allocation and built-in features for load balancing, auto-scaling, and automatic upgrades.  


#### Monitoring Setup
We will utilize DigitalOcean’s built-in monitoring dashboard to track CPU utilization, memory usage, disk I/O, active WebSocket connections and API call throughput. Custom alerts will notify the team when CPU usage exceeds 80% or available memory drops below a critical threshold.This ensures consistent game performance and reliability.

---

### Advanced Features

1. Real-Time Multiplayer Gameplay:  
   Implemented via WebSockets to provide instantaneous updates between players and the server. This enables live price feeds, portfolio updates, and opponent activity tracking every 2 seconds.

2. User Authentication and Authorization:  
   Implemented using secure login and token-based sessions. Users can only access and modify their own data and gameplay records. WebSockets will operate over HTTPS (WSS) for encrypted communication, and sensitive credentials will be stored in a secrets file.

3. Integration with Real Market Data:  
   Once the MVP is complete, stock data will be fetched from APIs such as [Yahoo Finance](https://ca.finance.yahoo.com) or [CCXT](https://github.com/ccxt/ccxt) to simulate realistic price movements and trading volatility.
   
   
### Fulfillment of Course Requirements

Our project satisfies all core technical requirements and exceeds the minimum advanced feature count. For core requirements, we use Docker and Docker Compose for containerized multi-container development, PostgreSQL with DigitalOcean Volumes for persistent relational data storage, Kubernetes for orchestration with service replication and load balancing, and DigitalOcean's monitoring dashboard for tracking CPU, memory, and application-specific metrics with automated alerts. For advanced features, real-time multiplayer gameplay via WebSockets fulfills the "Real-time functionality" requirement by enabling live price feeds and portfolio updates every 2 seconds. User authentication and authorization with HTTPS/WSS satisfies the "Security enhancements" requirement through token-based sessions, encrypted communication, and secrets management. Additionally, integration with Yahoo Finance or CCXT APIs meets the "Integration with external services" requirement by fetching real market data for realistic price movements. This combination ensures comprehensive coverage of both mandatory and optional project criteria.

---

### Scope and Feasibility
The scope is appropriate for a three-person team over eight weeks.  
The technologies involved (Node.js, WebSockets, PostgreSQL, and Kubernetes) are well-documented and widely supported.  
The project will follow an incremental development plan:
- Focus first on the core gameplay loop (matchmaking, transactions, leaderboard).  
- Add multiplayer real-time functionality.  
- Integrate external APIs and polish the UI in later weeks.  

By the presentation date (in approx. 4 weeks), a fully playable MVP will be completed and ready to demo. The remaining 4 weeks until the final deliverable will be spent on implementing advanced features, refining UI and gameplay, and testing.

---

## 3. Tentative Plan

### Team Roles and Responsibilities

| Member | Primary Responsibilities |
|---------|---------------------------|
| Maggie | Frontend UI/UX design and implementation. WebSocket integration for real-time updates. |
| Thomas | Backend API development and external API integration (Yahoo Finance, CCXT). |
| Peishuo | DevOps setup (Kubernetes, Docker, DigitalOcean), database design, and user authentication. |

All members will contribute equally to game logic, feature testing, and non-code deliverables, including documentation, presentation, and video demo.  

### Planned Development Timeline

| Phase | Focus |
|-------|-------|
| Week 0 (Oct 13) | Complete proposal, design backend and UI mockups. |
| Week 1 (Oct 20) | Finalize database schema and begin backend implementation. |
| Week 2 (Oct 27) | Implement game mechanics and frontend integration. |
| Week 3 (Nov 3) | Finish core gameplay and UI synchronization. |
| Week 4 (Nov 10) | Add real-time WebSocket feature and prepare presentation. |
| Week 5 (Nov 17) | Implement security features and API integration. |
| Week 6 (Nov 24) | Refine gameplay, fix bugs, enhance UI. |
| Week 7 (Dec 1) | Write final report, record demo video. |
| Week 8 (Dec 8) | Submit final deliverables. |

---

### Feasibility and Confidence
The project is realistic, well-scoped, and technically grounded. The chosen technologies (Node.js, PostgreSQL, Kubernetes, Docker, and DigitalOcean) align directly with course objectives, ensuring both educational value and technical depth. With a clear division of labor and achievable milestones, we are confident the project will be completed on time and to a high standard.
