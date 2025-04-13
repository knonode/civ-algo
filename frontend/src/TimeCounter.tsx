// Rolling Time Counter Component
import React, { useEffect, useState } from 'react';
import './TimeCounter.css'; // Assuming CSS file is renamed
import type { MilestoneSegment } from './GameInterface'; // Import the type

interface TimeCounterProps {
  yearsPerRound: number;     // Current years per round value
  currentRound: number;      // Current Algorand round number
  historicalYear: number;    // Current year in historical timeline (e.g., -10000 for 10000 BCE)
  totalRounds: number;       // Total rounds in the game simulation
  milestone?: MilestoneSegment | null; // Make milestone optional
}

// Calculate appropriate animation duration based on how quickly time is passing
const calculateAnimationDuration = (yearsPerRound: number): number => {
  // Faster animations for rapidly changing early eras, slower for modern times
  if (yearsPerRound > 1000) return 100;  // Very fast for prehistoric eras
  if (yearsPerRound > 100) return 200;   // Fast for ancient history
  if (yearsPerRound > 10) return 300;    // Medium for medieval/renaissance
  return 400;                           // Slower for modern times
};

// Utility function to format large numbers with K/M suffixes
const formatRoundNumber = (num: number): string => {
  if (num < 1000) {
    return num.toString();
  }
  if (num < 1_000_000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'; // e.g., 1.2K, 123K
  }
  return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'; // e.g., 1.2M, 11M
};

// Main component
const TimeCounter: React.FC<TimeCounterProps> = ({
  yearsPerRound,
  currentRound,
  historicalYear,
  totalRounds,
}) => {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [prevYearsPerRound, setPrevYearsPerRound] = useState(yearsPerRound);
  const animationDuration = calculateAnimationDuration(yearsPerRound);

  // Simplified useEffect to handle highlight on yearsPerRound change
  useEffect(() => {
    if (yearsPerRound !== prevYearsPerRound) {
      setIsHighlighted(true);
      const timer = setTimeout(() => {
        setIsHighlighted(false);
        setPrevYearsPerRound(yearsPerRound);
      }, animationDuration + 100); // Highlight slightly longer than potential (unused) digit anim
      return () => clearTimeout(timer);
    } else {
      // Ensure highlight is off on initial load or if value reverts
       setIsHighlighted(false);
    }
    // Ensure prev value is updated on initial load
    setPrevYearsPerRound(yearsPerRound);

  }, [yearsPerRound, prevYearsPerRound, animationDuration]);

  // Format the main historical year display (BCE/CE)
  const formatHistoricalYearDisplay = (): string => {
    if (historicalYear === 0) return '1 CE'; // Or handle as needed
    const year = Math.abs(historicalYear);
    const suffix = historicalYear < 0 ? ' BCE' : ' CE';
    // Add comma separators for large numbers
    return year.toLocaleString() + suffix;
  };

  // Format the bottom-right years per round display
  const formatYearsPerRound = (ypr: number): string => {
    if (ypr < 0.01) return ypr.toFixed(4); // More precision for very small rates
    if (ypr < 10) return ypr.toFixed(2);
    if (ypr < 100) return ypr.toFixed(1);
    return Math.floor(ypr).toLocaleString(); // Integer for large numbers
  };

  return (
    <div className={`time-counter ${isHighlighted ? 'highlighted' : ''}`}>
      <div className="counter-header">CIV.ALGO</div>
      
      {/* Main Display: Historical Year */}
      <div className="counter-display main-year-display">
        {formatHistoricalYearDisplay()}
      </div>

      <div className="historical-info">
        <span className="round-number">
          Round #{formatRoundNumber(currentRound)} / {formatRoundNumber(totalRounds)}
        </span>
        <span className="historical-year years-per-round">
          {formatYearsPerRound(yearsPerRound)} Years/Round
        </span>
      </div>
    </div>
  );
};

export default TimeCounter;