import React, { Component } from 'react';
import './App.css';

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
}

class App extends Component<{}, AppState> {
  private intervalId?: NodeJS.Timeout;

  constructor(props: any) {
    super(props);
    this.state = {
      stocks: [],
      portfolio: {},
      balance: 1000.00, // Starting balance
      loading: true,
      error: null,
      lastUpdate: '',
      currentVolley: 0,
      gameStatus: ''
    };
  }

  async componentDidMount() {
    await this.fetchStocks();
    // Update stock prices every 2 seconds (matching backend volley timing)
    this.intervalId = setInterval(() => {
      this.fetchStockPrices();
    }, 2000);
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
        // Also fetch initial prices
        await this.fetchStockPrices();
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

  // Fetch current stock prices from backend
  async fetchStockPrices() {
    try {
      const response = await fetch(`${API_BASE_URL}/stocks/prices`);
      const data = await response.json();
      
      if (data.success) {
        // Update stocks with current prices
        const updatedStocks = this.state.stocks.map(stock => {
          const priceData = data.prices.find((p: any) => p.ticker === stock.ticker);
          return {
            ...stock,
            current_price: priceData ? parseFloat(priceData.current_price) : stock.initial_price
          };
        });
        
        this.setState({ 
          stocks: updatedStocks,
          lastUpdate: new Date().toLocaleTimeString(),
          currentVolley: data.current_volley || 0,
          gameStatus: data.game_status || ''
        });
      }
    } catch (error) {
      console.error('Error fetching stock prices:', error);
    }
  }

  // Buy stock (currently just local state, will be API call later)
  buyStock(ticker: string, price: number) {
    if (this.state.balance >= price) {
      this.setState(prevState => ({
        portfolio: {
          ...prevState.portfolio,
          [ticker]: (prevState.portfolio[ticker] || 0) + 1
        },
        balance: prevState.balance - price
      }));
    }
  }

  // Sell stock (currently just local state, will be API call later)
  sellStock(ticker: string, price: number) {
    const currentHolding = this.state.portfolio[ticker] || 0;
    if (currentHolding > 0) {
      this.setState(prevState => ({
        portfolio: {
          ...prevState.portfolio,
          [ticker]: currentHolding - 1
        },
        balance: prevState.balance + price
      }));
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
    const { stocks, portfolio, balance, loading, error, lastUpdate, currentVolley, gameStatus } = this.state;
    const portfolioValue = this.getPortfolioValue();
    const totalValue = balance + portfolioValue;

    if (loading) {
      return (
        <div className="loading">
          <h2>Loading Stock Data...</h2>
          <p>Connecting to backend API...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => this.fetchStocks()}>Retry</button>
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
                  <h3>{stock.ticker}</h3>
                  <h4>{stock.company_name}</h4>
                </div>
                
                <div className="stock-price">
                  <h2>${currentPrice.toFixed(2)}</h2>
                  <p>Holdings: {holding} shares</p>
                  <p>Value: ${(holding * currentPrice).toFixed(2)}</p>
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