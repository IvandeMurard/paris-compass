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
 * **This component can no longer take the page down — w6-fiche-robuste (#156).** It used to
 * build the map, add layers to it, and only then ask one of those layers where it was:
 * `instance.fitBounds(circle.getBounds())`. A Leaflet map created without a view never
 * attaches the layers added to it — `Map.addLayer` defers through `whenReady`, which on a
 * view-less map waits for a `load` event that no one will fire — so `circle._map` was
 * `undefined` and `getBounds()` threw `Cannot read properties of undefined (reading
 * 'layerPointToLatLng')`. A throw inside an effect reaches the nearest error boundary, and the
 * boundary above this page is the application's: the verdict, the findings and the gaps block
 * all died for a support illustration. Three things changed, in the order that matters:
 *
 *  1. the frame is computed from the point by `contextMapFrame`, with no map in the loop;
 *  2. the map is given that view **before** a single layer is added, so nothing is ever asked
 *     for bounds it cannot know;
 *  3. a mount that throws anyway degrades to a written absence, in this section, and the rest
 *     of the sheet is untouched.
 *
 * **What this does not catch**: the layers drawn are the ones `drawableLayers` derives from
 * the findings that resolved, but nothing here proves a drawn dot corresponds to a counted
 * one. The guarantee is structural — `useAddressContext` hands over the one snapshot it
 * scored, so there is no second set of points to draw — and it would break the day someone
 * gave this component its own fetch. And the degradation is synchronous: a tile request that
 * fails after the map is built leaves a grey square, which is Leaflet's business and has never
 * been fatal.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  FOOTFALL_RADIUS_M,
  distanceM,
  type AreaScores,
  type Layer,
  type NeighbourhoodContext,
} from '@/core';
import { CONTEXT_COPY } from '@/i18n/contextText';
import { useLocale } from '@/i18n/locale';
import { drawableLayers } from '@/lib/contextLayers';
import { contextMapFrame } from '@/lib/contextMapFrame';

/** One style per layer. Colour only — the map says *where*, the findings say *how much*. */
const LAYER_STYLE: Record<Layer, { color: string; radius: number }> = {
  amenities: { color: '#2563eb', radius: 3 },
  premises: { color: '#16a34a', radius: 3 },
  roads: { color: '#a16207', radius: 2 },
  // Merchant services are a SUBSET of the premises already drawn in green, so they are drawn
  // slightly larger and in a warmer tone rather than as a fourth cloud of dots: a reader must
  // be able to see that the services axis reads the same survey, not a second one.
  services: { color: '#c2410c', radius: 4 },
  // The rail layer is a distance and not a cloud. It has a style because `Record<Layer, …>`
  // is exhaustive on purpose — a layer added to the core cannot be forgotten here — and it
  // draws nothing, because `families.stations` below is empty by construction.
  stations: { color: '#7c3aed', radius: 5 },
};

/** Every gesture off. See the header: this is the specification, not a default. */
const GESTURES_OFF = {
  dragging: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  touchZoom: false,
  boxZoom: false,
  keyboard: false,
  zoomControl: false,
  attributionControl: true,
} as const;

const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

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
  const { lat, lng } = point;

  const frame = useMemo(() => contextMapFrame({ lat, lng }, FOOTFALL_RADIUS_M), [lat, lng]);

  /**
   * The point whose mount threw, never a bare boolean.
   *
   * A boolean would latch: once the section stopped rendering its host element the effect
   * would find no node to mount into, so a later address could never clear the failure. Keyed
   * by the point, the flag expires the moment the sheet is looking at somewhere else.
   */
  const [failedAt, setFailedAt] = useState<string | null>(null);
  const failed = failedAt === `${lat},${lng}`;

  useEffect(() => {
    if (frame.kind !== 'cadre' || failed) return;
    const node = host.current;
    if (!node) return;

    let instance: L.Map | null = null;
    try {
      instance = L.map(node, GESTURES_OFF);

      // The view comes FIRST. Everything below is added to a map that already knows where it
      // is looking, which is what makes those layers actually attach — see the header.
      const { south, west, north, east } = frame.bounds;
      instance.fitBounds(
        [
          [south, west],
          [north, east],
        ],
        { padding: [8, 8], animate: false },
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: OSM_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(instance);

      L.circle([lat, lng], {
        radius: FOOTFALL_RADIUS_M,
        color: '#0f172a',
        weight: 1,
        fillOpacity: 0.04,
      }).addTo(instance);

      const layers = drawableLayers(scores, loaded);
      const families: Record<Layer, readonly { lat: number; lng: number }[]> = {
        amenities: points.amenities,
        premises: points.premises,
        roads: points.roads,
        services: points.services,
        // The rail layer holds a DISTANCE, not points — `nearestStationM`. There is nothing
        // to draw, and inventing a marker at a position the layer never gave would put a dot
        // on the map that no figure was computed from.
        stations: [],
      };
      for (const layer of layers) {
        const style = LAYER_STYLE[layer];
        for (const p of families[layer]) {
          // Only what the circle covers. Drawing the whole fetched box would show a wider area
          // than any figure was computed on, which is the coverage illusion this page refuses.
          // The distance is the core's, not the map's: which dots belong to a finding is a
          // question about the finding, and it must answer the same way with no map at all.
          if (distanceM({ lat, lng }, p) > FOOTFALL_RADIUS_M) continue;
          L.circleMarker([p.lat, p.lng], {
            radius: style.radius,
            color: style.color,
            weight: 0,
            fillColor: style.color,
            fillOpacity: 0.6,
            interactive: false,
          }).addTo(instance);
        }
      }

      L.circleMarker([lat, lng], {
        radius: 6,
        color: '#0f172a',
        weight: 2,
        fillColor: '#ffffff',
        fillOpacity: 1,
        interactive: false,
      }).addTo(instance);
    } catch (error) {
      // Named on screen rather than swallowed: a support map that cannot draw itself is a
      // missing illustration, and the sheet says so where the illustration would have been.
      console.error('Context mini-map could not be drawn', error);
      try {
        instance?.remove();
      } catch {
        /* the map never got far enough to have anything to tear down */
      }
      setFailedAt(`${lat},${lng}`);
      return;
    }

    const built = instance;
    return () => {
      built.remove();
    };
    // `points`, `scores` and `loaded` come from one query result, so this rebuilds once per
    // address rather than on every render. One effect rather than two on purpose: the defect
    // this file exists to fix was an ordering bug between a mount effect and a draw effect.
  }, [frame, failed, lat, lng, points, scores, loaded, locale]);

  return (
    <section aria-labelledby="context-map" className="rounded-lg border bg-white p-5">
      <h2
        id="context-map"
        className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {c.mapHeading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{c.mapIntro(FOOTFALL_RADIUS_M)}</p>
      {frame.kind !== 'cadre' || failed ? (
        <p className="mt-3 rounded-md border border-dashed bg-muted/30 p-3 text-sm">
          {c.mapUnavailable}
        </p>
      ) : (
        <>
          <div
            ref={host}
            role="img"
            aria-label={c.mapAlt(FOOTFALL_RADIUS_M)}
            className="mt-3 h-64 w-full overflow-hidden rounded-md border"
          />
          <p className="mt-2 text-xs text-muted-foreground">{c.mapNotInteractive}</p>
        </>
      )}
    </section>
  );
};

export default ContextMap;
