import type { Layer } from '@/core';
import { fetchJson } from './http';
import type { BBox, Poi, PoiCategory } from './types';

/** Public Overpass mirrors, tried in order when one is rate-limited or down. */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

export const OVERPASS_HOSTS = OVERPASS_ENDPOINTS.map((url) => new URL(url).host);

/**
 * How long one mirror is given before the request is abandoned.
 *
 * Sized for `/carte`, where the visitor asked for OpenStreetMap data and a mirror that answers
 * in fifty seconds is still an answer. It is deliberately NOT the bound the context sheet
 * lives under: see `budgetMs`.
 */
export const MIRROR_TIMEOUT_MS = 70000;

/**
 * Every Overpass mirror refused the request.
 *
 * Distinguished from a generic failure because the two call for different words on screen.
 * A `TypeError: Failed to fetch` on all three hosts is not an upstream outage — the mirrors
 * are independent — it is the browser's own network refusing to reach them: proxy, DNS
 * filter, content blocker. `blocked` records that reading so the UI can name the hosts
 * instead of blaming the data.
 */
export class OverpassUnreachableError extends Error {
  readonly hosts = OVERPASS_HOSTS;
  readonly blocked: boolean;
  /** Set by hand: the `cause` option of `Error` needs a lib newer than this project targets. */
  readonly reason: unknown;

  constructor(message: string, options: { blocked: boolean; cause?: unknown }) {
    super(message);
    this.name = 'OverpassUnreachableError';
    this.blocked = options.blocked;
    this.reason = options.cause;
  }
}

/**
 * A `fetch` that never reached the server rejects with a `TypeError`, with no status.
 * An HTTP error, a timeout abort or an Overpass remark all produce something else.
 */
const isNetworkRefusal = (error: unknown) =>
  error instanceof TypeError ||
  (error instanceof DOMException && error.name === 'AbortError');


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
  /** Overpass reports its own failures here, not in the HTTP status. See `remarkOf`. */
  remark?: string;
}

/**
 * Overpass signals a failed query in band.
 *
 * A query that times out or exhausts memory answers **HTTP 200** with `elements: []` and a
 * `remark` such as "runtime error: Query timed out". Accepting that as an empty
 * neighbourhood is how an outage turns into a measured zero on every score — and, for
 * noise, into a "very low" reading, which is a positive claim drawn from an absence.
 *
 * Any remark is treated as a failure rather than only the ones matching known wordings:
 * this is Overpass's sole channel for partial results, and the response falls through to
 * the next mirror before anything is surfaced. A spurious error is visible and recoverable;
 * a silent zero is neither.
 */
function remarkOf(payload: unknown): string | undefined {
  const remark = (payload as OverpassResponse | null)?.remark;
  return typeof remark === 'string' && remark.trim() ? remark : undefined;
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
  /**
   * Which layers this snapshot actually carries, for the scoring core.
   *
   * All three, always, and that is not redundant: the three families are fetched in one
   * union query, so either the whole snapshot arrives or `fetchOverpassSnapshot` throws.
   * Stating it here rather than assuming it downstream is what will keep the next source
   * — BDCom premises joined to OSM amenities, which can fail separately — honest.
   */
  loaded: Layer[];
}

const ROAD_WEIGHT: Record<string, number> = {
  motorway: 4,
  trunk: 3.5,
  primary: 3,
  secondary: 2,
};

export interface OverpassOptions {
  /**
   * Total wall-clock the caller is willing to spend, across every mirror — w6-fiche-robuste
   * (#156), geste 2.
   *
   * **The budget belongs to the caller, not to this module.** Three mirrors at
   * `MIRROR_TIMEOUT_MS` is the right shape for `/carte`: the visitor asked for OpenStreetMap
   * data, the screen is the map, and waiting is the price of the answer. The context sheet has
   * a different contract — it owes a verdict *or its refusal* in a readable delay — and it
   * cannot express that here by picking a smaller per-request timeout, because what it needs
   * bounded is the walk, not the hop. Measured on 13 September 2026 in production: three
   * mirrors, no budget, **2 min 20** of « Lecture du quartier en cours… » before the sheet
   * could say anything at all (`DIAGNOSTIC.md` §50).
   *
   * Left out, nothing changes: each mirror gets its own timeout and the walk lasts as long as
   * it lasts.
   */
  budgetMs?: number;
}

/**
 * Fetch every OpenStreetMap feature Compass needs for a map viewport, in one request.
 *
 * Each mirror is tried exactly once — no back-off loop. Three hosts that all refuse in the
 * same second are refusing for a local reason, and retrying them only spends the user's
 * time while the map stays blank. The caller is told, once, and offers a Retry button.
 */
export async function fetchOverpassSnapshot(
  bbox: BBox,
  { budgetMs }: OverpassOptions = {},
): Promise<OverpassSnapshot> {
  const query = buildQuery(bbox);
  const startedAt = Date.now();
  let data: OverpassResponse | null = null;
  let lastError: unknown = null;
  let refusals = 0;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    // A mirror is only tried with the time that is actually left. The budget bounds the walk,
    // so a first mirror that burns all of it means the second is not attempted at all —
    // which is the point: the caller asked for an answer within a delay, not for three tries.
    const left = budgetMs === undefined ? MIRROR_TIMEOUT_MS : budgetMs - (Date.now() - startedAt);
    if (left <= 0) break;

    try {
      data = await fetchJson<OverpassResponse>(endpoint, {
        cacheKey: `overpass:${bboxKey(bbox)}`,
        maxAgeMs: 60 * 60 * 1000,
        timeoutMs: Math.min(MIRROR_TIMEOUT_MS, left),
        // A well-formed response with zero elements is a legitimate answer, not a failure:
        // some viewports genuinely hold nothing. Only a malformed payload is an error.
        validate: (payload) =>
          Array.isArray((payload as OverpassResponse | null)?.elements) && !remarkOf(payload),
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: query }).toString(),
        },
      });
      break;
    } catch (error) {
      lastError = error;
      if (isNetworkRefusal(error)) refusals += 1;
    }
  }

  if (!data) {
    const message = lastError instanceof Error ? lastError.message : 'Overpass unavailable';
    throw new OverpassUnreachableError(message, {
      // Every mirror refused at the network layer: the block is on this side of the wire.
      // A budget that runs out stops the walk early, so this cannot be reached under one —
      // which is the honest answer: a caller who gave up after ten seconds has not observed
      // three mirrors refusing, and must not claim to have.
      blocked: refusals === OVERPASS_ENDPOINTS.length,
      cause: lastError,
    });
  }


  const snapshot: OverpassSnapshot = {
    pois: [],
    roads: [],
    premises: [],
    loaded: ['amenities', 'roads', 'premises'],
  };

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
