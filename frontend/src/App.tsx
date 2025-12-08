import React, { Component } from 'react';
import './App.css';
import MainMenu from './MainMenu';
import Lobby from './Lobby';
import GameScreen from './GameScreen';
import ResultsScreen from './ResultsScreen';

// API configuration - use environment variable in production, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000/api`;
const WS_BASE_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3000`;

// Type definitions
interface Stock {
  stock_id: number;
  ticker: string;
  company_name: string;
  initial_price: string;
  current_price?: string;
}

interface Portfolio {
  [ticker: string]: number; // ticker -> quantity
}

interface Notification {
  id: number;
  ticker: string;
  impact: number;
  transactionType: 'buy' | 'sell';
}

interface GameResult {
  participant_id: number;
  guest_id: number;
  user_id: number | null;
  player_name: string;
  starting_balance: number;
  cash_remaining: number;
  portfolio_value: number;
  total_value: number;
  rank: number;
}

interface AvailableGame {
  game_id: number;
  status: string;
  created_at: string;
  player_count: number;
  max_players: number;
}

interface Player {
  participant_id: number;
  player_name: string;
  starting_balance: number;
  current_balance: number;
  portfolio_value: number;
  total_value: number;
}

interface AppState {
  stocks: Stock[];
  portfolio: Portfolio;
  balance: number;
  loading: boolean;
  error: string | null;
  lastUpdate: string;
  currentVolley: number;
  gameStatus: string;
  gameId: number | null;
  participantId: number | null;
  inGame: boolean;
  inLobby: boolean;
  notifications: Notification[];
  previousPlayerImpacts: { [ticker: string]: number };
  playerTransactions: { [key: string]: 'buy' | 'sell' }; // key: "ticker_volley"
  gameResults: GameResult[] | null;
  availableGames: AvailableGame[];
  inLogin: boolean;
  playerId: number | null;
  playerName: string;
  isGuest: boolean;
  token: string | null;
  gameParticipants: Player[];
  showPlayersModal: boolean;
  wsConnected: boolean;
}

class App extends Component<{}, AppState> {
  private intervalId?: NodeJS.Timeout;
  private ws?: WebSocket;
  private wsReconnectTimeout?: NodeJS.Timeout;
  private guestRegistrationInProgress = false;

  constructor(props: any) {
    super(props);
    this.state = {
      stocks: [],
      portfolio: {},
      balance: 1000.00,
      loading: true,
      error: null,
      lastUpdate: '',
      currentVolley: 0,
      gameStatus: '',
      gameId: null,
      participantId: null,
      inGame: false,
      inLobby: false,
      notifications: [],
      previousPlayerImpacts: {},
      playerTransactions: {},
      gameResults: null,
      availableGames: [],
      inLogin: true,
      playerId: null,
      playerName: '',
      isGuest: true,
      token: null,
      gameParticipants: [],
      showPlayersModal: false,
      wsConnected: false
    };
  }

  async componentDidMount() {
    // Try to load token from localStorage
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      this.setState({ token: savedToken, inLogin: false });
    }
    await this.fetchStocks();
    // Don't start price updates until in a game
  }

  // Helper method to get auth headers
  getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.state.token) {
      headers['Authorization'] = `Bearer ${this.state.token}`;
    }
    return headers;
  }

  async login() {
    const user = (document.querySelector('.login-input') as HTMLInputElement)?.value;
    const pass = (document.querySelectorAll('.login-input')[1] as HTMLInputElement)?.value;

    if (!user || !pass) {
      alert('Please enter your username and password');
      return;
    }

    console.log("Logging in with", user, pass);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await response.json();
      if (data.success) {
        console.log("Login successful:", data);
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        this.setState({
          inLogin: false,
          isGuest: false,
          playerId: data.user_id,
          playerName: data.username,
          token: data.token
        });
      } else {
        alert(data.error || 'Login failed');
      }
    }
    catch (error) {
      console.error('Error during login:', error);
      alert('Network error: Unable to login');
    }
  }

  async register() {
    const user = (document.querySelector('.login-input') as HTMLInputElement)?.value;
    const pass = (document.querySelectorAll('.login-input')[1] as HTMLInputElement)?.value;

    if (!user || !pass) {
      alert('Please enter your username and password');
      return;
    }

    console.log("Registering account with", user, pass);
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await response.json();
      if (data.success) {
        alert('Registration successful! You can now log in.');
      } else {
        alert(data.error || 'Registration failed');
      }
    }
    catch (error) {
      console.error('Error during registration:', error);
      alert('Network error: Unable to register');
    }
  }

  async playGuest() {
    try {
      // Prevent duplicate guest registration calls
      if (this.guestRegistrationInProgress) {
        console.log('[GUEST] Guest registration already in progress, skipping duplicate call');
        return;
      }

      this.guestRegistrationInProgress = true;

      // Always create a fresh guest session (guests are temporary/anonymous)
      const response = await fetch(`${API_BASE_URL}/guests/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        this.setState({
          inLogin: false,
          isGuest: true,
          playerId: data.guest_id,
          playerName: 'Guest Player',
          token: data.token
        });
      }
    }
    catch (error) {
      console.error('Error during guest registration:', error);
      alert('Network error: Unable to register guest');
    }
    finally {
      this.guestRegistrationInProgress = false;
    }
  }

  async goToLobby() {
    this.setState({ inLobby: true });
    await this.fetchAvailableGames();
  }

  logout() {
    // Clear tokens from localStorage
    localStorage.removeItem('token');
    // Reset to login screen
    this.setState({
      inLogin: true,
      playerId: null,
      playerName: '',
      isGuest: true,
      token: null,
      inGame: false,
      inLobby: false,
      gameId: null,
      participantId: null
    });
    console.log('[LOGOUT] User logged out');
  }

  async fetchAvailableGames() {
    try {
      const response = await fetch(`${API_BASE_URL}/games/available`);
      const data = await response.json();

      if (data.success) {
        this.setState({ availableGames: data.games });
      }
    } catch (error) {
      console.error('Error fetching available games:', error);
    }
  }

  componentWillUnmount() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.wsReconnectTimeout) {
      clearTimeout(this.wsReconnectTimeout);
    }
    this.disconnectWebSocket();
  }

  // Fetch all available stocks from backend
  async fetchStocks() {
    try {
      this.setState({ loading: true, error: null });
      const response = await fetch(`${API_BASE_URL}/stocks`);
      const data = await response.json();
      
      if (data.success) {
        this.setState({ 
          stocks: data.stocks,
          loading: false 
        });
      } else {
        this.setState({ 
          error: data.error || 'Failed to fetch stocks',
          loading: false 
        });
      }
    } catch (error) {
      this.setState({ 
        error: 'Network error: Unable to connect to backend',
        loading: false 
      });
      console.error('Error fetching stocks:', error);
    }
  }

  // Create a new game from lobby
  async createGame() {
    try {
      this.setState({ loading: true, error: null });
      const response = await fetch(`${API_BASE_URL}/games/create`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ playerName: this.state.playerName })
      });

      const data = await response.json();

      if (data.success) {
        this.setState({
          gameId: data.game_id,
          participantId: data.participant_id,
          balance: data.starting_balance,
          inGame: true,
          inLobby: false,
          loading: false
        }, () => {
          // Connect WebSocket after game state is set
          this.connectWebSocket();
        });

        // Start updating game state
        this.intervalId = setInterval(() => {
          this.fetchGameState();
          this.fetchParticipants();
        }, 2000);

        await this.fetchGameState();
        await this.fetchParticipants();
      } else {
        this.setState({
          error: data.error || 'Failed to create game',
          loading: false
        });
      }
    } catch (error) {
      this.setState({
        error: 'Network error: Unable to create game',
        loading: false
      });
      console.error('Error creating game:', error);
    }
  }

  // Join an existing game from lobby
  async joinExistingGame(gameId: number) {
    try {
      this.setState({ loading: true, error: null });
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/join`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ playerName: this.state.playerName })
      });

      const data = await response.json();

      if (data.success) {
        this.setState({
          gameId: data.game_id,
          participantId: data.participant_id,
          balance: data.starting_balance,
          inGame: true,
          inLobby: false,
          loading: false
        }, () => {
          // Connect WebSocket after game state is set
          this.connectWebSocket();
        });

        // Start updating game state
        this.intervalId = setInterval(() => {
          this.fetchGameState();
          this.fetchParticipants();
        }, 2000);

        await this.fetchGameState();
        await this.fetchParticipants();
      } else {
        this.setState({
          error: data.error || 'Failed to join game',
          loading: false
        });
      }
    } catch (error) {
      this.setState({
        error: 'Network error: Unable to join game',
        loading: false
      });
      console.error('Error joining game:', error);
    }
  }

  // Start a game (transition from waiting to active)
  async startGame() {
    if (!this.state.gameId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/games/${this.state.gameId}/start`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (data.success) {
        // Game started, price updates will begin
        console.log('Game started!');
      } else {
        this.setState({
          error: data.error || 'Failed to start game'
        });
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  }

  // Join a new game (legacy - creates a new game)
  async joinGame() {
    try {
      this.setState({ loading: true, error: null });
      const response = await fetch(`${API_BASE_URL}/games/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: 'Player' })
      });

      const data = await response.json();

      if (data.success) {
        this.setState({
          gameId: data.game_id,
          participantId: data.participant_id,
          balance: data.starting_balance,
          inGame: true,
          loading: false
        });
        
        // Start updating game state every 2 seconds
        this.intervalId = setInterval(() => {
          this.fetchGameState();
        }, 2000);
        
        // Initial fetch
        await this.fetchGameState();
      } else {
        this.setState({ 
          error: data.error || 'Failed to join game',
          loading: false 
        });
      }
    } catch (error) {
      this.setState({ 
        error: 'Network error: Unable to join game',
        loading: false 
      });
      console.error('Error joining game:', error);
    }
  }

  // Fetch current game state and portfolio
  async fetchGameState() {
    if (!this.state.gameId || !this.state.participantId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/games/${this.state.gameId}/state/${this.state.participantId}`);
      const data = await response.json();

      if (data.success) {
        // During active gameplay, stock prices come from WebSocket ticks, not REST API
        // Only fetch prices for completed games or when not actively trading
        let updatedStocks = this.state.stocks;

        if (this.state.gameStatus !== 'active') {
          // For non-active games, fetch current prices from the API
          const pricesResponse = await fetch(`${API_BASE_URL}/stocks/prices?gameId=${this.state.gameId}`);
          const pricesData = await pricesResponse.json();

          if (pricesData.success) {
            updatedStocks = this.state.stocks.map(stock => {
              const priceData = pricesData.prices.find((p: any) => p.ticker === stock.ticker);
              return {
                ...stock,
                current_price: priceData ? parseFloat(priceData.current_price) : stock.initial_price
              };
            });
          }
        } else {
          // During active game, keep the stocks as-is (WebSocket will update them via handlePriceUpdate)
          updatedStocks = this.state.stocks;
        }

        // Detect player impact changes and create notifications
        const newNotifications: Notification[] = [];
        const newPreviousImpacts = { ...this.state.previousPlayerImpacts };

        // During active games, prices array is empty, so no impact notifications
        const pricesArray = this.state.gameStatus === 'active' ? [] : [];
        pricesArray.forEach((priceData: any) => {
            const currentImpact = parseFloat(priceData.player_impact) || 0;
            const previousImpact = this.state.previousPlayerImpacts[priceData.ticker] || 0;

            // If impact changed, create a notification
            if (currentImpact !== previousImpact && currentImpact !== 0) {
              // Check if we recorded this transaction
              const transactionKey = `${priceData.ticker}_${pricesData.current_volley}`;
              const recordedType = this.state.playerTransactions[transactionKey];

              // Use recorded type if available, otherwise use API type, fallback to inferring
              const transactionType = recordedType || priceData.last_transaction_type || (currentImpact > 0 ? 'buy' : 'sell');

              newNotifications.push({
                id: Date.now() + Math.random(),
                ticker: priceData.ticker,
                impact: currentImpact,
                transactionType: transactionType as 'buy' | 'sell'
              });

              // Auto-remove notification after 1 second
              setTimeout(() => {
                this.setState(prevState => ({
                  notifications: prevState.notifications.filter(n => n.id !== newNotifications[newNotifications.length - 1].id)
                }));
              }, 1000);
            }

            newPreviousImpacts[priceData.ticker] = currentImpact;
        });

        const newGameStatus = data.game.status || '';

        // If game is completed, fetch results
        if (newGameStatus === 'completed' && !this.state.gameResults) {
          try {
            const resultsResponse = await fetch(`${API_BASE_URL}/games/${this.state.gameId}/results`);
            const resultsData = await resultsResponse.json();

            if (resultsData.success) {
              this.setState({
                stocks: updatedStocks,
                // During game, portfolio/balance come from WebSocket, not REST API
                lastUpdate: new Date().toLocaleTimeString(),
                currentVolley: data.game.current_volley || 0,
                gameStatus: newGameStatus,
                notifications: [...this.state.notifications, ...newNotifications],
                previousPlayerImpacts: newPreviousImpacts,
                gameResults: resultsData.participants
              });
            }
          } catch (error) {
            console.error('Error fetching game results:', error);
            this.setState({
              stocks: updatedStocks,
              // During game, portfolio/balance come from WebSocket, not REST API
              lastUpdate: new Date().toLocaleTimeString(),
              currentVolley: data.game.current_volley || 0,
              gameStatus: newGameStatus,
              notifications: [...this.state.notifications, ...newNotifications],
              previousPlayerImpacts: newPreviousImpacts
            });
          }
        } else {
          this.setState({
            stocks: updatedStocks,
            // During game, portfolio/balance come from WebSocket, not REST API
            lastUpdate: new Date().toLocaleTimeString(),
            currentVolley: data.game.current_volley || 0,
            gameStatus: newGameStatus,
            notifications: [...this.state.notifications, ...newNotifications],
            previousPlayerImpacts: newPreviousImpacts
          });
        }
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    }
  }

  // Fetch all participants in the current game
  async fetchParticipants() {
    if (!this.state.gameId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/games/${this.state.gameId}/participants`);
      const data = await response.json();

      if (data.success) {
        this.setState({ gameParticipants: data.participants });
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }

  // WebSocket connection methods
  connectWebSocket() {
    if (!this.state.gameId || !this.state.token) {
      console.log('Cannot connect WebSocket: missing gameId or token');
      return;
    }

    // Check if WebSocket exists and is in a valid state (OPEN or CONNECTING)
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting, skipping duplicate connection');
      return;
    }

    // Close any stale connections before opening a new one
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED && this.ws.readyState !== WebSocket.CLOSING) {
      console.log('Closing stale WebSocket connection');
      this.ws.close();
    }

    try {
      const wsUrl = `${WS_BASE_URL}/ws?gameId=${this.state.gameId}&token=${this.state.token}`;

      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        this.setState({ wsConnected: true });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);

          switch (data.type) {
            case 'tick':
              // Price update broadcast
              this.handlePriceUpdate(data);
              break;
            case 'game_start':
              this.handleGameStart();
              break;
            case 'game_end':
              this.handleGameEnd();
              break;
            case 'transaction':
              // Transaction confirmation - update player balance and portfolio
              console.log('Transaction confirmed:', data);
              if (data.newBalance !== undefined && data.newHoldings !== undefined) {
                const updatedPortfolio = { ...this.state.portfolio };
                updatedPortfolio[data.ticker] = data.newHoldings;

                this.setState({
                  balance: data.newBalance,
                  portfolio: updatedPortfolio
                });

                console.log(`✓ Balance updated: $${data.newBalance.toFixed(2)}, Holdings: ${data.ticker}=${data.newHoldings}`);
              }
              break;
            case 'player_transaction':
              // Broadcast of other players' transactions
              console.log(`Player transaction: ${data.player} ${data.action}ed ${data.volume} shares of ${data.ticker}`);
              break;
            case 'error':
              this.setState({ error: data.message || 'Server error' });
              break;
            default:
              console.warn('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.setState({ wsConnected: false });
        this.setState({ error: 'WebSocket connection error' });
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.setState({ wsConnected: false });

        // Attempt to reconnect after 3 seconds
        if (this.state.inGame) {
          this.wsReconnectTimeout = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            this.connectWebSocket();
          }, 3000);
        }
      };

      this.ws = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.setState({ wsConnected: false });
      this.setState({ error: 'Failed to create WebSocket connection' });
    }
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.setState({ wsConnected: false });
  }

  sendWebSocketMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
      this.setState({ error: 'WebSocket not connected' });
    }
  }

  handlePriceUpdate(data: any) {
    if (!data.stock_updates || !Array.isArray(data.stock_updates)) {
      console.warn('Invalid price update data');
      return;
    }

    // Update stock prices from the broadcast
    const updatedStocks = this.state.stocks.map(stock => {
      const update = data.stock_updates.find((u: any) => u.ticker === stock.ticker);
      if (update) {
        return {
          ...stock,
          current_price: update.cur_price.toString()
        };
      }
      return stock;
    });

    // Update current volley
    this.setState({
      stocks: updatedStocks,
      currentVolley: data.tick || this.state.currentVolley,
      lastUpdate: new Date().toLocaleTimeString()
    });
  }

  handleGameStart() {
    console.log('Game started via WebSocket');
    this.setState({ gameStatus: 'active' });
  }

  async handleGameEnd() {
    console.log('Game ended via WebSocket');
    this.setState({ gameStatus: 'completed' });

    // Fetch game results
    if (this.state.gameId) {
      try {
        const resultsResponse = await fetch(`${API_BASE_URL}/games/${this.state.gameId}/results`);
        const resultsData = await resultsResponse.json();

        if (resultsData.success) {
          console.log('Game results fetched:', resultsData.participants);
          this.setState({ gameResults: resultsData.participants });
        }
      } catch (error) {
        console.error('Error fetching game results:', error);
      }
    }
  }

  // Buy stock via WebSocket
  async buyStock(ticker: string, price: number) {
    if (!this.state.inGame || !this.state.gameId || !this.state.participantId) {
      alert('Please join a game first');
      return;
    }

    if (!this.state.wsConnected) {
      alert('WebSocket not connected. Please wait for connection...');
      return;
    }

    try {
      // Send buy request via WebSocket
      this.sendWebSocketMessage({
        action: 'buy',
        ticker: ticker,
        volume: 1
      });

      console.log(`[BUY] Sent buy request for ${ticker}`);
    } catch (error) {
      console.error('Error buying stock:', error);
      alert('Failed to send buy request');
    }
  }

  // Sell stock via WebSocket
  async sellStock(ticker: string, price: number) {
    if (!this.state.inGame || !this.state.gameId || !this.state.participantId) {
      alert('Please join a game first');
      return;
    }

    const currentHolding = this.state.portfolio[ticker] || 0;
    if (currentHolding <= 0) {
      alert('You don\'t own any shares of this stock');
      return;
    }

    if (!this.state.wsConnected) {
      alert('WebSocket not connected. Please wait for connection...');
      return;
    }

    try {
      // Send sell request via WebSocket
      this.sendWebSocketMessage({
        action: 'sell',
        ticker: ticker,
        volume: 1
      });

      console.log(`[SELL] Sent sell request for ${ticker}`);
    } catch (error) {
      console.error('Error selling stock:', error);
      alert('Failed to send sell request');
    }
  }

  // Calculate total portfolio value
  getPortfolioValue(): number {
    return Object.entries(this.state.portfolio).reduce((total, [ticker, quantity]) => {
      const stock = this.state.stocks.find(s => s.ticker === ticker);
      const price = parseFloat(stock?.current_price || stock?.initial_price || '0');
      return total + (quantity * price);
    }, 0);
  }

  render() {
    const { stocks, portfolio, balance, loading, error, lastUpdate, currentVolley, gameStatus, inGame, inLogin } = this.state;
    const portfolioValue = this.getPortfolioValue();
    const totalValue = balance + portfolioValue;

    // Show login screen if not logged in
    if (inLogin) {
      return (
        <div className="app">
          <header className="app-header">
            <h1>Stock Trading Game</h1>
            <div className="login-container">
              <h2>Welcome to STG</h2>
              <input type="text" placeholder="Username" className="login-input" />
              <input type="password" placeholder="Password" className="login-input" />
              <button
                className="login-btn"
                onClick={() => this.login()}
              >
                Login
              </button>
              <button
                className="login-btn"
                onClick={() => this.register()}
              >
                Register
              </button>
              <button
                className="small-btn"
                onClick={() => this.playGuest()}
              >
                Play as Guest
              </button>
            </div>
          </header>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="loading">
          <h2>Loading...</h2>
          <p>{inGame ? 'Joining game...' : 'Loading stock data...'}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => inGame ? this.joinGame() : this.fetchStocks()}>Retry</button>
        </div>
      );
    }

    // Show main menu screen if not in a game
    if (!inGame && !this.state.inLobby) {
      return (
        <MainMenu
          onBrowseGames={() => this.goToLobby()}
          onLogout={() => this.logout()}
          playerName={this.state.playerName}
        />
      );
    }

    // Show lobby with available games
    if (!inGame && this.state.inLobby) {
      return (
        <Lobby
          availableGames={this.state.availableGames}
          onCreateGame={() => this.createGame()}
          onJoinGame={(gameId) => this.joinExistingGame(gameId)}
        />
      );
    }

    // Show game results screen if game is completed
    if (gameStatus === 'completed' && this.state.gameResults) {
      return (
        <ResultsScreen
          results={this.state.gameResults}
          currentParticipantId={this.state.participantId}
          onPlayAgain={() => {
            this.setState({ inGame: false, gameResults: null, gameId: null, participantId: null });
          }}
        />
      );
    }

    return (
      <GameScreen
        stocks={stocks}
        portfolio={portfolio}
        balance={balance}
        lastUpdate={lastUpdate}
        currentVolley={currentVolley}
        gameStatus={gameStatus}
        gameId={this.state.gameId}
        notifications={this.state.notifications}
        players={this.state.gameParticipants}
        currentParticipantId={this.state.participantId}
        showPlayersModal={this.state.showPlayersModal}
        onTogglePlayersModal={() =>
          this.setState({ showPlayersModal: !this.state.showPlayersModal })
        }
        onBuy={(ticker, price) => this.buyStock(ticker, price)}
        onSell={(ticker, price) => this.sellStock(ticker, price)}
        onStartGame={() => this.startGame()}
      />
    );
  }
}

export default App;