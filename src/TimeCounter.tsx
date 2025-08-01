// Rolling Time Counter Component
import React, { useEffect, useState, useRef } from 'react';
import './TimeCounter.css'; // Assuming CSS file is renamed
import type { MilestoneSegment } from './GameInterface'; // Import the type

interface TimeCounterProps {
  yearsPerRound: number;     // Current years per round value
  currentRound: number;      // Current Algorand round number
  historicalYear: number;    // Current year in historical timeline (e.g., -10000 for 10000 BCE)
  totalRounds: number;       // Total rounds in the game simulation
  milestone?: MilestoneSegment | null; // Make milestone optional
  expandedCounter: 'time' | 'population-global' | 'population-user' | 'population-description' | null;
  onCounterToggle: (counter: 'time' | 'population-global' | 'population-user' | 'population-description' | null) => void;
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

// Format the years per round display with multiple time units
const formatYearsPerRound = (ypr: number): string => {
  // Convert to various time units
  const MONTHS_PER_YEAR = 12;
  const DAYS_PER_MONTH = 30.44; // Average
  const HOURS_PER_DAY = 24;
  const MINUTES_PER_HOUR = 60;
  const SECONDS_PER_MINUTE = 60;
  
  if (ypr >= 1) {
    // Years
    return ypr < 10 ? ypr.toFixed(2) + ' Y/R' : 
           ypr < 100 ? ypr.toFixed(1) + ' Y/R' : 
           Math.floor(ypr).toLocaleString() + ' Y/R';
  } 
  
  // Convert to months
  const monthsPerRound = ypr * MONTHS_PER_YEAR;
  if (monthsPerRound >= 1) {
    return monthsPerRound.toFixed(1) + ' M/R';
  }
  
  // Convert to days
  const daysPerRound = monthsPerRound * DAYS_PER_MONTH;
  if (daysPerRound >= 1) {
    return daysPerRound.toFixed(1) + ' D/R';
  }
  
  // Convert to hours
  const hoursPerRound = daysPerRound * HOURS_PER_DAY;
  if (hoursPerRound >= 1) {
    return hoursPerRound.toFixed(1) + ' H/R';
  }
  
  // Convert to minutes
  const minutesPerRound = hoursPerRound * MINUTES_PER_HOUR;
  if (minutesPerRound >= 1) {
    return minutesPerRound.toFixed(1) + ' Min/R';
  }
  
  // Convert to seconds
  const secondsPerRound = minutesPerRound * SECONDS_PER_MINUTE;
  return secondsPerRound.toFixed(1) + ' S/R';
}

  // Format the main historical year display with increasing granularity
  const formatHistoricalYearDisplay = (yearsPerRound: number, historicalYear: number, currentRound: number): string => {
    if (historicalYear === 0) return '1 CE'; // Special case
    
    const absoluteYear = Math.abs(historicalYear);
    const suffix = historicalYear < 0 ? ' BCE' : ' CE';
    
    // For ancient history, just show the year
    if (yearsPerRound >= 1) {
      return absoluteYear.toLocaleString() + suffix;
    }
    
    const year = Math.floor(absoluteYear);
    const formattedYear = year.toLocaleString(); // Add comma separation
    
    // Calculate the date within the year based on the current round
    // We'll use the currentRound to determine the date within the year
    // This ensures the date progresses properly within each year
    let yearProgress = (currentRound % 365) / 365; // Use modulo to get position within year
    
    // For BCE years, time flows backwards, so we need to invert the progress
    if (historicalYear < 0) {
      yearProgress = 1 - yearProgress; // Invert the progress for BCE years
    }
    
    // For debugging - let's see what values we're getting
    console.log(`Year: ${historicalYear}, Round: ${currentRound}, Progress: ${yearProgress}, YpR: ${yearsPerRound}`);
    
    // For more recent history where yearsPerRound < 1, show months
    if (yearsPerRound < 1 && yearsPerRound >= 1/12) {
      const monthIndex = Math.floor(yearProgress * 12);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[monthIndex];
      return `${formattedYear}${suffix} ${month}`;
    }
    
    // For very recent history where yearsPerRound < 1/12 (about a month), show days
    if (yearsPerRound < 1/12 && yearsPerRound >= 1/365) {
      const monthIndex = Math.floor(yearProgress * 12);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[monthIndex];
      
      // Calculate day of month (approximate)
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const monthProgress = yearProgress * 12 - monthIndex;
      const day = Math.floor(monthProgress * daysInMonth[monthIndex]) + 1;
      
      return `${formattedYear}${suffix} ${month} ${day}`;
    }
    
    // For extremely recent history where yearsPerRound < 1/365 (about a day), add time
    if (yearsPerRound < 1/365) {
      const monthIndex = Math.floor(yearProgress * 12);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[monthIndex];
      
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const monthProgress = yearProgress * 12 - monthIndex;
      const day = Math.floor(monthProgress * daysInMonth[monthIndex]) + 1;
      
      const dayProgress = monthProgress * daysInMonth[monthIndex] - (day - 1);
      const hour = Math.floor(dayProgress * 24);
      const minute = Math.floor((dayProgress * 24 - hour) * 60);
      
      return `${formattedYear}${suffix} ${month} ${day}, ${hour}:${minute.toString().padStart(2, '0')}`;
    }
    
    return absoluteYear.toLocaleString() + suffix;
  };

// Main component
const TimeCounter: React.FC<TimeCounterProps> = ({
  yearsPerRound,
  currentRound,
  historicalYear,
  totalRounds,
  expandedCounter,
  onCounterToggle
}) => {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [prevYearsPerRound, setPrevYearsPerRound] = useState(yearsPerRound);
  const animationDuration = calculateAnimationDuration(yearsPerRound);

  // References for clickable spans
  const gameTimeRef = useRef<HTMLElement>(null);
  const roundNumberRef = useRef<HTMLElement>(null);
  const yearsPerRoundRef = useRef<HTMLElement>(null);

  // Handle counter clicks to expand/collapse
  const handleCounterClick = (counterType: 'time') => {
    if (expandedCounter === counterType) {
      onCounterToggle(null); // Collapse if already expanded
    } else {
      onCounterToggle(counterType); // Expand this counter
    }
  };

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
  const formattedYearDisplay = formatHistoricalYearDisplay(yearsPerRound, historicalYear, currentRound);

  return (
    <div className={`time-counter ${isHighlighted ? 'highlighted' : ''}`}>
      <div className="time-display-row">
        <span 
          ref={gameTimeRef}
          className={`time-group clickable-time ${expandedCounter === 'time' ? 'active' : ''}`}
          onClick={() => handleCounterClick('time')}
          title="Click to view time charts"
        >
          Game time <span className="main-year-display">{formattedYearDisplay}</span>
        </span>
        <span 
          ref={roundNumberRef}
          className={`round-number clickable-time ${expandedCounter === 'time' ? 'active' : ''}`}
          onClick={() => handleCounterClick('time')}
          title="Click to view time charts"
        >
          R #{currentRound.toLocaleString()}/{formatRoundNumber(totalRounds)}
        </span>
        <span 
          ref={yearsPerRoundRef}
          className={`years-per-round clickable-time ${expandedCounter === 'time' ? 'active' : ''}`}
          onClick={() => handleCounterClick('time')}
          title="Click to view time charts"
        >
          {formatYearsPerRound(yearsPerRound)}
        </span>
      </div>
    </div>
  );
};

export default TimeCounter;