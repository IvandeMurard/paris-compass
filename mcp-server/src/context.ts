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
  AMENITY_RADIUS_M,
  BDCOM_ORIGIN,
  IDFM_ORIGIN,
  OSM_ORIGIN,
  SERVICE_RADIUS_M,
  buildIndex,
  serviceFamilyOf,
  type Layer,
  type LayerNotes,
  type LayerOrigins,
  type NeighbourhoodContext,
  type Origin,
  type PremisePoint,
  type ScoringIndex,
  type ServicePoint,
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
  /** Caveats only this builder can know — today, a premises layer PostgREST truncated. */
  layerNotes: LayerNotes
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

/**
 * Les locaux BDCom d'un rayon, ET ce qui manque du rayon — corrigé le 14 septembre 2026.
 *
 * `total_matched` était dans le type de ligne depuis le 15 août et n'était lu nulle part.
 * PostgREST plafonne une réponse à `db-max-rows`, donc au-delà d'environ mille locaux ce
 * module recevait un PLANCHER et le déclarait chargé : la mandataire de passage était calculée
 * sur ce qui était arrivé, rendue comme un nombre mesuré et estampillée « APUR BDCom 2023 »
 * sans la moindre réserve. Mesuré rue de Bretagne le 14 septembre 2026 : 920 sur 920 à 400 m,
 * 1 000 sur 1 981 à 600 m, 1 000 sur **17 190** à 2 000 m — et `score_location` annonce
 * justement 2 000 m dans son schéma d'entrée. `DIAGNOSTIC.md` §51.
 *
 * Ce n'est pas une absence et ça ne se traite pas comme telle : un plancher est une vraie
 * lecture, et le retirer coûterait plus qu'il ne protège. Il remonte donc en `note`, par la
 * même porte que la troncature géographique du noyau.
 */
interface PremisesLayer {
  points: PremisePoint[]
  /** Renseignée quand PostgREST a rendu moins de lignes que le rayon n'en contient. */
  note?: string
}

async function fetchPremises(
  lat: number,
  lng: number,
  radiusM: number,
  vintageYear: number,
): Promise<PremisesLayer> {
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

  const points: PremisePoint[] = rows.map((r) => ({
    lat: r.lat as number,
    lng: r.lng as number,
    status: r.is_vacant ? "vacant" : "occupied",
  }))

  const totalMatched = Number(rows[0]?.total_matched ?? points.length)
  if (totalMatched > points.length) {
    return {
      points,
      note:
        `The premises layer is truncated: the service returned ${points.length} of the ` +
        `${totalMatched} premises the ${Math.round(radiusM)} m radius holds, because PostgREST ` +
        `caps a response at its own row limit. Every figure below that reads this layer is a ` +
        `FLOOR, not a total. A narrower radius returns the whole set.`,
    }
  }
  return { points }
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

/**
 * Les services marchands du rayon, typés par famille — w6-amenites-corpus.
 *
 * Deuxième appel et non un élargissement du premier : `compass_scoring_context_within` ne rend
 * ni code ni groupe d'activité — six colonnes, mesurées le 15 septembre 2026 — et le code
 * d'activité vit sur `compass_premises_within`, une autre fonction. Élargir la première aurait
 * demandé une migration.
 *
 * `out_of_corpus` n'est délibérément PAS relu ici : cette fonction n'a jamais porté le marqueur
 * (`DIAGNOSTIC.md` §36), donc un point hors des 80 quartiers y rend zéro ligne, indistinguable
 * d'un rayon vide. La frontière du corpus est tranchée une fois, par `fetchPremises`, et cette
 * couche la suit — l'appelant retire les deux ensemble.
 */
interface PremisesWithinRow {
  lat: number | null
  lng: number | null
  activity_niv18: number | null
  total_matched: number | null
  withheld: boolean
}

interface ServicesLayer {
  points: ServicePoint[]
  note?: string
}

async function fetchServices(
  lat: number,
  lng: number,
  radiusM: number,
  vintageYear: number,
): Promise<ServicesLayer> {
  const { data, error } = await supabase.rpc("compass_premises_within", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_vintage_year: vintageYear,
    p_limit: 1000,
  })
  if (error) throw new Error(`compass_premises_within: ${error.message}`)
  const rows = (data ?? []) as PremisesWithinRow[]

  if (rows.some((r) => r.withheld)) {
    throw new LayerUnavailable(
      `BDCom ${vintageYear} is not publicly redistributable — its licence has not been read, ` +
        `so neither the surveyed activities nor their counts are served to this caller. ` +
        `Vintage 2023 is ODbL and can be scored; call list_sources for the licence of each.`,
      "retenue_licence",
    )
  }

  const points: ServicePoint[] = []
  for (const r of rows) {
    if (r.lat === null || r.lng === null) continue
    const family = serviceFamilyOf(r.activity_niv18)
    // A premise outside the merchant-service families is dropped rather than bucketed: it
    // already counts under `density`, and counting it twice would be the double attribution
    // `LayerOrigins` exists to make visible.
    if (family === null) continue
    points.push({ lat: r.lat, lng: r.lng, family })
  }

  const totalMatched = Number(rows[0]?.total_matched ?? rows.length)
  if (totalMatched > rows.length) {
    return {
      points,
      note:
        `The surveyed-services layer is truncated: the service returned ${rows.length} of the ` +
        `${totalMatched} premises the ${Math.round(radiusM)} m radius holds, because PostgREST ` +
        `caps a response at its own row limit. Every figure below that reads this layer is a ` +
        `FLOOR, not a total.`,
    }
  }
  return { points }
}

interface StationProfileRow {
  station_name: string | null
  distance_m: number | null
}

/**
 * La distance à l'arrêt ferré le plus proche — toute la couche `stations`.
 *
 * `null` veut dire que la couche a RÉPONDU et n'a trouvé aucun arrêt dans le rayon : c'est une
 * lecture, mesurée au bois de Vincennes le 15 septembre 2026, et non une absence. Une base
 * injoignable jette, et les deux ne doivent jamais se rencontrer.
 *
 * Ce que cet appel N'UTILISE PAS, et que le ticket croyait utiliser : `pct_validations`, la
 * part d'une journée de station tombant dans chaque tranche horaire. C'est une FORME et jamais
 * un volume — le jeu ne publie aucun compte absolu (`20260907000002`, et mesuré : 24 tranches
 * JOHV sommant à 99,99 % à Oberkampf). Aucun axe ne peut en être compté.
 */
async function fetchStation(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<{ distanceM: number | null }> {
  const { data, error } = await supabase.rpc("compass_station_profile", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
  })
  if (error) throw new LayerUnavailable(`compass_station_profile: ${error.message}`, "source_injoignable")
  const rows = (data ?? []) as StationProfileRow[]
  const first = rows[0]
  if (!first || first.distance_m === null) return { distanceM: null }
  return { distanceM: Number(first.distance_m) }
}

/**
 * La provenance de la couche ferrée, lue et non écrite.
 *
 * `ingestion_run.source_as_of` pour la source `idfm` est la date de modification du portail
 * lui-même, portée depuis `20260907000002`. Même discipline que `premisesOrigin`.
 */
async function stationOrigin(): Promise<Origin> {
  const { data, error } = await supabase
    .from("ingestion_run")
    .select("source_as_of")
    .eq("source", "idfm")
    .maybeSingle()
  if (error) throw new Error(`ingestion_run(idfm): ${error.message}`)
  const asOf = (data as { source_as_of?: string | null } | null)?.source_as_of
  if (!asOf) {
    throw new Error(
      `ingestion_run states no date for source "idfm", so the vintage of the rail layer is ` +
        `unknown. A figure that cannot state its provenance is not shown.`,
    )
  }
  return IDFM_ORIGIN(asOf)
}

export async function buildNeighbourhoodContext(
  lat: number,
  lng: number,
  radiusM: number,
  vintageYear = 2023,
): Promise<ContextResult> {
  // Six independent calls, six independent failures — and the vintage metadata is its own,
  // deliberately not bundled with the rows. A withheld vintage returns no rows but its licence
  // and date are public, and they are exactly what a caller needs to understand the refusal.
  //
  // **Why the two corpus radii are not `radiusM` — w6-amenites-corpus.** The services layer is
  // fetched at `SERVICE_RADIUS_M` because the axes that read it count within that radius and
  // PostgREST caps a response at a thousand rows: asking wider buys truncation, not rows. The
  // rail layer is looked for within `AMENITY_RADIUS_M` because it has no cap to respect and a
  // narrower window would report « no stop » where one stands 500 m away. `radiusM` still
  // governs the two layers whose figures actually scale with it.
  const [amenitiesResult, premisesResult, originResult, servicesResult, stationResult, stationOriginResult] =
    await Promise.allSettled([
      fetchOverpassAmenities(lat, lng, radiusM),
      fetchPremises(lat, lng, radiusM, vintageYear),
      premisesOrigin(vintageYear),
      fetchServices(lat, lng, SERVICE_RADIUS_M, vintageYear),
      fetchStation(lat, lng, AMENITY_RADIUS_M),
      stationOrigin(),
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

  const premises = premisesResult.status === "fulfilled" ? premisesResult.value.points : []
  const layerNotes: LayerNotes = {}
  // Rows that arrived but cannot be attributed are rows that must not be scored: an
  // unattributable figure is one `Measured<T>` exists to keep off the screen. So a metadata
  // failure withdraws the layer even when the rows themselves came back.
  if (premisesResult.status === "fulfilled" && originResult.status === "fulfilled") {
    loaded.push("premises")
    if (premisesResult.value.note) layerNotes.premises = premisesResult.value.note
  }
  if (premisesResult.status === "rejected") {
    const reason = premisesResult.reason instanceof Error ? premisesResult.reason.message : String(premisesResult.reason)
    failures.push({ layer: "premises", reason, motif: motifOf(premisesResult.reason) })
  } else if (originResult.status === "rejected") {
    const reason = originResult.reason instanceof Error ? originResult.reason.message : String(originResult.reason)
    failures.push({ layer: "premises", reason, motif: motifOf(originResult.reason) })
  }

  // ── Hors du corpus, les DEUX autres couches du corpus tombent avec les locaux ───────────
  //
  // Mesuré à l'écran le 15 septembre 2026 à Massy, et corrigé avant livraison : les deux
  // fonctions appelées RÉUSSISSENT hors de Paris et rendent zéro ligne —
  // `compass_premises_within` n'a jamais porté `out_of_corpus` (`DIAGNOSTIC.md` §36) et
  // `idfm_station` est restreinte à Paris à l'ingestion. Traitées isolément elles comptent
  // donc comme « chargées et vides », et l'agent recevait « services 0/100, rail 0/100 » sur
  // une commune qui a des commerces et un RER : `DIAGNOSTIC.md` §16 un cran plus loin.
  //
  // `compass_scoring_context_within` est la seule autorité sur la frontière, et les deux
  // autres la suivent.
  const horsCorpus =
    premisesResult.status === "rejected" && motifOf(premisesResult.reason) === "hors_corpus"
  const HORS_CORPUS_REASON =
    "This point lies outside the BDCom corpus, which covers Paris intra-muros only. This layer " +
    "is withdrawn with the premises layer rather than counted as empty: a survey that stops at " +
    "the city limits knows nothing here, and a zero would be a figure computed on nothing."

  // ── The corpus: merchant services, the same survey read by activity code ────────────────
  // Same rule as premises one step along: rows without their licence must not be scored, so a
  // metadata failure withdraws this layer too — both read the same vintage, and
  // `compass_vintages` is the only place that knows its licence.
  const services =
    !horsCorpus && servicesResult.status === "fulfilled" ? servicesResult.value.points : []
  if (horsCorpus) {
    failures.push({ layer: "services", reason: HORS_CORPUS_REASON, motif: "hors_corpus" })
  } else if (servicesResult.status === "fulfilled" && originResult.status === "fulfilled") {
    loaded.push("services")
    if (servicesResult.value.note) layerNotes.services = servicesResult.value.note
  } else if (servicesResult.status === "rejected") {
    const reason = servicesResult.reason instanceof Error ? servicesResult.reason.message : String(servicesResult.reason)
    failures.push({ layer: "services", reason, motif: motifOf(servicesResult.reason) })
  } else if (originResult.status === "rejected") {
    const reason = originResult.reason instanceof Error ? originResult.reason.message : String(originResult.reason)
    failures.push({ layer: "services", reason, motif: motifOf(originResult.reason) })
  }

  // ── The corpus: rail stops, from Île-de-France Mobilités ────────────────────────────────
  // A stop found and a stop not found are both readings of a layer that ANSWERED **inside the
  // corpus**; only a thrown call, or a point the corpus does not cover, withdraws it.
  // `nearestStationM` carries the found/not-found distinction into the core.
  if (horsCorpus) {
    failures.push({ layer: "stations", reason: HORS_CORPUS_REASON, motif: "hors_corpus" })
  } else if (stationResult.status === "fulfilled" && stationOriginResult.status === "fulfilled") {
    loaded.push("stations")
  } else {
    const failed = stationResult.status === "rejected" ? stationResult : stationOriginResult
    const rejected = failed.status === "rejected" ? failed.reason : undefined
    const reason = rejected instanceof Error ? rejected.message : String(rejected)
    failures.push({ layer: "stations", reason, motif: motifOf(rejected) })
  }

  // Overpass answers with the current state of the map, so the query date is the vintage.
  // BDCom's is not today's date and must never be given it: `as_of` comes from the survey.
  const osm = OSM_ORIGIN(new Date().toISOString().slice(0, 10))
  const bdcom = originResult.status === "fulfilled" ? originResult.value : UNKNOWN_BDCOM(vintageYear)
  const origins: LayerOrigins = {
    amenities: osm,
    roads: osm,
    premises: bdcom,
    // Same survey, same vintage as the premises layer, so the same origin by construction
    // rather than by a second lookup free to answer differently.
    services: bdcom,
    stations:
      stationOriginResult.status === "fulfilled"
        ? stationOriginResult.value
        : IDFM_ORIGIN("unknown — ingestion_run could not be read"),
  }

  const context: NeighbourhoodContext = {
    amenities,
    roads,
    premises,
    services,
    nearestStationM:
      !horsCorpus && stationResult.status === "fulfilled" ? stationResult.value.distanceM : null,
    loaded,
  }
  return { index: buildIndex(context), layerNotes, failures, origins }
}
