import { useQuery } from '@tanstack/react-query';
import { fetchPremises } from '@/services/opendata/properties';
import { fetchAirQuality, fetchRisks } from '@/services/opendata/environment';
import { fetchEstablishmentsNear } from '@/services/opendata/sirene';
import type { BBox } from '@/services/opendata/types';

/**
 * Snap the viewport to a coarse grid so panning by a few metres reuses the cached answer.
 *
 * The grid step must stay well below a street-level viewport: at 1/200 (~550 m per edge) a
 * zoomed-in box could round flat — south and north landing on the same line — and a flat
 * box returns nothing. 1/1000 is ~110 m, small enough to be safe and coarse enough to cache.
 * Rounding outwards guarantees the fetched box always covers what is on screen.
 */
const GRID = 1000;

const roundBox = (bbox: BBox): BBox => ({
  south: Math.floor(bbox.south * GRID) / GRID,
  west: Math.floor(bbox.west * GRID) / GRID,
  north: Math.ceil(bbox.north * GRID) / GRID,
  east: Math.ceil(bbox.east * GRID) / GRID,
});

/** Opening view: rue Montorgueil and around — the densest retail stretch in central Paris,
 *  small enough for Overpass to answer in seconds. Must stay in sync with MapView's setView. */
export const PARIS_BBOX: BBox = { south: 48.8605, west: 2.3385, north: 48.8705, east: 2.3565 };

/**
 * Largest viewport we are willing to send to Overpass, in square degrees.
 *
 * The snapshot query asks for every shop, office, amenity, transit stop and major road
 * inside the box at once. Over central Paris that grows into tens of thousands of
 * elements, and the public mirrors answer with a timeout or a 429 — which the user reads
 * as "no results". Refusing the request and saying so is more honest than hanging.
 *
 * ~0.0006 deg² is roughly 3 km² around this latitude.
 */
const MAX_BBOX_AREA_DEG2 = 0.0006;

export const bboxArea = (bbox: BBox) =>
  Math.abs(bbox.north - bbox.south) * Math.abs(bbox.east - bbox.west);

export const isBboxTooLarge = (bbox: BBox) => bboxArea(bbox) > MAX_BBOX_AREA_DEG2;

export function usePremises(bbox: BBox = PARIS_BBOX) {
  const box = roundBox(bbox);
  const tooLarge = isBboxTooLarge(box);
  const query = useQuery({
    queryKey: ['premises', box],
    queryFn: () => fetchPremises(box),
    enabled: !tooLarge,
    staleTime: 30 * 60 * 1000,
    // No automatic retry. `fetchOverpassSnapshot` already walks three independent mirrors;
    // when all three refuse, a fourth attempt costs seventy more seconds and changes nothing.
    // The user gets an explicit Retry button instead of a silent loop.
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { ...query, tooLarge };
}

export function useAreaEnvironment(lat: number, lng: number) {
  return useQuery({
    queryKey: ['environment', lat.toFixed(3), lng.toFixed(3)],
    queryFn: async () => {
      const [air, risks] = await Promise.all([fetchAirQuality(lat, lng), fetchRisks(lat, lng)]);
      return { air, risks };
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useNearbyEstablishments(lat?: number, lng?: number) {
  return useQuery({
    queryKey: ['establishments', lat?.toFixed(3), lng?.toFixed(3)],
    queryFn: () => fetchEstablishmentsNear(lat as number, lng as number, 0.3, 20),
    enabled: typeof lat === 'number' && typeof lng === 'number',
    staleTime: 60 * 60 * 1000,
  });
}
