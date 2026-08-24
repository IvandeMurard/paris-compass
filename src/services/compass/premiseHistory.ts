/**
 * The browser's first two calls to the Compass database.
 *
 * Until now `compass_*` and `.rpc(` had **zero occurrences in `src/`** (`PLAN.md` §2.7,
 * `DIAGNOSTIC.md`): ten functions, a four-level confidence machinery and 85 418 premises
 * with no consumer outside the evaluation gate and the MCP server. This module is that
 * consumer. Nothing here computes anything — the database assembles the chronology, and
 * `src/i18n/timelineText.ts` decides how a row reads. Both on purpose: a sentence written
 * in a component is a sentence nothing tests, and that is how the two founding errors of
 * `PLAN.md` §2.5 were made.
 *
 * Errors are thrown, never turned into an empty array. An empty timeline and a failed call
 * look identical to a caller that swallows, which is the defect `fetchRentReferences` still
 * carries (`DIAGNOSTIC.md`, points mineurs).
 */

import { supabase } from '@/lib/supabase';
import type { TimelineRow } from '@/i18n/timelineText';

/**
 * How far around an OpenStreetMap point we look for the BDCom premise it refers to.
 *
 * **The two datasets share no identifier.** OpenStreetMap has a node id, BDCom an `ordre`,
 * and nothing published joins them — so the link is spatial, and spatial is an inference.
 * Measured on 658 OpenStreetMap premises around Les Halles against BDCom 2023, 24 August
 * 2026: the nearest BDCom premise sits at 5 m for half of them, 24 m at the third quartile
 * and 58 m at the ninth decile. Within 25 m there is a **median of 5 candidates** and up to
 * 125 in a shopping arcade; only 3 % of points have exactly one.
 *
 * Which is why nothing here picks the nearest. Auto-selecting would attach one premise's
 * history to another — the second founding error of §2.5, rebuilt in a new place. The
 * candidates are returned in full, with their distance, address and sign, and a human
 * chooses. The same measurement showed the trap: "Les Trésors Pets" in OpenStreetMap has
 * "BA&SH" as its nearest BDCom premise, 0 m away.
 */
export const RESOLUTION_RADIUS_M = 25;

/** How many candidates are fetched. `total_matched` says how many there were. */
const CANDIDATE_LIMIT = 25;

/**
 * The vintage the candidate list is drawn from.
 *
 * Pinned to 2023 like the MCP `find_premises` tool, and for the same reason: it is the only
 * vintage an anonymous caller may receive. 2017 and 2020 carry an APUR licence nobody has
 * read, so `compass_premises_within` answers a single `withheld = true` row for them. The
 * chronology itself still asks for all three — there, a withheld row *is* the answer.
 *
 * The consequence must be said on screen rather than absorbed: 2023 covers retail and
 * commercial services only. A premise that is vacant, or that is not a shop, is simply not
 * in the list — and that is not the same statement as "no premise here".
 */
const CANDIDATE_VINTAGE = 2023;

export interface PremiseCandidate {
  locationId: number;
  /** BDCom's own identifier for the premise within its vintage. */
  ordre: number | null;
  distanceM: number;
  address: string | null;
  arrondissement: number | null;
  quartierName: string | null;
  activityLabel: string | null;
  activityGroup: string | null;
  isVacant: boolean;
  sizeLabel: string | null;
  situationLabel: string | null;
  signName: string | null;
}

export interface CandidateResult {
  candidates: PremiseCandidate[];
  /** How many premises the radius actually holds, before `CANDIDATE_LIMIT`. */
  totalMatched: number;
  /** True when the vintage itself is withheld. Never the same as an empty radius. */
  withheld: boolean;
  radiusM: number;
  vintageYear: number;
}

/** BDCom premises around a point, in full and unranked beyond distance. */
export async function fetchPremiseCandidates(
  lat: number,
  lng: number,
): Promise<CandidateResult> {
  const { data, error } = await supabase.rpc('compass_premises_within', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: RESOLUTION_RADIUS_M,
    p_vintage_year: CANDIDATE_VINTAGE,
    p_limit: CANDIDATE_LIMIT,
  });
  if (error) throw new Error(`compass_premises_within: ${error.message}`);

  const rows = data ?? [];
  const base = {
    totalMatched: 0,
    withheld: false,
    radiusM: RESOLUTION_RADIUS_M,
    vintageYear: CANDIDATE_VINTAGE,
  };

  // A withheld vintage arrives as one row whose every other column is null. Reading it as
  // a premise would put an empty card on screen; reading it as zero rows would turn a
  // licence nobody has read into "there is nothing here". It is neither.
  if (rows.length === 1 && rows[0].withheld) {
    return { ...base, candidates: [], withheld: true, totalMatched: 0 };
  }

  return {
    ...base,
    // `total_matched` repeats on every row; it is a window count, not a per-row value.
    totalMatched: Number(rows[0]?.total_matched ?? 0),
    candidates: rows
      .filter((row) => row.location_id !== null)
      .map((row) => ({
        locationId: Number(row.location_id),
        ordre: row.ordre,
        distanceM: Number(row.distance_m ?? 0),
        address: row.address,
        arrondissement: row.arrondissement,
        quartierName: row.quartier_name,
        activityLabel: row.activity_label,
        activityGroup: row.activity_group,
        isVacant: row.is_vacant === true,
        sizeLabel: row.size_label,
        situationLabel: row.situation_label,
        signName: row.sign_name,
      })),
  };
}

/**
 * Everything known about one premise, in order, straight from the database.
 *
 * The rows are relayed as they come — the same discipline as the MCP `trace_premise` tool,
 * and for the same reason. Anything this function reshaped could commit the two errors the
 * underlying SQL exists to prevent.
 */
export async function fetchPremiseTimeline(locationId: number): Promise<TimelineRow[]> {
  const { data, error } = await supabase.rpc('compass_address_timeline', {
    p_location_id: locationId,
  });
  if (error) throw new Error(`compass_address_timeline: ${error.message}`);
  return (data ?? []) as TimelineRow[];
}
