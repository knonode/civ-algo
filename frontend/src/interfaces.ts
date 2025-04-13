// src/interfaces.ts

// Define the interface for location data used throughout the app
export interface LocationData {
  id: number;
  location: string;
  type_site: string;
  latitude: number;
  longitude: number;
  established_year: number;
  picture: string | null;
  culture: string | null;
  unesco_whs: string | null;
  type_icon: string | null;
  continent: string | null;
  region: string | null;
  country: string | null;
  hist_period: string | null;
} 