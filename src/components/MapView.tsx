
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { fetch15minCityData } from '@/utils/mapData';
import PropertyMarker from './map/PropertyMarker';
import AccessibilityCircle from './map/AccessibilityCircle';
import PropertyDetailsSidebar from './map/PropertyDetailsSidebar';
import MapControls from './map/MapControls';

// Sample property data that would come from an API
const sampleProperties = [
  { 
    id: 1, 
    lat: 48.8582, 
    lng: 2.3387, 
    price: 1750, 
    title: 'Commercial Space in 11th',
    address: '23 Rue de la Roquette, 75011 Paris',
    size: 45,
    airQuality: 'Good',
    noise: 'Moderate',
    footfall: 'High'
  },
  { 
    id: 2, 
    lat: 48.8742, 
    lng: 2.3470, 
    price: 3200, 
    title: 'Office in 9th',
    address: '15 Rue de la Chaussée d\'Antin, 75009 Paris',
    size: 85,
    airQuality: 'Moderate',
    noise: 'High',
    footfall: 'Very High'
  },
  { 
    id: 3, 
    lat: 48.8566, 
    lng: 2.3522, 
    price: 4500, 
    title: 'Retail Space in 1st',
    address: '5 Rue de Rivoli, 75001 Paris',
    size: 120,
    airQuality: 'Moderate',
    noise: 'High',
    footfall: 'Excellent'
  }
];

// MapSetup component to handle map reference and initialization
const MapSetup = ({ onMapReady }: { onMapReady: (map: L.Map) => void }) => {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  
  return null;
};

const MapView = () => {
  const [accessibilityData, setAccessibilityData] = useState<Record<string, any>>({});
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [accessibilityType, setAccessibilityType] = useState('walkability');
  const mapRef = useRef<L.Map | null>(null);
  
  console.log("Rendering MapView component");
  
  // Load accessibility data for the entire area
  useEffect(() => {
    const fetchData = async () => {
      const data: Record<string, any> = {};
      
      // Fetch data for each property
      for (const property of sampleProperties) {
        try {
          const accessData = await fetch15minCityData(property.lat, property.lng);
          data[property.id] = accessData;
        } catch (error) {
          console.error(`Error fetching data for property ${property.id}:`, error);
        }
      }
      
      setAccessibilityData(data);
    };
    
    fetchData();
  }, []);
  
  // Handle map reference
  const handleMapReady = (map: L.Map) => {
    console.log("Map is ready");
    mapRef.current = map;
  };

  // Paris center coordinates
  const center: [number, number] = [48.8566, 2.3522];

  return (
    <div className="relative h-full w-full">
      <MapContainer 
        className="h-full w-full" 
        center={center}
        zoom={13}
        scrollWheelZoom={true}
      >
        <MapSetup onMapReady={handleMapReady} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Property markers */}
        {sampleProperties.map(property => (
          <PropertyMarker 
            key={property.id}
            property={property}
            onSelect={setSelectedProperty}
          />
        ))}
        
        {/* Accessibility circles */}
        {showAccessibility && Object.entries(accessibilityData).map(([id, data]) => {
          const property = sampleProperties.find(p => p.id === parseInt(id));
          if (!property) return null;
          
          let score = 0;
          
          if (accessibilityType === 'walkability') {
            score = data.walkabilityScore;
          } else if (data.accessibilityScores && data.accessibilityScores[accessibilityType]) {
            score = data.accessibilityScores[accessibilityType].score;
          }
          
          return (
            <AccessibilityCircle
              key={`access-${id}-${accessibilityType}`}
              lat={property.lat}
              lng={property.lng}
              score={score}
              accessibilityType={accessibilityType}
              id={id}
            />
          );
        })}
      </MapContainer>
      
      {/* Map controls overlay */}
      <MapControls
        showAccessibility={showAccessibility}
        setShowAccessibility={setShowAccessibility}
        accessibilityType={accessibilityType}
        setAccessibilityType={setAccessibilityType}
      />
      
      {/* Selected property data */}
      {selectedProperty && accessibilityData[selectedProperty.id] && (
        <PropertyDetailsSidebar
          property={selectedProperty}
          accessibilityData={accessibilityData[selectedProperty.id]}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
};

export default MapView;
