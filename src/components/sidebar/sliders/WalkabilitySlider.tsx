
import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { BarChart3 } from 'lucide-react';

interface WalkabilitySliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
}

const WalkabilitySlider = ({ value, onValueChange }: WalkabilitySliderProps) => {
  return (
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
        value={value}
        onValueChange={onValueChange}
        className="mb-1"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{value[0]}</span>
        <span>{value[1]}</span>
      </div>
    </div>
  );
};

export default WalkabilitySlider;
