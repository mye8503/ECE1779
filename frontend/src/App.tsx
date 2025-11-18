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
  notifications: Notification[];
  previousPlayerImpacts: { [ticker: string]: number };
  playerTransactions: { [key: string]: 'buy' | 'sell' }; // key: "ticker_volley"
  gameResults: GameResult[] | null;
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
      notifications: [],
      previousPlayerImpacts: {},
      playerTransactions: {},
      gameResults: null
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

  // Join a new game
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
    const { stocks, portfolio, balance, loading, error, lastUpdate, currentVolley, gameStatus, inGame } = this.state;
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

    // Show join game screen if not in a game
    if (!inGame) {
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

    // Show game results screen if game is completed
    if (gameStatus === 'completed' && this.state.gameResults) {
      const results = this.state.gameResults;
      const playerResult = results.find(r => r.participant_id === this.state.participantId);

      return (
        <div className="app">
          <header className="app-header">
            <h1>Stock Trading Game</h1>
          </header>

          <div className="results-container">
            <div className="results-title">
              <h2>{playerResult && playerResult.rank === 1 ? '🎉 You Won! 🎉' : 'Game Over'}</h2>
              <p>Final Standings</p>
            </div>

            <div className="leaderboard">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Cash</th>
                    <th>Portfolio</th>
                    <th>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={result.participant_id} className={result.participant_id === this.state.participantId ? 'current-player' : ''}>
                      <td className="rank-cell">{result.rank}</td>
                      <td className="player-name-cell">{result.player_name}</td>
                      <td>${result.cash_remaining.toFixed(2)}</td>
                      <td>${result.portfolio_value.toFixed(2)}</td>
                      <td className="total-value-cell"><strong>${result.total_value.toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="results-actions">
              <button
                className="join-game-btn"
                onClick={() => {
                  this.setState({ inGame: false, gameResults: null, gameId: null, participantId: null });
                }}
              >
                Play Again
              </button>
            </div>
          </div>

          <footer className="app-footer">
            <p>Real-time stock trading simulation</p>
          </footer>
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

            // Get notifications for this stock
            const stockNotifications = this.state.notifications.filter(n => n.ticker === stock.ticker);

            return (
              <div key={stock.ticker} className="stock-card">
                {/* Notifications for this stock */}
                <div className="stock-notifications">
                  {stockNotifications.map((notification) => {
                    // Show the net effect of player action (opposite of player_impact)
                    const playerEffect = -notification.impact;
                    const isBuy = notification.transactionType === 'buy';
                    return (
                      <div key={notification.id} className="floating-notification-inline">
                        <span className={`notification-impact-inline ${isBuy ? 'positive' : 'negative'}`}>
                          {isBuy ? '📈 +' : '📉 '}
                          ${Math.abs(playerEffect).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

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