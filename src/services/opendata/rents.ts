import { fetchJson } from './http';

const DATASET =
  'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logement-encadrement-des-loyers/records';

export interface RentReference {
  quartier: string;
  lat: number;
  lng: number;
  /** Reference rent in €/m²/month (unfurnished, 2 rooms, most recent year). */
  refEurM2: number;
  maxEurM2: number;
  year: string;
}

interface OdsRecord {
  nom_quartier?: string;
  annee?: string;
  ref?: number;
  max?: number;
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
 * Official Paris rent references per quartier (encadrement des loyers).
 * Used as a market price benchmark; commercial rents are not published as open data.
 */
export async function fetchRentReferences(): Promise<RentReference[]> {
  const params = new URLSearchParams({
    select: 'nom_quartier,annee,ref,max,geo_shape',
    where: "piece=2 and meuble_txt='non meublé' and epoque='1946-1970'",
    order_by: 'annee desc',
    limit: '100',
  });

  try {
    const data = await fetchJson<{ results: OdsRecord[] }>(`${DATASET}?${params}`, {
      cacheKey: 'rents:paris',
      maxAgeMs: 24 * 60 * 60 * 1000,
    });

    const byQuartier = new Map<string, RentReference>();
    for (const record of data.results ?? []) {
      if (!record.nom_quartier || typeof record.ref !== 'number') continue;
      if (byQuartier.has(record.nom_quartier)) continue;
      const center = centroid(record.geo_shape?.geometry?.coordinates);
      if (!center) continue;
      byQuartier.set(record.nom_quartier, {
        quartier: record.nom_quartier,
        lat: center.lat,
        lng: center.lng,
        refEurM2: record.ref,
        maxEurM2: record.max ?? record.ref,
        year: record.annee ?? '',
      });
    }
    return [...byQuartier.values()];
  } catch (error) {
    console.error('Rent reference lookup failed', error);
    return [];
  }
}
