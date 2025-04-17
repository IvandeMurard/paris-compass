
import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Euro } from 'lucide-react';

interface PriceRangeSliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
}

const PriceRangeSlider = ({ value, onValueChange }: PriceRangeSliderProps) => {
  return (
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
        value={value}
        onValueChange={onValueChange}
        className="mb-1"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>€{value[0]}</span>
        <span>€{value[1]}</span>
      </div>
    </div>
  );
};

export default PriceRangeSlider;
