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
  OSM_ORIGIN,
  type Amenity,
  type AmenityCategory,
  type PremisePoint,
  type Road,
  type ScoringIndex,
} from '@/core';
import type { AreaScores, BBox, NoiseEstimate } from './types';
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

  return buildIndex({ amenities, premises, roads, bounds });
}

const originForNow = () => OSM_ORIGIN(new Date().toISOString().slice(0, 10));

/** Scores for one point, unwrapped to the plain numbers the current UI expects. */
export function computeScores(
  point: { lat: number; lng: number },
  index: ScoringIndex,
): AreaScores {
  const scored = scoreLocation(point, index, originForNow());
  return {
    walkability: scored.walkability.value ?? 0,
    schools: scored.schools.value ?? 0,
    healthcare: scored.healthcare.value ?? 0,
    groceries: scored.groceries.value ?? 0,
    transit: scored.transit.value ?? 0,
    parks: scored.parks.value ?? 0,
    footfall: scored.footfall.value ?? 0,
  };
}

export function estimateNoise(
  point: { lat: number; lng: number },
  index: ScoringIndex,
): NoiseEstimate {
  const score = scoreLocation(point, index, originForNow()).noise.value ?? 0;
  return { score, label: noiseLabel(score) };
}

export const scoreLabel = coreScoreLabel;
