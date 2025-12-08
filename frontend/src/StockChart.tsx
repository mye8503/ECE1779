import React, { useEffect, useMemo, useState } from 'react';

interface StockChartProps {
  ticker: string;
  gameId: number | null;
  avgBuyPrice?: number | null;
}

interface PriceData {
  volley: number;
  price: number | string;
  historical_delta: number;
  player_impact: number;
  created_at: string;
}

interface Candle extends PriceData {
  open: number;
  close: number;
  high: number;
  low: number;
}

const StockChart: React.FC<StockChartProps> = ({
  ticker,
  gameId,
  avgBuyPrice,
}) => {
  const [chartData, setChartData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = window.location.port ? `http://${window.location.hostname}:3000/api` : `http://${window.location.hostname}/api`;
  const [hoverInfo, setHoverInfo] = useState<{
    candle: Candle;
    clientX: number;
    clientY: number;
  } | null>(null);


  useEffect(() => {
    const fetchChartData = async () => {
      if (!gameId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/stocks/${ticker}/history?limit=30&gameId=${gameId}`
        );
        const data = await response.json();

        if (data.success && data.history) {
          setChartData(data.history);
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();

    // Update chart every 2 seconds to match price updates
    const interval = setInterval(fetchChartData, 2000);
    return () => clearInterval(interval);
  }, [ticker, gameId, API_BASE_URL]);

  // Helper: force anything to a number (or NaN if impossible)
  const toNum = (val: unknown): number => {
    if (typeof val === 'number') return val;
    const n = parseFloat(String(val));
    return Number.isNaN(n) ? NaN : n;
  };

  // Build candles from price series, coercing to numbers
  const candles: Candle[] = useMemo(
    () =>
      chartData.map((point, index) => {
        const thisPrice = toNum(point.price);
        const prevRaw =
          index > 0 ? chartData[index - 1].price : point.price;
        const prevPrice = toNum(prevRaw);

        const open = prevPrice;
        const close = thisPrice;
        const high = Math.max(open, close);
        const low = Math.min(open, close);

        return {
          ...point,
          price: thisPrice,
          open,
          close,
          high,
          low,
        };
      }),
    [chartData]
  );

  if (loading) {
    return (
      <div style={{ color: '#666', fontSize: '12px' }}>
        Loading chart...
      </div>
    );
  }

  if (candles.length === 0) {
    return (
      <div style={{ color: '#666', fontSize: '12px' }}>
        No chart data
      </div>
    );
  }

  const numericLows = candles.map((c) => toNum(c.low));
  const numericHighs = candles.map((c) => toNum(c.high));

  const minPrice = Math.min(...numericLows);
  const maxPrice = Math.max(...numericHighs);
  const priceRange = maxPrice - minPrice || 1; // avoid division by zero

  // Basic chart dimensions (logical, via viewBox; will scale to container)
  const WIDTH = 200;
  const HEIGHT = 100;
  const paddingX = 24; // for price axis labels
  const paddingY = 10;

  const usableWidth = WIDTH - paddingX * 2;
  const usableHeight = HEIGHT - paddingY * 2;

  const candleWidth =
    candles.length > 0
      ? Math.max(3, (usableWidth / candles.length) * 0.6)
      : 4;

  const priceToY = (price: number) =>
    paddingY +
    ((maxPrice - price) / priceRange) * usableHeight;

  const indexToX = (index: number) => {
    if (candles.length === 1) {
      return paddingX + usableWidth / 2;
    }
    const t = index / (candles.length - 1);
    return paddingX + t * usableWidth;
  };

  // Points for connecting line through close prices
  const linePoints = candles
    .map((candle, index) => {
      const x = indexToX(index);
      const y = priceToY(toNum(candle.close));
      return `${x},${y}`;
    })
    .join(' ');

  // Tick values for the price axis (min, mid, max)
  const tickValues = [minPrice, minPrice + priceRange / 2, maxPrice];

  // --- Average buy line + background shading ---
  const lastPrice = toNum(candles[candles.length - 1].close);
  let avgLineY: number | null = null;
  let aboveOpacity = 0;
  let belowOpacity = 0;

  if (typeof avgBuyPrice === 'number') {
    // Clamp avg price to visible range for drawing
    const clampedAvg = Math.max(minPrice, Math.min(maxPrice, avgBuyPrice));
    avgLineY = priceToY(clampedAvg);

    if (lastPrice > avgBuyPrice) {
      aboveOpacity = 0.12;
    } else if (lastPrice < avgBuyPrice) {
      belowOpacity = 0.12;
    }
  }

  // Helper to format prices safely
  const formatPrice = (val: unknown): string => {
    const n = toNum(val);
    if (Number.isNaN(n)) return '-';
    return n.toFixed(2);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
      >
        {/* Price axis (vertical) */}
        <line
          x1={paddingX}
          y1={paddingY}
          x2={paddingX}
          y2={HEIGHT - paddingY}
          stroke="#555"
          strokeWidth={0.6}
        />

        {/* Price axis ticks + labels */}
        {tickValues.map((value, i) => {
          const y = priceToY(value);
          return (
            <g key={`tick-${i}`}>
              <line
                x1={paddingX - 3}
                y1={y}
                x2={paddingX}
                y2={y}
                stroke="#777"
                strokeWidth={0.6}
              />
              <text
                x={paddingX - 6}
                y={y + 3}
                fontSize={7}
                fill="#aaa"
                textAnchor="end"
              >
                {value.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Optional horizontal baseline at min price */}
        <line
          x1={paddingX}
          y1={priceToY(minPrice)}
          x2={WIDTH - paddingX}
          y2={priceToY(minPrice)}
          stroke="#333"
          strokeWidth={0.5}
        />

        {/* Profit / loss background zones */}
        {avgLineY !== null && (
          <>
            {/* Above line (green when in profit) */}
            <rect
              x={paddingX}
              y={paddingY}
              width={usableWidth}
              height={avgLineY - paddingY}
              fill="#27ae60"
              fillOpacity={aboveOpacity}
            />
            {/* Below line (red when in loss) */}
            <rect
              x={paddingX}
              y={avgLineY}
              width={usableWidth}
              height={HEIGHT - paddingY - avgLineY}
              fill="#e74c3c"
              fillOpacity={belowOpacity}
            />
            {/* Average buy line */}
            <line
              x1={paddingX}
              y1={avgLineY}
              x2={WIDTH - paddingX}
              y2={avgLineY}
              stroke="#f1c40f"
              strokeWidth={0.8}
              strokeDasharray="3,2"
            />
          </>
        )}

        {/* Connecting line between close prices */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#bbbbbb"
          strokeWidth={0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.7}
        />

        {/* Candles (hoverable) */}
        {candles.map((candle, index) => {
          const xCenter = indexToX(index);
          const yHigh = priceToY(toNum(candle.high));
          const yLow = priceToY(toNum(candle.low));
          const yOpen = priceToY(toNum(candle.open));
          const yClose = priceToY(toNum(candle.close));

          const isUp = toNum(candle.close) >= toNum(candle.open);
          const color = isUp ? '#27ae60' : '#e74c3c';

          const bodyTop = Math.min(yOpen, yClose);
          const bodyBottom = Math.max(yOpen, yClose);
          const bodyHeight = Math.max(bodyBottom - bodyTop, 0.5);

          return (
            <g
              key={`${candle.volley}-${index}`}
              onMouseEnter={(e) =>
                setHoverInfo({
                  candle,
                  clientX: e.clientX,
                  clientY: e.clientY,
                })
              }
              onMouseMove={(e) =>
                setHoverInfo({
                  candle,
                  clientX: e.clientX,
                  clientY: e.clientY,
                })
              }
              onMouseLeave={() => setHoverInfo(null)}
            >
              {/* Wick */}
              <line
                x1={xCenter}
                y1={yHigh}
                x2={xCenter}
                y2={yLow}
                stroke={color}
                strokeWidth={0.6}
              />
              {/* Body */}
              <rect
                x={xCenter - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={color}
                stroke={color}
                strokeWidth={0.4}
                rx={0.5}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip for hovered candle */}
      {hoverInfo && (
        <div
          style={{
            position: 'fixed',
            left: hoverInfo.clientX + 10,
            top: hoverInfo.clientY + 10,
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            padding: '4px 6px',
            fontSize: '10px',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'nowrap',
          }}
        >
          <div>
            {new Date(hoverInfo.candle.created_at).toLocaleString()}
          </div>
          <div>Open: ${formatPrice(hoverInfo.candle.open)}</div>
          <div>Close: ${formatPrice(hoverInfo.candle.close)}</div>
        </div>
      )}
    </div>
  );
};

export default StockChart;
