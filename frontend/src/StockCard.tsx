import React from 'react';
import StockChart from './StockChart';

interface Stock {
  stock_id: number;
  ticker: string;
  company_name: string;
  initial_price: string;
  current_price?: string;
}

interface Notification {
  id: number;
  ticker: string;
  impact: number;
  transactionType: 'buy' | 'sell';
}

interface StockCardProps {
  stock: Stock;
  holdings: number;
  balance: number;
  gameId: number | null;
  notifications: Notification[];
  onBuy: (ticker: string, price: number) => void;
  onSell: (ticker: string, price: number) => void;
}

const StockCard: React.FC<StockCardProps> = ({
  stock,
  holdings,
  balance,
  gameId,
  notifications,
  onBuy,
  onSell
}) => {
  const currentPrice = parseFloat(stock.current_price || stock.initial_price);
  const canBuy = balance >= currentPrice;
  const canSell = holdings > 0;
  const holdingValue = holdings * currentPrice;

  // Get notifications for this stock
  const stockNotifications = notifications.filter(n => n.ticker === stock.ticker);

  return (
    <div className="stock-card">
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
          <p>Holdings: {holdings} shares</p>
          <p>Value: ${holdingValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="stock-center">
        <StockChart ticker={stock.ticker} gameId={gameId} />
      </div>

      <div className="stock-bottom">
        <div className="stock-price">
          <h2>${currentPrice.toFixed(2)}</h2>
        </div>

        <div className="stock-actions">
          <button
            className="buy-btn"
            disabled={!canBuy}
            onClick={() => onBuy(stock.ticker, currentPrice)}
          >
            Buy
          </button>
          <button
            className="sell-btn"
            disabled={!canSell}
            onClick={() => onSell(stock.ticker, currentPrice)}
          >
            Sell
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockCard;
