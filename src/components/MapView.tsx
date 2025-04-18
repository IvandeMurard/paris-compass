
import React, { useState, useEffect, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import { sampleProperties } from './PropertyList';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Sample walkability data for different areas (would come from 15mincity.ai API)
const walkabilityData = [
  { center: [48.8566, 2.3522] as [number, number], radius: 1000, score: 90, color: '#4ade80' }, // 1st arrondissement
  { center: [48.8728, 2.3378] as [number, number], radius: 800, score: 85, color: '#86efac' },  // 9th arrondissement
  { center: [48.8534, 2.3751] as [number, number], radius: 900, score: 80, color: '#bbf7d0' },  // 11th arrondissement
  { center: [48.8448, 2.3505] as [number, number], radius: 700, score: 75, color: '#d9f99d' },  // 5th arrondissement
  { center: [48.8673, 2.2898] as [number, number], radius: 1200, score: 65, color: '#fef08a' }, // 16th arrondissement
  { center: [48.8703, 2.3072] as [number, number], radius: 1100, score: 70, color: '#fde047' }  // 8th arrondissement
];

// Sample accessibility data (would come from 15mincity.ai API)
const accessibilityData = {
  schools: [
    { position: [48.8546, 2.3470] as [number, number], radius: 500, score: 95 },
    { position: [48.8670, 2.3210] as [number, number], radius: 450, score: 90 },
    { position: [48.8490, 2.3380] as [number, number], radius: 600, score: 85 }
  ],
  groceries: [
    { position: [48.8566, 2.3500] as [number, number], radius: 600, score: 90 },
    { position: [48.8700, 2.3400] as [number, number], radius: 500, score: 85 },
    { position: [48.8530, 2.3700] as [number, number], radius: 550, score: 80 }
  ],
  healthcare: [
    { position: [48.8580, 2.3450] as [number, number], radius: 700, score: 85 },
    { position: [48.8650, 2.3300] as [number, number], radius: 650, score: 80 },
    { position: [48.8510, 2.3650] as [number, number], radius: 800, score: 75 }
  ]
};

const MapView = () => {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [dataLayer, setDataLayer] = useState('walkability'); // 'walkability', 'accessibility', or 'none'
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const walkabilityLayerRef = useRef(null);
  const accessibilityLayerRef = useRef(null);

  // Style for quality indicators
  const getQualityColor = (quality) => {
    switch(quality.toLowerCase()) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-secondary';
      case 'moderate': return 'text-amber-500';
      case 'high':
      case 'poor': return 'text-destructive';
      default: return 'text-gray-600';
    }
  };

  // Initialize map when component mounts
  useEffect(() => {
    // Skip if we're server-side rendering or the map is already loaded
    if (typeof window === 'undefined' || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    try {
      // Create a custom icon for the property markers
      const propertyIcon = L.icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        shadowSize: [41, 41]
      });

      // Create the map instance
      const map = L.map(mapRef.current).setView([48.8566, 2.3522], 12);
      mapInstanceRef.current = map;

      // Add OvertureMaps as the base layer
      // Note: In a real implementation, you'd need an API key for OvertureMaps
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | <a href="https://overturemaps.org">OvertureMaps</a> | <a href="https://15mincity.ai">15mincity.ai</a>',
        maxZoom: 19
      }).addTo(map);

      // Create a layer group for property markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Create layer groups for data visualizations
      const walkabilityLayer = L.layerGroup();
      walkabilityLayerRef.current = walkabilityLayer;
      
      const accessibilityLayer = L.layerGroup();
      accessibilityLayerRef.current = accessibilityLayer;

      // Add property markers
      sampleProperties.forEach(property => {
        const marker = L.marker([property.lat, property.lng], { icon: propertyIcon })
          .bindPopup(`
            <div class="p-2">
              <h3 class="font-bold">${property.title}</h3>
              <p>${property.address}</p>
              <p>${property.price}€/month | ${property.size}m²</p>
            </div>
          `);
        
        marker.on('click', () => {
          setSelectedProperty(property);
        });
        
        markersLayer.addLayer(marker);
      });

      // Add walkability data visualization
      walkabilityData.forEach(area => {
        const circle = L.circle(area.center, {
          radius: area.radius,
          color: area.color,
          fillOpacity: 0.4,
          weight: 1
        }).bindTooltip(`Walkability Score: ${area.score}/100`);
        
        walkabilityLayer.addLayer(circle);
      });

      // Add accessibility data visualization
      const accessibilityColors = {
        schools: '#3b82f6', // blue
        groceries: '#10b981', // green
        healthcare: '#ef4444' // red
      };

      Object.entries(accessibilityData).forEach(([type, locations]) => {
        locations.forEach(location => {
          const circle = L.circle(location.position, {
            radius: location.radius,
            color: accessibilityColors[type as keyof typeof accessibilityColors],
            fillOpacity: 0.3,
            weight: 1
          }).bindTooltip(`${type.charAt(0).toUpperCase() + type.slice(1)} Access: ${location.score}/100`);
          
          accessibilityLayer.addLayer(circle);
        });
      });

      // Set initial data layer visibility
      if (dataLayer === 'walkability') {
        walkabilityLayer.addTo(map);
      } else if (dataLayer === 'accessibility') {
        accessibilityLayer.addTo(map);
      }

      setMapLoaded(true);
      
      // Clean up on unmount
      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, []);

  // Update data layer visibility when selection changes
  useEffect(() => {
    if (!mapInstanceRef.current || !walkabilityLayerRef.current || !accessibilityLayerRef.current) return;
    
    const map = mapInstanceRef.current;
    const walkabilityLayer = walkabilityLayerRef.current;
    const accessibilityLayer = accessibilityLayerRef.current;
    
    // Remove all data layers first
    walkabilityLayer.remove();
    accessibilityLayer.remove();
    
    // Add the selected data layer
    if (dataLayer === 'walkability') {
      walkabilityLayer.addTo(map);
    } else if (dataLayer === 'accessibility') {
      accessibilityLayer.addTo(map);
    }
  }, [dataLayer]);

  // Selected area indicators
  const selectedAreaIndicators = {
    airQuality: 'Good',
    noise: 'Moderate',
    greenSpaces: 'Nearby'
  };

  return (
    <div className="relative h-full w-full bg-[#f5f5f5]">
      {/* The map container */}
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
            <div className="flex flex-col">
              <span className={`font-medium ${getQualityColor(selectedProperty.footfall)}`}>{selectedProperty.footfall}</span>
              <span className="text-gray-500 text-xs">Footfall</span>
            </div>
            <div className="flex flex-col">
              <span className={`font-medium ${getQualityColor(selectedProperty.airQuality)}`}>{selectedProperty.airQuality}</span>
              <span className="text-gray-500 text-xs">Air Quality</span>
            </div>
          </div>
        </div>
      )}

      {/* Overlay with environmental indicators */}
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-md shadow-md z-[1000]">
        <h3 className="text-sm font-medium mb-1">Environmental Indicators</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Air Quality:</span>
            <span className={`font-medium ${getQualityColor(selectedAreaIndicators.airQuality)}`}>
              {selectedAreaIndicators.airQuality}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Noise Pollution:</span>
            <span className={`font-medium ${getQualityColor(selectedAreaIndicators.noise)}`}>
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
