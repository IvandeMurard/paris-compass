import { useQuery } from '@tanstack/react-query';

import {
  fetchPremiseCandidates,
  fetchPremiseTimeline,
  fetchSourceAsOf,
} from '@/services/compass/premiseHistory';

/**
 * Both queries are only fired when the sheet is open.
 *
 * A premise list holds up to 120 cards; resolving every one of them on render would send
 * 120 round trips to the database for a panel nobody has asked for. `enabled` is what keeps
 * the cost proportional to the reading.
 */

/** BDCom premises near an OpenStreetMap point — the candidates, never a verdict. */
export function usePremiseCandidates(
  point: { lat: number; lng: number } | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['compass', 'candidates', point?.lat.toFixed(6), point?.lng.toFixed(6)],
    queryFn: () => fetchPremiseCandidates(point!.lat, point!.lng),
    enabled: enabled && point !== null,
    // A survey vintage does not change while a tab is open. Neither do notices published
    // in 2015. Nothing here is worth refetching on focus.
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

/**
 * How current one source is, for the line that carries a displayed fact.
 *
 * Its own query rather than a field of the candidate row: the freshness table is one row per
 * dataset, so a failure here must degrade the source line to "date not read" and leave the
 * premise itself on screen. Folding it into `usePremiseCandidates` would let a freshness
 * lookup take the whole panel down with it.
 */
export function useSourceAsOf(source: string, enabled: boolean) {
  return useQuery({
    queryKey: ['compass', 'freshness', source],
    queryFn: () => fetchSourceAsOf(source),
    enabled,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

/** The chronology of one premise. */
export function usePremiseTimeline(locationId: number | null) {
  return useQuery({
    queryKey: ['compass', 'timeline', locationId],
    queryFn: () => fetchPremiseTimeline(locationId!),
    enabled: locationId !== null,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}
