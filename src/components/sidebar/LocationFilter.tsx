
import React from 'react';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin } from 'lucide-react';

const LocationFilter = () => {
  return (
    <div className="mb-4">
      <Label className="flex items-center mb-2">
        <MapPin size={16} className="mr-2" />
        Arrondissement
      </Label>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="flex items-center space-x-1">
            <Checkbox id={`arr-${i+1}`} />
            <label
              htmlFor={`arr-${i+1}`}
              className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {i+1}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocationFilter;
