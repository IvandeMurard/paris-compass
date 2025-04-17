
import React from 'react';
import { Button } from "@/components/ui/button";
import { Filter } from 'lucide-react';
import PriceRangeSlider from './sliders/PriceRangeSlider';
import SizeRangeSlider from './sliders/SizeRangeSlider';
import WalkabilitySlider from './sliders/WalkabilitySlider';

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
      
      <PriceRangeSlider value={priceRange} onValueChange={setPriceRange} />
      <SizeRangeSlider value={sizeRange} onValueChange={setSizeRange} />
      <WalkabilitySlider value={walkabilityRange} onValueChange={setWalkabilityRange} />

      <Button className="w-full" onClick={onApplyFilters}>
        Apply Filters
      </Button>
    </div>
  );
};

export default FilterSection;
