
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Filter } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import SidebarSearch from './sidebar/SidebarSearch';
import BasicFilters from './sidebar/BasicFilters';
import AccessibilityMetrics from './sidebar/AccessibilityMetrics';
import AmenitiesList from './sidebar/AmenitiesList';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar = ({ isOpen }: SidebarProps) => {
  const [query, setQuery] = useState('');
  const [priceRange, setPriceRange] = useState([500, 5000]);
  const [sizeRange, setSizeRange] = useState([20, 200]);
  const [walkabilityScore, setWalkabilityScore] = useState([0, 100]);
  const [amenityScores, setAmenityScores] = useState({
    schools: 0,
    healthcare: 0,
    groceries: 0,
    transit: 0,
    parks: 0
  });

  return (
    <div className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white shadow-lg w-80 transition-transform duration-300 z-10 overflow-y-auto 
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      
      <div className="p-4">
        <SidebarSearch query={query} setQuery={setQuery} />
        
        {/* Filters section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center">
              <Filter size={16} className="mr-2" />
              Filters
            </h3>
            <Button variant="ghost" size="sm" className="text-xs h-7">Reset</Button>
          </div>

          {/* Basic Filters */}
          <Collapsible defaultOpen className="space-y-4">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium">
              Basic Filters
            </CollapsibleTrigger>
            <CollapsibleContent>
              <BasicFilters
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                sizeRange={sizeRange}
                setSizeRange={setSizeRange}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Accessibility Metrics */}
          <Collapsible className="space-y-4 mt-6">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium">
              Accessibility Metrics
            </CollapsibleTrigger>
            <CollapsibleContent>
              <AccessibilityMetrics
                walkabilityScore={walkabilityScore}
                setWalkabilityScore={setWalkabilityScore}
                amenityScores={amenityScores}
                setAmenityScores={setAmenityScores}
              />
            </CollapsibleContent>
          </Collapsible>
          
          {/* Amenities List */}
          <AmenitiesList />
          
          <Button className="w-full mt-6" onClick={() => console.log("Apply filters")}>
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
