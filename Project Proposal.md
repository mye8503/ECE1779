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
- PostgreSQL will serve as the relational database for user accounts, games, transactions, and leaderboards.  
- DigitalOcean Volumes will be attached to the PostgreSQL container to persist data across container restarts and redeployments.

**Planned tables:**
- `Users` – login credentials, balance, games played, etc.  
- `Games` – metadata, game state, and session tracking.  
- `Stocks` – ticker symbols, company names, and reference data.  
- `Transactions` – records of user buy/sell orders during sessions.



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
