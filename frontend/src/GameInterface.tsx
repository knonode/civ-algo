import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import TimeCounter from './TimeCounter';
import MapView from './MapView';
import './GameInterface.css';
import { LocationData } from './interfaces'; // Import LocationData
import PopulationCounter from './PopulationCounter';

// Define AND Export the Milestone structure
export interface MilestoneSegment {
  startYear: number;  // Start year (e.g., -400000 for 400,000 BCE)
  endYear: number;    // End year (e.g., -325000 for 325,000 BCE)
  description: string;
  // Keep startRound and endRound for backwards compatibility if needed
  startRound?: number; 
  endRound?: number;
}

// Raw milestone descriptions (no longer need Omit, as the base type is now stricter)
const milestoneDescriptions: MilestoneSegment[] = [
  // Block 1
  { startYear: -400000, endYear: -325000, description: "Early stone tools, fire control" },
  { startYear: -325000, endYear: -250000, description: "Early human migration patterns" },
  { startYear: -250000, endYear: -175000, description: "Neanderthal development" },
  { startYear: -175000, endYear: -100000, description: "Early symbolic thought" },
  
  // Block 2
  { startYear: -100000, endYear: -80000, description: "Early Homo sapiens expansion" },
  { startYear: -80000, endYear: -60000, description: "Migration out of Africa" },
  { startYear: -60000, endYear: -40000, description: "Cave art begins" },
  { startYear: -40000, endYear: -20000, description: "Widespread human settlements" },
  
  // Block 3
  { startYear: -20000, endYear: -15000, description: "Last Ice Age peak" },
  { startYear: -15000, endYear: -12000, description: "End of Ice Age, megafauna extinction" },
  { startYear: -12000, endYear: -8000, description: "Early agriculture begins" },
  { startYear: -8000, endYear: -5000, description: "Neolithic Revolution, first villages" },
  
  // Block 4
  { startYear: -5000, endYear: -4000, description: "Early metallurgy, writing systems" },
  { startYear: -4000, endYear: -3000, description: "First cities, Egyptian Old Kingdom" },
  { startYear: -3000, endYear: -2000, description: "Bronze Age civilizations" },
  { startYear: -2000, endYear: -1000, description: "Iron Age begins, alphabet development" },
  
  // Block 5
  { startYear: -1000, endYear: -750, description: "Classical Greece emerges" },
  { startYear: -750, endYear: -500, description: "Rome founded, Buddha, Confucius" },
  { startYear: -500, endYear: -250, description: "Persian Empire, Alexander the Great" },
  { startYear: -250, endYear: 0, description: "Roman Republic, Han Dynasty" },
  
  // Block 6
  { startYear: 1, endYear: 125, description: "Roman Empire peak" },
  { startYear: 125, endYear: 250, description: "Christianity spreads" },
  { startYear: 250, endYear: 375, description: "Germanic migrations" },
  { startYear: 375, endYear: 500, description: "Fall of Western Roman Empire" },
  
  // Block 7
  { startYear: 500, endYear: 625, description: "Byzantine Empire, rise of Islam" },
  { startYear: 625, endYear: 750, description: "Islamic expansion, Tang Dynasty" },
  { startYear: 750, endYear: 875, description: "Charlemagne, Viking Age begins" },
  { startYear: 875, endYear: 1000, description: "Norse exploration, feudalism develops" },
  
  // Block 8
  { startYear: 1000, endYear: 1125, description: "Crusades begin, Song Dynasty" },
  { startYear: 1125, endYear: 1250, description: "Mongol Empire, Gothic architecture" },
  { startYear: 1250, endYear: 1375, description: "Black Death, Hundred Years' War" },
  { startYear: 1375, endYear: 1500, description: "Renaissance begins, Age of Discovery" },
  
  // Block 9
  { startYear: 1500, endYear: 1563, description: "Protestant Reformation, colonization" },
  { startYear: 1563, endYear: 1625, description: "Scientific Revolution begins" },
  { startYear: 1625, endYear: 1688, description: "Age of Absolutism, English Civil War" },
  { startYear: 1688, endYear: 1750, description: "Enlightenment, early Industrial Revolution" },
  
  // Block 10
  { startYear: 1750, endYear: 1800, description: "American and French Revolutions" },
  { startYear: 1800, endYear: 1850, description: "Napoleon, industrial expansion" },
  { startYear: 1850, endYear: 1875, description: "American Civil War, unification movements" },
  { startYear: 1875, endYear: 1900, description: "Imperialism, early electricity" },
  
  // Block 11
  { startYear: 1900, endYear: 1925, description: "World War I, Russian Revolution" },
  { startYear: 1925, endYear: 1945, description: "Great Depression, World War II" },
  { startYear: 1945, endYear: 1960, description: "Cold War begins, decolonization" },
  { startYear: 1960, endYear: 1975, description: "Space Race, Vietnam War" },
  
  // Block 12
  { startYear: 1975, endYear: 1990, description: "Personal computers, end of Cold War" },
  { startYear: 1990, endYear: 2000, description: "Internet age begins, globalization" },
  { startYear: 2000, endYear: 2015, description: "War on Terror, smartphones, social media" },
  { startYear: 2015, endYear: 2025, description: "AI advancement, pandemic, climate challenges" }
];

// --- Configuration for Logarithmic Time --- 
const START_YEAR = -400000; // Approx. 400,000 BCE
const END_YEAR = 2025;     // Target End Year CE
const TOTAL_ROUNDS = 12_000_000; // Total rounds over ~1 year real time

const TOTAL_YEARS = END_YEAR - START_YEAR;

// Keep original C value (or adjust as needed)
const C = 5;

// Calculate LOG_C and other constants as before
const LOG_C = Math.log(C);
const LOG_TOTAL_ROUNDS_PLUS_C = Math.log(TOTAL_ROUNDS + C);

// Apply power to logarithmic difference at max rounds
const power = 0.7; // Accelerates early history
const maxLogDiff = Math.log(TOTAL_ROUNDS + C) - LOG_C;
const maxPoweredLogDiff = Math.pow(maxLogDiff, power);

// Calculate B_CONSTANT based on the powered difference
const B_CONSTANT = TOTAL_YEARS / maxPoweredLogDiff;

// Modified calculation function
const calculateHistoricalYear = (round: number): number => {
  const currentRound = Math.min(round, TOTAL_ROUNDS);
  const nonNegativeRound = Math.max(0, currentRound);
  
  // Apply power to the logarithmic difference
  const logDiff = Math.log(nonNegativeRound + C) - LOG_C;
  const poweredLogDiff = Math.pow(logDiff, power);
  
  // Calculate year using powered difference and adjusted B_CONSTANT
  const year = START_YEAR + B_CONSTANT * poweredLogDiff;
  
  return Math.floor(year);
}

// Calculate Years Per Round (the derivative of the historical year function)
const calculateYearsPerRound = (round: number): number => {
  // Ensure round >= 0
  const nonNegativeRound = Math.max(0, round);
  
  // Apply the formula: dY/dR = B_CONSTANT / (R + C)
  const rate = B_CONSTANT / (nonNegativeRound + C);
  
  // Return a minimum value instead of near-zero for display purposes at high rounds
  // Or return the raw value if preferred
  return Math.max(0.01, rate); // Return rate, with a minimum floor of 0.01 
};
// --- End Configuration --- 

// Utility function to format large numbers (copied from TimeCounter)
const formatRoundNumber = (num: number): string => {
  if (num < 1000) {
    return num.toString();
  }
  if (num < 1_000_000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
};

const GameInterface: React.FC = () => {
  // console.log("GameInterface: Initial Render...");

  // Initialize state - currentRound now directly controlled by slider
  const initialRound = 1;
  const [currentRound, setCurrentRound] = useState(initialRound);
  const [yearsPerRound, setYearsPerRound] = useState(calculateYearsPerRound(initialRound));
  const [historicalYear, setHistoricalYear] = useState(calculateHistoricalYear(initialRound));
  // State for milestone data
  // const [processedMilestones, setProcessedMilestones] = useState<MilestoneSegment[]>([]); // REMOVE
  const [currentMilestone, setCurrentMilestone] = useState<MilestoneSegment | null>(null);
  // Add state for the locations fetched from the API
  const [visibleLocations, setVisibleLocations] = useState<LocationData[]>([]); // Use LocationData[]

  // Use a simpler play/pause state that doesn't cause conflicts
  const [isPaused, setIsPaused] = useState(false);

  // Track the last update timestamp and animation frame ID
  const lastUpdateTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Use animation frames instead of intervals for smoother updates
  useEffect(() => {
    console.log("Setting up animation frame loop");
    
    // Stop any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Skip animation setup if paused
    if (isPaused) return;
    
    // Time between updates in ms (equivalent to 2800ms interval)
    const updateInterval = 2800;
    
    // Animation loop
    const animate = (timestamp: number) => {
      // Initialize lastUpdateTime on first run
      if (lastUpdateTimeRef.current === 0) {
        lastUpdateTimeRef.current = timestamp;
      }
      
      // Check if enough time has passed for an update
      const elapsed = timestamp - lastUpdateTimeRef.current;
      
      if (elapsed >= updateInterval) {
        // Update the counter
        setCurrentRound(prev => {
          // Force a proper number (in case of NaN)
          const safeRound = isNaN(prev) ? 1 : prev;
          // Only increment if not at max
          if (safeRound < TOTAL_ROUNDS) {
            return safeRound + 1;
          }
          return safeRound;
        });
        
        // Reset the timer
        lastUpdateTimeRef.current = timestamp;
      }
      
      // Continue the animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(animate);
    
    // Cleanup on unmount or when isPaused changes
    return () => {
      console.log("Cleaning up animation frame");
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Reset the timestamp
      lastUpdateTimeRef.current = 0;
    };
  }, [isPaused, TOTAL_ROUNDS]);

  // Revised location fetching with better error handling
  useEffect(() => {
    // Track if component is still mounted
    let isMounted = true;
    
    const fetchLocations = async () => {
      try {
        console.log(`Fetching locations for year: ${historicalYear}`);
        // Use relative path for API call
        const response = await fetch(`/api/settlements?max_year=${historicalYear}`);
        
        // Guard against fetch errors
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Guard against unmounted component
        if (!isMounted) return;
        
        const data = await response.json();
        console.log(`Fetched ${data.length} locations.`);
        
        // Guard against unmounted component after JSON parse
        if (!isMounted) return;
        
        // Process locations with error handling for each item
        const processedLocations = data.map((loc: LocationData) => {
          try {
            return {
              ...loc,
              latitude: typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude,
              longitude: typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude
            };
          } catch (itemError) {
            console.error("Error processing location item:", itemError, loc);
            // Return item with original values
            return loc;
          }
        });
        
        // Final guard against unmount
        if (!isMounted) return;
        
        // Update state
        setVisibleLocations(processedLocations);
        
      } catch (error) {
        console.error("Error fetching locations:", error);
        // Could set an error state here if needed
      }
    };

    fetchLocations();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [historicalYear]);

  // Improved milestone finder with error handling
  useEffect(() => {
    try {
      // Calculate the historical year based on current round
      const calculatedHistoricalYear = calculateHistoricalYear(currentRound);
      const calculatedYearsPerRound = calculateYearsPerRound(currentRound);
      
      // Debug
      console.log(`Round: ${currentRound}, Year: ${calculatedHistoricalYear}, YpR: ${calculatedYearsPerRound.toFixed(4)}`);
      
      // Find the active milestone based on the historical year
      const activeMilestone = milestoneDescriptions.find(
        milestone => calculatedHistoricalYear >= milestone.startYear && 
                     calculatedHistoricalYear <= milestone.endYear
      );
      
      // Update state
      setHistoricalYear(calculatedHistoricalYear);
      setYearsPerRound(calculatedYearsPerRound);
      setCurrentMilestone(activeMilestone || null);
      
    } catch (error) {
      console.error("Error in milestone calculation:", error);
      // Don't update state on error to preserve previous valid state
    }
  }, [currentRound]);

  // Also update the slider handler to reset the timestamp
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    
    // Pause immediately
    setIsPaused(true);
    
    // Update the round directly
    const newRound = parseInt(event.target.value, 10);
    setCurrentRound(newRound);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Use a timeout to resume after some inactivity
    timeoutRef.current = window.setTimeout(() => {
      console.log("Timeout finished - unpausing");
      // Reset the timestamp reference
      lastUpdateTimeRef.current = 0;
      // Unpause to restart animation
      setIsPaused(false);
    }, 2000);
  };

  // console.log("GameInterface: Rendering JSX...");

  const timeoutRef = useRef<number | null>(null);

  // Add state for population
  const [globalPopulation, setGlobalPopulation] = useState<number>(0);

  // Add useEffect to fetch population when historicalYear changes
  useEffect(() => {
    const fetchPopulation = async () => {
      try {
        // Use relative path for API call
        const response = await fetch(`/api/global-population?year=${historicalYear}`);
        
        if (response.status === 404) {
          // Set default value for missing data instead of throwing error
          setGlobalPopulation(0);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setGlobalPopulation(data.population);
      } catch (error) {
        console.error("Error fetching population:", error);
        // Set fallback value on any error
        setGlobalPopulation(0);
      }
    };

    fetchPopulation();
  }, [historicalYear]);

  return (
    // Add a class for styling the layout
    <div className="game-interface-layout">
      <div className="counter-container">
        <TimeCounter
          yearsPerRound={yearsPerRound}
          currentRound={currentRound}
          historicalYear={historicalYear}
          totalRounds={TOTAL_ROUNDS}
        />
        <PopulationCounter 
          currentYear={historicalYear}
          population={globalPopulation}
          milestone={currentMilestone}
        />
      </div>

      {/* Restore slider container here */}
      <div className="slider-container">
        <label htmlFor="timeSlider">Round: {formatRoundNumber(currentRound)} / {formatRoundNumber(TOTAL_ROUNDS)}</label>
        <input
          type="range"
          id="timeSlider"
          min="1"
          max={TOTAL_ROUNDS} // Use the constant
          value={currentRound}
          onChange={handleSliderChange}
          className="time-slider"
        />
        <p className="slider-instruction">Use the slider to go forward and back in time.</p>
      </div>

      <div className="map-container">
         {/* Pass fetched locations to the map */}
        <MapView locations={visibleLocations} />
      </div>
    </div>
  );
};

export default GameInterface;