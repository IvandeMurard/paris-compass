import { fetchJson } from './http';

/**
 * Residential rent reference per Paris quartier (encadrement des loyers).
 *
 * ⚠️ HOUSING ONLY. The Paris rent control scheme applies to dwellings let as a main
 * residence under the law of 6 July 1989. It explicitly EXCLUDES commercial and
 * professional premises. This figure must never be used — directly or multiplied by a
 * floor area — to price, estimate or filter a commercial unit.
 *
 * Compass keeps it for one legitimate purpose: as a proxy for the residential standard
 * of living of the surrounding quartier, i.e. a catchment-area signal. It is surfaced
 * under that name, with its vintage, and never inside a price context.
 *
 * There is no open dataset of actual commercial rents in France: the local rent
 * observatories cover private housing, and INSEE's ILC is a revision index rather than
 * a level. See DIAGNOSTIC.md §1.
 */

const DATASET =
  'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logement-encadrement-des-loyers/records';

/**
 * The prefectural grid splits each quartier into 32 cells: 4 construction periods
 * (before 1946, 1946-1970, 1971-1990, after 1990) × 4 dwelling sizes × furnished or not.
 *
 * Compass averages all 32 rather than pinning one. Pinning a single cell — which is what
 * this module used to do — throws away 31/32 of the data and makes the signal hostage to
 * an arbitrary choice. The mix is identical for every quartier, all 80 of them carrying
 * exactly the same 32 cells, so the average stays comparable across neighbourhoods, which
 * is the only thing a catchment-area signal has to be.
 */
const CELLS_PER_QUARTIER = 32;

export interface NeighbourhoodProfile {
  quartier: string;
  lat: number;
  lng: number;
  /**
   * Mean residential reference rent across the whole grid of the quartier, €/m²/month.
   * A standard-of-living signal. NOT a commercial rent.
   */
  residentialRentEurM2: number;
  /** Vintage of the prefectural decree this figure comes from, e.g. "2025". */
  year: string;
  /** How many grid cells the mean was computed from. Expected to be 32. */
  sampleSize: number;
}

interface YearRecord {
  annee?: string;
}

interface AggregateRecord {
  nom_quartier?: string;
  ref_moyen?: number;
  n?: number;
}

interface ShapeRecord {
  nom_quartier?: string;
  geo_shape?: { geometry?: { coordinates?: unknown } };
}

function centroid(coordinates: unknown): { lat: number; lng: number } | null {
  const points: number[][] = [];
  const walk = (node: unknown) => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === 'number' && typeof node[1] === 'number') {
      points.push(node as number[]);
      return;
    }
    node.forEach(walk);
  };
  walk(coordinates);
  if (!points.length) return null;
  const lng = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const lat = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  return { lat, lng };
}

const query = (params: Record<string, string>) =>
  `${DATASET}?${new URLSearchParams(params).toString()}`;

/**
 * Most recent vintage actually published in the dataset.
 *
 * Resolved at runtime rather than hardcoded, so a new decree is picked up without a code
 * change. Note that the published vintage lags the decree in force: the dataset carried
 * 2019 to 2025 as of August 2026.
 */
async function latestYear(): Promise<string | null> {
  const data = await fetchJson<{ results: YearRecord[] }>(
    query({ select: 'annee', group_by: 'annee', order_by: 'annee desc', limit: '1' }),
    { cacheKey: 'neighbourhood:year', maxAgeMs: 24 * 60 * 60 * 1000 },
  );
  return data.results?.[0]?.annee ?? null;
}

/** One row per quartier: the mean of its whole grid, and how many cells fed it. */
async function meansByQuartier(year: string): Promise<Map<string, AggregateRecord>> {
  const data = await fetchJson<{ results: AggregateRecord[] }>(
    query({
      select: 'nom_quartier, avg(ref) as ref_moyen, count(*) as n',
      where: `annee="${year}"`,
      group_by: 'nom_quartier',
      limit: '100',
    }),
    { cacheKey: `neighbourhood:means:${year}`, maxAgeMs: 24 * 60 * 60 * 1000 },
  );

  const byQuartier = new Map<string, AggregateRecord>();
  for (const record of data.results ?? []) {
    if (record.nom_quartier) byQuartier.set(record.nom_quartier, record);
  }
  return byQuartier;
}

/**
 * One geometry per quartier.
 *
 * Aggregation queries cannot carry a geo field, so this pins an arbitrary grid cell to get
 * exactly 80 rows. The cell choice is irrelevant here: the geometry is the quartier's, and
 * identical in all 32 of them. It is used for geometry only — never for a value.
 */
async function shapesByQuartier(year: string): Promise<Map<string, { lat: number; lng: number }>> {
  const data = await fetchJson<{ results: ShapeRecord[] }>(
    query({
      select: 'nom_quartier, geo_shape',
      where: `annee="${year}" and piece=1 and epoque="Avant 1946" and meuble_txt="non meublé"`,
      limit: '100',
    }),
    { cacheKey: `neighbourhood:shapes:${year}`, maxAgeMs: 7 * 24 * 60 * 60 * 1000 },
  );

  const byQuartier = new Map<string, { lat: number; lng: number }>();
  for (const record of data.results ?? []) {
    if (!record.nom_quartier) continue;
    const center = centroid(record.geo_shape?.geometry?.coordinates);
    if (center) byQuartier.set(record.nom_quartier, center);
  }
  return byQuartier;
}

/**
 * Fetch the residential profile of every Paris quartier, for the most recent vintage
 * published.
 *
 * Returns an empty array when the source is unreachable, so callers surface the value as
 * unavailable rather than inventing one.
 */
export async function fetchNeighbourhoodProfiles(): Promise<NeighbourhoodProfile[]> {
  try {
    const year = await latestYear();
    if (!year) return [];

    const [means, shapes] = await Promise.all([meansByQuartier(year), shapesByQuartier(year)]);

    const profiles: NeighbourhoodProfile[] = [];
    for (const [quartier, aggregate] of means) {
      const center = shapes.get(quartier);
      if (!center || typeof aggregate.ref_moyen !== 'number') continue;
      profiles.push({
        quartier,
        lat: center.lat,
        lng: center.lng,
        residentialRentEurM2: Math.round(aggregate.ref_moyen * 10) / 10,
        year,
        sampleSize: aggregate.n ?? CELLS_PER_QUARTIER,
      });
    }
    return profiles;
  } catch (error) {
    console.error('Neighbourhood profile lookup failed', error);
    return [];
  }
}
