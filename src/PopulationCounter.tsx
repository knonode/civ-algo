import React, { useState, useEffect, useRef } from 'react';
import './PopulationCounter.css';
import { MilestoneSegment } from './GameInterface';

interface PopulationCounterProps {
  currentYear: number;
  population: number;
  milestone: MilestoneSegment | null;
  populationTrend: 'up' | 'down' | 'stable' | null;
}

const PopulationCounter: React.FC<PopulationCounterProps> = ({ 
  population,
  milestone,
  populationTrend
}) => {
  // Format population with commas
  const formattedPopulation = population.toLocaleString();
  
  // Add state for user's population (for now using a placeholder value)
  const userPopulation = 0; // This would be from props or state
  const formattedUserPopulation = userPopulation.toLocaleString();
  
  // State for tooltip visibility
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Reference to track click source
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Toggle tooltip visibility
  const handleDescriptionClick = () => {
    setShowTooltip(!showTooltip);
  };

  // Format years for display (with BCE/CE and commas)
  const formatHistoricalYear = (year: number): string => {
    // Convert to positive number and add commas
    const absoluteYear = Math.abs(year).toLocaleString();
    // Add BCE for negative years, CE for positive
    return year < 0 ? `${absoluteYear} BCE` : `${absoluteYear} CE`;
  };

  // Format year range for tooltip
  const formatYearRange = (milestone: MilestoneSegment): string => {
    const startFormatted = formatHistoricalYear(milestone.startYear);
    const endFormatted = formatHistoricalYear(milestone.endYear);
    return `${startFormatted} - ${endFormatted}`;
  };

  // Add document-wide click listener when tooltip is visible
  useEffect(() => {
    if (!showTooltip) return;
    
    const handleClickOutside = () => {
      setShowTooltip(false);
    };
    
    // Add the event listener with a small delay to prevent immediate closing
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);
    
    // Clean up
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showTooltip]);

  // Render trend arrow based on populationTrend
  const renderTrendArrow = () => {
    if (!populationTrend) return null;
    
    let arrow = '';
    switch (populationTrend) {
      case 'up':
        arrow = '↑';
        break;
      case 'down':
        arrow = '↓';
        break;
      case 'stable':
        arrow = '→';
        break;
    }
    
    return <span className={`trend-arrow ${populationTrend}`}>{arrow}</span>;
  };

  return (
    <div className="population-counter">
      <div className="population-display-row">
        <span className="population-group">
          Global ppl <span className="population-value">
            {formattedPopulation}
            {renderTrendArrow()} {/* Add trend arrow here */}
          </span>
        </span>
        <span className="population-group">Your ppl <span className="user-population-value">{formattedUserPopulation}</span></span>
        {milestone && (
          <span 
            className="population-info"
            onClick={(e) => {
              e.stopPropagation();
              handleDescriptionClick();
            }}
            aria-label="Click for full description"
          >
            {milestone.description}
          </span>
        )}
        {showTooltip && milestone && (
          <div 
            className="milestone-tooltip"
            ref={tooltipRef}
          >
            <div className="tooltip-description">{milestone.description}</div>
            <div className="tooltip-years">{formatYearRange(milestone)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PopulationCounter;
