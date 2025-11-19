import React from 'react';

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

interface ResultsScreenProps {
  results: GameResult[];
  currentParticipantId: number | null;
  onPlayAgain: () => void;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({
  results,
  currentParticipantId,
  onPlayAgain
}) => {
  const playerResult = results.find(r => r.participant_id === currentParticipantId);
  const isWinner = playerResult && playerResult.rank === 1;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Stock Trading Game</h1>
      </header>

      <div className="results-container">
        <div className="results-title">
          <h2>{isWinner ? '🎉 You Won! 🎉' : 'Game Over'}</h2>
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
              {results.map((result) => (
                <tr
                  key={result.participant_id}
                  className={result.participant_id === currentParticipantId ? 'current-player' : ''}
                >
                  <td className="rank-cell">{result.rank}</td>
                  <td className="player-name-cell">{result.player_name}</td>
                  <td>${result.cash_remaining.toFixed(2)}</td>
                  <td>${result.portfolio_value.toFixed(2)}</td>
                  <td className="total-value-cell">
                    <strong>${result.total_value.toFixed(2)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="results-actions">
          <button className="join-game-btn" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </div>

      <footer className="app-footer">
        <p>Real-time stock trading simulation</p>
      </footer>
    </div>
  );
};

export default ResultsScreen;
