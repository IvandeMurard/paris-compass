import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapLayers } from '@/hooks/useMapLayers';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Locate, Navigation2, Loader2 } from 'lucide-react';
import { usePremises, useAreaEnvironment } from '@/hooks/useOpenData';
import { useFiltersContext } from '@/providers/FiltersProvider';
import type { BBox } from '@/services/opendata/types';
import DataSourcesPanel from './DataSourcesPanel';
import OpenDataErrorNotice from './OpenDataErrorNotice';
import { useLocale } from '@/i18n/locale';
import { translateLabel } from '@/i18n/labels';

const MapView = () => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [dataLayer, setDataLayer] = useState<'walkability' | 'accessibility' | 'none'>('walkability');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const { t, locale } = useLocale();
  const { matches, bbox, setBbox } = useFiltersContext();
  const { data, isFetching, isError, error, refetch, tooLarge } = usePremises(bbox);
  const premises = useMemo(() => (data?.premises ?? []).filter(matches), [data, matches]);
  const pois = useMemo(() => data?.pois ?? [], [data]);

  const center = { lat: (bbox.south + bbox.north) / 2, lng: (bbox.west + bbox.east) / 2 };
  const { data: environment } = useAreaEnvironment(center.lat, center.lng);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([48.8655, 2.3475], 16);
    mapInstanceRef.current = map;
    setMapInstance(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        locale === 'en'
          ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · open data Etalab, City of Paris, Copernicus'
          : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · données ouvertes Etalab, Ville de Paris, Copernicus',
      maxZoom: 19,
    }).addTo(map);

    const syncBounds = () => {
      const bounds = map.getBounds();
      setBbox({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      });
    };
    syncBounds();
    map.on('moveend', syncBounds);

    setMapLoaded(true);

    return () => {
      map.off('moveend', syncBounds);
      map.remove();
      mapInstanceRef.current = null;
      setMapInstance(null);
    };
  }, []);

  const { walkabilityLayer, accessibilityLayer } = useMapLayers(mapInstance, premises, pois);

  useEffect(() => {
    if (!mapInstanceRef.current || !walkabilityLayer || !accessibilityLayer) return;

    walkabilityLayer.remove();
    accessibilityLayer.remove();

    if (dataLayer === 'walkability') {
      walkabilityLayer.addTo(mapInstanceRef.current);
    } else if (dataLayer === 'accessibility') {
      accessibilityLayer.addTo(mapInstanceRef.current);
    }
  }, [dataLayer, walkabilityLayer, accessibilityLayer]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleLocate = () =>
    navigator.geolocation.getCurrentPosition(
      (position) =>
        mapInstanceRef.current?.setView([position.coords.latitude, position.coords.longitude], 15),
      (error) => console.error('Error getting location:', error),
    );
  const handleResetView = () => mapInstanceRef.current?.setView([48.8655, 2.3475], 16);

  return (
    <div className="relative h-full w-full bg-[#f5f5f5]">
      <div ref={mapRef} className="h-full w-full" />

      {/* Centred, not tucked into the layers panel: an empty map is read as an answer unless
          the failure is put where the answer would have been. */}
      {isError && (
        <OpenDataErrorNotice
          error={error}
          onRetry={() => refetch()}
          className="absolute left-1/2 top-20 z-[1100] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2"
        />
      )}



      <div className="absolute left-4 top-4 flex flex-col gap-2 z-[1000]">
        <Button variant="secondary" size="icon" aria-label={t('map.zoomIn')} onClick={handleZoomIn} className="bg-white hover:bg-gray-100">
          <ZoomIn className="h-4 w-4 text-gray-700" />
        </Button>
        <Button variant="secondary" size="icon" aria-label={t('map.zoomOut')} onClick={handleZoomOut} className="bg-white hover:bg-gray-100">
          <ZoomOut className="h-4 w-4 text-gray-700" />
        </Button>
        <Button variant="secondary" size="icon" aria-label={t('map.locate')} onClick={handleLocate} className="bg-white hover:bg-gray-100">
          <Locate className="h-4 w-4 text-gray-700" />
        </Button>
        <Button variant="secondary" size="icon" aria-label={t('map.reset')} onClick={handleResetView} className="bg-white hover:bg-gray-100">
          <Navigation2 className="h-4 w-4 text-gray-700" />
        </Button>
      </div>

      {/* Data layer controls */}
      <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-md shadow-md z-[1000] w-56">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">{t('map.layers')}</h3>
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <div className="space-y-2">
          {[
            { id: 'none', label: t('map.layer.none') },
            { id: 'walkability', label: t('map.layer.walkability') },
            { id: 'accessibility', label: t('map.layer.amenities') },
          ].map((layer) => (
            <div key={layer.id} className="flex items-center gap-2">
              <input
                type="radio"
                id={`layer-${layer.id}`}
                name="dataLayer"
                checked={dataLayer === layer.id}
                onChange={() => setDataLayer(layer.id as typeof dataLayer)}
              />
              <label htmlFor={`layer-${layer.id}`} className="text-sm">
                {layer.label}
              </label>
            </div>
          ))}
        </div>
        {/* Four distinct states. A viewport still loading must never read as an empty
            result — that was the single most misleading thing about this panel. */}
        <p className="mt-3 text-[11px] text-muted-foreground">
          {tooLarge
            ? t('map.tooLarge')
            : isError
              ? t('map.unavailable')
              : isFetching && !data
                ? t('map.searching')
                : data && premises.length === 0 && pois.length === 0
                  ? t('map.noResult')
                  : `${premises.length} ${t('map.premises')} · ${pois.length} ${t('map.amenitiesInView')}`}
        </p>
        <DataSourcesPanel className="mt-3 w-full" />
      </div>

      {/* Environmental indicators for the current viewport */}
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-md shadow-md z-[1000] max-w-xs">
        <h3 className="text-sm font-medium mb-1">{t('map.env.title')}</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span>{t('map.env.air')}</span>
            <span className="font-medium">
              {environment?.air ? `${translateLabel(environment.air.label, locale)} (${Math.round(environment.air.aqi)})` : t('map.na')}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span>{t('map.env.pm25')}</span>
            <span className="font-medium">
              {environment?.air?.pm25 !== null && environment?.air?.pm25 !== undefined
                ? `${environment.air.pm25.toFixed(1)} µg/m³`
                : t('map.na')}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span>{t('map.env.risks')}</span>
            <span className="font-medium text-right">
              {environment?.risks?.labels.length
                ? environment.risks.labels.slice(0, 2).join(', ')
                : t('map.env.noRisk')}
            </span>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Copernicus CAMS · Géorisques</p>
      </div>

      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
            <p>{t('map.loading')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
