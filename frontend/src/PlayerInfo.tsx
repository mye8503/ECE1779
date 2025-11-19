import React from 'react';

interface PlayerInfoProps {
  balance: number;
  portfolioValue: number;
  lastUpdate: string;
  currentVolley: number;
  gameStatus: string;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  balance,
  portfolioValue,
  lastUpdate,
  currentVolley,
  gameStatus
}) => {
  const totalValue = balance + portfolioValue;

  return (
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
  );
};

export default PlayerInfo;
