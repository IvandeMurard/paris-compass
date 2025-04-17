
import React from 'react';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Leaf, Wind, Waves, Users as UsersIcon } from 'lucide-react';

const EnvironmentalFilter = () => {
  const environmentalItems = [
    { name: "Good Air Quality", icon: <Wind size={14} className="mr-2" /> },
    { name: "Low Noise Pollution", icon: <Waves size={14} className="mr-2" /> },
    { name: "High Footfall", icon: <UsersIcon size={14} className="mr-2" /> }
  ];

  return (
    <div className="mb-4">
      <Label className="flex items-center mb-2">
        <Leaf size={16} className="mr-2" />
        Environmental Quality
      </Label>
      <div className="space-y-2">
        {environmentalItems.map(item => (
          <div key={item.name} className="flex items-center space-x-2">
            <Checkbox id={`env-${item.name}`} />
            <label
              htmlFor={`env-${item.name}`}
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
            >
              {item.icon} {item.name}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnvironmentalFilter;
