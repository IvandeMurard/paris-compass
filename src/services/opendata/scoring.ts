/**
 * Adapter between the OpenStreetMap snapshot and the pure scoring core.
 *
 * All the arithmetic now lives in `@/core`, where it is testable and reusable by an MCP
 * server. This file only translates shapes and unwraps provenance for the current UI,
 * which still expects plain numbers. Surfacing source, licence and caveats in the
 * interface is the next step — the values already carry them.
 */

import {
  BDCOM_ORIGIN,
  IDFM_ORIGIN,
  buildIndex,
  noiseLabel,
  scoreLabel as coreScoreLabel,
  scoreLocation,
  uniformOrigins,
  OSM_ORIGIN,
  type Amenity,
  type AmenityCategory,
  type LayerOrigins,
  type NeighbourhoodContext,
  type PremisePoint,
  type Road,
  type ScoringIndex,
} from '@/core';
import type { AreaScores, BBox } from './types';
import type { OverpassSnapshot } from './overpass';

const AMENITY_CATEGORIES: readonly AmenityCategory[] = [
  'schools',
  'healthcare',
  'groceries',
  'parks',
  'transit',
];

const isAmenityCategory = (value: string): value is AmenityCategory =>
  (AMENITY_CATEGORIES as readonly string[]).includes(value);

/**
 * Build the spatial index once per snapshot.
 *
 * This used to be implicit: every premise rescanned the whole snapshot, five times over,
 * inside a map(). With tens of thousands of features that is millions of trigonometric
 * calls on the main thread. Building the index once and querying it per premise is the
 * whole fix.
 */
/**
 * The snapshot as the core's own context type, before it is indexed.
 *
 * Split out of `buildScoringIndex` for `ContextMap` — w6-contexte (#119), step 5. A `GridIndex`
 * is built for lookup by radius and gives no way back to the points it holds, and a mini-map
 * needs the points themselves. Re-deriving them beside the index would mean two conversions
 * from one snapshot, free to drift apart: the map would then draw something the figures were
 * not computed on, which is the one thing a map beside a figure must never do.
 */
export function toNeighbourhoodContext(
  snapshot: OverpassSnapshot,
  bounds?: BBox,
): NeighbourhoodContext {
  const amenities: Amenity[] = [];
  for (const poi of snapshot.pois) {
    if (!isAmenityCategory(poi.category)) continue;
    amenities.push({ lat: poi.lat, lng: poi.lng, category: poi.category });
  }

  const premises: PremisePoint[] = snapshot.premises.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    status: p.status,
  }));

  const roads: Road[] = snapshot.roads.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    weight: r.weight,
  }));

  // `loaded` comes from the snapshot, never from these array lengths: an empty array here
  // would otherwise be indistinguishable from a layer that failed to arrive. The same rule
  // is why the two corpus layers are empty AND absent from `loaded`: `/carte` reads one
  // Overpass snapshot and nothing else, so `services` and `stations` are not loaded here and
  // the axes that read them come back `unavailable` rather than as a measured zero.
  return {
    amenities,
    premises,
    roads,
    services: [],
    nearestStationM: null,
    bounds,
    loaded: snapshot.loaded,
  };
}

export function buildScoringIndex(snapshot: OverpassSnapshot, bounds?: BBox): ScoringIndex {
  return buildIndex(toNeighbourhoodContext(snapshot, bounds));
}

/**
 * Every layer `/carte` ACTUALLY loads comes out of one Overpass snapshot — amenities, roads
 * *and* premises, the latter from OSM's `shop=vacant` tagging rather than BDCom.
 *
 * **But `uniformOrigins` stopped being usable here on 15 September 2026** —
 * w6-amenites-corpus — and the reason is the one that type was created for. There are now
 * five layers, two of which this screen never loads; stamping OpenStreetMap on them would
 * make their absent figures say « OpenStreetMap is silent » when what is silent is APUR's
 * survey and IDFM's stop reference. `unavailable()` puts the origin on a MISSING figure
 * precisely so a reader learns which dataset is not there, so a wrong origin on a missing
 * figure is not a harmless placeholder — it is a false statement about an outage.
 *
 * Their real origins carry no date here: this screen never reads `compass_vintages` or
 * `ingestion_run`, so it does not know them, and « not loaded » is the only thing it may say.
 */
const originsForNow = (): LayerOrigins => {
  const osm = OSM_ORIGIN(new Date().toISOString().slice(0, 10));
  return {
    ...uniformOrigins(osm),
    services: BDCOM_ORIGIN(2023, 'non lue sur cet écran', 'non lu sur cet écran'),
    stations: IDFM_ORIGIN('non lu sur cet écran'),
  };
};

/**
 * Scores for one point, provenance included.
 *
 * This function used to unwrap `Measured<T>` into plain numbers, on the grounds that
 * the interface only wanted numbers. That was the leak: a figure arrived at the card
 * with no source, no vintage and no caveat, and nothing could tell a modelled proxy
 * from a count. The values now travel intact — rendering them is the caller's job, and
 * `Measured<T>` makes it impossible to render one without being able to attribute it.
 *
 * Noise is part of the record rather than a separate shape, for the same reason: it is
 * the score whose caveat matters most, so it must carry it like the others.
 */
export function computeScores(
  point: { lat: number; lng: number },
  index: ScoringIndex,
): AreaScores {
  return scoreLocation(point, index, originsForNow());
}

export const scoreLabel = coreScoreLabel;
export { noiseLabel };
