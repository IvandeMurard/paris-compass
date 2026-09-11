/**
 * Everything a context page needs for one point — w6-contexte (#119).
 *
 * Two queries, kept apart because they fail apart: the address (BAN) and the neighbourhood
 * (Overpass). A page can hold a resolved address and no neighbourhood, and that is not an
 * error screen — it is the case the verdict was written to refuse, so it must reach the page
 * intact rather than being swallowed by a thrown query.
 *
 * **Why an unreachable mirror still returns scores.** `scoreLocation` already knows how to
 * produce a figure that says why it is absent: pass it a context whose `loaded` is empty and
 * every axis comes back `unavailable()` with the core's own `missingReason`. Rendering an
 * error page instead would throw that away and put a generic « something went wrong » where
 * the product's whole argument is that it names what is missing. It is also the only path on
 * which the browser can reach the refusal branch of `composeVerdict`, since the Overpass
 * snapshot otherwise carries all three layers or none.
 */

import { useQuery } from '@tanstack/react-query';
import {
  AMENITY_RADIUS_M,
  M_PER_DEG_LAT,
  buildIndex,
  mPerDegLng,
  scoreLocation,
  uniformOrigins,
  OSM_ORIGIN,
  type AreaScores,
  type Layer,
  type LayerOrigins,
  type NeighbourhoodContext,
  type Withholding,
} from '@/core';
import { geocode, type GeocodeResult } from '@/services/opendata/geocoding';
import { fetchOverpassSnapshot } from '@/services/opendata/overpass';
import { toNeighbourhoodContext } from '@/services/opendata/scoring';
import type { BBox } from '@/services/opendata/types';

/** Overpass answers with the current state of the map, so the query date is the vintage. */
const today = () => new Date().toISOString().slice(0, 10);

/**
 * The box fetched around the point.
 *
 * One walking radius on each side, so the 800 m search is covered in every direction and the
 * core's truncation note stays off. At Paris latitude that is ~0.0144° by ~0.0219°, i.e.
 * ~0.00032 deg² — under the `MAX_BBOX_AREA_DEG2` ceiling that `useOpenData` enforces for the
 * map, which is what keeps the mirrors answering.
 */
export function boxAround(point: { lat: number; lng: number }, radiusM = AMENITY_RADIUS_M): BBox {
  const dLat = radiusM / M_PER_DEG_LAT;
  const dLng = radiusM / mPerDegLng(point.lat);
  return {
    south: point.lat - dLat,
    north: point.lat + dLat,
    west: point.lng - dLng,
    east: point.lng + dLng,
  };
}

export interface AddressContext {
  scores: AreaScores;
  /** Where each layer was read from — the same object `scoreLocation` was given, so the gaps
   *  block can name the premises source without going through a figure that may be absent. */
  origins: LayerOrigins;
  /** Structured reason per layer, for the layers that did not arrive. Empty when all did. */
  withheldBy: Partial<Record<Layer, Withholding>>;
  /** Layers that actually came back — what the gaps block reads to name what is missing. */
  loaded: readonly Layer[];
  /**
   * The points the scores were computed on — w6-contexte (#119), step 5.
   *
   * `ContextMap` draws these and no others. The alternative was a second fetch for the map,
   * which would have let the picture and the figures disagree without anything saying so: a
   * mirror answering twice, a minute apart, is enough. One snapshot, scored and drawn.
   */
  points: NeighbourhoodContext;
  bbox: BBox;
}

const ALL_LAYERS: readonly Layer[] = ['amenities', 'roads', 'premises'];

/**
 * Scores for one point, provenance included, with an unreachable source reported as an
 * absence per layer rather than as a thrown query.
 */
export async function fetchAddressContext(point: {
  lat: number;
  lng: number;
}): Promise<AddressContext> {
  const bbox = boxAround(point);
  // Every layer of the browser's context comes out of one Overpass snapshot — amenities, roads
  // *and* premises, the latter from OSM's `shop=vacant` tagging rather than BDCom. So the three
  // per-layer origins are legitimately identical here, and `uniformOrigins` says so rather than
  // leaving it assumed. The day the front reads `compass_*`, the premises origin becomes APUR's
  // and the type will not let it be forgotten.
  const origins = uniformOrigins(OSM_ORIGIN(today()));
  try {
    const snapshot = await fetchOverpassSnapshot(bbox);
    const points = toNeighbourhoodContext(snapshot, bbox);
    return {
      scores: scoreLocation(point, buildIndex(points), origins),
      origins,
      withheldBy: {},
      loaded: snapshot.loaded,
      points,
      bbox,
    };
  } catch {
    // Three mirrors refused, or the payload was malformed. `fetchOverpassSnapshot` has already
    // walked all of them once; the layer is unreachable, not empty, and the difference is the
    // whole point — an empty context declared `loaded` would score a measured zero.
    const empty: NeighbourhoodContext = {
      amenities: [],
      premises: [],
      roads: [],
      bounds: bbox,
      loaded: [],
    };
    const withheldBy: Partial<Record<Layer, Withholding>> = {};
    for (const layer of ALL_LAYERS) withheldBy[layer] = 'source_injoignable';
    return {
      scores: scoreLocation(point, buildIndex(empty), origins),
      origins,
      withheldBy,
      loaded: [],
      points: empty,
      bbox,
    };
  }
}

/** The neighbourhood around a point. Never disabled by a failure: see the header. */
export function useAddressContext(point: { lat: number; lng: number } | null) {
  return useQuery({
    queryKey: ['address-context', point?.lat.toFixed(5), point?.lng.toFixed(5)],
    queryFn: () => fetchAddressContext(point as { lat: number; lng: number }),
    enabled: point !== null,
    staleTime: 30 * 60 * 1000,
    // Same reasoning as `usePremises`: the snapshot fetcher already tries three mirrors, and a
    // fourth attempt costs seventy seconds and changes nothing.
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Resolve a slug to an address.
 *
 * It answers two different questions and the caller must not confuse them. The POINT comes
 * from the query string whenever the URL carries one, so the figures never depend on BAN
 * answering; this query then only supplies the LABEL, which a slug cannot give back — its
 * capitals and accents are gone. When the URL carries no coordinates, it supplies both, and
 * the page rewrites itself to the canonical URL.
 */
export function useAddressFromSlug(search: string, enabled: boolean) {
  return useQuery<GeocodeResult | null>({
    queryKey: ['ban', search.toLowerCase()],
    queryFn: async () => (await geocode(search, 1))[0] ?? null,
    enabled: enabled && search.length > 2,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
