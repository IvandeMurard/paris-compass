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
import { supabase } from "./supabase"

export interface ContextResult {
  index: ScoringIndex
  /** Which layers failed to load, and why — surfaced to the caller, never swallowed. */
  failures: { layer: Layer; reason: string }[]
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
    throw new Error(
      `BDCom ${vintageYear} is not publicly redistributable — its licence has not been ` +
        `read, so this caller receives neither its contents nor its counts. Scores that ` +
        `depend on the premises layer are unknown for this vintage, not zero. ` +
        `Vintage 2023 is ODbL and can be scored; call list_sources for the licence of each.`,
    )
  }

  return rows.map((r) => ({
    lat: r.lat as number,
    lng: r.lng as number,
    status: r.is_vacant ? "vacant" : "occupied",
  }))
}

/**
 * Provenance of a layer that failed to load.
 *
 * `scoreLocation` still needs one: `unavailable()` stamps source and licence on the missing
 * figure so a caller learns *which* dataset is silent, not merely that something is. Naming
 * a licence we could not read would be the very substitution this ticket removes, so the
 * string says so in full.
 */
const UNREAD_BDCOM = (vintageYear: number): Origin =>
  BDCOM_ORIGIN(vintageYear, "unknown — compass_vintages could not be read", "unknown")

export async function buildNeighbourhoodContext(
  lat: number,
  lng: number,
  radiusM: number,
  vintageYear = 2023,
): Promise<ContextResult> {
  // Three independent calls, three independent failures. The vintage metadata rides with the
  // premises rows rather than beside them: rows without their licence are rows that cannot be
  // attributed, and an unattributable layer is a layer that did not load.
  const [amenitiesResult, premisesResult] = await Promise.allSettled([
    fetchOverpassAmenities(lat, lng, radiusM),
    Promise.all([
      fetchPremises(lat, lng, radiusM, vintageYear),
      premisesOrigin(vintageYear),
    ]),
  ])

  const loaded: Layer[] = []
  const failures: { layer: Layer; reason: string }[] = []

  const amenities = amenitiesResult.status === "fulfilled" ? amenitiesResult.value.amenities : []
  const roads = amenitiesResult.status === "fulfilled" ? amenitiesResult.value.roads : []
  if (amenitiesResult.status === "fulfilled") {
    loaded.push("amenities", "roads")
  } else {
    const reason = amenitiesResult.reason instanceof Error ? amenitiesResult.reason.message : String(amenitiesResult.reason)
    failures.push({ layer: "amenities", reason }, { layer: "roads", reason })
  }

  const premises = premisesResult.status === "fulfilled" ? premisesResult.value[0] : []
  const premisesFrom =
    premisesResult.status === "fulfilled" ? premisesResult.value[1] : UNREAD_BDCOM(vintageYear)
  if (premisesResult.status === "fulfilled") {
    loaded.push("premises")
  } else {
    const reason = premisesResult.reason instanceof Error ? premisesResult.reason.message : String(premisesResult.reason)
    failures.push({ layer: "premises", reason })
  }

  // Overpass answers with the current state of the map, so the query date is the vintage.
  // BDCom's is not today's date and must never be given it: `as_of` comes from the survey.
  const osm = OSM_ORIGIN(new Date().toISOString().slice(0, 10))
  const origins: LayerOrigins = { amenities: osm, roads: osm, premises: premisesFrom }

  const context: NeighbourhoodContext = { amenities, roads, premises, loaded }
  return { index: buildIndex(context), failures, origins }
}
