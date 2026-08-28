import React, { Suspense, lazy, useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PropertyList from '@/components/PropertyList';
import NaturalLanguageSearch from '@/components/NaturalLanguageSearch';
import { Button } from '@/components/ui/button';
import { MapPin, LayoutGrid } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FiltersProvider, useFiltersContext } from '@/providers/FiltersProvider';
import { geocode } from '@/services/opendata/geocoding';
import Seo from '@/components/Seo';
import { SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';

// Leaflet and its layer code only ever run inside MapView, so the map is loaded on demand:
// that keeps the mapping library out of the bundle the page has to parse before it can paint
// its shell. The map is the default tab, so this buys first render, not bytes never fetched.
const MapView = lazy(() => import('@/components/MapView'));

/** MapView with its own boundary, so a pending map never suspends the rest of the page. */
const MapPanel = () => (
  <Suspense fallback={<div className="h-full" />}>
    <MapView />
  </Suspense>
);

const IndexContent = () => {
  const { updateQuery } = useFiltersContext();
  const { t, locale } = useLocale();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Handle window resize to auto-show sidebar on desktop
  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
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
    <div className="h-screen overflow-hidden bg-customBg font-sans flex flex-col">
      <Seo
        title={t('home.metaTitle')}
        description={t('home.metaDescription')}
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Compass',
            url: locale === 'en' ? `${SITE_URL}/en` : SITE_URL,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            inLanguage: locale === 'en' ? 'en' : 'fr-FR',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            author: { '@type': 'Person', name: 'Ivan de Murard' },
            description: t('home.metaDescription'),
          },
        ]}
      />
      <Header isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <h1 className="sr-only">{t('home.metaTitle')}</h1>


      <div className="flex flex-col flex-1 min-h-0">
        {/* Mobile search and view toggle */}
        <div className="md:hidden p-4 bg-white shadow-sm space-y-4">
          <NaturalLanguageSearch onSearch={handleSearch} className="w-full" />

          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              onClick={() => setViewMode('map')}
              className="flex-1 rounded-none"
            >
              <MapPin size={18} className="mr-1" /> {t('nav.map')}
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="flex-1 rounded-none"
            >
              <LayoutGrid size={18} className="mr-1" /> {t('view.list')}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar isOpen={isSidebarOpen} />

          {/* Main content area */}
          <div className="flex-1 min-h-0 overflow-hidden ml-0 md:ml-80">
            {/* Desktop view with tabs */}
            <div className="hidden md:flex h-full flex-col">
              <Tabs defaultValue="map" className="flex-1 min-h-0 flex flex-col">
                <div className="px-4 py-2 flex justify-between items-center border-b shrink-0">
                  <TabsList>
                    <TabsTrigger value="map" className="flex items-center">
                      <MapPin size={16} className="mr-1" /> {t('view.map')}
                    </TabsTrigger>
                    <TabsTrigger value="list" className="flex items-center">
                      <LayoutGrid size={16} className="mr-1" /> {t('view.list')}
                    </TabsTrigger>
                  </TabsList>

                  <NaturalLanguageSearch onSearch={handleSearch} className="w-96" />
                </div>

                <TabsContent value="map" className="flex-1 min-h-0 mt-0">
                  <MapPanel />
                </TabsContent>

                <TabsContent value="list" className="flex-1 min-h-0 overflow-auto mt-0">
                  <PropertyList />
                </TabsContent>
              </Tabs>
            </div>

            {/* Mobile view (conditional rendering) */}
            <div className="md:hidden h-full">
              {viewMode === 'map' ? (
                <div className="h-full">
                  <MapPanel />
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
    </div>
  );
};

const Index = () => (
  <FiltersProvider>
    <IndexContent />
  </FiltersProvider>
);

export default Index;
