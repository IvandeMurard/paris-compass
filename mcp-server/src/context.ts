// Assembles a NeighbourhoodContext (src/core) from two independent sources — never fetched
// inside the core itself, per its own contract.
//
// Amenities and roads: OpenStreetMap via Overpass, same as the front. Premises: BDCom via
// `compass_scoring_context_within`, not OSM's `shop=vacant` tag — a strictly better source
// than what the browser uses today, since it comes from APUR's door-to-door survey rather
// than volunteer tagging. The two calls run independently and fail independently: one
// mirror timing out must not blank out a premises count that arrived fine, and vice versa.
// `loaded` records exactly which of the two actually came back.
//
// It also decides the provenance of each layer, which is why `origins` sits here and not in
// the caller: the code that chose the source is the only code that can name it. Amenities and
// roads carry the OSM origin, premises carry APUR's — read from `compass_vintages`, never
// hard-coded, because licence and date differ per vintage and only the database knows them.

import {
  BDCOM_ORIGIN,
  OSM_ORIGIN,
  buildIndex,
  type Layer,
  type LayerOrigins,
  type NeighbourhoodContext,
  type Origin,
  type PremisePoint,
  type ScoringIndex,
} from "../../src/core"
import { fetchOverpassAmenities } from "./overpass"
import type { QuestionOutcome } from "./record"
import { supabase } from "./supabase"

/**
 * Une couche indisponible, avec son MOTIF STRUCTURÉ — w1-observabilite (#72).
 *
 * Le motif ne se relit pas dans le message. `#61` a refusé de classer une panne sur une chaîne
 * de caractères, et la règle vaut ici : « retenue de licence », « hors corpus » et « source
 * injoignable » ne mènent pas à la même action — un courrier à l'APUR, une source hors Paris,
 * un miroir — et les distinguer par un `includes()` sur une phrase anglaise reviendrait à
 * suspendre le journal à une reformulation. Le motif est donc porté par le jet, à l'endroit
 * exact où la cause est connue.
 *
 * C'est aussi le premier pas du « motif structuré » que docs/REPRISE.md appelle au point 6 de
 * « La suite » : un agent qui s'auto-évalue a besoin de la règle déclenchée, pas d'une phrase.
 */
export class LayerUnavailable extends Error {
  constructor(
    message: string,
    readonly motif: QuestionOutcome,
  ) {
    super(message)
    this.name = "LayerUnavailable"
  }
}

/** Le motif d'un échec dont personne n'a nommé la cause : la source n'a pas répondu. */
export function motifOf(reason: unknown): QuestionOutcome {
  return reason instanceof LayerUnavailable ? reason.motif : "source_injoignable"
}

export interface ContextResult {
  index: ScoringIndex
  /**
   * Which layers failed to load, and why — surfaced to the caller, never swallowed.
   *
   * `motif` est la même cause, sous une forme qu'une machine peut lire : `reason` explique à
   * un humain, `motif` se compte. Les deux, jamais l'un à la place de l'autre.
   */
  failures: { layer: Layer; reason: string; motif: QuestionOutcome }[]
  /** Where each layer came from. Passed straight to `scoreLocation`. */
  origins: LayerOrigins
}

interface VintageRow {
  vintage_year: number
  licence: string
  licence_note: string | null
  as_of: string
}

/**
 * The premises origin, measured rather than assumed.
 *
 * `compass_vintages` is the only place that knows a vintage's licence and survey date, and
 * the two differ: 2023 is ODbL, 2017 and 2020 carry an APUR licence nobody has read. Writing
 * either into this file would be a claim about data this file does not hold — the failure
 * `Measured<T>` exists to prevent, moved one level up into the string that names the licence.
 *
 * Same wording as `list_sources` for the unread case, on purpose: an agent that calls both
 * must not read two different descriptions of one licence.
 */
async function premisesOrigin(vintageYear: number): Promise<Origin> {
  const { data, error } = await supabase.rpc("compass_vintages")
  if (error) throw new Error(`compass_vintages: ${error.message}`)
  const row = ((data ?? []) as VintageRow[]).find((v) => v.vintage_year === vintageYear)
  if (!row) {
    throw new Error(
      `compass_vintages lists no vintage ${vintageYear}, so the licence and date of this ` +
        `premises layer are unknown. A figure that cannot state its provenance is not shown.`,
    )
  }
  const licence =
    row.licence === "custom"
      ? `Custom APUR licence (unread) — ${row.licence_note ?? ""}`.trim()
      : row.licence
  return BDCOM_ORIGIN(row.vintage_year, licence, row.as_of)
}

interface ScoringContextRow {
  lat: number | null
  lng: number | null
  is_vacant: boolean | null
  total_matched: number | null
  /** True on a single coordinate-less row when the caller may not receive this vintage. */
  withheld: boolean
  /**
   * True on a single coordinate-less row when the point falls outside every Paris quartier.
   * Added by 20260825000003 — see the throw below for why an empty result was not enough.
   */
  out_of_corpus: boolean
}

async function fetchPremises(
  lat: number,
  lng: number,
  radiusM: number,
  vintageYear: number,
): Promise<PremisePoint[]> {
  const { data, error } = await supabase.rpc("compass_scoring_context_within", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_vintage_year: vintageYear,
  })
  if (error) throw new Error(`compass_scoring_context_within: ${error.message}`)
  const rows = (data ?? []) as ScoringContextRow[]

  // A withheld vintage is not an empty neighbourhood. Throwing puts this in
  // `failures` rather than in `loaded`, which is the whole point: an empty array
  // on a layer declared loaded means "nothing here" to src/core, and the footfall
  // proxy would come back as a measured zero — a licence restriction reported as
  // an absence of shops. See 20260816000001_scoring_context_withholding.sql.
  if (rows.some((r) => r.withheld)) {
    throw new LayerUnavailable(
      `BDCom ${vintageYear} is not publicly redistributable — its licence has not been ` +
        `read, so this caller receives neither its contents nor its counts. Scores that ` +
        `depend on the premises layer are unknown for this vintage, not zero. ` +
        `Vintage 2023 is ODbL and can be scored; call list_sources for the licence of each.`,
      "retenue_licence",
    )
  }

  // A point outside the corpus is not an empty neighbourhood either, and this was the harder
  // of the two to see: the query *succeeded* with zero rows, so the layer counted as loaded and
  // the footfall proxy came back as a real number — 22 at Massy, computed on zero premises and
  // still stamped "APUR BDCom 2023". DIAGNOSTIC.md §16, issue #55.
  //
  // Note what is deliberately not done here: zero rows is still treated as a genuine zero.
  // Measured 25 August, the Bois de Vincennes sits inside the Picpus quartier and holds no
  // BDCom premise within 400 m — a true empty radius inside Paris. Treating every empty result
  // as "unknown" would destroy the one answer the data gives with certainty.
  if (rows.some((r) => r.out_of_corpus)) {
    throw new LayerUnavailable(
      `This point lies outside the BDCom corpus, which covers Paris intra-muros only — it is ` +
        `in none of the 80 quartiers. Premises are unknown here, not absent: no door-to-door ` +
        `survey was carried out at this address. Scores that depend on the premises layer are ` +
        `unavailable rather than zero.`,
      "hors_corpus",
    )
  }

  return rows.map((r) => ({
    lat: r.lat as number,
    lng: r.lng as number,
    status: r.is_vacant ? "vacant" : "occupied",
  }))
}

/**
 * Provenance of a premises layer whose own metadata could not be read.
 *
 * `scoreLocation` still needs an origin for a layer that never loaded: `unavailable()` stamps
 * it on the missing figure so a caller learns *which* dataset is silent, not merely that
 * something is. Reached only when `compass_vintages` itself fails — a withheld vintage keeps
 * its real licence string, which is the useful one, because "unread APUR licence" *is* the
 * reason the rows are missing.
 */
const UNKNOWN_BDCOM = (vintageYear: number): Origin =>
  BDCOM_ORIGIN(vintageYear, "unknown — compass_vintages could not be read", "unknown")

export async function buildNeighbourhoodContext(
  lat: number,
  lng: number,
  radiusM: number,
  vintageYear = 2023,
): Promise<ContextResult> {
  // Three independent calls, three independent failures — and the vintage metadata is its own,
  // deliberately not bundled with the rows. A withheld vintage returns no rows but its licence
  // and date are public, and they are exactly what a caller needs to understand the refusal.
  const [amenitiesResult, premisesResult, originResult] = await Promise.allSettled([
    fetchOverpassAmenities(lat, lng, radiusM),
    fetchPremises(lat, lng, radiusM, vintageYear),
    premisesOrigin(vintageYear),
  ])

  const loaded: Layer[] = []
  const failures: { layer: Layer; reason: string; motif: QuestionOutcome }[] = []

  const amenities = amenitiesResult.status === "fulfilled" ? amenitiesResult.value.amenities : []
  const roads = amenitiesResult.status === "fulfilled" ? amenitiesResult.value.roads : []
  if (amenitiesResult.status === "fulfilled") {
    loaded.push("amenities", "roads")
  } else {
    const reason = amenitiesResult.reason instanceof Error ? amenitiesResult.reason.message : String(amenitiesResult.reason)
    // Overpass est du HTTP vers un tiers : un échec ici est par définition une source
    // injoignable, et c'est le seul motif que la base ne pourra jamais apprendre seule.
    const motif = motifOf(amenitiesResult.reason)
    failures.push({ layer: "amenities", reason, motif }, { layer: "roads", reason, motif })
  }

  const premises = premisesResult.status === "fulfilled" ? premisesResult.value : []
  // Rows that arrived but cannot be attributed are rows that must not be scored: an
  // unattributable figure is one `Measured<T>` exists to keep off the screen. So a metadata
  // failure withdraws the layer even when the rows themselves came back.
  if (premisesResult.status === "fulfilled" && originResult.status === "fulfilled") {
    loaded.push("premises")
  }
  if (premisesResult.status === "rejected") {
    const reason = premisesResult.reason instanceof Error ? premisesResult.reason.message : String(premisesResult.reason)
    failures.push({ layer: "premises", reason, motif: motifOf(premisesResult.reason) })
  } else if (originResult.status === "rejected") {
    const reason = originResult.reason instanceof Error ? originResult.reason.message : String(originResult.reason)
    failures.push({ layer: "premises", reason, motif: motifOf(originResult.reason) })
  }

  // Overpass answers with the current state of the map, so the query date is the vintage.
  // BDCom's is not today's date and must never be given it: `as_of` comes from the survey.
  const osm = OSM_ORIGIN(new Date().toISOString().slice(0, 10))
  const origins: LayerOrigins = {
    amenities: osm,
    roads: osm,
    premises: originResult.status === "fulfilled" ? originResult.value : UNKNOWN_BDCOM(vintageYear),
  }

  const context: NeighbourhoodContext = { amenities, roads, premises, loaded }
  return { index: buildIndex(context), failures, origins }
}
