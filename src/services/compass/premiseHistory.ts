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
import type { TerrasseStatus } from '@/i18n/terrasseText';
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
  /**
   * Whether a terrace or a display stall is authorised at this premise's street number
   * (w1-terrasses, issue #15). Three values, never two: `'inconnu'` says an authorisation
   * exists at the address and the source does not publish which of the co-located premises
   * holds it. Relayed as it comes and read in `src/i18n/terrasseText.ts` — a fait
   * administratif, never proof of a terrace standing today.
   */
  terrasseStatus: TerrasseStatus | null;
  terrassePermanente: boolean;
  terrasseEstivale: boolean;
  terrasseEtalage: boolean;
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
        // No `?? 'non'` here, and that is the whole point: a column that arrives null must
        // reach the screen as "no status returned", not as a negative answer. The default
        // lives in the table (`not null default 'non'`), where it means something.
        terrasseStatus: row.terrasse_status,
        terrassePermanente: row.terrasse_permanente === true,
        terrasseEstivale: row.terrasse_estivale === true,
        terrasseEtalage: row.terrasse_etalage === true,
      })),
  };
}

/**
 * How current one dataset is, as the source itself states it.
 *
 * Returns `source_as_of` and nothing else, deliberately. `compass_source_freshness` also
 * carries `ingested_at` — when *we* last loaded — and a caller holding both will eventually
 * render the wrong one, which is the defect the RPC's own comment exists to warn about. A
 * terrace authorisation carries no expiry, so the source's date is the only thing that tells
 * a reader how old the answer is.
 *
 * Throws like the two calls above: a failed lookup must not be indistinguishable from a
 * source with no stated date. The panel turns the absence into a sentence of its own.
 */
export async function fetchSourceAsOf(source: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('compass_source_freshness');
  if (error) throw new Error(`compass_source_freshness: ${error.message}`);
  return (data ?? []).find((row) => row.source === source)?.source_as_of ?? null;
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
