import React from 'react';
import './TimeTable.css';

interface TimeTableProps {
  currentRound: number;
  totalRounds: number;
}

const TimeTable: React.FC<TimeTableProps> = ({
  currentRound,
  totalRounds
}) => {
  // Constants from GameInterface
  const UPDATE_INTERVAL_MS = 2800; // milliseconds per round
  const TOTAL_GAME_YEARS = 402025; // From -400,000 BCE to 2025 CE
  
  // Time calculation constants (copied from GameInterface)
  const START_YEAR = -400000;
  const C = 5;
  const LOG_C = Math.log(C);
  const power = 0.7;
  const maxLogDiff = Math.log(totalRounds + C) - LOG_C;
  const maxPoweredLogDiff = Math.pow(maxLogDiff, power);
  const B_CONSTANT = TOTAL_GAME_YEARS / maxPoweredLogDiff;
  
  // Helper functions (copied from GameInterface)
  const calculateHistoricalYear = (round: number): number => {
    const currentRound = Math.min(round, totalRounds);
    const nonNegativeRound = Math.max(0, currentRound);
    const logDiff = Math.log(nonNegativeRound + C) - LOG_C;
    const poweredLogDiff = Math.pow(logDiff, power);
    const year = START_YEAR + B_CONSTANT * poweredLogDiff;
    return Math.floor(year);
  };
  

  
  // Calculate real-time metrics
  const msPerRound = UPDATE_INTERVAL_MS;
  const secondsPerRound = msPerRound / 1000;
  
  // Rounds per real-time periods
  const roundsPerSecond = 1 / secondsPerRound;
  const roundsPerMinute = roundsPerSecond * 60;
  const roundsPerHour = roundsPerMinute * 60;
  const roundsPerDay = roundsPerHour * 24;
  const roundsPerMonth = roundsPerDay * 30.44; // Average month
  const roundsPerYear = roundsPerDay * 365.25; // Including leap years
  
  // Calculate average game years over different periods
  // This accounts for the exponential time progression
  const calculateAverageGameYears = (rounds: number, fromRound: number = currentRound): number => {
    if (rounds <= 0) return 0;
    
    const toRound = Math.min(fromRound + rounds, totalRounds);
    const startYear = calculateHistoricalYear(fromRound);
    const endYear = calculateHistoricalYear(toRound);
    
    return Math.abs(endYear - startYear);
  };
  
  // Game time per real-time periods (using averages)
  const gameYearsPerSecond = calculateAverageGameYears(roundsPerSecond);
  const gameYearsPerMinute = calculateAverageGameYears(roundsPerMinute);
  const gameYearsPerHour = calculateAverageGameYears(roundsPerHour);
  const gameYearsPerDay = calculateAverageGameYears(roundsPerDay);
  const gameYearsPerMonth = calculateAverageGameYears(roundsPerMonth);
  const gameYearsPerRealYear = calculateAverageGameYears(roundsPerYear);
  
  // Remaining time calculations
  const roundsRemaining = totalRounds - currentRound;
  const realTimeRemainingMs = roundsRemaining * msPerRound;
  const realTimeRemainingDays = realTimeRemainingMs / (1000 * 60 * 60 * 24);
  
  // Format large numbers
  const formatNumber = (num: number, decimals = 2): string => {
    if (num === 0) return '0';
    if (Math.abs(num) < 0.001) return num.toExponential(2);
    if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(decimals);
  };
  
  // Format time duration
  const formatDuration = (days: number): string => {
    const totalDays = Math.floor(days);
    const years = Math.floor(totalDays / 365);
    const remainingDays = totalDays % 365;
    const months = Math.floor(remainingDays / 30);
    const finalDays = remainingDays % 30;
    
    if (years > 0) {
      return `${years}y ${months}m ${finalDays}d`;
    } else if (months > 0) {
      return `${months}m ${finalDays}d`;
    } else {
      return `${finalDays}d`;
    }
  };

  return (
    <div className="time-table">
      <h4>Time Mechanics</h4>
      
      <table className="time-calculations">
        <thead>
          <tr>
            <th>Real Time Period</th>
            <th>Rounds</th>
            <th>Avg Game Years</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Per Second</td>
            <td>{formatNumber(roundsPerSecond, 3)}</td>
            <td>{formatNumber(gameYearsPerSecond)}</td>
          </tr>
          <tr>
            <td>Per Minute</td>
            <td>{formatNumber(roundsPerMinute, 1)}</td>
            <td>{formatNumber(gameYearsPerMinute)}</td>
          </tr>
          <tr>
            <td>Per Hour</td>
            <td>{formatNumber(roundsPerHour)}</td>
            <td>{formatNumber(gameYearsPerHour)}</td>
          </tr>
          <tr>
            <td>Per Day</td>
            <td>{formatNumber(roundsPerDay)}</td>
            <td>{formatNumber(gameYearsPerDay)}</td>
          </tr>
          <tr>
            <td>Per Month</td>
            <td>{formatNumber(roundsPerMonth)}</td>
            <td>{formatNumber(gameYearsPerMonth)}</td>
          </tr>
          <tr>
            <td>Per Year</td>
            <td>{formatNumber(roundsPerYear)}</td>
            <td>{formatNumber(gameYearsPerRealYear)}</td>
          </tr>
        </tbody>
      </table>
      
      <div className="game-progress">
        <h5>Game Progress</h5>
        <div className="progress-stats">
          <div className="stat">
            <span className="label">Current Round:</span>
            <span className="value">
              {currentRound.toLocaleString(undefined, { maximumFractionDigits: 0 })} / {formatNumber(totalRounds, 0)}
            </span>
          </div>
          <div className="stat">
            <span className="label">Progress:</span>
            <span className="value">{((currentRound / totalRounds) * 100).toFixed(2)}%</span>
          </div>
          <div className="stat">
            <span className="label">Rounds Remaining:</span>
            <span className="value">{formatNumber(roundsRemaining, 0)}</span>
          </div>
          <div className="stat">
            <span className="label">Real Time Remaining:</span>
            <span className="value">{formatDuration(realTimeRemainingDays)}</span>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default TimeTable; 