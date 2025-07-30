import React from 'react';
import './PopulationCounter.css';
import { MilestoneSegment } from './GameInterface';

interface PopulationCounterProps {
  currentYear: number;
  population: number;
  milestone: MilestoneSegment | null;
}

const PopulationCounter: React.FC<PopulationCounterProps> = ({ 
  population,
  milestone
}) => {
  // Format population with commas
  const formattedPopulation = population.toLocaleString();
  
  return (
    <div className="population-counter">
      <div className="population-display-row">
        <span className="population-title">Global ppl</span>
        <span className="population-value">{formattedPopulation}</span>
        {milestone && (
          <span className="population-info">{milestone.description}</span>
        )}
      </div>
    </div>
  );
};

export default PopulationCounter;
