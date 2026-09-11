/**
 * The mini-map of a context sheet — w6-contexte (#119), step 5.
 *
 * **In support, and second.** The whole ticket exists because a map was asked to answer a
 * closed question it cannot answer. This one illustrates an answer that has already been given
 * above it: the verdict, then the findings, then — for whoever wants to see where — a fixed
 * circle around the point. It carries no filter panel, and that absence is the specification,
 * not an unfinished state: a filter is an invitation to explore, and exploration lives on
 * `/carte` now.
 *
 * **Not interactive at first glance.** Dragging, wheel zoom, double-click zoom and the zoom
 * control are all off. A reader scrolling the page past a Leaflet canvas must not have the
 * page hijacked by the map, and more importantly: a map that can be panned is a map that
 * invites comparison in bulk, which `docs/PERIMETRE.md` §1 refuses by name. What is shown is
 * one radius around one address, and there is no gesture that turns it into anything else.
 *
 * **The radius is `FOOTFALL_RADIUS_M`, not a 400 written here.** The circle means something
 * exact: it is the radius the footfall finding actually reads. A literal in this file would be
 * a figure on screen that nothing keeps in step with the core, which is the failure
 * `Measured<T>` exists to prevent, moved into a shape.
 *
 * **What this does not catch**: the layers drawn are the ones `drawableLayers` derives from
 * the findings that resolved, but nothing here proves a drawn dot corresponds to a counted
 * one. The guarantee is structural — `useAddressContext` hands over the one snapshot it
 * scored, so there is no second set of points to draw — and it would break the day someone
 * gave this component its own fetch.
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FOOTFALL_RADIUS_M, type AreaScores, type Layer, type NeighbourhoodContext } from '@/core';
import { CONTEXT_COPY } from '@/i18n/contextText';
import { useLocale } from '@/i18n/locale';
import { drawableLayers } from '@/lib/contextLayers';

/** One style per layer. Colour only — the map says *where*, the findings say *how much*. */
const LAYER_STYLE: Record<Layer, { color: string; radius: number }> = {
  amenities: { color: '#2563eb', radius: 3 },
  premises: { color: '#16a34a', radius: 3 },
  roads: { color: '#a16207', radius: 2 },
};

interface ContextMapProps {
  point: { lat: number; lng: number };
  points: NeighbourhoodContext;
  scores: AreaScores;
  loaded: readonly Layer[];
}

const ContextMap = ({ point, points, scores, loaded }: ContextMapProps) => {
  const { locale } = useLocale();
  const c = CONTEXT_COPY[locale];
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!host.current || map.current) return;

    const instance = L.map(host.current, {
      // Every gesture off. See the header: this is the specification, not a default.
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomControl: false,
      attributionControl: true,
    });
    map.current = instance;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        locale === 'en'
          ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(instance);

    return () => {
      instance.remove();
      map.current = null;
    };
  }, [locale]);

  // Points and circle are redrawn together, never incrementally: a partial update is how a
  // map ends up showing one layer from a previous address.
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    const drawn = L.layerGroup().addTo(instance);
    const circle = L.circle([point.lat, point.lng], {
      radius: FOOTFALL_RADIUS_M,
      color: '#0f172a',
      weight: 1,
      fillOpacity: 0.04,
    }).addTo(drawn);

    const layers = drawableLayers(scores, loaded);
    const families: Record<Layer, readonly { lat: number; lng: number }[]> = {
      amenities: points.amenities,
      premises: points.premises,
      roads: points.roads,
    };
    for (const layer of layers) {
      const style = LAYER_STYLE[layer];
      for (const p of families[layer]) {
        // Only what the circle covers. Drawing the whole fetched box would show a wider area
        // than any figure was computed on, which is the coverage illusion this page refuses.
        if (instance.distance([point.lat, point.lng], [p.lat, p.lng]) > FOOTFALL_RADIUS_M) continue;
        L.circleMarker([p.lat, p.lng], {
          radius: style.radius,
          color: style.color,
          weight: 0,
          fillColor: style.color,
          fillOpacity: 0.6,
          interactive: false,
        }).addTo(drawn);
      }
    }

    L.circleMarker([point.lat, point.lng], {
      radius: 6,
      color: '#0f172a',
      weight: 2,
      fillColor: '#ffffff',
      fillOpacity: 1,
      interactive: false,
    }).addTo(drawn);

    instance.fitBounds(circle.getBounds(), { padding: [8, 8], animate: false });

    return () => {
      drawn.remove();
    };
  }, [point.lat, point.lng, points, scores, loaded]);

  return (
    <section aria-labelledby="context-map" className="rounded-lg border bg-white p-5">
      <h2 id="context-map" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {c.mapHeading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{c.mapIntro(FOOTFALL_RADIUS_M)}</p>
      <div
        ref={host}
        role="img"
        aria-label={c.mapAlt(FOOTFALL_RADIUS_M)}
        className="mt-3 h-64 w-full overflow-hidden rounded-md border"
      />
      <p className="mt-2 text-xs text-muted-foreground">{c.mapNotInteractive}</p>
    </section>
  );
};

export default ContextMap;
