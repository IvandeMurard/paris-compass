
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapLayers } from '@/hooks/useMapLayers';
import QualityIndicator from './map/QualityIndicator';

const MapView = () => {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [dataLayer, setDataLayer] = useState<'walkability' | 'accessibility' | 'none'>('walkability');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapRef.current).setView([48.8566, 2.3522], 12);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | <a href="https://overturemaps.org">OvertureMaps</a> | <a href="https://15mincity.ai">15mincity.ai</a>',
        maxZoom: 19
      }).addTo(map);

      setMapLoaded(true);

      return () => {
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, []);

  // Initialize and manage map layers
  const { walkabilityLayer, accessibilityLayer } = useMapLayers(mapInstanceRef.current);

  // Update data layer visibility
  useEffect(() => {
    if (!mapInstanceRef.current || !walkabilityLayer || !accessibilityLayer) return;
    
    walkabilityLayer.remove();
    accessibilityLayer.remove();
    
    if (dataLayer === 'walkability') {
      walkabilityLayer.addTo(mapInstanceRef.current);
    } else if (dataLayer === 'accessibility') {
      accessibilityLayer.addTo(mapInstanceRef.current);
    }
  }, [dataLayer, walkabilityLayer, accessibilityLayer]);

  const selectedAreaIndicators = {
    airQuality: 'Good',
    noise: 'Moderate',
    greenSpaces: 'Nearby'
  };

  return (
    <div className="relative h-full w-full bg-[#f5f5f5]">
      <div ref={mapRef} className="h-full w-full" />

      {/* Data layer controls */}
      <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-md shadow-md z-[1000]">
        <h3 className="text-sm font-medium mb-2">Data Layers</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input 
              type="radio" 
              id="layer-none" 
              name="dataLayer" 
              checked={dataLayer === 'none'} 
              onChange={() => setDataLayer('none')} 
            />
            <label htmlFor="layer-none" className="text-sm">None</label>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="radio" 
              id="layer-walkability" 
              name="dataLayer" 
              checked={dataLayer === 'walkability'} 
              onChange={() => setDataLayer('walkability')} 
            />
            <label htmlFor="layer-walkability" className="text-sm">15mincity.ai Walkability</label>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="radio" 
              id="layer-accessibility" 
              name="dataLayer" 
              checked={dataLayer === 'accessibility'} 
              onChange={() => setDataLayer('accessibility')} 
            />
            <label htmlFor="layer-accessibility" className="text-sm">15mincity.ai Accessibility</label>
          </div>
        </div>
      </div>

      {/* Selected property info */}
      {selectedProperty && (
        <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded-md shadow-md max-w-md z-[1000]">
          <h3 className="font-medium mb-1">{selectedProperty.title}</h3>
          <p className="text-sm text-gray-600 mb-2">{selectedProperty.address}</p>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="font-medium">{selectedProperty.price}€/month</span>
              <span className="text-gray-500 text-xs">Price</span>
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{selectedProperty.size}m²</span>
              <span className="text-gray-500 text-xs">Size</span>
            </div>
          </div>
          
          <QualityIndicator 
            footfall={selectedProperty.footfall}
            airQuality={selectedProperty.airQuality}
            noise={selectedProperty.noise}
          />
        </div>
      )}

      {/* Overlay with environmental indicators */}
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-md shadow-md z-[1000]">
        <h3 className="text-sm font-medium mb-1">Environmental Indicators</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Air Quality:</span>
            <span className={`font-medium`}>
              {selectedAreaIndicators.airQuality}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Noise Pollution:</span>
            <span className={`font-medium`}>
              {selectedAreaIndicators.noise}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Green Spaces:</span>
            <span className="text-secondary font-medium">
              {selectedAreaIndicators.greenSpaces}
            </span>
          </div>
        </div>
      </div>

      {/* Loading placeholder */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;

