import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface StockChartProps {
  ticker: string;
  gameId: number | null;
}

interface PriceData {
  volley: number;
  price: number;
  historical_delta: number;
  player_impact: number;
  created_at: string;
}

const StockChart: React.FC<StockChartProps> = ({ ticker, gameId }) => {
  const [chartData, setChartData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = window.location.port ? `http://${window.location.hostname}:3000/api` : `http://${window.location.hostname}/api`;

  useEffect(() => {
    const fetchChartData = async () => {
      if (!gameId) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE_URL}/stocks/${ticker}/history?limit=30&gameId=${gameId}`);
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
  }, [ticker, gameId]);

  if (loading) {
    return <div style={{ color: '#666', fontSize: '12px' }}>Loading chart...</div>;
  }

  if (chartData.length === 0) {
    return <div style={{ color: '#666', fontSize: '12px' }}>No chart data</div>;
  }

  // Determine line color based on overall trend
  const firstPrice = chartData[0]?.price || 0;
  const lastPrice = chartData[chartData.length - 1]?.price || 0;
  const lineColor = lastPrice >= firstPrice ? '#27ae60' : '#e74c3c';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <XAxis 
          dataKey="volley" 
          axisLine={false} 
          tickLine={false}
          tick={false}
        />
        <YAxis 
          domain={['dataMin - 1', 'dataMax + 1']}
          axisLine={false} 
          tickLine={false}
          tick={false}
        />
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke={lineColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: lineColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default StockChart;