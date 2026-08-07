import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Poi, Premise } from '@/services/opendata/types';

const CATEGORY_COLORS: Record<string, string> = {
  schools: '#3b82f6',
  healthcare: '#ef4444',
  groceries: '#10b981',
  parks: '#22c55e',
  transit: '#8b5cf6',
  commerce: '#94a3b8',
};

function walkabilityColor(score: number) {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#4ade80';
  if (score >= 40) return '#facc15';
  if (score >= 20) return '#fb923c';
  return '#ef4444';
}

/** Renders real premises, walkability and amenity layers computed from open data. */
export const useMapLayers = (map: L.Map | null, premises: Premise[], pois: Poi[]) => {
  const [layers, setLayers] = useState<{
    markersLayer: L.LayerGroup | null;
    walkabilityLayer: L.LayerGroup | null;
    accessibilityLayer: L.LayerGroup | null;
  }>({ markersLayer: null, walkabilityLayer: null, accessibilityLayer: null });
  const layersRef = useRef(layers);

  useEffect(() => {
    if (!map) return;

    const markersLayer = L.layerGroup().addTo(map);
    const walkabilityLayer = L.layerGroup();
    const accessibilityLayer = L.layerGroup();

    premises.forEach((premise) => {
      const marker = L.circleMarker([premise.lat, premise.lng], {
        radius: premise.status === 'vacant' ? 8 : 5,
        color: premise.status === 'vacant' ? '#0f766e' : '#64748b',
        fillColor: premise.status === 'vacant' ? '#14b8a6' : '#cbd5e1',
        fillOpacity: 0.9,
        weight: 2,
      }).bindPopup(`
        <div class="p-1">
          <strong>${premise.title}</strong><br/>
          <span>${premise.address}</span><br/>
          <span>Marchabilité ${premise.scores.walkability}/100 · Flux ${premise.scores.footfall}/100</span><br/>
          <span>${
            premise.residentialRentEurM2 !== null
              ? `Loyer résidentiel du quartier ${premise.residentialRentEurM2} €/m²${
                  premise.quartier ? ` · ${premise.quartier}` : ''
                }`
              : 'Quartier non renseigné'
          }</span>
        </div>
      `);
      markersLayer.addLayer(marker);

      // One disc per premise, so the radius has to stay well under the spacing between
      // premises. At 220 m in a street as dense as Montorgueil the discs merged into an
      // opaque sheet that hid the map. 30 m reads as a score dot and keeps the streets legible.
      const circle = L.circle([premise.lat, premise.lng], {
        radius: 30,
        color: '#ffffff',
        fillColor: walkabilityColor(premise.scores.walkability),
        fillOpacity: 0.85,
        weight: 1,
      }).bindTooltip(`Marchabilité : ${premise.scores.walkability}/100`);
      walkabilityLayer.addLayer(circle);
    });

    pois.forEach((poi) => {
      const dot = L.circleMarker([poi.lat, poi.lng], {
        radius: 4,
        color: CATEGORY_COLORS[poi.category] ?? '#64748b',
        fillColor: CATEGORY_COLORS[poi.category] ?? '#64748b',
        fillOpacity: 0.8,
        weight: 1,
      }).bindTooltip(`${poi.name ?? poi.category} · OpenStreetMap`);
      accessibilityLayer.addLayer(dot);
    });

    layersRef.current = { markersLayer, walkabilityLayer, accessibilityLayer };
    setLayers(layersRef.current);

    return () => {
      markersLayer.remove();
      walkabilityLayer.remove();
      accessibilityLayer.remove();
    };
  }, [map, premises, pois]);

  return layers;
};
