import React, { useEffect, useState } from 'react';
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

interface BuyStats {
  shares: number;
  totalCost: number;
  avgPrice: number;
}

const StockCard: React.FC<StockCardProps> = ({
  stock,
  holdings,
  balance,
  gameId,
  notifications,
  onBuy,
  onSell,
}) => {
  const currentPrice = parseFloat(stock.current_price || stock.initial_price);
  const canBuy = balance >= currentPrice;
  const canSell = holdings > 0;
  const holdingValue = holdings * currentPrice;

  // Local tracking of average buy price for this stock
  const [buyStats, setBuyStats] = useState<BuyStats | null>(null);

  // If we fully exit the position, clear the average line
  useEffect(() => {
    if (holdings <= 0 && buyStats) {
      setBuyStats(null);
    }
  }, [holdings, buyStats]);

  const avgBuyPrice = buyStats?.avgPrice ?? null;

  const handleBuy = () => {
    onBuy(stock.ticker, currentPrice);

    // Assume 1 share per click for averaging
    setBuyStats((prev) => {
      if (!prev) {
        return {
          shares: 1,
          totalCost: currentPrice,
          avgPrice: currentPrice,
        };
      }
      const shares = prev.shares + 1;
      const totalCost = prev.totalCost + currentPrice;
      return {
        shares,
        totalCost,
        avgPrice: totalCost / shares,
      };
    });
  };

  const handleSell = () => {
    onSell(stock.ticker, currentPrice);
    // Optional: we leave avg line until position is fully closed
    // (effect above will clear when holdings hits 0)
  };

  // Get notifications for this stock
  const stockNotifications = notifications.filter(
    (n) => n.ticker === stock.ticker
  );

  return (
    <div
      className="stock-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Notifications for this stock */}
      <div className="stock-notifications">
        {stockNotifications.map((notification) => {
          // Show the net effect of player action (opposite of player_impact)
          const playerEffect = -notification.impact;
          const isBuy = notification.transactionType === 'buy';
          return (
            <div
              key={notification.id}
              className="floating-notification-inline"
            >
              <span
                className={`notification-impact-inline ${
                  isBuy ? 'positive' : 'negative'
                }`}
              >
                {isBuy ? '📈 +' : '📉 '}
                ${Math.abs(playerEffect).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="stock-header" style={{ flex: '0 0 auto' }}>
        <div className="stock-title">
          <h3>{stock.ticker}</h3>
          <h4>{stock.company_name}</h4>
        </div>
        <div className="stock-holdings">
          <p>Holdings: {holdings} shares</p>
          <p>Value: ${holdingValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Chart area: same height + stretches to fill middle */}
      <div
        className="stock-center"
        style={{
          flex: '1 1 auto',
          minHeight: '140px',
          marginTop: '8px',
        }}
      >
        <StockChart
          ticker={stock.ticker}
          gameId={gameId}
          avgBuyPrice={avgBuyPrice}
        />
      </div>

      <div
        className="stock-bottom"
        style={{ flex: '0 0 auto', marginTop: '8px' }}
      >
        <div className="stock-price">
          <h2>${currentPrice.toFixed(2)}</h2>
        </div>

        <div className="stock-actions">
          <button
            className="buy-btn"
            disabled={!canBuy}
            onClick={handleBuy}
          >
            Buy
          </button>
          <button
            className="sell-btn"
            disabled={!canSell}
            onClick={handleSell}
          >
            Sell
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockCard;
