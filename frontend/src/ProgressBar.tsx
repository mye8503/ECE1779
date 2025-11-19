import React from 'react';

interface ProgressBarProps {
  currentVolley: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentVolley }) => {
  if (currentVolley <= 0) {
    return null;
  }

  const MAX_VOLLEYS = 90;  // 3 minutes = 90 volleys
  const progressPercentage = Math.min((currentVolley / MAX_VOLLEYS) * 100, 100);
  const elapsedSeconds = currentVolley * 2;
  const remainingSeconds = (MAX_VOLLEYS - currentVolley) * 2;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      <div className="progress-text">
        <span>{formatTime(elapsedSeconds)} elapsed</span>
        <span>{formatTime(remainingSeconds)} remaining</span>
      </div>
    </div>
  );
};

export default ProgressBar;
