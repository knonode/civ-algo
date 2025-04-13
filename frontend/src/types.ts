// Simple type definitions for the project

export interface MilestoneSegment {
  startRound: number;
  endRound: number;
  description: string;
  startYear: number; // Calculated year (guaranteed number when passed as prop)
  endYear: number;   // Calculated year (guaranteed number when passed as prop)
} 