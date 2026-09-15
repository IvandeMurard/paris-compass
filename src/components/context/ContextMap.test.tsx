// @vitest-environment jsdom
/**
 * The mini-map must never be able to take the sheet down — w6-fiche-robuste (#156).
 *
 * **Why this file is the only one in the repo that mounts anything.** Every other decision on
 * the context page — which words, which provenance, which layers may be drawn, which gaps to
 * list — was deliberately pushed into plain modules so it could be tested with no DOM at all.
 * This defect cannot be: it is a property of a Leaflet map object that exists only once
 * mounted. `circle.getBounds()` reads `this._map`, and `Map.addLayer` only sets a layer's
 * `_map` through `whenReady`, which on a map that was never given a view waits for a `load`
 * event nobody will fire. Nothing short of a real Leaflet on a real element shows that.
 *
 * **Real Leaflet, not a double.** A hand-written fake that threw on `getBounds()` would prove
 * the test author knew the bug, and nothing about the library that ships. The first case below
 * replays the exact sequence the component ran until 13 September 2026 and asserts the message
 * production actually showed, so the day Leaflet changes this contract, the premise of the
 * guard is re-examined rather than assumed.
 *
 * **What this does not catch.** jsdom lays nothing out, so the map is built at a container
 * size a browser would never report — measured here: Leaflet clamps and mounts anyway, at zoom
 * 19 instead of 14. Tiles, projections at real pixel sizes and anything visual are outside
 * what any of this sees; that is what the browser counter-proof in the closing comment of
 * `#156` is for, and neither replaces the other.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import L from 'leaflet';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FOOTFALL_RADIUS_M,
  unavailable,
  withValue,
  type AreaScores,
  type Layer,
  type Measured,
  type NeighbourhoodContext,
  type Origin,
} from '@/core';
import { CONTEXT_COPY } from '@/i18n/contextText';
import ContextMap from './ContextMap';

const OSM: Origin = {
  source: 'OpenStreetMap via Overpass',
  licence: 'ODbL-1.0',
  asOf: '2026-09-13',
};

const plain = (n: number): Measured<number> => withValue(n, OSM, 'derived');

const scores = (partial: Partial<AreaScores> = {}): AreaScores => ({
  density: plain(65),
  services: plain(65),
  rail: plain(65),
  alimentaire: plain(65),
  walkability: plain(70),
  schools: plain(70),
  healthcare: plain(70),
  groceries: plain(70),
  parks: plain(70),
  transit: plain(70),
  footfall: plain(60),
  noise: plain(20),
  ...partial,
});

/** Rue de Bretagne — the address the production failure was measured on. */
const BRETAGNE = { lat: 48.8631, lng: 2.3621 };

const snapshot = (loaded: readonly Layer[]): NeighbourhoodContext => ({
  amenities: [{ lat: 48.8633, lng: 2.3625, category: 'transit' }],
  roads: [{ lat: 48.8628, lng: 2.3618, weight: 3 }],
  premises: [{ lat: 48.8632, lng: 2.3623, status: 'occupied' }],
  services: [{ lat: 48.8632, lng: 2.3623, family: 'alimentaire' }],
  nearestStationM: 317,
  loaded,
});

const ALL: readonly Layer[] = ['amenities', 'roads', 'premises'];

let mounted: { root: Root; host: HTMLDivElement } | null = null;

function render(node: React.ReactNode) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  mounted = { root, host };
  return host;
}

afterEach(() => {
  if (mounted) {
    const { root, host } = mounted;
    act(() => {
      root.unmount();
    });
    host.remove();
    mounted = null;
  }
  vi.restoreAllMocks();
});

describe('le contrat Leaflet que le composant violait', () => {
  it('un cercle posé sur une carte sans vue ne sait pas ses bornes', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const map = L.map(host, { zoomControl: false });
    const circle = L.circle([BRETAGNE.lat, BRETAGNE.lng], { radius: FOOTFALL_RADIUS_M }).addTo(map);

    // Word for word what the visitor saw on 13 September 2026, `DIAGNOSTIC.md` §50.
    expect(() => circle.getBounds()).toThrow(/layerPointToLatLng/);

    map.remove();
    host.remove();
  });
});

describe('ContextMap', () => {
  it('se monte sans jeter, et monte vraiment une carte', () => {
    const host = render(
      <ContextMap point={BRETAGNE} points={snapshot(ALL)} scores={scores()} loaded={ALL} />,
    );

    // Not just « did not throw »: a component that quietly degraded would also pass that.
    expect(host.querySelector('.leaflet-container')).not.toBeNull();
    expect(host.textContent).not.toContain(CONTEXT_COPY.fr.mapUnavailable);
  });

  it('refuse de se monter sans bornes utilisables, et le dit', () => {
    // A point off the globe: no frame exists, so there is nothing to draw and nothing to throw.
    const host = render(
      <ContextMap
        point={{ lat: Number.NaN, lng: 2.3621 }}
        points={snapshot(ALL)}
        scores={scores()}
        loaded={ALL}
      />,
    );

    expect(host.querySelector('.leaflet-container')).toBeNull();
    expect(host.textContent).toContain(CONTEXT_COPY.fr.mapUnavailable);
  });

  it('rend le refus de verdict sans carte plutôt qu’un écran d’erreur', () => {
    // The Overpass outage, as `useAddressContext` hands it over: nothing loaded, every axis
    // withheld. This is the case the whole ticket exists for.
    const empty: NeighbourhoodContext = {
      amenities: [],
      roads: [],
      premises: [],
      services: [],
      nearestStationM: null,
      loaded: [],
    };
    const host = render(
      <ContextMap
        point={BRETAGNE}
        points={empty}
        scores={scores({
          footfall: unavailable(OSM, 'premises absent'),
          transit: unavailable(OSM, 'amenities absent'),
          walkability: unavailable(OSM, 'amenities absent'),
        })}
        loaded={[]}
      />,
    );

    expect(host.querySelector('.leaflet-container')).not.toBeNull();
  });

  it('ne laisse pas un instantané malformé emporter ce qui l’entoure', () => {
    // A caller handing over a context with a family missing — the shape a service can produce
    // and the types cannot prevent at runtime. The section degrades; the sibling survives.
    const broken = { amenities: [], roads: [], loaded: ALL } as unknown as NeighbourhoodContext;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const host = render(
      <div>
        <p>le reste de la fiche</p>
        <ContextMap point={BRETAGNE} points={broken} scores={scores()} loaded={ALL} />
      </div>,
    );

    expect(host.textContent).toContain('le reste de la fiche');
    expect(host.textContent).toContain(CONTEXT_COPY.fr.mapUnavailable);
    expect(host.querySelector('.leaflet-container')).toBeNull();
  });
});
