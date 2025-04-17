import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MapView from '@/components/MapView';
import PropertyList from '@/components/PropertyList';
import NaturalLanguageSearch from '@/components/NaturalLanguageSearch';
import { Button } from '@/components/ui/button';
import { MapPin, LayoutGrid } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle window resize to auto-show sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle search queries
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // In a real implementation, this would trigger a search API call
    console.log(`Searching for: ${query}`);
  };

  return (
    <div className="min-h-screen bg-customBg font-sans flex flex-col">
      <Header isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-col flex-1 h-[calc(100vh-4rem)]">
        {/* Mobile search and view toggle */}
        <div className="md:hidden p-4 bg-white shadow-sm">
          <NaturalLanguageSearch onSearch={handleSearch} className="mb-4" />
          
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant={viewMode === 'list' ? 'default' : 'ghost'} 
              onClick={() => setViewMode('list')}
              className="flex-1 rounded-none"
            >
              <LayoutGrid size={18} className="mr-1" /> List
            </Button>
            <Button 
              variant={viewMode === 'map' ? 'default' : 'ghost'} 
              onClick={() => setViewMode('map')}
              className="flex-1 rounded-none"
            >
              <MapPin size={18} className="mr-1" /> Map
            </Button>
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar with filters */}
          <Sidebar isOpen={isSidebarOpen} />
          
          {/* Main content area */}
          <div className="flex-1 overflow-hidden ml-0 md:ml-80">
            {/* Desktop view with tabs */}
            <div className="hidden md:block h-full">
              <Tabs defaultValue="list" className="h-full">
                <div className="px-4 pt-4 flex justify-between items-center border-b">
                  <TabsList>
                    <TabsTrigger value="list" className="flex items-center">
                      <LayoutGrid size={16} className="mr-1" /> List View
                    </TabsTrigger>
                    <TabsTrigger value="map" className="flex items-center">
                      <MapPin size={16} className="mr-1" /> Map View
                    </TabsTrigger>
                  </TabsList>
                  
                  <NaturalLanguageSearch onSearch={handleSearch} className="w-96" />
                </div>
                
                <TabsContent value="list" className="h-[calc(100%-57px)] overflow-auto mt-0">
                  <PropertyList />
                </TabsContent>
                
                <TabsContent value="map" className="h-[calc(100%-57px)] mt-0">
                  <MapView />
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Mobile view (conditional rendering) */}
            <div className="md:hidden h-full">
              {viewMode === 'list' ? (
                <div className="h-full overflow-auto">
                  <PropertyList />
                </div>
              ) : (
                <div className="h-full">
                  <MapView />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
