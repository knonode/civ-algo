import React, { useEffect, useState, useRef, useCallback } from 'react';
// import TimeCounter from './TimeCounter';
import MapView from './MapView';
import './GameInterface.css';
import './PopulationCounter.css';
import FocusChat from './components/FocusChat';
import AdminPanel from './components/AdminPanel';
import { LocationData } from './interfaces'; // Import LocationData
import { ICON_FILENAMES, getIconFilenameForType } from './iconMap';
// import PopulationCounter from './PopulationCounter';
import PopulationChart from './PopulationChart';
import TimeTable from './TimeTable';
import GlobeView from './components/GlobeView';
// Allow pointing API calls to a remote base (useful when local serverless dev is flaky on Windows)
const API_BASE: string = import.meta.env.VITE_API_BASE ?? '';

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
  { startYear: -400000, endYear: -325000, description: "Early stone tools, fire" },
  { startYear: -325000, endYear: -250000, description: "Early human migration" },
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

// Apply power to logarithmic difference at max rounds
const power = 0.7; // Accelerates early history
const maxLogDiff = Math.log(TOTAL_ROUNDS + C) - LOG_C;
const maxPoweredLogDiff = Math.pow(maxLogDiff, power);

// Calculate B_CONSTANT based on the powered difference
const B_CONSTANT = TOTAL_YEARS / maxPoweredLogDiff;

// Historical year calculation
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

// Updated Years Per Round calculation without minimum floor
const calculateYearsPerRound = (round: number): number => {
  // Ensure round >= 0
  const nonNegativeRound = Math.max(0, round);
  
  // Apply the correct derivative formula that includes the power term
  const logDiff = Math.log(nonNegativeRound + C) - LOG_C;
  
  // The derivative is: power * B_CONSTANT * (logDiff)^(power-1) * (1/(round + C))
  const rate = power * B_CONSTANT * Math.pow(logDiff, power - 1) / (nonNegativeRound + C);
  
  // Return the actual rate without a minimum floor
  return rate;
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

// Utility function to format historical years (copied from PopulationCounter)
const formatHistoricalYear = (year: number): string => {
  // Convert to positive number and add commas
  const absoluteYear = Math.abs(year).toLocaleString();
  // Add BCE for negative years, CE for positive
  return year < 0 ? `${absoluteYear} BCE` : `${absoluteYear} CE`;
};

const GameInterface: React.FC = () => {

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
  // Legend filter state: settlements icon filenames selected
  const [legendSettlementsSelected, setLegendSettlementsSelected] = useState<Set<string>>(() => new Set(ICON_FILENAMES));
  // Which settlement icon types are actually available (entered the game for current year)
  const [availableSettlementIcons, setAvailableSettlementIcons] = useState<Set<string>>(() => new Set());

  // Use a simpler play/pause state that doesn't cause conflicts
  const [isPaused, setIsPaused] = useState(false);

  // Track the last update timestamp and animation frame ID
  const lastUpdateTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Top controls accordion (styled like bottom pills)
  const [expandedTopPanel, setExpandedTopPanel] = useState<'time' | 'population-global' | 'population-user' | 'population-description' | 'civ-algo' | 'wallet' | null>(null);
  // Note: Counters replaced by pill rows; keep placeholder if reintroducing later
  // Player controls accordion (expands upward)
  const [expandedPlayerPanel, setExpandedPlayerPanel] = useState<'map-time' | 'map-legend' | 'map-focus' | 'admin' | 'search' | null>(null);

  // Add state for network selection
  const [isMainnet, setIsMainnet] = useState(false);

  // Add state for map mode
  const [mapMode, setMapMode] = useState<'2d' | '3d'>('2d');

  // Add stable references
  const anchorRefStable = useRef<HTMLElement | null>(null);
  const handleClosePopulationChart = useCallback(() => {
    setExpandedTopPanel(null);
  }, []);

  // Collapse expansions when clicking outside top or bottom controls
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const clickedInsideTop = !!target.closest('.game-controls');
      const clickedInsideBottom = !!target.closest('.player-controls');
      if (!clickedInsideTop && !clickedInsideBottom) {
        if (expandedTopPanel) setExpandedTopPanel(null);
        if (expandedPlayerPanel) setExpandedPlayerPanel(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [expandedTopPanel, expandedPlayerPanel]);

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
  }, [isPaused]);

  // Revised location fetching with better error handling
  useEffect(() => {
    // Track if component is still mounted
    let isMounted = true;
    
    const fetchLocations = async () => {
      try {
        console.log(`Fetching locations for year: ${historicalYear}`);
        // Use relative path for API call
        const response = await fetch(`${API_BASE}/api/settlements?max_year=${historicalYear}`);
        
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
        
        // Determine which settlement types are available for this year
        const availableIcons = new Set<string>();
        for (const loc of processedLocations) {
          const icon = getIconFilenameForType(loc.type_site || 'settlement');
          availableIcons.add(icon);
        }
        setAvailableSettlementIcons(availableIcons);

        // Apply legend filter for settlements (only icons that are selected)
        const filtered = processedLocations.filter((loc: LocationData) => {
          const icon = getIconFilenameForType(loc.type_site || 'settlement');
          return legendSettlementsSelected.has(icon);
        });
        setVisibleLocations(filtered);
        
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
  }, [historicalYear, legendSettlementsSelected]);

  // Legend interaction handlers (tri-state like)
  const toggleAllSettlementIcons = () => {
    const available = availableSettlementIcons;
    const selected = new Set(legendSettlementsSelected);
    let selectedAvailableCount = 0;
    available.forEach((fn) => { if (selected.has(fn)) selectedAvailableCount += 1; });

    if (available.size > 0 && selectedAvailableCount === available.size) {
      // all available -> deselect all available
      available.forEach((fn) => selected.delete(fn));
      setLegendSettlementsSelected(selected);
    } else {
      // none/partial -> select all available (keep any other selections intact)
      available.forEach((fn) => selected.add(fn));
      setLegendSettlementsSelected(selected);
    }
  };

  const toggleOneSettlementIcon = (filename: string) => {
    const next = new Set(legendSettlementsSelected);
    if (next.has(filename)) next.delete(filename); else next.add(filename);
    setLegendSettlementsSelected(next);
  };

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
    
    // Cancel any existing trend timeout
    if (trendTimeoutRef.current) {
      clearTimeout(trendTimeoutRef.current);
      trendTimeoutRef.current = null;
    }
    
    // Pause immediately
    setIsPaused(true);
    
    // Update the round directly
    const newRound = parseInt(event.target.value, 10);
    setCurrentRound(newRound);
    
    // IMPORTANT: Reset interpolation values during jumps
    setNextYearPopulation(0);
    setInterpolatedPopulation(0);
    prevPopulationRef.current = 0; // Reset previous population too
    
    // Reset trend state
    setPopulationTrend(null);
    lastTrendRef.current = null;
    
    // IMPORTANT: Calculate and update these values immediately
    const calculatedHistoricalYear = calculateHistoricalYear(newRound);
    const calculatedYearsPerRound = calculateYearsPerRound(newRound);
    
    // Update state immediately instead of waiting for useEffect
    setHistoricalYear(calculatedHistoricalYear);
    setYearsPerRound(calculatedYearsPerRound);
    
    // Find the active milestone based on the historical year
    const activeMilestone = milestoneDescriptions.find(
      milestone => calculatedHistoricalYear >= milestone.startYear && 
                   calculatedHistoricalYear <= milestone.endYear
    );
    setCurrentMilestone(activeMilestone || null);
    
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


  const timeoutRef = useRef<number | null>(null);

  // Add state for population
  const [globalPopulation, setGlobalPopulation] = useState<number>(0);

  // Add useEffect to fetch population when historicalYear changes
  useEffect(() => {
    const fetchPopulation = async () => {
      try {
        // Use relative path for API call
        const response = await fetch(`${API_BASE}/api/global-population?year=${historicalYear}`);
        
        if (response.status === 404) {
          // Set default value for missing data instead of throwing error
          setGlobalPopulation(0);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Raw population data for year ${historicalYear}: ${data.population}`);
        setGlobalPopulation(data.population);
        
        // Also fetch next year's population for interpolation
        const nextYear = historicalYear + 1;
        const nextYearResponse = await fetch(`${API_BASE}/api/global-population?year=${nextYear}`);
        
        if (nextYearResponse.ok) {
          const nextYearData = await nextYearResponse.json();
          console.log(`Raw population data for year ${nextYear}: ${nextYearData.population}`);
          setNextYearPopulation(nextYearData.population);
        }
        
      } catch (error) {
        console.error("Error fetching population:", error);
        // Set fallback value on any error
        setGlobalPopulation(0);
      }
    };

    fetchPopulation();
  }, [historicalYear]);

  // Add new state for next year's population
  const [nextYearPopulation, setNextYearPopulation] = useState<number>(0);

  // Use ref instead of state to avoid dependency issues
  const prevPopulationRef = useRef<number>(0);
  const [populationTrend, setPopulationTrend] = useState<'up' | 'down' | 'stable' | null>(null);
  const lastTrendRef = useRef<'up' | 'down' | 'stable' | null>(null);
  const trendTimeoutRef = useRef<number | null>(null);

  // Use ref to track when we last updated the trend
  const lastTrendUpdateRoundRef = useRef<number>(0);

  // Update the derived state to include trend calculation
  useEffect(() => {
    // If nextYearPopulation is available, interpolate between current and next
    if (nextYearPopulation > 0) {
      const yearProgress = (currentRound % 365) / 365;
      
      // For BCE years, time flows backwards, so we need to invert the progress
      const adjustedProgress = historicalYear < 0 ? 1 - yearProgress : yearProgress;
      
      const interpolatedPopulation = globalPopulation + 
        (nextYearPopulation - globalPopulation) * adjustedProgress;
      
      // Round to nearest integer
      const roundedPopulation = Math.round(interpolatedPopulation);
      setInterpolatedPopulation(roundedPopulation);

      // Only update trend when the round changes
      if (currentRound !== lastTrendUpdateRoundRef.current) {
        // Simple trend calculation based on previous value
        if (prevPopulationRef.current === 0) {
          // First meaningful value, initialize but don't show trend yet
          prevPopulationRef.current = roundedPopulation;
          setPopulationTrend(null);
        } else if (roundedPopulation > prevPopulationRef.current) {
          setPopulationTrend('up');
        } else if (roundedPopulation < prevPopulationRef.current) {
          setPopulationTrend('down');
        } else {
          setPopulationTrend('stable');
        }
        
        // Update previous population for next comparison
        prevPopulationRef.current = roundedPopulation;
        
        // Remember this round so we don't update again until round changes
        lastTrendUpdateRoundRef.current = currentRound;
      }
    } else {
      setInterpolatedPopulation(globalPopulation);
      setPopulationTrend(null);
    }

    // Clear timeout on unmount
    return () => {
      if (trendTimeoutRef.current) {
        clearTimeout(trendTimeoutRef.current);
      }
    };
  }, [currentRound, globalPopulation, historicalYear, nextYearPopulation]); // Include all dependencies

  // Add state for the interpolated population
  const [interpolatedPopulation, setInterpolatedPopulation] = useState<number>(0);

  // Helper to format Years/Round like TimeCounter
  const formatYearsPerRoundDisplay = (ypr: number): string => {
    const MONTHS_PER_YEAR = 12;
    const DAYS_PER_MONTH = 30.44;
    const HOURS_PER_DAY = 24;
    const MINUTES_PER_HOUR = 60;
    const SECONDS_PER_MINUTE = 60;

    if (ypr >= 1) {
      return ypr < 10 ? ypr.toFixed(2) + ' Y/R' :
             ypr < 100 ? ypr.toFixed(1) + ' Y/R' :
             Math.floor(ypr).toLocaleString() + ' Y/R';
    }

    const monthsPerRound = ypr * MONTHS_PER_YEAR;
    if (monthsPerRound >= 1) return monthsPerRound.toFixed(1) + ' M/R';

    const daysPerRound = monthsPerRound * DAYS_PER_MONTH;
    if (daysPerRound >= 1) return daysPerRound.toFixed(1) + ' D/R';

    const hoursPerRound = daysPerRound * HOURS_PER_DAY;
    if (hoursPerRound >= 1) return hoursPerRound.toFixed(1) + ' H/R';

    const minutesPerRound = hoursPerRound * MINUTES_PER_HOUR;
    if (minutesPerRound >= 1) return minutesPerRound.toFixed(1) + ' Min/R';

    const secondsPerRound = minutesPerRound * SECONDS_PER_MINUTE;
    return secondsPerRound.toFixed(1) + ' S/R';
  };

  return (
    <div className="game-interface-layout">
      <div className="game-controls">
        {/* Top row */}
        <div className="player-row">
          <div className="player-row-controls player-row-pills">
            <span
              className={`player-pill ${expandedTopPanel === 'civ-algo' ? 'active' : ''}`}
              onClick={() => setExpandedTopPanel(expandedTopPanel === 'civ-algo' ? null : 'civ-algo')}
            >
              CIV.ALGO
            </span>
            <span
              className={`player-pill`}
              onClick={() => setIsMainnet(!isMainnet)}
              title="Toggle network"
            >
              {isMainnet ? 'MAINNET' : 'TESTNET'}
            </span>
            <span
              className={`player-pill ${expandedTopPanel === 'wallet' ? 'active' : ''}`}
              onClick={() => setExpandedTopPanel(expandedTopPanel === 'wallet' ? null : 'wallet')}
            >
              WALLET
            </span>
          </div>
        </div>
        {expandedTopPanel === 'civ-algo' && (
          <div className="player-expansion">
            <div className="expansion-content">
              <h4>
                Get access to the game by minting a civ.algo segment at{' '}
                <a
                  href="https://app.nf.domains/name/civ.algo?view=segments"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-text-primary)', textDecoration: 'underline' }}
                >
                  NFDomains
                </a>
              </h4>
              <p>An on-chain civ-like simulation game across history of Sapiens.</p>
              <div className="links">
                <a href="https://docs.google.com/presentation/d/1tcXTQ7dKaslwGiP8009Dx3SKE6Bua-oMhh5abNbf_kY/edit?usp=sharing" target="_blank" rel="noopener noreferrer">Documentation</a>
                <a href="https://discord.gg/M3Tz4GtFcr" target="_blank" rel="noopener noreferrer">Discord</a>
                <a href="https://x.com/hampelman_nft" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
              </div>
            </div>
          </div>
        )}
        {expandedTopPanel === 'wallet' && (
          <div className="player-expansion">
            <div className="expansion-content">
              <h4>Connect Wallet</h4>
              <div className="wallet-buttons">
                <button className="wallet-btn">Pera</button>
                <button className="wallet-btn">Defly</button>
                <button className="wallet-btn">Lute</button>
                <button className="wallet-btn">Exodus</button>
              </div>
            </div>
          </div>
        )}

        {/* Second row */}
        <div className="player-row">
          <div className="player-row-controls player-row-pills">
            <span
              className={`player-pill ${expandedTopPanel === 'time' ? 'active' : ''}`}
              onClick={() => setExpandedTopPanel(expandedTopPanel === 'time' ? null : 'time')}
              title="View time mechanics"
            >
              {`${formatHistoricalYear(historicalYear)}`}
            </span>
            <span
              className={`player-pill ${expandedTopPanel === 'time' ? 'active' : ''}`}
              onClick={() => setExpandedTopPanel(expandedTopPanel === 'time' ? null : 'time')}
              title="View time mechanics"
            >
              {`R ${formatRoundNumber(currentRound)}/${formatRoundNumber(TOTAL_ROUNDS)}`}
            </span>
            <span
              className={`player-pill ${expandedTopPanel === 'time' ? 'active' : ''}`}
              onClick={() => setExpandedTopPanel(expandedTopPanel === 'time' ? null : 'time')}
              title="View time mechanics"
            >
              {formatYearsPerRoundDisplay(yearsPerRound)}
            </span>
          </div>
        </div>
        {expandedTopPanel === 'time' && (
          <div className="player-expansion">
            <div className="expansion-content">
              <div className="time-expansion">
                <TimeTable currentRound={currentRound} totalRounds={TOTAL_ROUNDS} />
              </div>
            </div>
          </div>
        )}

        {/* Third row */}
        <div className="player-row">
          <div className="player-row-controls player-row-pills">
            <span
              className={`player-pill ${expandedTopPanel === 'population-global' ? 'active' : ''}`}
              onClick={() => setExpandedTopPanel(expandedTopPanel === 'population-global' ? null : 'population-global')}
            >
              {interpolatedPopulation.toLocaleString()}
              {populationTrend && (
                <span className={`trend-arrow ${populationTrend}`} style={{ marginLeft: 6 }}>
                  {populationTrend === 'up' ? '▲' : populationTrend === 'down' ? '▼' : '-'}
                </span>
              )}
            </span>
            <span
              className={`player-pill ${expandedTopPanel === 'population-user' ? 'active' : ''}`}
              onClick={() => setExpandedTopPanel(expandedTopPanel === 'population-user' ? null : 'population-user')}
            >
              Your ppl
            </span>
            <span
              className={`player-pill milestone-pill ${expandedTopPanel === 'population-description' ? 'active' : ''}`}
              onClick={() => setExpandedTopPanel(expandedTopPanel === 'population-description' ? null : 'population-description')}
              title={currentMilestone ? currentMilestone.description : 'Period milestone'}
            >
              {currentMilestone ? currentMilestone.description : 'Period milestone'}
            </span>
          </div>
        </div>
        {expandedTopPanel === 'population-global' && (
          <div className="player-expansion">
            <div className="expansion-content">
              <div className="population-global-expansion">
                <PopulationChart
                  isExpanded={true}
                  onClose={handleClosePopulationChart}
                  anchorRef={anchorRefStable}
                  embedded={true}
                />
              </div>
            </div>
          </div>
        )}
        {expandedTopPanel === 'population-user' && (
          <div className="player-expansion">
            <div className="expansion-content">
              <div className="expansion-placeholder">
                <h4>Your Population Chart</h4>
                <p>Your population growth chart will appear here</p>
                <p>Placeholder for future implementation</p>
              </div>
            </div>
          </div>
        )}
        {expandedTopPanel === 'population-description' && currentMilestone && (
          <div className="player-expansion">
            <div className="expansion-content">
              <div className="population-description-expansion">
                <div className="milestone-expansion">
                  <h4>{currentMilestone.description}</h4>
                  <div className="milestone-years">
                    {formatHistoricalYear(currentMilestone.startYear)} - {formatHistoricalYear(currentMilestone.endYear)}
                  </div>
                  <div className="milestone-summary">
                    <p>Placeholder for historical period summary.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Counters replaced by pill rows above */}
      </div>

      <div className="map-container">
        {mapMode === '2d' ? (
          <MapView locations={visibleLocations} />
        ) : (
          <GlobeView locations={visibleLocations} />
        )}
      </div>

      {/* Player Controls (bottom, expands upward from its row) */}
      <div className="player-controls">
        <div className="player-rows">
          {/* Time Machine group (expansion appears ABOVE its row) */}
          {expandedPlayerPanel === 'map-time' && (
            <div className="player-expansion">
              <div className="expansion-content">
                <div className="player-row-controls">
                  <span className="player-slider-label">R{formatRoundNumber(currentRound)}/{formatRoundNumber(TOTAL_ROUNDS)}</span>
                  <input
                    type="range"
                    id="timeSlider"
                    min="1"
                    max={TOTAL_ROUNDS}
                    value={currentRound}
                    onChange={handleSliderChange}
                    className="time-slider time-slider-compact"
                  />
                </div>
              </div>
            </div>
          )}
          
          {expandedPlayerPanel === 'map-focus' && (
            <div className="player-expansion">
              <div className="expansion-content">
                <FocusChat />
              </div>
            </div>
          )}
          {expandedPlayerPanel === 'admin' && (
            <div className="player-expansion">
              <div className="expansion-content">
                <AdminPanel />
              </div>
            </div>
          )}
          <div className={`player-row map-row ${expandedPlayerPanel && expandedPlayerPanel.startsWith('map-') ? 'active' : ''}`}>
            <div className="player-row-controls player-row-pills">
              <span
                className={`player-pill ${expandedPlayerPanel === 'map-time' ? 'active' : ''}`}
                onClick={() => setExpandedPlayerPanel(expandedPlayerPanel === 'map-time' ? null : 'map-time')}
              >
                TIMELINE
              </span>
              <span
                className={`player-pill ${expandedPlayerPanel === 'admin' ? 'active' : ''}`}
                onClick={() => setExpandedPlayerPanel(expandedPlayerPanel === 'admin' ? null : 'admin')}
              >
                ADMIN
              </span>
              <span
                className={`player-pill ${expandedPlayerPanel === 'map-focus' ? 'active' : ''}`}
                onClick={() => setExpandedPlayerPanel(expandedPlayerPanel === 'map-focus' ? null : 'map-focus')}
              >
                FOCUS
              </span>
            </div>
          </div>

          {/* Expansions between rows for MAP row neighbors (LEGEND, SEARCH) */}
          {expandedPlayerPanel === 'map-legend' && (
            <div className="player-expansion">
              <div className="expansion-content">
                <h4>Map Legend</h4>
                <div className="legend-grid">
                  {/* Settlements category */}
                  <div className="legend-category">
                    <div className="legend-cat-header">
                      <label className={`checkbox compact${availableSettlementIcons.size === 0 ? ' disabled' : ''}`}>
                        <input
                          type="checkbox"
                          disabled={availableSettlementIcons.size === 0}
                          checked={(() => {
                            if (availableSettlementIcons.size === 0) return false;
                            let count = 0; availableSettlementIcons.forEach((fn) => { if (legendSettlementsSelected.has(fn)) count += 1; });
                            return count === availableSettlementIcons.size;
                          })()}
                          ref={(el) => {
                            if (el) {
                              let count = 0; availableSettlementIcons.forEach((fn) => { if (legendSettlementsSelected.has(fn)) count += 1; });
                              el.indeterminate = availableSettlementIcons.size > 0 && count > 0 && count < availableSettlementIcons.size;
                            }
                          }}
                          onChange={toggleAllSettlementIcons}
                        />
                        <span>Settlements</span>
                      </label>
                    </div>
                    <div className="legend-sublist">
                      {ICON_FILENAMES.map((fn) => {
                        const isAvailable = availableSettlementIcons.has(fn);
                        return (
                          <label className={`checkbox compact${!isAvailable ? ' disabled' : ''}`} key={fn} title={fn.replace('.svg','')}>
                            <input
                              type="checkbox"
                              disabled={!isAvailable}
                              checked={legendSettlementsSelected.has(fn)}
                              onChange={() => toggleOneSettlementIcon(fn)}
                            />
                            <span>{fn.replace('.svg','')}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cities category (disabled) */}
                  <div className="legend-category">
                    <div className="legend-cat-header">
                      <label className="checkbox compact disabled">
                        <input type="checkbox" disabled />
                        <span>Cities</span>
                      </label>
                    </div>
                    <div className="legend-sublist">
                      {['coast','river','altitude','mono','metropol','megalopolis','city-state'].map((s) => (
                        <label className="checkbox compact disabled" key={s}>
                          <input type="checkbox" disabled />
                          <span>{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Empires category (disabled) */}
                  <div className="legend-category">
                    <div className="legend-cat-header">
                      <label className="checkbox compact disabled">
                        <input type="checkbox" disabled />
                        <span>Empires</span>
                      </label>
                    </div>
                    <div className="legend-sublist">
                      {['territorial','maritime','informal'].map((s) => (
                        <label className="checkbox compact disabled" key={s}>
                          <input type="checkbox" disabled />
                          <span>{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Countries category (disabled) */}
                  <div className="legend-category">
                    <div className="legend-cat-header">
                      <label className="checkbox compact disabled">
                        <input type="checkbox" disabled />
                        <span>Countries</span>
                      </label>
                    </div>
                    <div className="legend-sublist">
                      {['democratic','autocratic','developing'].map((s) => (
                        <label className="checkbox compact disabled" key={s}>
                          <input type="checkbox" disabled />
                          <span>{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Specialists category (disabled) */}
                  <div className="legend-category">
                    <div className="legend-cat-header">
                      <label className="checkbox compact disabled">
                        <input type="checkbox" disabled />
                        <span>Specialists</span>
                      </label>
                    </div>
                    <div className="legend-sublist">
                      {['art','fundamental','applied','medicine','economy','social','politics','military','frontier'].map((s) => (
                        <label className="checkbox compact disabled" key={s}>
                          <input type="checkbox" disabled />
                          <span>{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {expandedPlayerPanel === 'search' && (
            <div className="player-expansion">
              <div className="expansion-content">
                <h4>Search</h4>
                <p>Search tools placeholder</p>
              </div>
            </div>
          )}

          <div className={`player-row ${expandedPlayerPanel === 'admin' || expandedPlayerPanel === 'search' ? 'active' : ''}`}>
            <div className="player-row-controls player-row-pills">
              <span
                className="player-pill"
                onClick={() => setMapMode(mapMode === '2d' ? '3d' : '2d')}
                title="Toggle between 2D and 3D map"
              >
                MAP
              </span>
              <span
                className={`player-pill ${expandedPlayerPanel === 'map-legend' ? 'active' : ''}`}
                onClick={() => setExpandedPlayerPanel(expandedPlayerPanel === 'map-legend' ? null : 'map-legend')}
              >
                LEGEND
              </span>
              <span
                className={`player-pill ${expandedPlayerPanel === 'search' ? 'active' : ''}`}
                onClick={() => setExpandedPlayerPanel(expandedPlayerPanel === 'search' ? null : 'search')}
              >
                SEARCH
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameInterface;