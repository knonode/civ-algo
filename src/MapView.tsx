import React, { useEffect, useRef, useState } from 'react';
// Keep L from leaflet, remove react-leaflet imports for now
import L from 'leaflet';
import { LocationData } from './interfaces'; // Import from new file

// Refined interface to match expected API response from backend/index.js
/*
interface LocationData {
  id: number;
  location: string; // Renamed from name in previous step
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
*/

interface MapViewProps {
  locations: LocationData[];
}

// REMOVE the MapBoundsUpdater component
/*
const MapBoundsUpdater: React.FC<{ locations: LocationData[] }> = ({ locations }) => {
  const map = useMap();
  useEffect(() => {
    // ... fitting logic ...
  }, [locations, map]);
  return null;
};
*/

function getImageFilename(location: string): string[] {
  // 1. Most common: remove apostrophes, keep spaces and hyphens
  const primary = location.replace(/['’]/g, '') + '.png';

  // 2. Fallback: replace spaces with hyphens, remove apostrophes
  const fallback = location.replace(/['’]/g, '').replace(/\s+/g, '-') + '.png';

  return [primary, fallback];
}

const settlementIcon = L.icon({
  iconUrl: '/icons/settlement.svg',
  iconSize: [16, 16],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const MapView: React.FC<MapViewProps> = ({ locations }) => {
  // Ref to hold the map instance
  const mapRef = useRef<L.Map | null>(null);
  // Ref for the div element where the map will be rendered
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  // State to track if map is initialized
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const renderedLocationsRef = useRef<Set<string>>(new Set());

  // Initialize plain Leaflet map on mount
  useEffect(() => {
    // Prevent double initialization
    if (mapRef.current || !mapElementRef.current) {
      return;
    }

    console.log("Initializing plain Leaflet map...");

    // Introduce a small delay
    const timerId = setTimeout(() => {
      if (!mapElementRef.current) {
        console.error("Map element ref not available inside setTimeout");
        return;
      }
      try {
        console.log("Attempting L.map inside setTimeout..."); // Log before L.map
        mapRef.current = L.map(mapElementRef.current, {
          center: [20, 0], // Initial center
          zoom: 2,        // Initial zoom
          attributionControl: false,
          zoomControl: false  // Disable zoom control buttons
        });
        console.log("L.map call completed inside setTimeout."); // Log after L.map

        // --- ADD LAYERS BACK ---
        L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' }
        ).addTo(mapRef.current);


        console.log("Plain Leaflet map initialized (L.map + Layers)."); // Updated log
        console.log("Map instance object:", mapRef.current);
        setIsMapInitialized(true);

      } catch (error) {
          console.error("*** ERROR DURING LEAFLET INITIALIZATION (inside setTimeout) ***:", error);
      }
    }, 10); // 10ms delay

    // Cleanup function to remove map and clear timeout
    return () => {
      clearTimeout(timerId); // Clear the timeout
      if (mapRef.current) {
        console.log("Removing plain Leaflet map instance.");
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapInitialized(false);
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  // Effect to add/update dynamic markers - UNCOMMENT NOW
  useEffect(() => {

    if (!mapRef.current || !isMapInitialized) {
      return;
    }

    // Ensure map is valid before proceeding
    if (!mapRef.current) {
        return;
    }

    const map = mapRef.current;

    locations.forEach((loc) => {
      if (
        typeof loc.latitude === 'number' &&
        typeof loc.longitude === 'number' &&
        !renderedLocationsRef.current.has(loc.location)
      ) {
        const imageCandidates = getImageFilename(loc.location);

        const marker = L.marker([loc.latitude, loc.longitude], {
          icon: settlementIcon
        })
        .bindPopup(
          `
          <div style="color: #eee; text-align: center; font-weight: 300; cursor: pointer;">
            <div style="margin-bottom: 4px;">${loc.location}</div>
            <img 
              src="/Settlements-pixelated/${imageCandidates[0]}" 
              alt="${loc.location}" 
              style="max-width: 120px; max-height: 80px;" 
              onerror="this.onerror=null;this.src='/Settlements-pixelated/${imageCandidates[1]}';"
            />
          </div>
          `
        )
        .addTo(map);

        marker.openPopup();

        renderedLocationsRef.current.add(loc.location);
      }
    });

  }, [locations, isMapInitialized]);

  return (
    // Div container for the Leaflet map
    // Note: height/width must be set via CSS or style prop for Leaflet to work
    <div ref={mapElementRef} style={{ height: '100%', width: '100%' }}></div>
  );
};

export default MapView; 