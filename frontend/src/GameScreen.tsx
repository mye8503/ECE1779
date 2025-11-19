import React from 'react';
import PlayerInfo from './PlayerInfo';
import ProgressBar from './ProgressBar';
import StockCard from './StockCard';

interface Stock {
  stock_id: number;
  ticker: string;
  company_name: string;
  initial_price: string;
  current_price?: string;
}

interface Portfolio {
  [ticker: string]: number;
}

interface Notification {
  id: number;
  ticker: string;
  impact: number;
  transactionType: 'buy' | 'sell';
}

interface GameScreenProps {
  stocks: Stock[];
  portfolio: Portfolio;
  balance: number;
  lastUpdate: string;
  currentVolley: number;
  gameStatus: string;
  gameId: number | null;
  notifications: Notification[];
  onBuy: (ticker: string, price: number) => void;
  onSell: (ticker: string, price: number) => void;
  onStartGame?: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  stocks,
  portfolio,
  balance,
  lastUpdate,
  currentVolley,
  gameStatus,
  gameId,
  notifications,
  onBuy,
  onSell,
  onStartGame
}) => {
  // Calculate portfolio value
  const portfolioValue = Object.entries(portfolio).reduce((total, [ticker, quantity]) => {
    const stock = stocks.find(s => s.ticker === ticker);
    const price = parseFloat(stock?.current_price || stock?.initial_price || '0');
    return total + (quantity * price);
  }, 0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Stock Trading Game</h1>
        <PlayerInfo
          balance={balance}
          portfolioValue={portfolioValue}
          lastUpdate={lastUpdate}
          currentVolley={currentVolley}
          gameStatus={gameStatus}
        />
        {gameStatus === 'waiting' && onStartGame && (
          <div className="start-game-container">
            <button className="start-game-btn" onClick={onStartGame}>
              Start Game
            </button>
          </div>
        )}
        <ProgressBar currentVolley={currentVolley} />
      </header>

      <div className="stocks-grid">
        {stocks.map((stock) => {
          const holding = portfolio[stock.ticker] || 0;

          return (
            <StockCard
              key={stock.ticker}
              stock={stock}
              holdings={holding}
              balance={balance}
              gameId={gameId}
              notifications={notifications}
              onBuy={onBuy}
              onSell={onSell}
            />
          );
        })}
      </div>

      <footer className="app-footer">
        <p>Real-time stock trading simulation</p>
      </footer>
    </div>
  );
};

export default GameScreen;
