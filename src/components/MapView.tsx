
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, Ruler, Euro, Users, BarChart3, Building } from 'lucide-react';

import { fetchOvertureMapsData, fetch15minCityData, getScoreColor, getScoreDescription } from '@/utils/mapData';

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

// Create a custom marker icon
const createMarkerIcon = (price: number) => {
  // Different colors based on price range
  const getColor = () => {
    if (price > 4000) return '#7E69AB'; // expensive - secondary purple
    if (price > 2000) return '#9b87f5'; // medium - primary purple
    return '#D6BCFA'; // affordable - light purple
  };

  return L.divIcon({
    className: 'custom-marker-icon',
    html: `<div style="background-color: ${getColor()}; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; justify-content: center; align-items: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">€${Math.round(price/100)}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
};

// Component to update map view when accessibility layer is toggled
const MapController = ({ showAccessibility, accessibilityType }: { 
  showAccessibility: boolean;
  accessibilityType: string;
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      map.invalidateSize();
    }
  }, [map, showAccessibility, accessibilityType]);
  
  return null;
};

const MapView = () => {
  const [accessibilityData, setAccessibilityData] = useState<Record<string, any>>({});
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [accessibilityType, setAccessibilityType] = useState('walkability');
  const mapRef = useRef<L.Map | null>(null);
  
  // Style for quality indicators
  const getQualityColor = (quality: string) => {
    switch(quality.toLowerCase()) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-secondary';
      case 'moderate': return 'text-amber-500';
      case 'high':
      case 'poor': return 'text-destructive';
      default: return 'text-gray-600';
    }
  };

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

  // Paris center coordinates
  const center: [number, number] = [48.8566, 2.3522];

  return (
    <div className="relative h-full w-full">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        whenCreated={(map) => { mapRef.current = map; }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController showAccessibility={showAccessibility} accessibilityType={accessibilityType} />
        
        {/* Property markers */}
        {sampleProperties.map(property => (
          <Marker 
            key={property.id}
            position={[property.lat, property.lng]} 
            icon={createMarkerIcon(property.price)}
            eventHandlers={{
              click: () => {
                setSelectedProperty(property);
              }
            }}
          >
            <Popup>
              <div className="w-64">
                <h3 className="font-medium">{property.title}</h3>
                <p className="text-sm text-gray-500">{property.address}</p>
                <p className="text-primary font-medium mt-1">€{property.price}/month</p>
                <p className="text-sm">{property.size}m²</p>
                <div className="mt-2 flex justify-between text-xs">
                  <span className={getQualityColor(property.airQuality)}>
                    Air: {property.airQuality}
                  </span>
                  <span className={getQualityColor(property.noise)}>
                    Noise: {property.noise}
                  </span>
                  <span className={getQualityColor(property.footfall)}>
                    Footfall: {property.footfall}
                  </span>
                </div>
                <Button 
                  className="mt-2 w-full" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // This would navigate to property details in a real app
                    console.log(`View details for property ${property.id}`);
                  }}
                >
                  <Info size={14} className="mr-1" /> View Details
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Accessibility circles */}
        {showAccessibility && Object.entries(accessibilityData).map(([id, data]) => {
          const property = sampleProperties.find(p => p.id === parseInt(id));
          if (!property) return null;
          
          let score = 0;
          let color = '';
          
          if (accessibilityType === 'walkability') {
            score = data.walkabilityScore;
          } else if (data.accessibilityScores && data.accessibilityScores[accessibilityType]) {
            score = data.accessibilityScores[accessibilityType].score;
          }
          
          color = getScoreColor(score);
          
          return (
            <Circle
              key={`access-${id}-${accessibilityType}`}
              center={[property.lat, property.lng]}
              radius={300}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.3,
                color: color,
                weight: 1
              }}
            />
          );
        })}
      </MapContainer>
      
      {/* Controls overlay */}
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-md shadow-md">
        <h3 className="text-sm font-medium mb-2">Accessibility Layers</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="show-accessibility"
              className="mr-2" 
              checked={showAccessibility}
              onChange={(e) => setShowAccessibility(e.target.checked)}
            />
            <label htmlFor="show-accessibility" className="text-sm">Show Layers</label>
          </div>
          
          <div className="space-y-1">
            <select 
              className="w-full text-xs p-1 border rounded"
              value={accessibilityType}
              onChange={(e) => setAccessibilityType(e.target.value)}
              disabled={!showAccessibility}
            >
              <option value="walkability">Overall Walkability</option>
              <option value="grocery">Grocery Access</option>
              <option value="pharmacy">Pharmacy Access</option>
              <option value="park">Parks & Green Spaces</option>
              <option value="restaurant">Restaurant Access</option>
              <option value="school">School Access</option>
              <option value="healthcare">Healthcare Access</option>
              <option value="transport">Public Transport</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Selected property data */}
      {selectedProperty && accessibilityData[selectedProperty.id] && (
        <div className="absolute top-4 right-4 w-72 bg-white/95 p-4 rounded-md shadow-md">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium">{selectedProperty.title}</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => setSelectedProperty(null)}
            >
              ×
            </Button>
          </div>
          
          <div className="space-y-1 mb-3">
            <div className="flex items-center text-sm">
              <Euro size={14} className="mr-1 text-primary" />
              <span>{selectedProperty.price}€/month</span>
            </div>
            <div className="flex items-center text-sm">
              <Ruler size={14} className="mr-1 text-primary" />
              <span>{selectedProperty.size} m²</span>
            </div>
            <div className="flex items-center text-sm">
              <Building size={14} className="mr-1 text-primary" />
              <span className="truncate">{selectedProperty.address}</span>
            </div>
          </div>
          
          <h4 className="text-sm font-medium mb-1">15-Min City Metrics</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Walkability:</span>
              <Badge 
                className="font-normal"
                style={{ backgroundColor: getScoreColor(accessibilityData[selectedProperty.id].walkabilityScore) }}
              >
                {getScoreDescription(accessibilityData[selectedProperty.id].walkabilityScore)}
              </Badge>
            </div>
            
            {accessibilityData[selectedProperty.id].accessibilityScores && 
              Object.values(accessibilityData[selectedProperty.id].accessibilityScores)
                .slice(0, 4) // Show only first 4 metrics
                .map((score: any) => (
                  <div key={score.type} className="flex justify-between text-sm">
                    <span className="capitalize">{score.type}:</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs">{score.minutesToAccess} min</span>
                      <Badge 
                        className="font-normal"
                        style={{ backgroundColor: getScoreColor(score.score) }}
                      >
                        {getScoreDescription(score.score)}
                      </Badge>
                    </span>
                  </div>
                ))
            }
          </div>
          
          <Button 
            className="w-full mt-3" 
            variant="default" 
            size="sm"
            onClick={() => {
              // This would navigate to property details in a real app
              console.log(`View details for property ${selectedProperty.id}`);
            }}
          >
            <Info size={14} className="mr-1" /> Full Property Details
          </Button>
        </div>
      )}
    </div>
  );
};

export default MapView;
