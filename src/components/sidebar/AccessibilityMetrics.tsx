
import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MapPin, School, Hospital, Store, TreePine } from 'lucide-react';

interface AccessibilityMetricsProps {
  walkabilityScore: number[];
  setWalkabilityScore: (value: number[]) => void;
  amenityScores: {
    schools: number;
    healthcare: number;
    groceries: number;
    transit: number;
    parks: number;
  };
  setAmenityScores: (value: any) => void;
}

const AccessibilityMetrics = ({
  walkabilityScore,
  setWalkabilityScore,
  amenityScores,
  setAmenityScores
}: AccessibilityMetricsProps) => {
  return (
    <>
      {/* Walkability Score */}
      <div className="mb-4">
        <Label htmlFor="walkability" className="flex items-center mb-2">
          <MapPin size={16} className="mr-2" />
          Walkability Score
        </Label>
        <Slider
          id="walkability"
          min={0}
          max={100}
          step={1}
          value={walkabilityScore}
          onValueChange={setWalkabilityScore}
          className="mb-1"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{walkabilityScore[0]}</span>
          <span>{walkabilityScore[1]}</span>
        </div>
      </div>

      {/* Amenity Scores */}
      <div className="space-y-4">
        <Label className="flex items-center mb-2">Minimum Amenity Scores</Label>
        <div className="grid gap-4">
          {[
            { name: 'schools', icon: <School size={14} />, label: 'Schools' },
            { name: 'healthcare', icon: <Hospital size={14} />, label: 'Healthcare' },
            { name: 'groceries', icon: <Store size={14} />, label: 'Groceries' },
            { name: 'transit', icon: <MapPin size={14} />, label: 'Public Transit' },
            { name: 'parks', icon: <TreePine size={14} />, label: 'Parks & Recreation' }
          ].map((amenity) => (
            <div key={amenity.name} className="space-y-2">
              <Label className="flex items-center text-xs">
                {amenity.icon}
                <span className="ml-2">{amenity.label}</span>
              </Label>
              <Slider
                id={`amenity-${amenity.name}`}
                min={0}
                max={100}
                step={1}
                value={[amenityScores[amenity.name as keyof typeof amenityScores]]}
                onValueChange={(value) => setAmenityScores(prev => ({
                  ...prev,
                  [amenity.name]: value[0]
                }))}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AccessibilityMetrics;
