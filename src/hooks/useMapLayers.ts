
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { walkabilityData } from '@/data/mapData';
import { sampleProperties } from '@/components/PropertyList';

export const useMapLayers = (map: L.Map | null) => {
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const walkabilityLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create the property icon
    const propertyIcon = L.icon({
      iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      shadowSize: [41, 41]
    });

    // Initialize layers
    const markersLayer = L.layerGroup().addTo(map);
    const walkabilityLayer = L.layerGroup();

    markersLayerRef.current = markersLayer;
    walkabilityLayerRef.current = walkabilityLayer;

    // Add property markers with walkability info
    sampleProperties.forEach(property => {
      const marker = L.marker([property.lat, property.lng], { icon: propertyIcon })
        .bindPopup(`
          <div class="p-2">
            <h3 class="font-bold">${property.title}</h3>
            <p>${property.address}</p>
            <p>${property.price}€/month | ${property.size}m²</p>
            <p class="text-sm mt-1">Walkability Score: ${walkabilityData.find(w => 
              w.center[0] === property.lat && 
              w.center[1] === property.lng
            )?.score || 'N/A'}/100</p>
          </div>
        `);
      markersLayer.addLayer(marker);
    });

    // Add walkability data
    walkabilityData.forEach(area => {
      const circle = L.circle(area.center, {
        radius: area.radius,
        color: area.color,
        fillOpacity: 0.4,
        weight: 1
      }).bindTooltip(`Walkability Score: ${area.score}/100`);
      walkabilityLayer.addLayer(circle);
    });

    return () => {
      markersLayer.remove();
      walkabilityLayer.remove();
    };
  }, [map]);

  return {
    markersLayer: markersLayerRef.current,
    walkabilityLayer: walkabilityLayerRef.current
  };
};
