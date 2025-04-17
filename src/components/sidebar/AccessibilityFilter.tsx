
import React from 'react';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart3, ShoppingCart, Leaf, MapPin } from 'lucide-react';

const AccessibilityFilter = () => {
  const accessibilityItems = [
    { name: "Groceries within 5min", icon: <ShoppingCart size={14} className="mr-2" /> },
    { name: "Parks within 10min", icon: <Leaf size={14} className="mr-2" /> },
    { name: "Public Transport within 5min", icon: <MapPin size={14} className="mr-2" /> },
    { name: "Restaurants within 5min", icon: <MapPin size={14} className="mr-2" /> },
    { name: "Healthcare within 15min", icon: <MapPin size={14} className="mr-2" /> }
  ];

  return (
    <div className="mb-4">
      <Label className="flex items-center mb-2">
        <BarChart3 size={16} className="mr-2" />
        Accessibility Requirements
      </Label>
      <div className="space-y-2">
        {accessibilityItems.map(item => (
          <div key={item.name} className="flex items-center space-x-2">
            <Checkbox id={`access-${item.name}`} />
            <label
              htmlFor={`access-${item.name}`}
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

export default AccessibilityFilter;
