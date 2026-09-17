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
  combineOrigins,
  scoreLocation,
  uniformOrigins,
  type Amenity,
  type NeighbourhoodContext,
  type Origin,
  type Point,
} from './index';

const ORIGIN: Origin = { source: 'test', licence: 'ODbL', asOf: '2026-08' };
/** One source behind all three layers — the shape these arithmetic tests care about. */
const ORIGINS = uniformOrigins(ORIGIN);

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

/**
 * A context whose three layers all loaded and simply hold nothing — the "genuinely empty
 * neighbourhood" case. Tests that need the other case, a layer that never arrived, pass
 * `loaded` explicitly.
 */
function context(partial: Partial<NeighbourhoodContext> = {}): NeighbourhoodContext {
  return {
    amenities: [],
    roads: [],
    premises: [],
    loaded: ['amenities', 'roads', 'premises'],
    ...partial,
  };
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
    const scores = scoreLocation(MONTORGUEIL, buildIndex(context()), ORIGINS);
    expect(scores.walkability.value).toBe(0);
    expect(scores.groceries.value).toBe(0);
  });

  // The counterpart to the test above, and the whole point of `loaded`. Both contexts hold
  // three empty arrays; only the declaration tells "counted nothing" from "counted nothing
  // because the layer never arrived". Before this, an Overpass outage scored as a real 0.
  it('returns nulls, not zeros, when a layer never loaded', () => {
    const scores = scoreLocation(
      MONTORGUEIL,
      buildIndex(context({ loaded: [] })),
      ORIGINS,
    );

    for (const measured of Object.values(scores)) {
      expect(measured.value).toBeNull();
      expect(measured.missingReason).toBeTruthy();
    }
  });

  // The most damaging case: 0 exposure is labelled "Very low" downstream, so a road layer
  // that failed to load used to read as a quiet street. An absence became a selling point.
  it('does not report silence when the road layer is missing', () => {
    const scores = scoreLocation(
      MONTORGUEIL,
      buildIndex(context({ loaded: ['amenities', 'premises'] })),
      ORIGINS,
    );

    expect(scores.noise.value).toBeNull();
    expect(scores.noise.missingReason).toContain('unmeasured');
    // The layers that did load are unaffected: absence is per-layer, not all-or-nothing.
    expect(scores.walkability.value).toBe(0);
    expect(scores.footfall.value).toBe(0);
  });

  it('withholds a composite when either layer behind it is missing', () => {
    const noPremises = scoreLocation(
      MONTORGUEIL,
      buildIndex(context({ loaded: ['amenities', 'roads'] })),
      ORIGINS,
    );
    expect(noPremises.footfall.value).toBeNull();
    // Walkability does not read the premises layer, so it still stands.
    expect(noPremises.walkability.value).toBe(0);

    const noAmenities = scoreLocation(
      MONTORGUEIL,
      buildIndex(context({ loaded: ['premises', 'roads'] })),
      ORIGINS,
    );
    expect(noAmenities.footfall.value).toBeNull();
    expect(noAmenities.walkability.value).toBeNull();
    expect(noAmenities.noise.value).toBe(0);
  });

  it('keeps every score within 0-100', () => {
    const amenities: Amenity[] = Array.from({ length: 400 }, (_, i) => ({
      ...offset(MONTORGUEIL, i % 20, Math.floor(i / 20)),
      category: 'groceries' as const,
    }));
    const scores = scoreLocation(MONTORGUEIL, buildIndex(context({ amenities })), ORIGINS);
    for (const measured of Object.values(scores)) {
      expect(measured.value).toBeGreaterThanOrEqual(0);
      expect(measured.value).toBeLessThanOrEqual(100);
    }
  });

  it('always labels footfall and noise as estimates', () => {
    const scores = scoreLocation(MONTORGUEIL, buildIndex(context()), ORIGINS);
    expect(scores.footfall.method).toBe('estimated');
    expect(scores.noise.method).toBe('estimated');
    expect(scores.footfall.note).toBeTruthy();
  });

  it('carries its origin on every figure', () => {
    const scores = scoreLocation(MONTORGUEIL, buildIndex(context()), ORIGINS);
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
      ORIGINS,
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
    const scores = scoreLocation(MONTORGUEIL, buildIndex(context({ bounds: wide })), ORIGINS);
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
    const a = scoreLocation(MONTORGUEIL, served, ORIGINS).walkability.value ?? 0;
    const b = scoreLocation(MONTORGUEIL, bare, ORIGINS).walkability.value ?? 0;
    expect(a).toBeGreaterThan(b);
  });
});

/**
 * The defect `w0-provenance` closes: one `Origin` for the whole result meant the MCP
 * server, which loads premises from APUR and amenities from OpenStreetMap, stamped
 * "OpenStreetMap via Overpass, ODbL" on APUR's figures. Two sources, one label, and the
 * wrong licence on the half that has a stricter one.
 */
describe('scoreLocation attributes each metric to the layer it reads', () => {
  const OSM: Origin = { source: 'OpenStreetMap via Overpass', licence: 'ODbL', asOf: '2026-08-24' };
  const APUR: Origin = { source: 'APUR BDCom 2023', licence: 'ODbL', asOf: '2023-06' };
  const MIXED = { amenities: OSM, roads: OSM, premises: APUR };

  it('names OpenStreetMap on the amenity axes, never the premises source', () => {
    const scores = scoreLocation(MONTORGUEIL, buildIndex(context()), MIXED);
    for (const key of ['walkability', 'schools', 'healthcare', 'groceries', 'parks', 'transit'] as const) {
      expect(scores[key].source).toBe(OSM.source);
    }
    expect(scores.noise.source).toBe(OSM.source);
  });

  // The footfall proxy is 65 % premise density and 35 % transport access. Attributing it to
  // either source alone would hide a third of where it comes from, so it names both.
  it('names both sources on the footfall proxy, which mixes two layers', () => {
    const scores = scoreLocation(MONTORGUEIL, buildIndex(context()), MIXED);
    expect(scores.footfall.source).toContain('APUR BDCom 2023');
    expect(scores.footfall.source).toContain('OpenStreetMap via Overpass');
  });

  // A missing figure still has to say which dataset is silent: "unavailable" alone does not
  // tell a caller whether to retry Overpass or to ask APUR for a licence.
  it('keeps the right source on a layer that never loaded', () => {
    const scores = scoreLocation(
      MONTORGUEIL,
      buildIndex(context({ loaded: ['amenities', 'roads'] })),
      MIXED,
    );
    expect(scores.footfall.value).toBeNull();
    expect(scores.footfall.source).toBe(APUR.source);
    expect(scores.noise.source).toBe(OSM.source);
  });
});

describe('combineOrigins', () => {
  const OSM: Origin = { source: 'OpenStreetMap via Overpass', licence: 'ODbL', asOf: '2026-08-24' };

  it('collapses identical origins rather than repeating them', () => {
    expect(combineOrigins(OSM, OSM)).toEqual(OSM);
  });

  // Dropping one licence of a composite would tell a redistributor they are bound by less
  // than they are. Both are named, and only exact duplicates disappear.
  it('keeps every distinct licence', () => {
    const apur: Origin = { source: 'APUR BDCom 2017', licence: 'Custom APUR licence (unread)', asOf: '2017' };
    expect(combineOrigins(apur, OSM).licence).toBe('Custom APUR licence (unread) + ODbL');
  });

  it('carries the oldest date, not the newest', () => {
    const apur: Origin = { source: 'APUR BDCom 2023', licence: 'ODbL', asOf: '2023-06' };
    expect(combineOrigins(OSM, apur).asOf).toBe('2023-06');
    expect(combineOrigins(apur, OSM).asOf).toBe('2023-06');
  });
});
