/**
 * Pure geometry. No network, no DOM, no framework.
 *
 * This used to live in `services/opendata/http.ts`, next to a fetch helper — geometry has
 * nothing to do with transport, and burying it there made it untestable in isolation.
 */

export interface Point {
  lat: number;
  lng: number;
}

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export const EARTH_RADIUS_M = 6371000;

/** Great-circle distance in metres. */
export function distanceM(a: Point, b: Point): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

/**
 * Metres per degree of latitude.
 *
 * Derived from the same sphere `distanceM` uses, on purpose. Mixing an ellipsoidal
 * constant (110574) with a spherical distance formula put a 0.56 % inconsistency between
 * the distances measured and the grid cells and coverage boxes computed from them — small,
 * but the kind of drift that makes two supposedly identical calculations disagree.
 */
export const M_PER_DEG_LAT = (EARTH_RADIUS_M * Math.PI) / 180;

/** Metres per degree of longitude, which shrinks with latitude. */
export const mPerDegLng = (lat: number) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

/**
 * Does `bounds` fully contain the disc of radius `radiusM` around `point`?
 *
 * This is what makes the viewport-truncation problem visible instead of silent. Scores
 * count what falls within a radius; when the data only covers the map viewport, a point
 * near the edge has its disc cut off and scores lower for no reason but the framing.
 * Callers use this to downgrade the figure to `estimated` and say why.
 */
export function boundsCoverRadius(point: Point, radiusM: number, bounds: BBox): boolean {
  const dLat = radiusM / M_PER_DEG_LAT;
  const dLng = radiusM / mPerDegLng(point.lat);
  return (
    point.lat - dLat >= bounds.south &&
    point.lat + dLat <= bounds.north &&
    point.lng - dLng >= bounds.west &&
    point.lng + dLng <= bounds.east
  );
}

/**
 * Uniform grid index over points, so counting neighbours stops being O(n) per query.
 *
 * The previous implementation scanned every point of the snapshot once per category per
 * premise. With a few hundred premises and tens of thousands of points that is millions of
 * trigonometric calls on the main thread, and the tab freezes. The grid narrows each query
 * to the cells the search radius actually touches.
 */
export class GridIndex<T extends Point> {
  private readonly cells = new Map<string, T[]>();
  private readonly cellDeg: number;
  private readonly refLat: number;

  constructor(items: readonly T[], cellSizeM = 200, refLat = 48.86) {
    this.refLat = refLat;
    this.cellDeg = cellSizeM / M_PER_DEG_LAT;
    for (const item of items) {
      const key = this.key(item.lat, item.lng);
      const bucket = this.cells.get(key);
      if (bucket) bucket.push(item);
      else this.cells.set(key, [item]);
    }
  }

  private key(lat: number, lng: number): string {
    const latCell = Math.floor(lat / this.cellDeg);
    // Longitude cells are widened so they stay roughly square in metres.
    const lngDeg = this.cellDeg * (M_PER_DEG_LAT / mPerDegLng(this.refLat));
    const lngCell = Math.floor(lng / lngDeg);
    return `${latCell}:${lngCell}`;
  }

  /** Every indexed item within `radiusM` of `point`. */
  within(point: Point, radiusM: number): T[] {
    const lngDeg = this.cellDeg * (M_PER_DEG_LAT / mPerDegLng(this.refLat));
    const latSpan = Math.ceil(radiusM / M_PER_DEG_LAT / this.cellDeg);
    const lngSpan = Math.ceil(radiusM / mPerDegLng(point.lat) / lngDeg);
    const latCell = Math.floor(point.lat / this.cellDeg);
    const lngCell = Math.floor(point.lng / lngDeg);

    const found: T[] = [];
    for (let i = latCell - latSpan; i <= latCell + latSpan; i += 1) {
      for (let j = lngCell - lngSpan; j <= lngCell + lngSpan; j += 1) {
        const bucket = this.cells.get(`${i}:${j}`);
        if (!bucket) continue;
        for (const item of bucket) {
          if (distanceM(point, item) <= radiusM) found.push(item);
        }
      }
    }
    return found;
  }

  get size(): number {
    let total = 0;
    for (const bucket of this.cells.values()) total += bucket.length;
    return total;
  }
}
