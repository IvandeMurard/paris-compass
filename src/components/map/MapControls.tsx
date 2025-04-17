
import React from 'react';

interface MapControlsProps {
  showAccessibility: boolean;
  setShowAccessibility: (show: boolean) => void;
  accessibilityType: string;
  setAccessibilityType: (type: string) => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  showAccessibility,
  setShowAccessibility,
  accessibilityType,
  setAccessibilityType
}) => {
  return (
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
  );
};

export default MapControls;
