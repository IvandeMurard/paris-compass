
import React from 'react';
import { Circle } from 'react-leaflet';
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
    <Circle
      key={`access-${id}-${accessibilityType}`}
      center={[lat, lng]}
      radius={300}
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
