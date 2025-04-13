import React from 'react';
import './PopulationCounter.css';
import { MilestoneSegment } from './GameInterface'; // Import type

interface PopulationCounterProps {
  currentYear: number;
  population: number;
  milestone: MilestoneSegment | null; // Add milestone prop
}

const PopulationCounter: React.FC<PopulationCounterProps> = ({ 
  currentYear, 
  population,
  milestone
}) => {
  // Format population with commas
  const formattedPopulation = population.toLocaleString();
  
  return (
    <div className="population-counter">
      <div className="population-title">GLOBAL POPULATION</div>
      <div className="population-value">{formattedPopulation}</div>
      {milestone && (
        <div className="population-info">{milestone.description} ({milestone.startYear} BCE - {milestone.endYear} BCE)</div>
      )}
      <div className="population-year">Year: {currentYear}</div>
    </div>
  );
};

export default PopulationCounter;
