// Assembles a NeighbourhoodContext (src/core) from two independent sources — never fetched
// inside the core itself, per its own contract.
//
// Amenities and roads: OpenStreetMap via Overpass, same as the front. Premises: BDCom via
// `compass_scoring_context_within`, not OSM's `shop=vacant` tag — a strictly better source
// than what the browser uses today, since it comes from APUR's door-to-door survey rather
// than volunteer tagging. The two calls run independently and fail independently: one
// mirror timing out must not blank out a premises count that arrived fine, and vice versa.
// `loaded` records exactly which of the two actually came back.

import { buildIndex, type Layer, type NeighbourhoodContext, type PremisePoint, type ScoringIndex } from "../../src/core"
import { fetchOverpassAmenities } from "./overpass"
import { supabase } from "./supabase"

export interface ContextResult {
  index: ScoringIndex
  /** Which layers failed to load, and why — surfaced to the caller, never swallowed. */
  failures: { layer: Layer; reason: string }[]
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

export async function buildNeighbourhoodContext(
  lat: number,
  lng: number,
  radiusM: number,
  vintageYear = 2023,
): Promise<ContextResult> {
  const [amenitiesResult, premisesResult] = await Promise.allSettled([
    fetchOverpassAmenities(lat, lng, radiusM),
    fetchPremises(lat, lng, radiusM, vintageYear),
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

  const premises = premisesResult.status === "fulfilled" ? premisesResult.value : []
  if (premisesResult.status === "fulfilled") {
    loaded.push("premises")
  } else {
    const reason = premisesResult.reason instanceof Error ? premisesResult.reason.message : String(premisesResult.reason)
    failures.push({ layer: "premises", reason })
  }

  const context: NeighbourhoodContext = { amenities, roads, premises, loaded }
  return { index: buildIndex(context), failures }
}
