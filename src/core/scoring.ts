/**
 * The scoring core. Pure functions: no React, no fetch, no Leaflet, no DOM.
 *
 * Everything here takes plain data in and returns provenance-carrying values out, which
 * is what lets the same code serve three consumers: the browser, a test runner, and the
 * MCP server an agent talks to.
 *
 * Formulas and constants are the ones published on the Methodology page. If one changes
 * here, it changes there.
 */

import { GridIndex, boundsCoverRadius, clamp, distanceM, type BBox, type Point } from './geo';
import {
  withValue,
  type Measured,
  type Origin,
} from './provenance';

export type AmenityCategory =
  | 'schools'
  | 'healthcare'
  | 'groceries'
  | 'parks'
  | 'transit';

export interface Amenity extends Point {
  category: AmenityCategory;
}

export interface Road extends Point {
  /** Relative acoustic weight of the road class. */
  weight: number;
}

export interface PremisePoint extends Point {
  status: 'vacant' | 'occupied';
}

/** Everything the core needs to score a location. Assembled by the caller, never fetched here. */
export interface NeighbourhoodContext {
  amenities: readonly Amenity[];
  roads: readonly Road[];
  premises: readonly PremisePoint[];
  /**
   * Geographic extent the context actually covers. When present, the core checks whether a
   * search radius fits inside it and degrades the figure when it does not.
   */
  bounds?: BBox;
}

/** Radius used for amenity counting — roughly a ten-minute walk. */
export const AMENITY_RADIUS_M = 800;
/** Radius used for the footfall proxy. */
export const FOOTFALL_RADIUS_M = 400;
/** Radius beyond which a road no longer contributes to the noise proxy. */
export const NOISE_RADIUS_M = 500;

/** Saturation constants, per amenity family. The first few matter most; the eleventh barely. */
export const SATURATION: Record<AmenityCategory, number> = {
  schools: 8,
  healthcare: 14,
  groceries: 18,
  parks: 7,
  transit: 25,
};

/** Weights of each family inside the walkability composite. Must sum to 1. */
export const WALKABILITY_WEIGHTS: Record<AmenityCategory, number> = {
  schools: 0.15,
  healthcare: 0.2,
  groceries: 0.3,
  parks: 0.15,
  transit: 0.2,
};

/** Saturating score: n items mapped onto 0-100, with diminishing returns. */
export function saturating(count: number, saturation: number): number {
  return clamp(Math.round(100 * (1 - Math.exp(-count / saturation))));
}

export interface AreaScores {
  walkability: Measured<number>;
  schools: Measured<number>;
  healthcare: Measured<number>;
  groceries: Measured<number>;
  parks: Measured<number>;
  transit: Measured<number>;
  footfall: Measured<number>;
  noise: Measured<number>;
}

/** Indexes built once per context and reused across every point scored against it. */
export interface ScoringIndex {
  amenities: GridIndex<Amenity>;
  premises: GridIndex<PremisePoint>;
  roads: readonly Road[];
  bounds?: BBox;
}

export function buildIndex(context: NeighbourhoodContext): ScoringIndex {
  return {
    amenities: new GridIndex(context.amenities),
    premises: new GridIndex(context.premises),
    roads: context.roads,
    bounds: context.bounds,
  };
}

const TRUNCATED =
  'The data covering this point stops before the full search radius, so the count is a floor, not a total.';

function coverageNote(point: Point, radiusM: number, bounds?: BBox): string | undefined {
  if (!bounds) return undefined;
  return boundsCoverRadius(point, radiusM, bounds) ? undefined : TRUNCATED;
}

export function countAmenities(
  point: Point,
  category: AmenityCategory,
  index: ScoringIndex,
  radiusM = AMENITY_RADIUS_M,
): number {
  return index.amenities.within(point, radiusM).filter((a) => a.category === category).length;
}

/**
 * Noise proxy: each major road within 500 m contributes in proportion to its class and
 * decreasingly with distance. Explicitly an estimate — it models exposure from road
 * geometry alone, ignores buildings, and is not a measurement.
 */
export function noiseExposure(point: Point, roads: readonly Road[]): number {
  let exposure = 0;
  for (const road of roads) {
    const d = distanceM(point, road);
    if (d > NOISE_RADIUS_M) continue;
    exposure += road.weight * (1 - d / NOISE_RADIUS_M);
  }
  return clamp(Math.round(exposure * 5));
}

export function scoreLocation(
  point: Point,
  index: ScoringIndex,
  origin: Origin,
): AreaScores {
  const amenityNote = coverageNote(point, AMENITY_RADIUS_M, index.bounds);

  const byCategory = {} as Record<AmenityCategory, Measured<number>>;
  const rawByCategory = {} as Record<AmenityCategory, number>;

  for (const category of Object.keys(SATURATION) as AmenityCategory[]) {
    const count = countAmenities(point, category, index);
    const score = saturating(count, SATURATION[category]);
    rawByCategory[category] = score;
    byCategory[category] = withValue(score, origin, 'derived', amenityNote);
  }

  const walkability = Math.round(
    (Object.keys(WALKABILITY_WEIGHTS) as AmenityCategory[]).reduce(
      (sum, category) => sum + rawByCategory[category] * WALKABILITY_WEIGHTS[category],
      0,
    ),
  );

  const occupiedNearby = index.premises
    .within(point, FOOTFALL_RADIUS_M)
    .filter((p) => p.status === 'occupied').length;

  const footfall = clamp(
    Math.round(saturating(occupiedNearby, 90) * 0.65 + rawByCategory.transit * 0.35),
  );

  return {
    ...byCategory,
    walkability: withValue(walkability, origin, 'derived', amenityNote),
    footfall: withValue(
      footfall,
      origin,
      'estimated',
      'No open pedestrian count exists for Île-de-France. This is a proxy from active-business density and transport access: it compares two locations against each other, it does not predict footfall.',
    ),
    noise: withValue(
      noiseExposure(point, index.roads),
      origin,
      'estimated',
      'Modelled from the proximity and class of major roads only. Buildings, traffic volume and time of day are not taken into account.',
    ),
  };
}

export function scoreLabel(score: number): 'Excellent' | 'Good' | 'Moderate' | 'Low' {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  return 'Low';
}

export function noiseLabel(score: number): 'High' | 'Moderate' | 'Low' | 'Very low' {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Moderate';
  if (score >= 15) return 'Low';
  return 'Very low';
}
