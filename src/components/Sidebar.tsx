
import React from 'react';
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import FilterSection from './sidebar/FilterSection';
import LocationFilter from './sidebar/LocationFilter';
import AccessibilityFilter from './sidebar/AccessibilityFilter';
import EnvironmentalFilter from './sidebar/EnvironmentalFilter';
import AmenitiesFilter from './sidebar/AmenitiesFilter';
import MobileResultsList from './sidebar/MobileResultsList';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar = ({ isOpen }: SidebarProps) => {
  const [query, setQuery] = React.useState('');

  const handleApplyFilters = () => {
    console.log('Applying filters...');
  };

  return (
    <div className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white shadow-lg w-80 transition-transform duration-300 z-10 overflow-y-auto 
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      
      <div className="p-4">
        {/* Natural language search */}
        <div className="mb-6">
          <div className="relative">
            <Input
              placeholder="Find a commercial space..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-10"
            />
            <Search className="absolute top-2.5 right-3 h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Try: "Find a 50m² space in the 10th arrondissement near a park"
          </p>
        </div>
        
        <FilterSection onApplyFilters={handleApplyFilters} />
        <LocationFilter />
        <AccessibilityFilter />
        <EnvironmentalFilter />
        <AmenitiesFilter />
        <MobileResultsList />
      </div>
    </div>
  );
};

export default Sidebar;
