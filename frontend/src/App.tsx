import React, { Component } from 'react';
import './App.css';
import MainMenu from './MainMenu';
import Lobby from './Lobby';
import GameScreen from './GameScreen';
import ResultsScreen from './ResultsScreen';

// API configuration - dynamically detect host
const API_BASE_URL = `http://${window.location.hostname}:3000/api`;

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
}

class App extends Component<{}, AppState> {
  private intervalId?: NodeJS.Timeout;

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
      token: null
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
      const response = await fetch(`${API_BASE_URL}/guests/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        // Store token in localStorage
        localStorage.setItem('token', data.token);
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
  }

  async goToLobby() {
    this.setState({ inLobby: true });
    await this.fetchAvailableGames();
  }

  logout() {
    // Clear token from localStorage
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
        });

        // Start updating game state
        this.intervalId = setInterval(() => {
          this.fetchGameState();
        }, 2000);

        await this.fetchGameState();
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
        });

        // Start updating game state
        this.intervalId = setInterval(() => {
          this.fetchGameState();
        }, 2000);

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
        // Update stocks with current prices from the game
        const pricesResponse = await fetch(`${API_BASE_URL}/stocks/prices?gameId=${this.state.gameId}`);
        const pricesData = await pricesResponse.json();

        if (pricesData.success) {
          const updatedStocks = this.state.stocks.map(stock => {
            const priceData = pricesData.prices.find((p: any) => p.ticker === stock.ticker);
            return {
              ...stock,
              current_price: priceData ? parseFloat(priceData.current_price) : stock.initial_price
            };
          });

          // Detect player impact changes and create notifications
          const newNotifications: Notification[] = [];
          const newPreviousImpacts = { ...this.state.previousPlayerImpacts };

          pricesData.prices.forEach((priceData: any) => {
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
                  portfolio: data.portfolio,
                  balance: data.balance,
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
                portfolio: data.portfolio,
                balance: data.balance,
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
              portfolio: data.portfolio,
              balance: data.balance,
              lastUpdate: new Date().toLocaleTimeString(),
              currentVolley: data.game.current_volley || 0,
              gameStatus: newGameStatus,
              notifications: [...this.state.notifications, ...newNotifications],
              previousPlayerImpacts: newPreviousImpacts
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    }
  }

  // Buy stock via API
  async buyStock(ticker: string, price: number) {
    if (!this.state.inGame || !this.state.gameId || !this.state.participantId) {
      alert('Please join a game first');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          gameId: this.state.gameId,
          participantId: this.state.participantId,
          ticker,
          transactionType: 'buy',
          quantity: 1
        })
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Failed to buy stock');
      } else {
        // Record this transaction for the NEXT volley (when the impact will show)
        const nextVolley = this.state.currentVolley + 1;
        const key = `${ticker}_${nextVolley}`;
        console.log(`[BUY] Recording transaction: ${key} = buy. Current volley: ${this.state.currentVolley}`);
        this.setState(prevState => ({
          playerTransactions: {
            ...prevState.playerTransactions,
            [key]: 'buy'
          }
        }), () => {
          console.log(`[BUY] playerTransactions after setState:`, this.state.playerTransactions);
        });
      }
      // Portfolio will update on next fetchGameState call
    } catch (error) {
      console.error('Error buying stock:', error);
      alert('Network error: Failed to buy stock');
    }
  }

  // Sell stock via API
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

    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          gameId: this.state.gameId,
          participantId: this.state.participantId,
          ticker,
          transactionType: 'sell',
          quantity: 1
        })
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Failed to sell stock');
      } else {
        // Record this transaction for the NEXT volley (when the impact will show)
        const nextVolley = this.state.currentVolley + 1;
        const key = `${ticker}_${nextVolley}`;
        this.setState(prevState => ({
          playerTransactions: {
            ...prevState.playerTransactions,
            [key]: 'sell'
          }
        }));
      }
      // Portfolio will update on next fetchGameState call
    } catch (error) {
      console.error('Error selling stock:', error);
      alert('Network error: Failed to sell stock');
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
        onBuy={(ticker, price) => this.buyStock(ticker, price)}
        onSell={(ticker, price) => this.sellStock(ticker, price)}
        onStartGame={() => this.startGame()}
      />
    );
  }
}

export default App;