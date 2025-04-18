
import React from 'react';
import { Button } from "@/components/ui/button";
import { Filter } from 'lucide-react';
import SidebarSearch from './sidebar/SidebarSearch';
import BasicFilters from './sidebar/BasicFilters';
import AccessibilityMetrics from './sidebar/AccessibilityMetrics';
import AmenitiesList from './sidebar/AmenitiesList';
import { useFilters } from '@/hooks/useFilters';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar = ({ isOpen }: SidebarProps) => {
  const {
    filters,
    updateQuery,
    updatePriceRange,
    updateSizeRange,
    updateWalkabilityScore,
    updateAmenityScores,
    toggleAmenity
  } = useFilters();

  return (
    <div className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white shadow-lg w-80 transition-transform duration-300 z-10 overflow-y-auto 
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      
      <div className="p-4">
        <SidebarSearch query={filters.query} setQuery={updateQuery} />
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center">
              <Filter size={16} className="mr-2" />
              Filters
            </h3>
            <Button variant="ghost" size="sm" className="text-xs h-7">Reset</Button>
          </div>

          <BasicFilters
            priceRange={filters.priceRange}
            setPriceRange={updatePriceRange}
            sizeRange={filters.sizeRange}
            setSizeRange={updateSizeRange}
          />

          <AccessibilityMetrics
            walkabilityScore={filters.walkabilityScore}
            setWalkabilityScore={updateWalkabilityScore}
            amenityScores={filters.amenityScores}
            setAmenityScores={updateAmenityScores}
          />
          
          <AmenitiesList 
            selectedAmenities={filters.selectedAmenities}
            onAmenityToggle={toggleAmenity}
          />
          
          <Button className="w-full mt-6" onClick={() => console.log("Apply filters", filters)}>
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
