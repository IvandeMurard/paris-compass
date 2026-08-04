import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapLayers } from '@/hooks/useMapLayers';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Locate, Navigation2, Loader2 } from 'lucide-react';
import { usePremises, useAreaEnvironment, PARIS_BBOX } from '@/hooks/useOpenData';
import { useFiltersContext } from '@/providers/FiltersProvider';
import type { BBox } from '@/services/opendata/types';
import DataSourcesPanel from './DataSourcesPanel';

const MapView = () => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [bbox, setBbox] = useState<BBox>(PARIS_BBOX);
  const [dataLayer, setDataLayer] = useState<'walkability' | 'accessibility' | 'none'>('walkability');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const { data, isFetching, isError } = usePremises(bbox);
  const { matches } = useFiltersContext();
  const premises = (data?.premises ?? []).filter(matches);
  const pois = data?.pois ?? [];

  const center = { lat: (bbox.south + bbox.north) / 2, lng: (bbox.west + bbox.east) / 2 };
  const { data: environment } = useAreaEnvironment(center.lat, center.lng);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([48.8566, 2.3522], 14);
    mapInstanceRef.current = map;
    setMapInstance(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · données ouvertes Etalab, Ville de Paris, Copernicus',
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
  const handleResetView = () => mapInstanceRef.current?.setView([48.8566, 2.3522], 14);

  return (
    <div className="relative h-full w-full bg-[#f5f5f5]">
      <div ref={mapRef} className="h-full w-full" />

      <div className="absolute left-4 top-4 flex flex-col gap-2 z-[1000]">
        <Button variant="secondary" size="icon" onClick={handleZoomIn} className="bg-white hover:bg-gray-100">
          <ZoomIn className="h-4 w-4 text-gray-700" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleZoomOut} className="bg-white hover:bg-gray-100">
          <ZoomOut className="h-4 w-4 text-gray-700" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleLocate} className="bg-white hover:bg-gray-100">
          <Locate className="h-4 w-4 text-gray-700" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleResetView} className="bg-white hover:bg-gray-100">
          <Navigation2 className="h-4 w-4 text-gray-700" />
        </Button>
      </div>

      {/* Data layer controls */}
      <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-md shadow-md z-[1000] w-56">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Couches de données</h3>
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <div className="space-y-2">
          {[
            { id: 'none', label: 'Aucune' },
            { id: 'walkability', label: 'Marchabilité (OSM)' },
            { id: 'accessibility', label: 'Aménités (OSM)' },
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
        <p className="mt-3 text-[11px] text-muted-foreground">
          {isError
            ? 'Données ouvertes momentanément indisponibles.'
            : `${premises.length} locaux · ${pois.length} aménités dans la vue`}
        </p>
        <DataSourcesPanel className="mt-3 w-full" />
      </div>

      {/* Environmental indicators for the current viewport */}
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-md shadow-md z-[1000] max-w-xs">
        <h3 className="text-sm font-medium mb-1">Indicateurs environnementaux</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span>Qualité de l’air (indice EAQI) :</span>
            <span className="font-medium">
              {environment?.air ? `${environment.air.label} (${Math.round(environment.air.aqi)})` : 'n/d'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span>PM2.5 :</span>
            <span className="font-medium">
              {environment?.air?.pm25 !== null && environment?.air?.pm25 !== undefined
                ? `${environment.air.pm25.toFixed(1)} µg/m³`
                : 'n/d'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Risques recensés :</span>
            <span className="font-medium text-right">
              {environment?.risks?.labels.length
                ? environment.risks.labels.slice(0, 2).join(', ')
                : 'Aucun dans 1 km'}
            </span>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Copernicus CAMS · Géorisques</p>
      </div>

      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
            <p>Chargement de la carte…</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
