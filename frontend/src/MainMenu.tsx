import React from 'react';

interface MainMenuProps {
  onBrowseGames: () => void;
  onLogout: () => void;
  playerName: string;
}

const MainMenu: React.FC<MainMenuProps> = ({ onBrowseGames, onLogout, playerName }) => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Stock Trading Game</h1>
        <div className="header-actions">
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="main-menu-container">
        <div className="join-game-container">
          <h2>Ready to start trading?</h2>
          <p>Join a game or create your own to start buying and selling stocks in real-time!</p>
          <button
            className="join-game-btn"
            onClick={onBrowseGames}
          >
            Browse Games
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
