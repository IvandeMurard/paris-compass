/**
 * `/carte` — free exploration, in second place. w6-contexte (#119), step 4.
 *
 * **This is the old home page, moved and not rewritten.** Same `FiltersProvider`, same
 * `MapView`, same list, same sidebar. The ticket asks for a demotion, not a redesign: a
 * rewrite here would mix « the map is no longer the product » with « the map works
 * differently », and a regression in the second would be blamed on the first.
 *
 * **Why the map stops being the first thing a visitor sees.** A map serves someone looking for
 * *where to look*. A taker arrives with an address and a closed question — *does this one hold
 * up?* — and a map answers it with points to interpret. It also pushes toward comparison in
 * bulk, which `docs/PERIMETRE.md` §1 refuses by name, and a page full of dots suggests coverage
 * the corpus does not have. So it stays, for the visitor who genuinely has no address, and it
 * stays indexable: unlike `/contexte/*` there is exactly one of it.
 *
 * English path is `/en/map`, not `/en/carte` — see `src/i18n/routes.ts`.
 */

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
import { useIsMobile } from '@/hooks/use-mobile';

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

const CarteContent = () => {
  const { updateQuery } = useFiltersContext();
  const { t, locale } = useLocale();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const isMobile = useIsMobile();

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
        title={t('map.metaTitle')}
        description={t('map.metaDescription')}
        path="/carte"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Compass',
            url: locale === 'en' ? `${SITE_URL}/en/map` : `${SITE_URL}/carte`,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            inLanguage: locale === 'en' ? 'en' : 'fr-FR',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            author: { '@type': 'Person', name: 'Ivan de Murard' },
            description: t('map.metaDescription'),
          },
        ]}
      />
      <Header isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <h1 className="sr-only">{t('map.metaTitle')}</h1>

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
            {/* Mount exactly one responsive map. Keeping both variants in the DOM made two
                Leaflet instances fetch and update the same viewport, even when one was hidden. */}
            {isMobile ? (
              <div className="h-full">
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
            ) : (
              <div className="flex h-full flex-col">
                <Tabs defaultValue="map" className="flex flex-1 min-h-0 flex-col">
                  <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
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

                  <TabsContent value="map" className="mt-0 min-h-0 flex-1">
                    <MapPanel />
                  </TabsContent>

                  <TabsContent value="list" className="mt-0 min-h-0 flex-1 overflow-auto">
                    <PropertyList />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Carte = () => (
  <FiltersProvider>
    <CarteContent />
  </FiltersProvider>
);

export default Carte;
