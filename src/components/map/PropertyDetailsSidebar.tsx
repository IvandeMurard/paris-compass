
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, Euro, Ruler, Building } from 'lucide-react';

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

interface AccessibilityScore {
  type: string;
  score: number;
  minutesToAccess: number;
}

interface AccessibilityData {
  walkabilityScore: number;
  accessibilityScores: Record<string, AccessibilityScore>;
}

interface PropertyDetailsSidebarProps {
  property: Property;
  accessibilityData: AccessibilityData;
  onClose: () => void;
}

const PropertyDetailsSidebar: React.FC<PropertyDetailsSidebarProps> = ({
  property,
  accessibilityData,
  onClose
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10B981'; // green-500
    if (score >= 75) return '#34D399'; // green-400
    if (score >= 60) return '#FBBF24'; // amber-400
    if (score >= 40) return '#F59E0B'; // amber-500
    if (score >= 20) return '#EF4444'; // red-500
    return '#B91C1C'; // red-700
  };
  
  const getScoreDescription = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Very Good';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Poor';
    return 'Very Poor';
  };
  
  return (
    <div className="absolute top-4 right-4 w-72 bg-white/95 p-4 rounded-md shadow-md">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">{property.title}</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0"
          onClick={onClose}
        >
          ×
        </Button>
      </div>
      
      <div className="space-y-1 mb-3">
        <div className="flex items-center text-sm">
          <Euro size={14} className="mr-1 text-primary" />
          <span>{property.price}€/month</span>
        </div>
        <div className="flex items-center text-sm">
          <Ruler size={14} className="mr-1 text-primary" />
          <span>{property.size} m²</span>
        </div>
        <div className="flex items-center text-sm">
          <Building size={14} className="mr-1 text-primary" />
          <span className="truncate">{property.address}</span>
        </div>
      </div>
      
      <h4 className="text-sm font-medium mb-1">15-Min City Metrics</h4>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>Walkability:</span>
          <Badge 
            className="font-normal"
            style={{ backgroundColor: getScoreColor(accessibilityData.walkabilityScore) }}
          >
            {getScoreDescription(accessibilityData.walkabilityScore)}
          </Badge>
        </div>
        
        {accessibilityData.accessibilityScores && 
          Object.values(accessibilityData.accessibilityScores)
            .slice(0, 4) // Show only first 4 metrics
            .map((score: AccessibilityScore) => (
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
          console.log(`View details for property ${property.id}`);
        }}
      >
        <Info size={14} className="mr-1" /> Full Property Details
      </Button>
    </div>
  );
};

export default PropertyDetailsSidebar;
