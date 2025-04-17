
import React from 'react';
import { CircleMarker } from 'react-leaflet';
import { getScoreColor } from '@/utils/mapData';

interface AccessibilityCircleProps {
  lat: number;
  lng: number;
  score: number;
  accessibilityType: string;
  id: string;
}

const AccessibilityCircle: React.FC<AccessibilityCircleProps> = ({ 
  lat, 
  lng, 
  score,
  accessibilityType,
  id 
}) => {
  const color = getScoreColor(score);
  
  return (
    <CircleMarker
      key={`access-${id}-${accessibilityType}`}
      center={[lat, lng]}
      radius={30}
      pathOptions={{
        fillColor: color,
        fillOpacity: 0.3,
        color: color,
        weight: 1
      }}
    />
  );
};

export default AccessibilityCircle;
