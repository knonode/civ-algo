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

const MapView: React.FC<MapViewProps> = ({ locations }) => {
  // Ref to hold the map instance
  const mapRef = useRef<L.Map | null>(null);
  // Ref for the div element where the map will be rendered
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  // State to track if map is initialized
  const [isMapInitialized, setIsMapInitialized] = useState(false);

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
          attributionControl: false
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
    console.log(`Dynamic Marker useEffect triggered. Received ${locations.length} locations:`, locations);

    if (!mapRef.current || !isMapInitialized) {
      console.log("Map not ready for dynamic markers yet...");
      return;
    }
    // Log the map instance *inside this effect*
    console.log("Map instance inside dynamic marker effect:", mapRef.current);

    // Ensure map is valid before proceeding
    if (!mapRef.current) {
        console.error("Map instance became null before loops!");
        return;
    }

    console.log("Updating dynamic markers on plain Leaflet map...");
    const map = mapRef.current;

    // --- Clear existing dynamic markers (simple approach) ---
    map.eachLayer((layer) => {
        // Check if it's a CircleMarker and NOT the hardcoded one
        if (layer instanceof L.CircleMarker && layer.getLatLng().lat !== 51.505) {
            console.log("Clearing dynamic marker:", layer);
            map.removeLayer(layer);
        }
    });
    console.log("Finished marker clearing process.");
    // --- End Clear ---

    // Add log immediately before the add loop
    console.log("Attempting locations.forEach loop...");
    // Add new markers
    console.log("Starting adding new markers process...");
    // Log length immediately before loop
    console.log("Locations length before forEach:", locations.length);
    locations.forEach((loc) => {
      // Add try...catch inside the loop callback
      try {
        if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
          console.log(`INSIDE LOOP: Adding marker for ${loc.location} at [${loc.latitude}, ${loc.longitude}]`);
          L.circleMarker([loc.latitude, loc.longitude], {
            radius: 5,
            fillColor: "#ffd700",
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          })
          .bindPopup(`<b>${loc.location}</b><br/>Type: ${loc.type_site}`)
          .addTo(map);
        } else {
            console.log(`INSIDE LOOP: Skipping invalid location: ${loc.location}`);
        }
      } catch(loopError) {
        console.error("*** ERROR INSIDE forEach loop ***:", loopError, "for location:", loc);
      }
    });
    console.log("Finished adding dynamic markers loop.");

  }, [locations, isMapInitialized]); // Add locations and isMapInitialized back

  return (
    // Div container for the Leaflet map
    // Note: height/width must be set via CSS or style prop for Leaflet to work
    <div ref={mapElementRef} style={{ height: '600px', width: '100%' }}></div>
  );
};

export default MapView; 