import React, { useRef } from 'react';
import './PopulationCounter.css';
import { MilestoneSegment } from './GameInterface';

interface PopulationCounterProps {
  population: number;
  milestone: MilestoneSegment | null;
  populationTrend: 'up' | 'down' | 'stable' | null;
  expandedCounter: 'time' | 'population-global' | 'population-user' | 'population-description' | null;
  onCounterToggle: (counter: 'time' | 'population-global' | 'population-user' | 'population-description' | null) => void;
}

const PopulationCounter: React.FC<PopulationCounterProps> = ({ 
  population,
  milestone,
  populationTrend,
  expandedCounter,
  onCounterToggle
}) => {
  // Format population with commas
  const formattedPopulation = population.toLocaleString();
  
  // Add state for user's population (for now using a placeholder value)
  const userPopulation = 0; // This would be from props or state
  const formattedUserPopulation = userPopulation.toLocaleString();
  
  // References
  const globalPopRef = useRef<HTMLElement>(null);
  const userPopRef = useRef<HTMLElement>(null);
  const descriptionRef = useRef<HTMLElement>(null);

  // Handle counter clicks to expand/collapse
  const handleCounterClick = (counterType: 'population-global' | 'population-user' | 'population-description') => {
    if (expandedCounter === counterType) {
      onCounterToggle(null); // Collapse if already expanded
    } else {
      onCounterToggle(counterType); // Expand this counter
    }
  };
  
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
        <span 
          ref={globalPopRef}
          className={`population-group clickable-population ${expandedCounter === 'population-global' ? 'active' : ''}`}
          onClick={() => handleCounterClick('population-global')}
          title="Click to view population chart"
        >
          Global ppl <span className="population-value">
            {formattedPopulation}
            {renderTrendArrow()}
          </span>
        </span>
        <span 
          ref={userPopRef}
          className={`population-group clickable-population ${expandedCounter === 'population-user' ? 'active' : ''}`}
          onClick={() => handleCounterClick('population-user')}
          title="Click to view your population chart"
        >
          Your ppl <span className="user-population-value">{formattedUserPopulation}</span>
        </span>
        {milestone && (
          <span 
            ref={descriptionRef}
            className={`population-info clickable-population ${expandedCounter === 'population-description' ? 'active' : ''}`}
            onClick={() => handleCounterClick('population-description')}
            aria-label="Click for full description"
          >
            {milestone.description}
          </span>
        )}
      </div>
    </div>
  );
};

export default PopulationCounter;
