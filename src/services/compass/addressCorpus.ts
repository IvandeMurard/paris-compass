/**
 * What the context sheet reads out of the Compass database — w6-fiche-corpus (#157).
 *
 * **The inversion this module exists to undo.** Until 14 September 2026 `/contexte/:slug` had
 * exactly two sources: BAN to geocode, and Overpass for everything else. Fourteen gate arms
 * guarded a corpus the product screen never asked for, while the one source the screen did ask
 * for — a free public mirror — was guarded by nothing and had just fallen over (`#156`). The
 * sheet now renders what `compass_*` gives first: dated, licensed, guarded, and answering in a
 * fraction of a second from a database this project owns. Overpass completes it when a mirror
 * replies.
 *
 * **Nothing here computes anything**, same discipline as `premiseHistory.ts`: the database
 * does the spatial selection, `src/core` does the arithmetic, and `src/i18n` decides how a row
 * reads. A number assembled in this file would be a number no test could reach.
 *
 * **Failures are thrown with a structured motive, never flattened into an empty array.** This
 * is the front's half of what `mcp-server/src/context.ts` has done since 15 August: an empty
 * radius and a withheld vintage and a point outside Paris are three different answers, and the
 * one thing they must never become is a measured zero. `#61` refused to classify a failure by
 * reading its message, and the rule holds here — the motive is carried from the place the
 * cause is known.
 */

import { BDCOM_ORIGIN, asWithholding, type Origin, type PremisePoint, type Withholding } from '@/core';
import { supabase } from '@/lib/supabase';

/**
 * The vintage the sheet reads, and the only one an anonymous caller may receive.
 *
 * Pinned to 2023 like `find_premises` and like `premiseHistory.ts`, for the same reason: 2017
 * and 2020 carry an APUR licence nobody has read, so `compass_scoring_context_within` answers
 * a single `withheld = true` row for them. Not a parameter, because making it one would be a
 * business mode and `#157` puts those out of scope (`w6-modes`, #36).
 */
export const SHEET_VINTAGE = 2023;

/**
 * The radius the premises layer is fetched at.
 *
 * `FOOTFALL_RADIUS_M` and nothing wider, and the reason is measured rather than aesthetic:
 * PostgREST caps a response at `db-max-rows`, so a wider radius buys truncation and not rows.
 * At rue de Bretagne on 14 September 2026 the function matched 920 premises at 400 m and
 * handed back all 920; at 800 m it matched 3 528 and handed back 1 000; at 2 000 m it matched
 * 17 190 and handed back 1 000. Both figures that read this layer count within
 * `FOOTFALL_RADIUS_M`, so 400 m is the radius they actually need — asking for more would
 * guarantee a floor where a total was available.
 *
 * The cap is not gone, only pushed out of reach in most of Paris, which is why `truncated`
 * below is reported rather than assumed away.
 */
export { FOOTFALL_RADIUS_M as SHEET_RADIUS_M } from '@/core';

/**
 * A corpus layer that did not arrive, with the motive the caller is allowed to say about it.
 *
 * Mirrors `LayerUnavailable` in `mcp-server/src/context.ts` — same three motives, same reason
 * for carrying them structurally. « Retenue de licence », « hors corpus » and « source
 * injoignable » lead to three different things happening next: a letter to the APUR, a point
 * outside Paris, an outage. Telling them apart with `includes()` on a sentence would hang the
 * distinction on a reword.
 */
export class CorpusUnavailable extends Error {
  constructor(
    message: string,
    readonly motif: Withholding,
  ) {
    super(message);
    this.name = 'CorpusUnavailable';
  }
}

/** The motive of a failure nobody named: the source did not answer. */
export function motifOf(reason: unknown): Withholding {
  return reason instanceof CorpusUnavailable ? reason.motif : 'source_injoignable';
}

export interface CorpusPremises {
  points: PremisePoint[];
  /** How many the radius actually holds. Equal to `points.length` unless PostgREST capped. */
  totalMatched: number;
  /** True when PostgREST returned fewer rows than the radius holds — the count is a floor. */
  truncated: boolean;
}

/**
 * The BDCom premises around a point, as bare scored-against points.
 *
 * Relayed, never ranked and never filtered: the caller hands them straight to `buildIndex`.
 * `total_matched` is read rather than ignored, and that half is new — the MCP server has
 * carried the column in its row type since 15 August and never looked at it, which is how a
 * count floored at a thousand reached an agent stamped « APUR BDCom 2023 » with no caveat.
 */
export async function fetchCorpusPremises(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<CorpusPremises> {
  const { data, error } = await supabase.rpc('compass_scoring_context_within', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_vintage_year: SHEET_VINTAGE,
  });
  if (error) throw new Error(`compass_scoring_context_within: ${error.message}`);
  const rows = data ?? [];

  // A withheld vintage is not an empty neighbourhood. Throwing puts this layer in the
  // sheet's failures rather than in `loaded`, which is the whole point: an empty array on a
  // layer declared loaded means « nothing here » to `src/core`, and both figures that read
  // premises would come back as a measured zero — a licence nobody has read, rendered as an
  // absence of shops. 20260816000001_scoring_context_withholding.sql.
  if (rows.some((row) => row.withheld)) {
    throw new CorpusUnavailable(
      `Le millésime BDCom ${SHEET_VINTAGE} n’est pas redistribuable : sa licence APUR n’a pas ` +
        `été lue, donc ni son contenu ni ses comptes ne sont servis ici. Ce qui dépend des ` +
        `locaux est inconnu pour ce millésime, pas nul.`,
      'retenue_licence',
    );
  }

  // A point outside the corpus is not an empty neighbourhood either, and it was the harder of
  // the two to see: the query SUCCEEDS with zero rows, so the layer would count as loaded and
  // the figures would come back as real numbers computed on nothing. `DIAGNOSTIC.md` §16.
  //
  // What is deliberately NOT done here: zero rows stays a genuine zero. Measured 14 September
  // 2026, the Bois de Vincennes sits inside the Picpus quartier and holds no BDCom premise
  // within 400 m — a true empty radius inside Paris. Reading every empty answer as « unknown »
  // would destroy the one answer the survey gives with certainty.
  if (rows.some((row) => row.out_of_corpus)) {
    throw new CorpusUnavailable(
      `Ce point est hors du corpus BDCom, qui couvre Paris intra-muros et s’arrête aux limites ` +
        `de la commune : il n’est dans aucun des 80 quartiers. Les locaux y sont inconnus, pas ` +
        `absents — aucun relevé porte-à-porte n’a été fait à cette adresse.`,
      'hors_corpus',
    );
  }

  const points = rows
    .filter((row) => row.lat !== null && row.lng !== null)
    .map((row) => ({
      lat: row.lat as number,
      lng: row.lng as number,
      // `is_vacant` is relayed rather than defaulted, and on the 2023 vintage it is false on
      // every row — that vintage is `retail_only` and holds no vacant premise at all (7 853 in
      // 2017, 8 764 in 2020, 0 in 2023, measured 14 September 2026). The distinction is dead on
      // this vintage and alive in the type; collapsing it here would make the day 2017 opens
      // look like a code change rather than a licence answer.
      status: row.is_vacant ? ('vacant' as const) : ('occupied' as const),
    }));

  const totalMatched = Number(rows[0]?.total_matched ?? points.length);
  return { points, totalMatched, truncated: totalMatched > points.length };
}

/**
 * The provenance of the premises layer, measured rather than assumed.
 *
 * `compass_vintages` is the only place that knows a vintage's licence and survey date, and the
 * two differ per vintage: 2023 is ODbL-1.0 as of 2023-06, 2017 and 2020 carry an APUR licence
 * nobody has read. Writing either into this file would be a claim about data this file does
 * not hold — the exact failure `Measured<T>` exists to prevent, moved one level up into the
 * string that names the licence. Same wording as the MCP server for the unread case, so a
 * reader who meets both does not meet two descriptions of one licence.
 */
export async function fetchPremisesOrigin(): Promise<Origin> {
  const { data, error } = await supabase.rpc('compass_vintages');
  if (error) throw new Error(`compass_vintages: ${error.message}`);
  const row = (data ?? []).find((v) => v.vintage_year === SHEET_VINTAGE);
  if (!row) {
    throw new Error(
      `compass_vintages ne déclare aucun millésime ${SHEET_VINTAGE} : la licence et la date de ` +
        `cette couche sont inconnues. Un chiffre qui ne peut pas dire sa provenance n’est pas montré.`,
    );
  }
  const licence =
    row.licence === 'custom'
      ? `Licence APUR spécifique (non lue) — ${row.licence_note ?? ''}`.trim()
      : row.licence;
  return BDCOM_ORIGIN(row.vintage_year, licence, row.as_of);
}

/**
 * What a premise around here became between two vintages — and, today, why nobody can be told.
 *
 * `compass_activity_transitions` is `PLAN.md` §6.1: the matrix the schema has held since 2023
 * and no product surface has ever asked for. It is on the sheet as a GAP rather than as a
 * finding, and not by preference — a transition derives from TWO vintages, all three possible
 * pairs contain a withheld one, so an anonymous caller receives a single marked row saying so
 * and no pair is servable until the APUR answers. Measured on rue de Bretagne, 14 September
 * 2026: one row, `withheld = true`, in 68 ms.
 *
 * That is exactly why it is worth calling. It is the one thing on this page that puts « retenue
 * de licence » in front of a visitor on an ordinary Paris address, which is the difference
 * between a product that has a licence problem and a product that says it has one. The day the
 * APUR answers, this call starts returning the matrix and the gap becomes a finding.
 */
export interface TransitionsVerdict {
  withheld: boolean;
  /** The sentence the function itself wrote about its own answer. Never rewritten here. */
  evidence: string | null;
  licence: string | null;
  /** How many pairs came back. Zero on a withheld answer, and on a radius with no pair. */
  pairs: number;
}

export async function fetchActivityTransitions(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<TransitionsVerdict> {
  const { data, error } = await supabase.rpc('compass_activity_transitions', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
  });
  if (error) throw new Error(`compass_activity_transitions: ${error.message}`);
  const rows = data ?? [];
  const marked = rows.find((row) => row.withheld);
  if (marked) {
    return {
      withheld: true,
      evidence: marked.evidence ?? null,
      licence: marked.licence ?? null,
      pairs: 0,
    };
  }
  return {
    withheld: false,
    evidence: rows[0]?.evidence ?? null,
    licence: rows[0]?.licence ?? null,
    pairs: rows.length,
  };
}

/** Narrows the wider vocabulary of a thrown reason to the four the verdict reasons over. */
export const withholdingOf = (reason: unknown): Withholding => asWithholding(motifOf(reason));
