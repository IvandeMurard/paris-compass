import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MapView from '@/components/MapView';
import PropertyList from '@/components/PropertyList';
import NaturalLanguageSearch from '@/components/NaturalLanguageSearch';
import { Button } from '@/components/ui/button';
import { MapPin, LayoutGrid } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiltersProvider, useFiltersContext } from '@/providers/FiltersProvider';
import { geocode } from '@/services/opendata/geocoding';
import Seo from '@/components/Seo';
import HomeContent from '@/components/HomeContent';
import SiteFooter from '@/components/SiteFooter';
import { FAQ } from '@/content/faq';
import { SITE_URL } from '@/content/site';

const IndexContent = () => {
  const { updateQuery } = useFiltersContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map'); // Changed default to 'map'


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

  // Geocode the query with the Base Adresse Nationale, then filter on the matched address.
  const handleSearch = async (query: string) => {
    const [match] = await geocode(query, 1);
    updateQuery(match ? match.label : query);
  };

  return (
    <div className="min-h-screen bg-customBg font-sans flex flex-col">
      <Seo
        title="Compass — trouver un local commercial en Île-de-France par son environnement"
        description="Carte gratuite des locaux commerciaux d’Île-de-France replacés dans leur environnement : commerces, transports, écoles, bruit, qualité de l’air et loyers de référence, à partir de données publiques."
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Compass',
            url: SITE_URL,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            inLanguage: 'fr-FR',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            author: { '@type': 'Person', name: 'Ivan de Murard' },
            description:
              'Recherche de locaux commerciaux en Île-de-France contextualisée par des données publiques : marchabilité, flux estimé, bruit, qualité de l’air, risques et loyers de référence.',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.slice(0, 5).map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ]}
      />
      <Header isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-col flex-1 h-[calc(100vh-4rem)]">
        {/* Mobile search and view toggle */}
        <div className="md:hidden p-4 bg-white shadow-sm space-y-4">
          <NaturalLanguageSearch onSearch={handleSearch} className="w-full" />
          
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant={viewMode === 'map' ? 'default' : 'ghost'} 
              onClick={() => setViewMode('map')}
              className="flex-1 rounded-none"
            >
              <MapPin size={18} className="mr-1" /> Map
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'ghost'} 
              onClick={() => setViewMode('list')}
              className="flex-1 rounded-none"
            >
              <LayoutGrid size={18} className="mr-1" /> List
            </Button>
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={isSidebarOpen} />
          
          {/* Main content area */}
          <div className="flex-1 overflow-hidden ml-0 md:ml-80">
            {/* Desktop view with tabs */}
            <div className="hidden md:block h-full">
              <Tabs defaultValue="map" className="h-full"> {/* Changed default to map */}
                <div className="px-4 pt-4 flex justify-between items-center border-b">
                  <TabsList>
                    <TabsTrigger value="map" className="flex items-center">
                      <MapPin size={16} className="mr-1" /> Map View
                    </TabsTrigger>
                    <TabsTrigger value="list" className="flex items-center">
                      <LayoutGrid size={16} className="mr-1" /> List View
                    </TabsTrigger>
                  </TabsList>
                  
                  <NaturalLanguageSearch onSearch={handleSearch} className="w-96" />
                </div>
                
                <TabsContent value="map" className="h-[calc(100%-57px)] mt-0">
                  <MapView />
                </TabsContent>

                <TabsContent value="list" className="h-[calc(100%-57px)] overflow-auto mt-0">
                  <PropertyList />
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Mobile view (conditional rendering) */}
            <div className="md:hidden h-full">
              {viewMode === 'map' ? (
                <div className="h-full">
                  <MapView />
                </div>
              ) : (
                <div className="h-full overflow-auto">
                  <PropertyList />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <HomeContent />
      <SiteFooter />
    </div>
  );
};

const Index = () => (
  <FiltersProvider>
    <IndexContent />
  </FiltersProvider>
);

export default Index;
