import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Search, Filter, LayoutGrid, MapPin, Euro, Building, Tag, Baby, ShoppingCart, School, Hospital, Book, Store, TreePine } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar = ({ isOpen }: SidebarProps) => {
  const [query, setQuery] = useState('');
  const [priceRange, setPriceRange] = useState([500, 5000]);
  const [sizeRange, setSizeRange] = useState([20, 200]);
  const [walkabilityScore, setWalkabilityScore] = useState([0, 100]);
  
  // New state for accessibility scores
  const [amenityScores, setAmenityScores] = useState({
    schools: 0,
    healthcare: 0,
    groceries: 0,
    transit: 0,
    parks: 0
  });
  
  // This would be replaced with actual data from an API
  const fakePropertyResults = [
    { id: 1, title: 'Commercial Space in 11th', price: 1750, size: 45, address: '23 Rue de la Roquette, 75011 Paris' },
    { id: 2, title: 'Office in 9th', price: 3200, size: 85, address: '15 Rue de la Chaussée d\'Antin, 75009 Paris' },
    { id: 3, title: 'Retail Space in 1st', price: 4500, size: 120, address: '5 Rue de Rivoli, 75001 Paris' },
  ];
  
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
        
        {/* Filters section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center">
              <Filter size={16} className="mr-2" />
              Filters
            </h3>
            <Button variant="ghost" size="sm" className="text-xs h-7">Reset</Button>
          </div>

          {/* Existing filters */}
          <Collapsible defaultOpen className="space-y-4">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium">
              Basic Filters
            </CollapsibleTrigger>
            <CollapsibleContent>
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
              
              {/* Arrondissement checkboxes */}
              <div className="mb-4">
                <Label className="flex items-center mb-2">
                  <MapPin size={16} className="mr-2" />
                  Arrondissement
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} className="flex items-center space-x-1">
                      <Checkbox id={`arr-${i+1}`} />
                      <label
                        htmlFor={`arr-${i+1}`}
                        className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {i+1}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* New 15-minute city metrics */}
          <Collapsible className="space-y-4 mt-6">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium">
              Accessibility Metrics
            </CollapsibleTrigger>
            <CollapsibleContent>
              {/* Walkability Score */}
              <div className="mb-4">
                <Label htmlFor="walkability" className="flex items-center mb-2">
                  <MapPin size={16} className="mr-2" />
                  Walkability Score
                </Label>
                <Slider
                  id="walkability"
                  min={0}
                  max={100}
                  step={1}
                  value={walkabilityScore}
                  onValueChange={setWalkabilityScore}
                  className="mb-1"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{walkabilityScore[0]}</span>
                  <span>{walkabilityScore[1]}</span>
                </div>
              </div>

              {/* Amenity Scores */}
              <div className="space-y-4">
                <Label className="flex items-center mb-2">
                  <Tag size={16} className="mr-2" />
                  Minimum Amenity Scores
                </Label>
                
                <div className="grid gap-4">
                  {[
                    { name: 'schools', icon: <School size={14} />, label: 'Schools' },
                    { name: 'healthcare', icon: <Hospital size={14} />, label: 'Healthcare' },
                    { name: 'groceries', icon: <Store size={14} />, label: 'Groceries' },
                    { name: 'transit', icon: <MapPin size={14} />, label: 'Public Transit' },
                    { name: 'parks', icon: <TreePine size={14} />, label: 'Parks & Recreation' }
                  ].map((amenity) => (
                    <div key={amenity.name} className="space-y-2">
                      <Label className="flex items-center text-xs">
                        {amenity.icon}
                        <span className="ml-2">{amenity.label}</span>
                      </Label>
                      <Slider
                        id={`amenity-${amenity.name}`}
                        min={0}
                        max={100}
                        step={1}
                        value={[amenityScores[amenity.name as keyof typeof amenityScores]]}
                        onValueChange={(value) => setAmenityScores(prev => ({
                          ...prev,
                          [amenity.name]: value[0]
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          {/* Amenities checkboxes */}
          <div className="mb-4 mt-6">
            <Label className="flex items-center mb-2">
              <Tag size={16} className="mr-2" />
              Amenities
            </Label>
            <div className="space-y-2">
              {[
                { name: "Metro Station", icon: <MapPin size={14} className="mr-2" /> },
                { name: "Park", icon: <TreePine size={14} className="mr-2" /> },
                { name: "Shopping Center", icon: <ShoppingCart size={14} className="mr-2" /> },
                { name: "Restaurant Area", icon: <MapPin size={14} className="mr-2" /> },
                { name: "Parking Available", icon: <MapPin size={14} className="mr-2" /> },
                { name: "Daycare", icon: <Baby size={14} className="mr-2" /> },
                { name: "Markets", icon: <ShoppingCart size={14} className="mr-2" /> }
              ].map(amenity => (
                <div key={amenity.name} className="flex items-center space-x-2">
                  <Checkbox id={`amenity-${amenity.name}`} />
                  <label
                    htmlFor={`amenity-${amenity.name}`}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                  >
                    {amenity.icon} {amenity.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <Button className="w-full mt-6" onClick={() => console.log("Apply filters")}>
            Apply Filters
          </Button>
        </div>
        
        {/* Results list for mobile view */}
        <div className="md:hidden">
          <h3 className="font-medium flex items-center mb-4">
            <LayoutGrid size={16} className="mr-2" />
            Results
          </h3>
          
          <div className="space-y-4">
            {fakePropertyResults.map(property => (
              <div key={property.id} className="bg-muted rounded-md p-3">
                <h4 className="font-medium">{property.title}</h4>
                <p className="text-primary font-medium">€{property.price}/month</p>
                <p className="text-sm">{property.size} m²</p>
                <p className="text-xs text-muted-foreground">{property.address}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
