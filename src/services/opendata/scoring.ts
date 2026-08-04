import { clamp, distanceM } from './http';
import type { AreaScores, NoiseEstimate, Poi, PoiCategory } from './types';
import type { OverpassSnapshot } from './overpass';

const RADIUS_M = 800;

/** Saturating score: n POIs within 800 m mapped onto 0-100. */
function categoryScore(count: number, saturation: number) {
  return clamp(Math.round(100 * (1 - Math.exp(-count / saturation))));
}

function countNear(pois: Poi[], point: { lat: number; lng: number }, category: PoiCategory) {
  let count = 0;
  for (const poi of pois) {
    if (poi.category !== category) continue;
    if (distanceM(point, poi) <= RADIUS_M) count += 1;
  }
  return count;
}

export function computeScores(
  point: { lat: number; lng: number },
  snapshot: OverpassSnapshot,
): AreaScores {
  const schools = categoryScore(countNear(snapshot.pois, point, 'schools'), 3);
  const healthcare = categoryScore(countNear(snapshot.pois, point, 'healthcare'), 4);
  const groceries = categoryScore(countNear(snapshot.pois, point, 'groceries'), 5);
  const parks = categoryScore(countNear(snapshot.pois, point, 'parks'), 3);
  const transitCount = countNear(snapshot.pois, point, 'transit');
  const transit = categoryScore(transitCount, 6);

  const walkability = Math.round(
    schools * 0.15 + healthcare * 0.2 + groceries * 0.3 + parks * 0.15 + transit * 0.2,
  );

  // Footfall proxy: density of nearby businesses + transit access (no open dataset exists).
  const commerceCount = snapshot.premises.filter(
    (p) => distanceM(point, p) <= 400 && p.status === 'occupied',
  ).length;
  const footfall = clamp(
    Math.round(categoryScore(commerceCount, 15) * 0.65 + transit * 0.35),
  );

  return { walkability, schools, healthcare, groceries, transit, parks, footfall };
}

/** Noise proxy derived from the proximity and class of major OSM roads. */
export function estimateNoise(
  point: { lat: number; lng: number },
  snapshot: OverpassSnapshot,
): NoiseEstimate {
  let exposure = 0;
  for (const road of snapshot.roads) {
    const d = distanceM(point, road);
    if (d > 500) continue;
    exposure += road.weight * (1 - d / 500);
  }
  const score = clamp(Math.round(exposure * 12));
  const label = score >= 70 ? 'High' : score >= 40 ? 'Moderate' : score >= 15 ? 'Low' : 'Very low';
  return { score, label };
}

export function scoreLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  return 'Low';
}
