import { useQuery } from '@tanstack/react-query';
import { fetchPremises } from '@/services/opendata/properties';
import { fetchAirQuality, fetchRisks } from '@/services/opendata/environment';
import { fetchEstablishmentsNear } from '@/services/opendata/sirene';
import type { BBox } from '@/services/opendata/types';

const roundBox = (bbox: BBox): BBox => ({
  south: Math.round(bbox.south * 200) / 200,
  west: Math.round(bbox.west * 200) / 200,
  north: Math.round(bbox.north * 200) / 200,
  east: Math.round(bbox.east * 200) / 200,
});

export const PARIS_BBOX: BBox = { south: 48.84, west: 2.31, north: 48.885, east: 2.4 };

export function usePremises(bbox: BBox = PARIS_BBOX) {
  const box = roundBox(bbox);
  return useQuery({
    queryKey: ['premises', box],
    queryFn: () => fetchPremises(box),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
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
