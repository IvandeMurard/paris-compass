
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Button } from "@/components/ui/button";
import { Info } from 'lucide-react';

interface Property {
  id: number;
  lat: number;
  lng: number;
  price: number;
  title: string;
  address: string;
  size: number;
  airQuality: string;
  noise: string;
  footfall: string;
}

interface PropertyMarkerProps {
  property: Property;
  onSelect: (property: Property) => void;
}

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

const PropertyMarker: React.FC<PropertyMarkerProps> = ({ property, onSelect }) => {
  const icon = createMarkerIcon(property.price);
  const position: [number, number] = [property.lat, property.lng];
  
  return (
    <Marker 
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => {
          onSelect(property);
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
              console.log(`View details for property ${property.id}`);
            }}
          >
            <Info size={14} className="mr-1" /> View Details
          </Button>
        </div>
      </Popup>
    </Marker>
  );
};

export default PropertyMarker;
