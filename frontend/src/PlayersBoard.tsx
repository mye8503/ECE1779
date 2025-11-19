import React from 'react';

interface Player {
  participant_id: number;
  player_name: string;
  starting_balance: number;
  current_balance: number;
  portfolio_value: number;
  total_value: number;
}

interface PlayersBoardProps {
  players: Player[];
  currentParticipantId: number | null;
  gameStatus: string;
}

const PlayersBoard: React.FC<PlayersBoardProps> = ({
  players,
  currentParticipantId,
  gameStatus
}) => {
  // Sort players by total value (descending)
  const sortedPlayers = [...players].sort((a, b) => b.total_value - a.total_value);

  return (
    <div className="players-board">
      <div className="players-board-header">
        <h3>Players in Game</h3>
        <span className="game-status-badge">{gameStatus}</span>
      </div>

      <div className="players-table-container">
        <table className="players-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Balance</th>
              <th>Portfolio</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => (
              <tr
                key={player.participant_id}
                className={
                  player.participant_id === currentParticipantId ? 'current-player' : ''
                }
              >
                <td className="player-name">
                  {player.player_name}
                  {player.participant_id === currentParticipantId && (
                    <span className="you-badge"> (You)</span>
                  )}
                </td>
                <td className="balance-cell">
                  ${player.current_balance.toFixed(2)}
                </td>
                <td className="portfolio-cell">
                  ${player.portfolio_value.toFixed(2)}
                </td>
                <td className="total-cell">
                  <strong>${player.total_value.toFixed(2)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayersBoard;
