
import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Building } from 'lucide-react';

interface SizeRangeSliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
}

const SizeRangeSlider = ({ value, onValueChange }: SizeRangeSliderProps) => {
  return (
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
        value={value}
        onValueChange={onValueChange}
        className="mb-1"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{value[0]} m²</span>
        <span>{value[1]} m²</span>
      </div>
    </div>
  );
};

export default SizeRangeSlider;
