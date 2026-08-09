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
  unavailable,
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

/** The three families of data a context carries, each loaded independently by the caller. */
export type Layer = 'amenities' | 'roads' | 'premises';

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
  /**
   * Which layers the caller actually loaded.
   *
   * Required, and deliberately not inferred from array length, because an empty array is
   * ambiguous: it means "nothing here" for a layer that loaded, and "we do not know" for
   * one that did not. Those two must not produce the same score — a road layer that failed
   * to load would otherwise score as silence, which is an assertion drawn from an absence.
   * Only the caller can tell them apart, and the core stays pure by refusing to guess.
   */
  loaded: readonly Layer[];
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
  loaded: ReadonlySet<Layer>;
}

export function buildIndex(context: NeighbourhoodContext): ScoringIndex {
  return {
    amenities: new GridIndex(context.amenities),
    premises: new GridIndex(context.premises),
    roads: context.roads,
    bounds: context.bounds,
    loaded: new Set(context.loaded),
  };
}

const TRUNCATED =
  'The data covering this point stops before the full search radius, so the count is a floor, not a total.';

/**
 * Why a figure is missing, per layer.
 *
 * These read as full sentences because they are shown, not logged: `missingReason` is what
 * the interface and the MCP layer put in front of a caller in place of the number.
 */
const MISSING = {
  amenities:
    'The amenity layer did not load for this area, so nothing was counted. Nothing counted is not the same as nothing there.',
  premises:
    'The premises layer did not load for this area, so surrounding activity is unknown rather than absent.',
  roads:
    'The road layer did not load for this area, so exposure could not be modelled. This is not a quiet location, it is an unmeasured one.',
} as const;

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
  const hasAmenities = index.loaded.has('amenities');
  const hasPremises = index.loaded.has('premises');
  const hasRoads = index.loaded.has('roads');

  const byCategory = {} as Record<AmenityCategory, Measured<number>>;
  const rawByCategory = {} as Record<AmenityCategory, number>;

  for (const category of Object.keys(SATURATION) as AmenityCategory[]) {
    if (!hasAmenities) {
      byCategory[category] = unavailable(origin, MISSING.amenities);
      continue;
    }
    const count = countAmenities(point, category, index);
    const score = saturating(count, SATURATION[category]);
    rawByCategory[category] = score;
    byCategory[category] = withValue(score, origin, 'derived', amenityNote);
  }

  // Every composite below is guarded by the layers it reads. A composite computed from a
  // layer that never loaded would be arithmetic on an assumption, not a derivation.
  const walkability = hasAmenities
    ? withValue(
        Math.round(
          (Object.keys(WALKABILITY_WEIGHTS) as AmenityCategory[]).reduce(
            (sum, category) => sum + rawByCategory[category] * WALKABILITY_WEIGHTS[category],
            0,
          ),
        ),
        origin,
        'derived',
        amenityNote,
      )
    : unavailable<number>(origin, MISSING.amenities);

  // Footfall mixes two layers, so it survives only if both are there.
  let footfall: Measured<number>;
  if (!hasPremises) {
    footfall = unavailable<number>(origin, MISSING.premises);
  } else if (!hasAmenities) {
    footfall = unavailable<number>(origin, MISSING.amenities);
  } else {
    const occupiedNearby = index.premises
      .within(point, FOOTFALL_RADIUS_M)
      .filter((p) => p.status === 'occupied').length;
    footfall = withValue(
      clamp(Math.round(saturating(occupiedNearby, 90) * 0.65 + rawByCategory.transit * 0.35)),
      origin,
      'estimated',
      'No open pedestrian count exists for Île-de-France. This is a proxy from active-business density and transport access: it compares two locations against each other, it does not predict footfall.',
    );
  }

  return {
    ...byCategory,
    walkability,
    footfall,
    noise: hasRoads
      ? withValue(
          noiseExposure(point, index.roads),
          origin,
          'estimated',
          'Modelled from the proximity and class of major roads only. Buildings, traffic volume and time of day are not taken into account.',
        )
      : unavailable<number>(origin, MISSING.roads),
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
