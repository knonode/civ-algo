import React, { useEffect, useRef, useState } from 'react';
// Keep L from leaflet, remove react-leaflet imports for now
import L from 'leaflet';
import { LocationData } from './interfaces'; // Import from new file
import { getIconFilenameForType } from './iconMap';

// Extend Window interface for our global function
declare global {
  interface Window {
    toggleSettlementDetails?: (settlementId: number, imageElement: HTMLElement) => void;
  }
}
import './MapView.css';

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

// Function to map type_site values to appropriate icon filenames
const getIconForType = (typeSite: string): string => getIconFilenameForType(typeSite);

// Function to create icon with optional UNESCO overlay
const createMarkerIcon = (typeSite: string, hasUnesco: boolean): L.Icon | L.DivIcon => {
  const iconFilename = getIconForType(typeSite);
  
  if (!hasUnesco) {
    // Simple icon without UNESCO overlay
    return L.icon({
      iconUrl: `/icons/${iconFilename}`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8]
    });
  } else {
    // Create composite icon with UNESCO badge
    // For UNESCO sites, we'll create a div icon that can contain both images
    return L.divIcon({
      html: `
        <div style="position: relative; width: 20px; height: 20px;">
          <img src="/icons/${iconFilename}" style="width: 16px; height: 16px; position: absolute; left: 0; top: 0;" />
          <img src="/icons/unesco.svg" style="width: 8px; height: 8px; position: absolute; right: 0; top: 0; background: white; border-radius: 50%; padding: 1px;" />
        </div>
      `,
      className: 'custom-marker-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10]
    });
  }
};

const MapView: React.FC<MapViewProps> = ({ locations }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  // Track currently rendered markers by location name
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    window.toggleSettlementDetails = (settlementId: number) => {
      const detailsElement = document.getElementById(`details-${settlementId}`);
      if (detailsElement) {
        const isVisible = detailsElement.style.display !== 'none';
        detailsElement.style.display = isVisible ? 'none' : 'block';
      }
    };
    return () => {
      delete window.toggleSettlementDetails;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current || !mapElementRef.current) {
      return;
    }

    // Capture refs in local variables for cleanup
    let localMap: L.Map | null = null;
    const localMarkerMap = markerMapRef.current;

    const timerId = setTimeout(() => {
      if (!mapElementRef.current) return;
      try {
        localMap = L.map(mapElementRef.current, {
          center: [20, 0],
          zoom: 2,
          attributionControl: false,
          zoomControl: false
        });
        mapRef.current = localMap;
        L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' }
        ).addTo(localMap);
        setIsMapInitialized(true);
      } catch (error) {
        console.error("*** ERROR DURING LEAFLET INITIALIZATION (inside setTimeout) ***:", error);
      }
    }, 10);

    return () => {
      clearTimeout(timerId);
      // Use captured locals instead of refs in cleanup
      for (const [, marker] of localMarkerMap) {
        marker.remove();
      }
      localMarkerMap.clear();
      if (localMap) {
        localMap.remove();
      }
      mapRef.current = null;
      setIsMapInitialized(false);
    };
  }, []);

  // Reconcile markers with incoming locations on every change
  useEffect(() => {
    if (!mapRef.current || !isMapInitialized) return;
    const map = mapRef.current;

    const incoming = new Set(locations.map(l => l.location));

    // Remove markers for locations that are no longer present
    for (const [locName, marker] of markerMapRef.current) {
      if (!incoming.has(locName)) {
        marker.removeFrom(map);
        markerMapRef.current.delete(locName);
      }
    }

    // Add markers for new locations
    locations.forEach((loc) => {
      if (
        typeof loc.latitude === 'number' &&
        typeof loc.longitude === 'number' &&
        !markerMapRef.current.has(loc.location)
      ) {
        const imageCandidates = getImageFilename(loc.location);
        const markerIcon = createMarkerIcon(loc.type_site || 'settlement', !!loc.unesco_whs);

        const marker = L.marker([loc.latitude, loc.longitude], { icon: markerIcon })
          .bindPopup(`
            <div style="color: var(--color-text-primary); text-align: center; font-weight: 300;">
              <div style="margin-bottom: 4px;">${loc.location}</div>
              <img 
                src="/Settlements-pixelated/${imageCandidates[0]}" 
                alt="${loc.location}" 
                style="max-width: 120px; max-height: 80px; cursor: pointer;" 
                onerror="this.onerror=null;this.src='/Settlements-pixelated/${imageCandidates[1]}';"
                onclick="window.toggleSettlementDetails && window.toggleSettlementDetails(${loc.id})"
              />
              <div id="details-${loc.id}" class="settlement-card-details" style="display: none;">
                <div class="detail-row">
                  <span class="detail-value">${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}</span>
                </div>
                ${loc.type_site ? `<div class="detail-row"><span class="detail-value">${loc.type_site.replace('.svg', '')}</span></div>` : ''}
                <div class="detail-row">
                  <span class="detail-value">${loc.culture || 'culture n/a'}</span>
                </div>
                ${loc.country ? `<div class="detail-row"><span class="detail-value">${loc.country}</span></div>` : ''}
                ${loc.continent ? `<div class="detail-row"><span class="detail-value">${loc.continent}</span></div>` : ''}
                ${loc.established_year ? `<div class="detail-row"><span class="detail-value">${formatYear(loc.established_year)}</span></div>` : ''}
                ${loc.hist_period ? `<div class="detail-row"><span class="detail-value">${loc.hist_period}</span></div>` : ''}
                ${loc.unesco_whs ? `<div class="detail-row"><span class="detail-value">${loc.unesco_whs}</span></div>` : ''}
              </div>
            </div>
          `)
          .addTo(map);

        // Open popup so the settlement image is visible when marker appears
        marker.openPopup();

        markerMapRef.current.set(loc.location, marker);
      }
    });
  }, [locations, isMapInitialized]);

  const formatYear = (year: number): string => {
    if (year < 0) return `${Math.abs(year)} BCE`;
    return `${year} CE`;
  };

  return (
    <div ref={mapElementRef} style={{ height: '100%', width: '100%' }}></div>
  );
};

export default MapView; 