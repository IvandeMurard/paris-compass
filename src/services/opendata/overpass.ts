import { fetchJson } from './http';
import type { BBox, Poi, PoiCategory } from './types';

/** Public Overpass mirrors, tried in order when one is rate-limited or down. */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const round = (v: number) => Math.round(v * 1000) / 1000;

export function bboxKey(bbox: BBox) {
  return `${round(bbox.south)},${round(bbox.west)},${round(bbox.north)},${round(bbox.east)}`;
}

function buildQuery(bbox: BBox) {
  const b = bboxKey(bbox);
  return `[out:json][timeout:60];
(
  nwr["shop"="vacant"](${b});
  nwr["disused:shop"](${b});
  nwr["shop"]["shop"!="vacant"](${b});
  nwr["office"](${b});
  nwr["amenity"~"^(school|college|kindergarten|university)$"](${b});
  nwr["amenity"~"^(hospital|clinic|doctors|pharmacy)$"](${b});
  nwr["shop"~"^(supermarket|convenience|greengrocer|bakery|butcher)$"](${b});
  nwr["leisure"~"^(park|garden|playground)$"](${b});
  nwr["railway"="station"](${b});
  nwr["railway"="subway_entrance"](${b});
  nwr["highway"="bus_stop"](${b});
  way["highway"~"^(motorway|trunk|primary|secondary)$"](${b});
);
out center tags;`;
}

function elementPosition(el: OverpassElement) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng };
}

function categorise(tags: Record<string, string>): PoiCategory | 'road' | null {
  if (tags.highway && ['motorway', 'trunk', 'primary', 'secondary'].includes(tags.highway)) {
    return 'road';
  }
  const amenity = tags.amenity;
  if (amenity && ['school', 'college', 'kindergarten', 'university'].includes(amenity)) {
    return 'schools';
  }
  if (amenity && ['hospital', 'clinic', 'doctors', 'pharmacy'].includes(amenity)) {
    return 'healthcare';
  }
  if (
    tags.shop &&
    ['supermarket', 'convenience', 'greengrocer', 'bakery', 'butcher'].includes(tags.shop)
  ) {
    return 'groceries';
  }
  if (tags.leisure && ['park', 'garden', 'playground'].includes(tags.leisure)) {
    return 'parks';
  }
  if (tags.railway === 'station' || tags.railway === 'subway_entrance' || tags.highway === 'bus_stop') {
    return 'transit';
  }
  if (tags.shop || tags.office || tags['disused:shop']) return 'commerce';
  return null;
}

export interface OverpassSnapshot {
  pois: Poi[];
  roads: { lat: number; lng: number; weight: number }[];
  premises: {
    id: string;
    lat: number;
    lng: number;
    tags: Record<string, string>;
    status: 'vacant' | 'occupied';
  }[];
}

const ROAD_WEIGHT: Record<string, number> = {
  motorway: 4,
  trunk: 3.5,
  primary: 3,
  secondary: 2,
};

/** Fetch every OpenStreetMap feature Compass needs for a map viewport, in one request. */
export async function fetchOverpassSnapshot(bbox: BBox): Promise<OverpassSnapshot> {
  const query = buildQuery(bbox);
  let data: OverpassResponse | null = null;
  let lastError: unknown = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      data = await fetchJson<OverpassResponse>(endpoint, {
        cacheKey: `overpass:${bboxKey(bbox)}`,
        maxAgeMs: 60 * 60 * 1000,
        timeoutMs: 70000,
        // A well-formed response with zero elements is a legitimate answer, not a failure:
        // some viewports genuinely hold nothing. Only a malformed payload is an error.
        validate: (payload) => Array.isArray((payload as OverpassResponse | null)?.elements),
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: query }).toString(),
        },
      });
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!data) throw lastError instanceof Error ? lastError : new Error('Overpass unavailable');

  const snapshot: OverpassSnapshot = { pois: [], roads: [], premises: [] };

  for (const el of data.elements ?? []) {
    const tags = el.tags ?? {};
    const position = elementPosition(el);
    if (!position) continue;
    const category = categorise(tags);
    if (!category) continue;

    if (category === 'road') {
      snapshot.roads.push({ ...position, weight: ROAD_WEIGHT[tags.highway] ?? 1 });
      continue;
    }

    const id = `${el.type}/${el.id}`;
    if (category === 'commerce') {
      const vacant = tags.shop === 'vacant' || Boolean(tags['disused:shop']);
      snapshot.premises.push({ id, ...position, tags, status: vacant ? 'vacant' : 'occupied' });
      continue;
    }

    snapshot.pois.push({ id, category, name: tags.name, ...position });
  }

  return snapshot;
}
