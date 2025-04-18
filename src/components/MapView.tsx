
import React from 'react';
import { Badge } from "@/components/ui/badge";

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

const MapView = () => {
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

  const selectedAreaIndicators = {
    airQuality: 'Good',
    noise: 'Moderate',
    greenSpaces: 'Nearby'
  };

  return (
    <div className="relative h-full w-full bg-[#f5f5f5]">
      {/* Placeholder for map - in full implementation, this would be the Leaflet map */}
      <div className="h-full w-full flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-lg font-medium mb-4">Interactive Property Map</h2>
          <p className="text-gray-600 mb-6">
            This would be an interactive map showing {sampleProperties.length} commercial properties in Île-de-France.
          </p>
          
          <div className="grid grid-cols-1 gap-4">
            {sampleProperties.map((property) => (
              <div key={property.id} className="bg-muted p-3 rounded-md border border-gray-200 text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{property.title}</h3>
                    <p className="text-sm text-gray-500">{property.address}</p>
                  </div>
                  <Badge className="bg-primary">{property.price}€/mo</Badge>
                </div>
                
                <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                  <div className="text-center">
                    <span className={`block ${getQualityColor(property.footfall)}`}>{property.footfall}</span>
                    <span className="text-gray-500">Footfall</span>
                  </div>
                  <div className="text-center">
                    <span className={`block ${getQualityColor(property.airQuality)}`}>{property.airQuality}</span>
                    <span className="text-gray-500">Air</span>
                  </div>
                  <div className="text-center">
                    <span className={`block ${getQualityColor(property.noise)}`}>{property.noise}</span>
                    <span className="text-gray-500">Noise</span>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  <p>Located at {property.lat.toFixed(4)}, {property.lng.toFixed(4)} • {property.size}m²</p>
                </div>
              </div>
            ))}
          </div>
          
          <p className="mt-6 text-sm text-gray-500">
            In the full implementation, this would be an interactive Leaflet map with clickable property markers and detailed information popups.
          </p>
        </div>
      </div>

      {/* Overlay with environmental indicators */}
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-md shadow-md">
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
    </div>
  );
};

export default MapView;
