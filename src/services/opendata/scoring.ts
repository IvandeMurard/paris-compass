/**
 * Adapter between the OpenStreetMap snapshot and the pure scoring core.
 *
 * All the arithmetic now lives in `@/core`, where it is testable and reusable by an MCP
 * server. This file only translates shapes and unwraps provenance for the current UI,
 * which still expects plain numbers. Surfacing source, licence and caveats in the
 * interface is the next step — the values already carry them.
 */

import {
  buildIndex,
  noiseLabel,
  scoreLabel as coreScoreLabel,
  scoreLocation,
  uniformOrigins,
  OSM_ORIGIN,
  type Amenity,
  type AmenityCategory,
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
export function buildScoringIndex(snapshot: OverpassSnapshot, bounds?: BBox): ScoringIndex {
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
  // would otherwise be indistinguishable from a layer that failed to arrive.
  return buildIndex({ amenities, premises, roads, bounds, loaded: snapshot.loaded });
}

/**
 * Every layer of the browser's context comes out of one Overpass snapshot — amenities,
 * roads *and* premises, the latter from OSM's `shop=vacant` tagging rather than BDCom.
 * So the three per-layer origins are legitimately identical here, and `uniformOrigins`
 * says that deliberately instead of leaving it assumed.
 *
 * This is exactly what stops being true when the front starts reading `compass_*`
 * (PLAN.md §2.7): the premises origin becomes APUR's, and the type will not let it be
 * forgotten. On the agent side that day has already come — see `mcp-server/src/context.ts`.
 */
const originsForNow = () => uniformOrigins(OSM_ORIGIN(new Date().toISOString().slice(0, 10)));

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
