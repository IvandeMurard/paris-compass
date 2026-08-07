import { distanceM } from './http';
import { fetchOverpassSnapshot } from './overpass';
import { fetchNeighbourhoodProfiles, type NeighbourhoodProfile } from './neighbourhood';
import { computeScores, estimateNoise } from './scoring';
import type { BBox, Poi, Premise } from './types';

const CATEGORY_LABELS: Record<string, string> = {
  vacant: 'Local vacant',
  convenience: 'Supérette',
  supermarket: 'Supermarché',
  bakery: 'Boulangerie',
  clothes: 'Prêt-à-porter',
  hairdresser: 'Salon de coiffure',
  restaurant: 'Restaurant',
};

function premiseTitle(tags: Record<string, string>, status: 'vacant' | 'occupied') {
  if (status === 'vacant') {
    const previous = tags['disused:shop'] ?? tags['was:shop'];
    return previous
      ? `Local vacant (ancien ${CATEGORY_LABELS[previous] ?? previous})`
      : 'Local commercial vacant';
  }
  const kind = tags.shop ?? tags.office ?? 'commerce';
  return tags.name ?? CATEGORY_LABELS[kind] ?? `Local ${kind}`;
}

function premiseAddress(tags: Record<string, string>) {
  const parts = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' '),
  ].filter(Boolean);
  return parts.join(', ') || tags.address || 'Adresse non renseignée dans OpenStreetMap';
}

function arrondissementFromPostcode(postcode?: string) {
  if (!postcode || !postcode.startsWith('75')) return undefined;
  const value = Number(postcode.slice(3));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function nearestNeighbourhood(
  point: { lat: number; lng: number },
  profiles: NeighbourhoodProfile[],
) {
  let best: NeighbourhoodProfile | null = null;
  let bestDistance = Infinity;
  for (const profile of profiles) {
    const d = distanceM(point, profile);
    if (d < bestDistance) {
      bestDistance = d;
      best = profile;
    }
  }
  return bestDistance <= 3000 ? best : null;
}

function parseSize(tags: Record<string, string>): number | null {
  const raw = tags['building:area'] ?? tags.area ?? tags['shop:area'];
  const value = raw ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

export interface PremiseSearchResult {
  premises: Premise[];
  pois: Poi[];
  fetchedAt: string;
}

/** Build the list of real commercial premises for a viewport from open data only. */
export async function fetchPremises(bbox: BBox): Promise<PremiseSearchResult> {
  const [snapshot, neighbourhoods] = await Promise.all([
    fetchOverpassSnapshot(bbox),
    fetchNeighbourhoodProfiles(),
  ]);

  const premises: Premise[] = snapshot.premises
    // Vacant premises first: those are the ones actually available.
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'vacant' ? -1 : 1))
    .slice(0, 120)
    .map((raw) => {
      const point = { lat: raw.lat, lng: raw.lng };
      const scores = computeScores(point, snapshot);
      const noise = estimateNoise(point, snapshot);
      const neighbourhood = nearestNeighbourhood(point, neighbourhoods);
      const sizeM2 = parseSize(raw.tags);
      const postcode = raw.tags['addr:postcode'];

      return {
        id: raw.id,
        title: premiseTitle(raw.tags, raw.status),
        category: raw.tags.shop ?? raw.tags['disused:shop'] ?? raw.tags.office ?? 'commerce',
        status: raw.status,
        address: premiseAddress(raw.tags),
        postcode,
        arrondissement: arrondissementFromPostcode(postcode),
        lat: raw.lat,
        lng: raw.lng,
        sizeM2,
        // Catchment-area signal only. Never multiplied by a floor area: the source covers
        // housing and says nothing about commercial rents. See DIAGNOSTIC.md §1.
        residentialRentEurM2: neighbourhood?.residentialRentEurM2 ?? null,
        quartier: neighbourhood?.quartier,
        scores,
        noise,
      } satisfies Premise;
    });

  return { premises, pois: snapshot.pois, fetchedAt: new Date().toISOString() };
}
