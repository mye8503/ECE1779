import React from 'react';

interface AvailableGame {
  game_id: number;
  status: string;
  created_at: string;
  player_count: number;
  max_players: number;
}

interface LobbyProps {
  availableGames: AvailableGame[];
  onCreateGame: () => void;
  onJoinGame: (gameId: number) => void;
}

const Lobby: React.FC<LobbyProps> = ({ availableGames, onCreateGame, onJoinGame }) => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Stock Trading Game</h1>
      </header>

      <div className="lobby-container">
        <div className="lobby-header">
          <h2>Game Lobby</h2>
          <p>Select a game to join or create a new one</p>
        </div>

        <div className="lobby-content">
          <div className="games-section">
            <h3>Available Games</h3>
            {availableGames.length === 0 ? (
              <p className="no-games">No games available. Create one to get started!</p>
            ) : (
              <div className="games-list">
                {availableGames.map((game) => (
                  <div key={game.game_id} className="game-card">
                    <div className="game-info">
                      <p className="game-id">Game #{game.game_id}</p>
                      <p className="game-players">
                        {game.player_count} / {game.max_players} players
                      </p>
                    </div>
                    <button
                      className="join-game-btn"
                      onClick={() => onJoinGame(game.game_id)}
                    >
                      Join Game
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="create-section">
            <h3>Create New Game</h3>
            <p>Start your own game and invite others to join</p>
            <button
              className="join-game-btn"
              onClick={onCreateGame}
            >
              Create Game
            </button>
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <p>Real-time stock trading simulation</p>
      </footer>
    </div>
  );
};

export default Lobby;
