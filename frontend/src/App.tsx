import React, { Component } from 'react';
import './App.css';
import StockChart from './StockChart';

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
  playerId: number | null;
  isGuest: boolean;
  playerName: string;
  participantId: number | null;
  inGame: boolean;
  inLogin: boolean;
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
      playerId: null,
      isGuest: true,
      playerName: '',
      participantId: null,
      inGame: false,
      inLogin: true
    };
  }

  async componentDidMount() {
    await this.fetchStocks();
    // Don't start price updates until in a game
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

  async login() {
    const user = (document.querySelector('.login-input') as HTMLInputElement).value;
    const pass = (document.querySelectorAll('.login-input')[1] as HTMLInputElement).value;

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
        // Handle successful login
        this.setState({ inLogin: false, isGuest: false, playerId: data.user_id, playerName: data.username });

        // do more stuff?
      } else {
        // Handle login error
        alert(data.error || 'Login failed');
      }
    }
    catch (error) {
      console.error('Error during login:', error);
      alert('Network error: Unable to login');
    }
  }

  async register() {
    const user = (document.querySelector('.login-input') as HTMLInputElement).value;
    const pass = (document.querySelectorAll('.login-input')[1] as HTMLInputElement).value;

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
        // Handle successful registration
        // this.setState({ inLogin: false });
        // this.setState({ userId: data.user_id });
        alert('Registration successful! You can now log in.');

        // do more stuff?
      } else {
        // Handle registration error
        alert(data.error || 'Registration failed');
      }
    }
    catch (error) {
      console.error('Error during registration:', error);
      alert('Network error: Unable to register');
    }
  }

  // Play as guest
  async playGuest() {
    try {
      const response = await fetch(`${API_BASE_URL}/guests/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        this.setState({ inLogin: false, isGuest: true, 
          playerId: data.guest_id, playerName: 'Guest Player' });
      }
    }
    catch (error) {
      console.error('Error during guest registration:', error);
      alert('Network error: Unable to register guest');
    }
  }

  // Join a new game
  async joinGame() {
    console.log("Joining new game as", this.state.isGuest ? 'Guest' : 'User', this.state.playerId);
    try {
      this.setState({ loading: true, error: null });
      const response = await fetch(`${API_BASE_URL}/games/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGuest: this.state.isGuest, playerId: this.state.playerId,
          playerName: this.state.playerName })
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
          
          this.setState({ 
            stocks: updatedStocks,
            portfolio: data.portfolio,
            balance: data.balance,
            lastUpdate: new Date().toLocaleTimeString(),
            currentVolley: data.game.current_volley || 0,
            gameStatus: data.game.status || ''
          });
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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

    if (inLogin) {
      return (
        <div className="app">
          <header className="app-header">
            <h1>Stock Trading Game</h1>
            <div className="login-container">
              <h2>Welcome to STG</h2>
              {/* <p>Login, Register a new account, or play as Guest</p> */}
              <input type="text" placeholder="Username" className="login-input" />
              <input type="text" placeholder="Password" className="login-input" />
              <button 
                className="login-btn"
                onClick={() => this.login()}
              >
                Login
              </button>
              <button 
                className="login-btn"
                onClick={() => this.playGuest()}
              >
                Play as Guest
              </button>
              <button 
                className="login-btn"
                onClick={() => this.register()}
              >
                Register
              </button>
            </div>
          </header>
        </div>
      );
    }
    
    // Show join game screen if not in a game
    if (!inLogin && !inGame) {
      return (
        <div className="app">
          <header className="app-header">
            <h1>Stock Trading Game</h1>
            <div className="join-game-container">
              <h2>Ready to start trading?</h2>
              <p>Join a new game to start buying and selling stocks in real-time!</p>
              <button 
                className="join-game-btn"
                onClick={() => this.joinGame()}
              >
                Join New Game
              </button>
            </div>
          </header>
        </div>
      );
    }

    return (
      <div className="app">
        <header className="app-header">
          <h1>Stock Trading Game</h1>
          <div className="player-info">
            <div className="balance-info">
              <p><strong>Cash:</strong> ${balance.toFixed(2)}</p>
              <p><strong>Portfolio:</strong> ${portfolioValue.toFixed(2)}</p>
              <p><strong>Total Value:</strong> ${totalValue.toFixed(2)}</p>
            </div>
            <div className="update-info">
              {lastUpdate && <p><small>Last updated: {lastUpdate}</small></p>}
              {currentVolley > 0 && <p><small>Volley: {currentVolley}/300 ({gameStatus})</small></p>}
            </div>
          </div>
          
          {currentVolley > 0 && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${Math.min((currentVolley / 300) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="progress-text">
                <span>{Math.floor(currentVolley * 2 / 60)}:{((currentVolley * 2) % 60).toString().padStart(2, '0')} elapsed</span>
                <span>{Math.floor((300 - currentVolley) * 2 / 60)}:{(((300 - currentVolley) * 2) % 60).toString().padStart(2, '0')} remaining</span>
              </div>
            </div>
          )}
        </header>

        <div className="stocks-grid">
          {stocks.map((stock) => {
            const currentPrice = parseFloat(stock.current_price || stock.initial_price);
            const holding = portfolio[stock.ticker] || 0;
            const canBuy = balance >= currentPrice;
            const canSell = holding > 0;

            return (
              <div key={stock.ticker} className="stock-card">
                <div className="stock-header">
                  <div className="stock-title">
                    <h3>{stock.ticker}</h3>
                    <h4>{stock.company_name}</h4>
                  </div>
                  <div className="stock-holdings">
                    <p>Holdings: {holding} shares</p>
                    <p>Value: ${(holding * currentPrice).toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="stock-center">
                  <StockChart ticker={stock.ticker} gameId={this.state.gameId} />
                </div>

                <div className="stock-bottom">
                  <div className="stock-price">
                    <h2>${currentPrice.toFixed(2)}</h2>
                  </div>

                  <div className="stock-actions">
                    <button 
                      className="buy-btn"
                      disabled={!canBuy}
                      onClick={() => this.buyStock(stock.ticker, currentPrice)}
                    >
                      Buy
                    </button>
                    <button 
                      className="sell-btn"
                      disabled={!canSell}
                      onClick={() => this.sellStock(stock.ticker, currentPrice)}
                    >
                      Sell
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="app-footer">
          <p>Real-time stock trading simulation</p>
        </footer>
      </div>
    );
  }
}

export default App;