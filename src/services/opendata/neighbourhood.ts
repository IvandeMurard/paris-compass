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
 * under that name and never inside a price context.
 *
 * There is no open dataset of actual commercial rents in France: the local rent
 * observatories cover private housing, and INSEE's ILC is a revision index rather than
 * a level. See DIAGNOSTIC.md §1.
 */

const DATASET =
  'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logement-encadrement-des-loyers/records';

export interface NeighbourhoodProfile {
  quartier: string;
  lat: number;
  lng: number;
  /** Residential reference rent in €/m²/month — a standard-of-living signal, NOT a commercial rent. */
  residentialRentEurM2: number;
  year: string;
}

interface OdsRecord {
  nom_quartier?: string;
  annee?: string;
  ref?: number;
  geo_shape?: { geometry?: { type?: string; coordinates?: unknown } };
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

/**
 * Fetch the residential rent reference for every Paris quartier.
 *
 * The upstream dataset is broken down by number of rooms, furnishing and construction
 * period. We pin a single, documented slice so the figure is comparable across quartiers:
 * a 2-room unfurnished dwelling built between 1946 and 1970. The absolute level matters
 * far less than the relative gap between neighbourhoods, which is what a catchment-area
 * signal needs.
 *
 * Returns an empty array when the source is unreachable, so callers surface the value as
 * unavailable rather than inventing one.
 */
export async function fetchNeighbourhoodProfiles(): Promise<NeighbourhoodProfile[]> {
  const params = new URLSearchParams({
    select: 'nom_quartier,annee,ref,geo_shape',
    where: "piece=2 and meuble_txt='non meublé' and epoque='1946-1970'",
    order_by: 'annee desc',
    limit: '100',
  });

  try {
    const data = await fetchJson<{ results: OdsRecord[] }>(`${DATASET}?${params}`, {
      cacheKey: 'neighbourhood:paris',
      maxAgeMs: 24 * 60 * 60 * 1000,
    });

    const byQuartier = new Map<string, NeighbourhoodProfile>();
    for (const record of data.results ?? []) {
      if (!record.nom_quartier || typeof record.ref !== 'number') continue;
      if (byQuartier.has(record.nom_quartier)) continue;
      const center = centroid(record.geo_shape?.geometry?.coordinates);
      if (!center) continue;
      byQuartier.set(record.nom_quartier, {
        quartier: record.nom_quartier,
        lat: center.lat,
        lng: center.lng,
        residentialRentEurM2: record.ref,
        year: record.annee ?? '',
      });
    }
    return [...byQuartier.values()];
  } catch (error) {
    console.error('Neighbourhood profile lookup failed', error);
    return [];
  }
}
