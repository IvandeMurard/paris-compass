/**
 * The bounds the context mini-map is framed on — w6-fiche-robuste (#156), geste 1.
 *
 * **Why this exists at all.** `ContextMap` used to ask Leaflet for its own frame:
 * `instance.fitBounds(circle.getBounds())`. `Circle.getBounds()` reads `this._map`, and a
 * layer added to a map that has never been given a view is never actually attached —
 * `Map.addLayer` defers through `whenReady`, and `whenReady` on a view-less map only
 * subscribes to a `load` event that will not fire. So `circle._map` stayed `undefined` and the
 * call threw `Cannot read properties of undefined (reading 'layerPointToLatLng')`, inside an
 * effect, which React hands to the nearest error boundary — taking the verdict, the findings
 * and the gaps block down with a support illustration. Measured in production on
 * 13 September 2026, `DIAGNOSTIC.md` §50.
 *
 * **So the frame is computed here, from the point, with no map in the loop.** It is the same
 * arithmetic `boxAround` already uses for the Overpass query, and it answers before Leaflet is
 * touched: a component that knows its bounds can set its view first and add layers second,
 * which is the order that makes every later `getBounds()` unnecessary rather than merely
 * lucky.
 *
 * **A refusal is a finding, not a failure.** When the point cannot produce bounds inside the
 * world, the caller is told which of the three reasons applies and renders a written absence.
 * A support map that cannot draw itself is a missing illustration; it has never been a reason
 * for the page to stop answering.
 *
 * **What this does not catch.** It judges the *point*, never the *container*: a host element
 * of zero width, a Leaflet version that changes its projection contract, a tile server that
 * refuses — none of them are visible from here, and none of them are bounded by this function.
 * That residue is why `ContextMap` still degrades to the same written absence when the mount
 * itself throws.
 */

import { M_PER_DEG_LAT, mPerDegLng, type BBox, type Point } from '@/core';

/** Why a point yields no frame. Three causes, kept apart because they are three defects. */
export type MapFrameRefusal =
  /** The radius is not a usable length — a core constant gone wrong, not a bad address. */
  | 'rayon'
  /** The coordinates are absent, infinite, or off the globe. */
  | 'point'
  /** The point is fine but the circle around it leaves the world — a pole, or a huge radius. */
  | 'bornes';

export type MapFrame =
  | { kind: 'cadre'; center: Point; bounds: BBox }
  | { kind: 'refus'; because: MapFrameRefusal };

const inWorld = (bounds: BBox) =>
  bounds.south >= -90 && bounds.north <= 90 && bounds.west >= -180 && bounds.east <= 180;

const finite = (bounds: BBox) =>
  Number.isFinite(bounds.south) &&
  Number.isFinite(bounds.north) &&
  Number.isFinite(bounds.west) &&
  Number.isFinite(bounds.east);

/**
 * The bounds of a circle of `radiusM` around `point`, or the reason there are none.
 *
 * The three refusals are ordered by what a reader would have to fix, not by how likely they
 * are: a radius that is not a length is a bug in the core, coordinates off the globe are a bug
 * in the caller, and bounds that leave the world are neither — they are a legitimate point in
 * an illegitimate place for a flat frame.
 */
export function contextMapFrame(point: Point, radiusM: number): MapFrame {
  if (!Number.isFinite(radiusM) || radiusM <= 0) return { kind: 'refus', because: 'rayon' };
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    return { kind: 'refus', because: 'point' };
  }
  if (Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) {
    return { kind: 'refus', because: 'point' };
  }

  const dLat = radiusM / M_PER_DEG_LAT;
  const dLng = radiusM / mPerDegLng(point.lat);
  const bounds: BBox = {
    south: point.lat - dLat,
    north: point.lat + dLat,
    west: point.lng - dLng,
    east: point.lng + dLng,
  };

  // `mPerDegLng` collapses towards the poles, so a point a hair short of 90° yields a
  // longitude span wider than the globe. Finite is not the same as drawable.
  if (!finite(bounds) || !inWorld(bounds)) return { kind: 'refus', because: 'bornes' };

  return { kind: 'cadre', center: { lat: point.lat, lng: point.lng }, bounds };
}
