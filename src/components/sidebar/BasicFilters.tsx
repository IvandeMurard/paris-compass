
import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Euro, Building, MapPin } from 'lucide-react';

interface BasicFiltersProps {
  priceRange: number[];
  setPriceRange: (value: number[]) => void;
  sizeRange: number[];
  setSizeRange: (value: number[]) => void;
}

const BasicFilters = ({ priceRange, setPriceRange, sizeRange, setSizeRange }: BasicFiltersProps) => {
  return (
    <>
      {/* Price range slider */}
      <div className="mb-4">
        <Label htmlFor="price" className="flex items-center mb-2">
          <Euro size={16} className="mr-2" />
          Monthly Rent (€)
        </Label>
        <Slider
          id="price"
          min={0}
          max={10000}
          step={100}
          value={priceRange}
          onValueChange={setPriceRange}
          className="mb-1"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>€{priceRange[0]}</span>
          <span>€{priceRange[1]}</span>
        </div>
      </div>

      {/* Size range slider */}
      <div className="mb-4">
        <Label htmlFor="size" className="flex items-center mb-2">
          <Building size={16} className="mr-2" />
          Size (m²)
        </Label>
        <Slider
          id="size"
          min={0}
          max={500}
          step={10}
          value={sizeRange}
          onValueChange={setSizeRange}
          className="mb-1"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{sizeRange[0]} m²</span>
          <span>{sizeRange[1]} m²</span>
        </div>
      </div>

      {/* Arrondissement checkboxes */}
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
    </>
  );
};

export default BasicFilters;
