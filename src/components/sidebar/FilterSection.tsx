
import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Filter, Euro, Building, MapPin, BarChart3, Tag, Baby, ShoppingCart, Wind, Waves, Leaf, Users as UsersIcon } from 'lucide-react';

interface FilterSectionProps {
  onApplyFilters: () => void;
}

const FilterSection = ({ onApplyFilters }: FilterSectionProps) => {
  const [priceRange, setPriceRange] = React.useState([500, 5000]);
  const [sizeRange, setSizeRange] = React.useState([20, 200]);
  const [walkabilityRange, setWalkabilityRange] = React.useState([30, 100]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center">
          <Filter size={16} className="mr-2" />
          Filters
        </h3>
        <Button variant="ghost" size="sm" className="text-xs h-7">Reset</Button>
      </div>
      
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
      
      {/* Walkability score slider */}
      <div className="mb-4">
        <Label htmlFor="walkability" className="flex items-center mb-2">
          <BarChart3 size={16} className="mr-2" />
          Walkability Score
        </Label>
        <Slider
          id="walkability"
          min={0}
          max={100}
          step={5}
          value={walkabilityRange}
          onValueChange={setWalkabilityRange}
          className="mb-1"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{walkabilityRange[0]}</span>
          <span>{walkabilityRange[1]}</span>
        </div>
      </div>

      <Button className="w-full" onClick={onApplyFilters}>
        Apply Filters
      </Button>
    </div>
  );
};

export default FilterSection;
