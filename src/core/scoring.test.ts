import { describe, expect, it } from 'vitest';
import {
  AMENITY_RADIUS_M,
  buildIndex,
  countAmenities,
  distanceM,
  GridIndex,
  M_PER_DEG_LAT,
  mPerDegLng,
  noiseExposure,
  saturating,
  scoreLocation,
  type Amenity,
  type NeighbourhoodContext,
  type Origin,
  type Point,
} from './index';

const ORIGIN: Origin = { source: 'test', licence: 'ODbL', asOf: '2026-08' };

/** Montorgueil, the opening view of the app. */
const MONTORGUEIL: Point = { lat: 48.8655, lng: 2.3475 };

/**
 * Move a point by a given number of metres.
 *
 * Deliberately built on the module's own constants rather than hardcoded ones: the point
 * of the assertion below is that distances and degree conversions agree with each other.
 * Hardcoding an ellipsoidal constant here against a spherical distance formula is exactly
 * the inconsistency this test caught the first time it ran.
 */
function offset(point: Point, northM: number, eastM: number): Point {
  return {
    lat: point.lat + northM / M_PER_DEG_LAT,
    lng: point.lng + eastM / mPerDegLng(point.lat),
  };
}

function context(partial: Partial<NeighbourhoodContext> = {}): NeighbourhoodContext {
  return { amenities: [], roads: [], premises: [], ...partial };
}

describe('distanceM', () => {
  it('is zero for a point against itself', () => {
    expect(distanceM(MONTORGUEIL, MONTORGUEIL)).toBe(0);
  });

  it('matches a known offset within a metre', () => {
    const d = distanceM(MONTORGUEIL, offset(MONTORGUEIL, 500, 0));
    expect(d).toBeGreaterThan(499);
    expect(d).toBeLessThan(501);
  });

  it('is symmetric', () => {
    const a = MONTORGUEIL;
    const b = offset(MONTORGUEIL, 300, 200);
    expect(distanceM(a, b)).toBeCloseTo(distanceM(b, a), 6);
  });
});

describe('saturating', () => {
  it('is zero with nothing around', () => {
    expect(saturating(0, 10)).toBe(0);
  });

  it('never exceeds 100', () => {
    expect(saturating(10_000, 10)).toBeLessThanOrEqual(100);
  });

  it('increases with count but with diminishing returns', () => {
    const first = saturating(1, 10) - saturating(0, 10);
    const later = saturating(21, 10) - saturating(20, 10);
    expect(first).toBeGreaterThan(later);
  });
});

describe('GridIndex', () => {
  const points: Amenity[] = [
    { ...MONTORGUEIL, category: 'groceries' },
    { ...offset(MONTORGUEIL, 100, 0), category: 'groceries' },
    { ...offset(MONTORGUEIL, 5000, 0), category: 'groceries' },
  ];

  it('keeps every item it was given', () => {
    expect(new GridIndex(points).size).toBe(3);
  });

  it('returns only what is inside the radius', () => {
    const index = new GridIndex(points);
    expect(index.within(MONTORGUEIL, 300)).toHaveLength(2);
  });

  it('agrees with a brute-force scan', () => {
    const index = new GridIndex(points);
    const radius = 1200;
    const brute = points.filter((p) => distanceM(MONTORGUEIL, p) <= radius);
    expect(index.within(MONTORGUEIL, radius).length).toBe(brute.length);
  });
});

describe('countAmenities', () => {
  it('counts only the requested category', () => {
    const index = buildIndex(
      context({
        amenities: [
          { ...offset(MONTORGUEIL, 50, 0), category: 'groceries' },
          { ...offset(MONTORGUEIL, 60, 0), category: 'schools' },
        ],
      }),
    );
    expect(countAmenities(MONTORGUEIL, 'groceries', index)).toBe(1);
    expect(countAmenities(MONTORGUEIL, 'schools', index)).toBe(1);
    expect(countAmenities(MONTORGUEIL, 'parks', index)).toBe(0);
  });

  it('excludes amenities beyond the radius', () => {
    const index = buildIndex(
      context({
        amenities: [{ ...offset(MONTORGUEIL, AMENITY_RADIUS_M + 200, 0), category: 'parks' }],
      }),
    );
    expect(countAmenities(MONTORGUEIL, 'parks', index)).toBe(0);
  });
});

describe('noiseExposure', () => {
  it('is zero with no road nearby', () => {
    expect(noiseExposure(MONTORGUEIL, [])).toBe(0);
  });

  it('decreases as the road gets further away', () => {
    const near = noiseExposure(MONTORGUEIL, [{ ...offset(MONTORGUEIL, 50, 0), weight: 3 }]);
    const far = noiseExposure(MONTORGUEIL, [{ ...offset(MONTORGUEIL, 450, 0), weight: 3 }]);
    expect(near).toBeGreaterThan(far);
  });

  it('ignores roads beyond 500 m', () => {
    expect(noiseExposure(MONTORGUEIL, [{ ...offset(MONTORGUEIL, 900, 0), weight: 4 }])).toBe(0);
  });
});

describe('scoreLocation', () => {
  it('returns zeros, not nulls, when nothing is around', () => {
    const scores = scoreLocation(MONTORGUEIL, buildIndex(context()), ORIGIN);
    expect(scores.walkability.value).toBe(0);
    expect(scores.groceries.value).toBe(0);
  });

  it('keeps every score within 0-100', () => {
    const amenities: Amenity[] = Array.from({ length: 400 }, (_, i) => ({
      ...offset(MONTORGUEIL, i % 20, Math.floor(i / 20)),
      category: 'groceries' as const,
    }));
    const scores = scoreLocation(MONTORGUEIL, buildIndex(context({ amenities })), ORIGIN);
    for (const measured of Object.values(scores)) {
      expect(measured.value).toBeGreaterThanOrEqual(0);
      expect(measured.value).toBeLessThanOrEqual(100);
    }
  });

  it('always labels footfall and noise as estimates', () => {
    const scores = scoreLocation(MONTORGUEIL, buildIndex(context()), ORIGIN);
    expect(scores.footfall.method).toBe('estimated');
    expect(scores.noise.method).toBe('estimated');
    expect(scores.footfall.note).toBeTruthy();
  });

  it('carries its origin on every figure', () => {
    const scores = scoreLocation(MONTORGUEIL, buildIndex(context()), ORIGIN);
    for (const measured of Object.values(scores)) {
      expect(measured.source).toBe('test');
      expect(measured.licence).toBe('ODbL');
      expect(measured.asOf).toBe('2026-08');
    }
  });

  // The bug this guards against: a premise near the edge of the map viewport used to
  // score lower simply because its 800 m disc was cut off by the fetched area.
  it('flags a truncated search radius instead of scoring silently', () => {
    const tight = {
      south: MONTORGUEIL.lat - 0.001,
      north: MONTORGUEIL.lat + 0.001,
      west: MONTORGUEIL.lng - 0.001,
      east: MONTORGUEIL.lng + 0.001,
    };
    const scores = scoreLocation(
      MONTORGUEIL,
      buildIndex(context({ bounds: tight })),
      ORIGIN,
    );
    expect(scores.walkability.note).toContain('floor, not a total');
  });

  it('does not flag truncation when the bounds are wide enough', () => {
    const wide = {
      south: MONTORGUEIL.lat - 0.05,
      north: MONTORGUEIL.lat + 0.05,
      west: MONTORGUEIL.lng - 0.05,
      east: MONTORGUEIL.lng + 0.05,
    };
    const scores = scoreLocation(MONTORGUEIL, buildIndex(context({ bounds: wide })), ORIGIN);
    expect(scores.walkability.note).toBeUndefined();
  });

  it('rates a well-served location above a bare one', () => {
    const served = buildIndex(
      context({
        amenities: [
          { ...offset(MONTORGUEIL, 100, 0), category: 'groceries' },
          { ...offset(MONTORGUEIL, 120, 0), category: 'groceries' },
          { ...offset(MONTORGUEIL, 150, 0), category: 'schools' },
          { ...offset(MONTORGUEIL, 200, 0), category: 'transit' },
          { ...offset(MONTORGUEIL, 250, 0), category: 'parks' },
        ],
      }),
    );
    const bare = buildIndex(context());
    const a = scoreLocation(MONTORGUEIL, served, ORIGIN).walkability.value ?? 0;
    const b = scoreLocation(MONTORGUEIL, bare, ORIGIN).walkability.value ?? 0;
    expect(a).toBeGreaterThan(b);
  });
});
