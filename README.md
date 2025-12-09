# Final Report

## 0. Team Information
Peishuo Cai 1006865634 peishuo.cai@mail.utoronto.ca
Tom Nguyen 1006707761 tomasdfgh.nguyen@mail.utoronto.ca
Maggie Ye 1006830351 maggie.ye@mail.utoronto.ca


## 1. Motivation

The real stock market is high-stakes and intimidating to beginners. One of the best ways to gain day-trading experience without financial risk is through simulated trading. However, existing paper trading platforms fail to capture the competitive and time-sensitive nature of real world trading. As a result, users cannot effectively practice decision making or risk management skills under realistic market pressure.

Popular simulators such as [Investopedia](https://www.investopedia.com/simulator/) and [TradingView](https://www.tradingview.com/chart/?trade-now=Paper) provide safe environments for practice but primarily target single-player, long-term investors. They lack real-time competition, urgency, and stakes, as their virtual currencies can be freely adjusted and often carry no tangible consequences or rewards. This leads to a less engaging and less educational experience for aspiring traders.

Our project addresses this gap by creating a fast-paced, multiplayer stock-trading simulation game where players compete in short, ten-minute sessions using virtual currency. By introducing accelerated market conditions, real-time price updates, and direct competition, the game recreates the urgency and excitement of day-trading, without any financial risk. Features such as leaderboards, account progression, and rewards make learning about trading interactive and motivating.

The primary target users are beginner investors and students who want to explore day-trading but lack the financial freedom to do so in real markets. Secondary users include competitive gamers who enjoy strategy-based multiplayer experiences and want to test their skills in a financially simulated environment.

---

## 2. Objectives

The objective of this project is to develop a browser-based multiplayer game where users can simulate trading stocks in real time within a competitive environment. Each match lasts approximately ten minutes, pairing each user with four to five opponents. When insufficient human players are available, artificial opponents will fill the remaining slots.

During gameplay, users can buy and sell stocks from a curated list of companies. Stock prices update every two seconds, reflecting simulated or real-world market movements. At the end of the session, the player with the highest portfolio value is declared the winner. Each stock is represented by its name, ticker, and a live candlestick chart of price versus time.

Initially, stock data was randomly generated to focus on core gameplay and synchronization mechanics. Once the MVP was stable, we  integrated live stock data from the Alpha Vantage API to enhance realism. Players can join games either as guests or through registered accounts. Logged-in users will have their stats, scores, and leaderboard rankings saved persistently.

---

## 3 Technical Stack

### Backend

- Node.js (Express) — Core API responsible for all game logic, session management, and communication between services.
- WebSockets (ws) — Provides live 2s interval updates for stock price movements, and handles concurrent user interactions.
- PostgreSQL — Primary relational database storing persistent game state: users, sessions, trades, and historical prices.

### Frontend
- React + TypeScript — Single-page user interface for joining games, making trades, and viewing live charts.
- Charting library (Chart.js / Recharts) — Renders real-time candlestick charts synced via WebSockets.
- Client WebSocket Integration — Enables instant updates to UI without page refresh.

### Containerization & Local Development
- Docker — All services (frontend, backend, PostgreSQL, Redis) containerized for reproducibility.
- Docker Compose — Local multi-service development environment with isolated networking and volume mounting.
- Services include:
    - frontend
    - backend
    - postgres with persistent volume

### Orchestration — Kubernetes

We implemented Kubernetes for orchestration, using both local Minikube and a DigitalOcean-managed Kubernetes cluster.
####    Kubernetes Resources Used

| Resource Type | Name(s) | Purpose |
|---------------|---------|---------|
| **Deployments** | `backend-deployment` (replicated) | Runs the backend API with multiple replicas for load balancing and high availability |
|               | `frontend-deployment` | Serves the React frontend application |
|               | `redis-deployment` | Runs Redis caching service for fast in-memory operations |
| **StatefulSet** | `postgres-statefulset` | Provides stable network identity and persistent storage for PostgreSQL |
| **Services** | ClusterIP services (backend ↔ Redis ↔ PostgreSQL) | Enables internal communication between pods within the cluster |
|               | LoadBalancer / Ingress | Exposes the application publicly for external access |
| **Storage** | PersistentVolumeClaim (backed by DO Block Volume) | Ensures durable PostgreSQL storage across pod restarts, rescheduling, and cluster changes |


### Cloud Deployment

- DigitalOcean Kubernetes (DOKS) — Production-grade managed cluster.
- DigitalOcean Volumes — Persistent block storage for PostgreSQL.
- DigitalOcean Logs + Metrics — CPU, memory, and disk monitoring for pods.

### Monitoring & Observability

- kubectl logs / describe / events for debugging backend loops and WebSocket failures.
- DigitalOcean Monitoring Dashboard for pod-level resource metrics.
- DigitalOcean email alert for resource usage throttling 


## 4 Features

#### Orchestration Approach
Our project uses Kubernetes for clustering and orchestration, enabling automatic load balancing across multiple game servers. This ensures scalability and fault tolerance as concurrent user traffic increases.

#### Backend and API Integration
The backend is built with Node.js, chosen over Python for its better WebSocket support and non-blocking I/O architecture. It is fully Dockerized and orchestrated with Docker Compose for multi-container development. 

#### Database and Persistent Storage
**PostgreSQL Database:**
PostgreSQL is used for our relational database, storing all persistent application data including user accounts, game sessions, stock transactions, and leaderboard rankings.

**Persistent Storage with DigitalOcean Volumes:**
To ensure data survives container restarts and redeployments, we have attached a DigitalOcean Volume to the PostgreSQL container. The volume is mounted to `/var/lib/postgresql/data`, which is PostgreSQL's default data directory. This ensures that all database tables, indexes, and transaction logs are stored on the persistent volume rather than the ephemeral container filesystem.

The volume is provisioned with at least 10GB of storage (scalable as needed). It is attached to the PostgreSQL pod/container via Kubernetes PersistentVolume (PV) and PersistentVolumeClaim (PVC) resources. In case of pod failure or scheduled maintenance, Kubernetes will automatically remount the same volume to a new PostgreSQL instance, preserving all data. This approach guarantees that user accounts, game history, and leaderboard data remain intact across deployments, crashes, or infrastructure changes.


**Database Schema and Relationships**
Our database consists of seven core tables that manage user accounts, game sessions, stock data, and real-time transactions:

##### Users Table:
Stores registered player information including `user_id` (primary key), `username`, `email`, `password_hash`, account `balance`, and gameplay statistics (`games_played`, `games_won`, `total_profit`). This table tracks persistent player data across all game sessions.

##### Guests Table:
Manages temporary guest players with `guest_id` (primary key), `session_token` for identification, and expiration timestamps. Guest records are automatically cleaned up after expiration, allowing non-registered users to play without affecting long-term leaderboards.

##### Games Table:
Records each game session with `game_id` (primary key), `status` (waiting/active/completed), `current_volley` (increments every 2 seconds), `max_volleys` (default 300 for 10-minute games), start and end timestamps, and `winner_user_id` (foreign key to Users). The `current_volley` field is critical for synchronizing real-time price updates and transaction processing.

##### Stocks Table:
Contains reference data for tradeable stocks including `stock_id` (primary key), `ticker` symbol, `company_name`, and `initial_price`. This table serves as a static catalog of available stocks across all games. This table is also populated with the last 90 day's real market data for each ticker in the field `historical_prices`, as an array of *JSONB* objects.

##### GameStockPrices Table:
Implements the time-series price evolution for each stock within each game. Contains `id` (primary key), `game_id` (foreign key to Games), `stock_id` (foreign key to Stocks), `volley` number, computed `price`, `historical_delta` (change from API data), and `player_impact` (calculated from volley transactions). The composite unique constraint on (game_id, stock_id, volley) ensures one price record per stock per volley. This table enables the cumulative pricing model where prices evolve based on both historical market data and player trading activity.

##### GameParticipants Table:
Junction table linking players to game sessions. Contains `participant_id` (primary key), `game_id` (foreign key to Games), `user_id` (foreign key to Users), `guest_id` (foreign key to Guests), `is_ai` flag for bot players, `starting_balance`, `final_portfolio_value`, and `rank`. Check constraints ensure each participant is exactly one type (registered user, guest, or AI). This table tracks per-game performance separately from lifetime user statistics.

##### Transactions Table:
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
We deployed on DigitalOcean, which we chose over Fly.io due to its fixed pricing (more predictable for a short-term course project), infrastructure transparency, and managed Kubernetes services. Additionally, DigitalOcean offers more control over configuration and resource allocation and built-in features for load balancing, auto-scaling, and automatic upgrades.  


#### Monitoring Setup
We utilize DigitalOcean’s built-in monitoring dashboard to track CPU utilization, memory usage, disk I/O, active WebSocket connections and API call throughput. Custom alerts will notify the team when CPU usage exceeds 70% or available memory drops below a critical threshold for 5 minutes.This ensures consistent game performance and reliability.

---

### Advanced Features

1. Real-Time Multiplayer Gameplay:  
   Implemented via WebSockets to provide instantaneous updates between players and the server. This enables live price feeds, portfolio updates, and opponent activity tracking every 2 seconds.
2. User Authentication and Authorization:  
   Implemented using secure login and token-based sessions. Users can only access and modify their own data and gameplay records. WebSockets will operate over HTTPS (WSS) for encrypted communication, and sensitive credentials will be stored in a secrets file.
3. Integration with Real Market Data:  
   At initialization, recent 90-day historical stock data is fetched live from the https://www.alphavantage.co/ stock market data API to simulate realistic price movements and trading volatility, and used as a baseline for price calculation.


## 5 User Guide
How does a user interact with your application? Provide clear instructions for using each main feature, supported with screenshots where appropriate.

1. At the deployment link (http://209.38.10.60/), you will first see our home page. You can either Register a new account with a username and password, Login with an existing account, or play as a Guest. After registering an account, you will need to then login.
2. Selecting any of these options will take you to the games menu, where you can either logout (takes you back to the home page) or browse games.
3. Selecting browse games takes you to the game lobby. Here you can create a new game or join an existing one. In the waiting room for a game, you can start it at any time by clicking Start Game.
4. At this point, you should be able to Buy and Sell stocks depending on your portfolio allocation. Games are set to be 3 minutes long for the sake of testing.
5. When the game is finished, you can view your score vs the other players, and have the option to play again.
6. You can view the status of backend API calls as well as WebSocket updates in the console.

## 6 Development Guide
What are the steps to set up the development environment? Include detailed instructions for environment, database, storage, and local testing.

### Local Testing
1. To run on Kubernetes locally, make sure minikube is running and then run the shell script ```minikube_setup.sh```.
2. When the script completes, you can access the backend at `localhost:3000`. Some example requests:
`curl localhost:3000/api/health` to check the status of the backend
`curl localhost:3000/api/users` to see registered user accounts
`curl localhost:3000/api/stocks` to see what stocks are being used in the game
3. Access the frontend at `localhost:5180` and follow the user guide to interact with the application.
4. To track the state of the Kubernetes resources, run `minikube dashboard` in terminal and the corresponding site should open.


## 7 Deployment Information

Our application can be accessed online at http://209.38.10.60/. The code run to deploy to DigitalOcean can be found on the digital_ocean branch (see KUBERNETES_DEPLOYMENT.md).

## 8 Individual Contributions

### Team Roles and Responsibilities

| Member | Primary Responsibilities |
|---------|---------------------------|
| Maggie | Frontend UI/UX design. Backend API development. DevOps setup (Kubernetes, Docker, DigitalOcean).|  
| Thomas | Frontend UI/UX design and implementation. Backend API development. DevOps setup (Kubernetes, Docker, DigitalOcean). Database design. User authentication. |
| Peishuo | DevOps setup (Kubernetes, Docker, DigitalOcean). Database design. User authentication. WebSocket integration for real-time updates. External API integration (Alpha Vantage).|

All members contributed equally to game logic, feature testing, and non-code deliverables, including documentation, presentation, and video demo.  

---

## 9 Lessons Learned and Concluding Remarks

#### Websocket
This project was a great learning experience for understanding how WebSocket works and how it is integrated into the frontend. By going through examples on GitHub and referencing documentation, we were able to build up each component to work well with the typical endpoint-based backend logic. From the upgrade requests, authentication, to sending and listening to updates, the trial and error methods we took to build this application really helped to construct a working understanding about the technology. We also realized that our application was compact enough that it would function with normal HTTP requests to provide live stock updates, but if we were to decrease the time between each volley, or to increase the amount of players in a game, then the advantages of WebSockets will be better demonstrated.

#### Frontend Development
Although not the focus of this project, designing frontend elements and watching the complex backend logic being efficiently presented on a graphical interface is a very rewarding experience. We experimented with different packages for graphing the stock movements, and settled on a simple candlestick graph in the end. Working on the frontend felt like a productive break from the project.

#### Planning and Project organization
We greatly appreciated the efforts taken to describe the api calls and database schemas in detail before starting to code. It made the project experience very streamlined and allowed us to focus on brainstorming for new features such as WebSockets and the frontend design. We also noted the importance to maintain a good structure for our code base, as it was tedious to debug errors in a long file as opposed to going through a clearly designed architecture. The WebSocket logic in particular was easy to debug as each component was handled by a separate file, effectively isolating dependencies on local and global variables. Having proper branching in GitHub and clear commit messages also helped up stay on top of the order of the project and allowed for effective concurrent work.

Overall, this project was a great learning experience for the entire team. We were able to learn through planning and experimentation. Some parts felt harder to implement than others. The WebSocket logic felt much harder to implement as opposed to the api data calls to extract historical stock data, albeit both are considered **advanced features**. This is a well-designed course project that ties closely with modern technologies used in industries.


## 10 Video Demo (please click on the gif to watch the demo)

[![DEMO GIF](./readme_resources/stonks-up-stongs.gif)](https://www.youtube.com/watch?v=s6Vg-YWhgng)
   
  



