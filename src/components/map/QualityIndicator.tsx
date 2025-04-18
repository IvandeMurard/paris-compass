
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users } from 'lucide-react';

interface QualityIndicatorProps {
  footfall?: string;
  airQuality?: string;
  noise?: string;
}

export const getQualityColor = (quality: string) => {
  switch(quality.toLowerCase()) {
    case 'excellent': return 'bg-green-100 text-green-800';
    case 'good': return 'bg-emerald-100 text-emerald-800';
    case 'moderate': return 'bg-amber-100 text-amber-800';
    case 'high':
    case 'poor': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const QualityIndicator: React.FC<QualityIndicatorProps> = ({ 
  footfall = "Medium",
  airQuality = "Good",
  noise = "Moderate"
}) => {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
      <div className="flex flex-col items-center">
        <Users size={14} className="mb-1" />
        <Badge variant="secondary" className="font-normal">
          {footfall} Footfall
        </Badge>
      </div>
      
      <div className="flex flex-col items-center">
        <BarChart3 size={14} className="mb-1" />
        <Badge variant="secondary" className={`font-normal ${getQualityColor(airQuality)}`}>
          {airQuality} Air
        </Badge>
      </div>
      
      <div className="flex flex-col items-center">
        <BarChart3 size={14} className="mb-1" />
        <Badge variant="secondary" className={`font-normal ${getQualityColor(noise)}`}>
          {noise} Noise
        </Badge>
      </div>
    </div>
  );
};

export default QualityIndicator;

