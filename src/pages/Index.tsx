import React, { Suspense, lazy, useState, useEffect } from 'react';
import Header from '@/components/Header';
import PropertyList from '@/components/PropertyList';
import NaturalLanguageSearch from '@/components/NaturalLanguageSearch';
import FiltersSheet from '@/components/FiltersSheet';
import HeroOverlay from '@/components/home/HeroOverlay';
import { Button } from '@/components/ui/button';
import { MapPin, LayoutGrid, ListFilter } from 'lucide-react';
import { FiltersProvider, useFiltersContext } from '@/providers/FiltersProvider';
import { geocode } from '@/services/opendata/geocoding';
import Seo from '@/components/Seo';
import { SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';
import { useIsMobile } from '@/hooks/use-mobile';

const MapView = lazy(() => import('@/components/MapView'));

const HERO_DISMISSED_KEY = 'compass_hero_dismissed';

const MapPanel = () => (
  <Suspense fallback={<div className="h-full" />}>
    <MapView />
  </Suspense>
);

const IndexContent = () => {
  const { updateQuery } = useFiltersContext();
  const { t, locale } = useLocale();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [heroDismissed, setHeroDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(HERO_DISMISSED_KEY) === '1';
  });

  const dismissHero = () => {
    setHeroDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(HERO_DISMISSED_KEY, '1');
    }
  };

  const handleSearch = async (query: string) => {
    dismissHero();
    const [match] = await geocode(query, 1);
    updateQuery(match ? match.label : query);
  };

  return (
    <div className="h-screen overflow-hidden bg-background font-sans flex flex-col">
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

      <Header filtersTrigger={<FiltersSheet />} />
      <h1 className="sr-only">{t('home.metaTitle')}</h1>

      <div className="relative flex flex-1 min-h-0">
        {/* Map is always mounted, list view overlays it on mobile */}
        <div className="relative flex-1 min-h-0">
          <MapPanel />

          {!heroDismissed && (
            <HeroOverlay
              hidden={heroDismissed}
              onExplore={dismissHero}
              onSearch={handleSearch}
            />
          )}

          {/* Floating map/list toggle and search on desktop */}
          {!isMobile && (
            <div className="absolute left-1/2 top-4 z-[1000] w-[min(42rem,calc(100%-2rem))] -translate-x-1/2">
              <div className="flex items-center gap-2 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur-sm">
                <div className="flex rounded-lg border bg-muted p-0.5">
                  <Button
                    variant={viewMode === 'map' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('map')}
                    className="gap-1"
                  >
                    <MapPin size={16} /> {t('nav.map')}
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="gap-1"
                  >
                    <LayoutGrid size={16} /> {t('view.list')}
                  </Button>
                </div>
                <div className="flex-1">
                  <NaturalLanguageSearch onSearch={handleSearch} className="w-full" />
                </div>
              </div>
            </div>
          )}

          {/* Desktop list panel slides over the map */}
          {!isMobile && viewMode === 'list' && (
            <div className="absolute inset-0 z-[1000] bg-background overflow-auto">
              <div className="mx-auto max-w-6xl px-6 py-6">
                <PropertyList />
              </div>
            </div>
          )}
        </div>

        {/* Mobile bottom controls */}
        {isMobile && (
          <div className="absolute bottom-4 left-1/2 z-[1000] w-[min(24rem,calc(100%-2rem))] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full border bg-background/95 p-1.5 shadow-lg backdrop-blur-sm">
              <FiltersSheet>
                <Button variant="ghost" size="sm" className="gap-1 rounded-full">
                  <ListFilter size={16} /> {t('filters.title')}
                </Button>
              </FiltersSheet>
              <NaturalLanguageSearch onSearch={handleSearch} className="flex-1" />
              <div className="flex rounded-full border bg-muted p-0.5">
                <Button
                  variant={viewMode === 'map' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('map')}
                  className="h-8 w-8 rounded-full"
                >
                  <MapPin size={16} />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 rounded-full"
                >
                  <LayoutGrid size={16} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile list view */}
        {isMobile && viewMode === 'list' && (
          <div className="absolute inset-0 z-[1000] bg-background overflow-auto">
            <PropertyList />
          </div>
        )}
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
