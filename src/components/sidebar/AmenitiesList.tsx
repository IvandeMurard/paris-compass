
import React from 'react';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, TreePine, ShoppingCart, Baby } from 'lucide-react';
import { Tag } from 'lucide-react';

interface AmenitiesListProps {
  selectedAmenities: string[];
  onAmenityToggle: (amenity: string) => void;
}

const AmenitiesList = ({ selectedAmenities, onAmenityToggle }: AmenitiesListProps) => {
  return (
    <div className="mb-4">
      <Label className="flex items-center mb-2">
        <Tag size={16} className="mr-2" />
        Amenities
      </Label>
      <div className="space-y-2">
        {[
          { name: "Metro Station", icon: <MapPin size={14} className="mr-2" /> },
          { name: "Park", icon: <TreePine size={14} className="mr-2" /> },
          { name: "Shopping Center", icon: <ShoppingCart size={14} className="mr-2" /> },
          { name: "Restaurant Area", icon: <MapPin size={14} className="mr-2" /> },
          { name: "Parking Available", icon: <MapPin size={14} className="mr-2" /> },
          { name: "Daycare", icon: <Baby size={14} className="mr-2" /> },
          { name: "Markets", icon: <ShoppingCart size={14} className="mr-2" /> }
        ].map(amenity => (
          <div key={amenity.name} className="flex items-center space-x-2">
            <Checkbox 
              id={`amenity-${amenity.name}`}
              checked={selectedAmenities.includes(amenity.name)}
              onCheckedChange={() => onAmenityToggle(amenity.name)}
            />
            <label
              htmlFor={`amenity-${amenity.name}`}
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
            >
              {amenity.icon} {amenity.name}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AmenitiesList;
