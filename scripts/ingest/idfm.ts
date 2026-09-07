// Validations IDFM horaires — w2-idfm (issue #19).
//
//   npx.cmd tsx scripts/ingest/idfm.ts
//
// Replaces the pedestrian-count proxy with a rhythm actually measured at the station:
// "profil horaire de la station la plus proche […] distingue un pôle de bureau d'un pôle
// résidentiel" (docs/tickets/w2-idfm.md). Doctrine: "Mesuré à la station, pas à la porte" —
// this file never touches an address, only a point and its nearest station.
//
// TWO SOURCES, ONE FAMILY OF STOP IDENTIFIERS (id_zdc / zdcid), NEITHER CARRYING THE OTHER'S
// FACT. The validation-profile dataset knows a station's RHYTHM (percent of its day, by hour)
// but not WHERE it is; the référentiel des arrêts (zones-d-arrets) knows WHERE every stop is
// but nothing about validations. Both are read here and joined in application code on that
// shared id — see the migration header (20260907000002) for why the profile dataset's own id
// is never pinned (its `dataset_id` does not settle into one spelling across quarters) while
// zones-d-arrets keeps one stable id and is read with `resolveDataset` skipped.
//
// Run after geography.ts — not because this file reads street_key or quartier_id (it does
// not), but because it writes premise_location.nearest_idfm_station_id/idfm_station_distance_m
// on the same table geography.ts populates the geometry of. Re-running is safe: both
// reference tables are rebuilt from scratch and the attachment recomputed, exactly like
// chantiers.ts and terrasses.ts.

import type { Client } from "pg"

import { assertPrivileged, connect, inTransaction, insertRows, log, recordRun } from "./lib/db"
import { datasetModified, exportJson, normalizeTitle, resolveDataset } from "./lib/idfmOpendata"

/** Only the current quarter's snapshot is loaded — see the migration header for why the
 * 2015-2024 file archive (histo-validations-reseau-ferre) is out of scope here. */
const PROFILE_SEARCH_QUERY = "validations reseau ferre profils horaires jour type"

function isProfileTitle(title: string): boolean {
  const n = normalizeTitle(title)
  return n.includes("reseau ferre") && n.includes("profils horaires") && n.includes("jour type")
}

/** A stable, non-rotating id — unlike the profile dataset, this reference layer has kept one
 * name since it was first measured (7 September 2026), so it is pinned like every other
 * reference table this project reads (chantiers-perturbants, terrasses-autorisations). */
const STATIONS_DATASET = "zones-d-arrets"

/** Paris communes carry INSEE code 751NN (NN = arrondissement, 01-20) in `zdapostalregion` —
 * distinct from the postal code 750NN a letter would carry. Confirmed against `zdatown`
 * ("Paris 7e" for 75107) on a sample of 5 rows, 7 September 2026. */
const PARIS_POSTAL_PREFIX = "751"

interface ProfileRecord {
  id_zdc: number | null
  libelle_arret: string | null
  cat_jour: string
  trnc_horr_60: string
  pourcentage_validations: number | null
  /** Which line/mode this row's own 100%-summing profile belongs to — see
   * `aggregateProfiles` for why all three are kept as the code rather than just one. */
  code_stif_trns: number | null
  code_stif_res: string | null
  code_stif_arret: string | null
}

interface StopRecord {
  zdaid: string
  zdaname: string
  zdaxepsg2154: number | null
  zdayepsg2154: number | null
  zdcid: string
  zdapostalregion: string | null
}

interface StationAgg {
  idZdc: number
  names: Map<string, number>
  arrondissements: Map<number, number>
  xs: number[]
  ys: number[]
}

function mostFrequent<K>(counts: Map<K, number>): K {
  let bestKey: K | undefined
  let bestCount = -1
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestKey = key
      bestCount = count
    }
  }
  // Only called on a non-empty map — every station is built from at least one stop record.
  return bestKey as K
}

/** Paris stations (zdc) — coordinates and name averaged/voted across every zdaid (individual
 * stop) the référentiel groups under one zdc, e.g. a rail platform plus an adjoining bus stop
 * sharing the station's zone. Only zdc actually in Paris (751xx) are kept. */
export async function buildParisStations(): Promise<Map<number, StationAgg>> {
  const stops = await exportJson<StopRecord>(
    STATIONS_DATASET,
    `startswith(zdapostalregion, "${PARIS_POSTAL_PREFIX}")`,
  )
  const stations = new Map<number, StationAgg>()
  for (const s of stops) {
    if (!s.zdcid || s.zdaxepsg2154 == null || s.zdayepsg2154 == null) continue
    const idZdc = Number(s.zdcid)
    if (!Number.isFinite(idZdc)) continue
    let agg = stations.get(idZdc)
    if (!agg) {
      agg = { idZdc, names: new Map(), arrondissements: new Map(), xs: [], ys: [] }
      stations.set(idZdc, agg)
    }
    agg.names.set(s.zdaname, (agg.names.get(s.zdaname) ?? 0) + 1)
    const arr = Number(s.zdapostalregion) - 75100
    if (Number.isFinite(arr) && arr >= 1 && arr <= 20) {
      agg.arrondissements.set(arr, (agg.arrondissements.get(arr) ?? 0) + 1)
    }
    agg.xs.push(s.zdaxepsg2154)
    agg.ys.push(s.zdayepsg2154)
  }
  return stations
}

const avg = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length

/**
 * Averages, not sums, the percentage across every `code_stif_arret` a zdc carries -- see the
 * migration header for why: this dataset has no absolute validation count, so there is no way
 * to weight two lines serving one station by how much each is actually used. Restricted to
 * Paris zdc that `buildParisStations` actually resolved a location for; a zdc the profile
 * dataset names but the referentiel does not place would attach premises to a station with no
 * coordinate, which cannot happen with a foreign key in place regardless -- filtering here
 * only avoids computing an aggregate this migration would then discard.
 *
 * THE DIVISOR IS FIXED PER (id_zdc, cat_jour), NEVER PER HOUR BUCKET -- measured 7 September
 * 2026 on a first version that divided by however many codes reported THAT bucket: several
 * stations came out summing well above 100 instead of 100. A code that runs no service at
 * 3 a.m. does not omit that hour by oversight -- it means near-zero validations then, a value
 * of 0, not "no opinion to average in". Dividing an hour with fewer reporting codes by a
 * SMALLER n therefore overstates it. The fix: count the codes once per (id_zdc, cat_jour) --
 * call it k -- sum every code's percentage at each hour, and divide by that fixed k
 * throughout. A code silent at one hour contributes 0 there, and the combined profile sums to
 * 100 (k profiles of 100 each, divided by k) regardless of which hours each code reports.
 *
 * A STATION IS DROPPED OUTRIGHT WHEN THE SOURCE ITSELF PUBLISHES MORE THAN ONE ROW FOR THE
 * SAME (code, cat_jour, hour bucket) -- measured 7 September 2026: exactly one Paris zdc,
 * 71545 "Porte de Clichy", carries up to 4 rows for one code at one hour, with DIFFERENT
 * percentages (0.97 to 26.41 at 12H-13H) and no other published field to tell them apart --
 * not a rounding artefact, an unexplained multiplicity in IDFM's own export. Averaging them
 * blind would publish a number this project cannot stand behind; the schema (8 fields, none
 * of them a discriminant) offers no way to know which row is right. DIAGNOSTIC.md records the
 * exclusion, dated, so a future reload does not silently start serving it once the source
 * changes shape. Every other Paris zdc measured that day carried exactly one row per
 * (code, cat_jour, hour) -- this is a one-station exception, not a general defence.
 */
export function aggregateProfiles(
  records: ProfileRecord[],
  parisZdc: ReadonlySet<number>,
): Map<string, { idZdc: number; catJour: string; hourBucket: string; pct: number }> {
  const codesPerStation = new Map<string, Set<string>>() // key: "idZdc catJour"
  const sums = new Map<string, { idZdc: number; catJour: string; hourBucket: string; sum: number }>()
  const rawRowCount = new Map<string, number>() // key: "idZdc code catJour hourBucket"
  const dirtyStations = new Set<number>()

  for (const r of records) {
    if (r.id_zdc == null || r.pourcentage_validations == null) continue
    const idZdc = Math.trunc(r.id_zdc)
    if (!parisZdc.has(idZdc)) continue

    const codeKey = `${r.code_stif_trns} ${r.code_stif_res} ${r.code_stif_arret}`
    const rowKey = `${idZdc} ${codeKey} ${r.cat_jour} ${r.trnc_horr_60}`
    const seen = (rawRowCount.get(rowKey) ?? 0) + 1
    rawRowCount.set(rowKey, seen)
    if (seen > 1) dirtyStations.add(idZdc)

    const stationKey = `${idZdc} ${r.cat_jour}`
    let codes = codesPerStation.get(stationKey)
    if (!codes) {
      codes = new Set()
      codesPerStation.set(stationKey, codes)
    }
    codes.add(codeKey)

    const hourKey = `${stationKey} ${r.trnc_horr_60}`
    const existing = sums.get(hourKey)
    if (existing) {
      existing.sum += r.pourcentage_validations
    } else {
      sums.set(hourKey, { idZdc, catJour: r.cat_jour, hourBucket: r.trnc_horr_60, sum: r.pourcentage_validations })
    }
  }

  if (dirtyStations.size > 0) {
    log(
      "profils écartés (lignes dupliquées sans discriminant)",
      [...dirtyStations].join(", "),
    )
  }

  const result = new Map<string, { idZdc: number; catJour: string; hourBucket: string; pct: number }>()
  for (const [hourKey, entry] of sums) {
    if (dirtyStations.has(entry.idZdc)) continue
    const k = codesPerStation.get(`${entry.idZdc} ${entry.catJour}`)?.size ?? 1
    result.set(hourKey, { idZdc: entry.idZdc, catJour: entry.catJour, hourBucket: entry.hourBucket, pct: entry.sum / k })
  }
  return result
}

export async function loadStations(client: Client, stations: Map<number, StationAgg>): Promise<number> {
  await client.query("delete from public.idfm_station")
  const chunk = 500
  const rows = [...stations.values()]
  for (let start = 0; start < rows.length; start += chunk) {
    const slice = rows.slice(start, start + chunk)
    const values: unknown[] = []
    const tuples = slice.map((s, i) => {
      const arrondissement = s.arrondissements.size > 0 ? mostFrequent(s.arrondissements) : null
      values.push(s.idZdc, mostFrequent(s.names), arrondissement, avg(s.xs), avg(s.ys))
      const b = i * 5
      return (
        `($${b + 1}, $${b + 2}, $${b + 3}, ` +
        `ST_Transform(ST_SetSRID(ST_MakePoint($${b + 4}, $${b + 5}), 2154), 4326)::geography)`
      )
    })
    await client.query(
      `insert into public.idfm_station (id_zdc, libelle, arrondissement, geom)
       values ${tuples.join(", ")}`,
      values,
    )
  }
  return rows.length
}

export async function loadProfiles(
  client: Client,
  aggregated: Map<string, { idZdc: number; catJour: string; hourBucket: string; pct: number }>,
): Promise<number> {
  await client.query("delete from public.idfm_validation_profile")
  const rows = [...aggregated.values()].map((a) => [a.idZdc, a.catJour, a.hourBucket, a.pct])
  return insertRows(
    client,
    "idfm_validation_profile",
    ["id_zdc", "cat_jour", "hour_bucket", "pct_validations"],
    rows,
  )
}

/** Nearest station for EVERY premise, unconditionally — unlike chantier_exposed or
 * terrasse_status, there is no "within tolerance" cutoff here (docs/tickets/w2-idfm.md names
 * no radius as part of the fact itself; the ticket's "800 m" appears only in its
 * demonstration). A premise many kilometres from the nearest Paris station still has one, and
 * `idfm_station_distance_m` is exactly what lets a caller decide whether that answer means
 * anything at its own radius. KNN (`<->`) against the small station table (order of 300 rows
 * in Paris) rather than an ST_DWithin threshold join, because there is no threshold to give it.
 */
export async function attach(client: Client): Promise<number> {
  const result = await client.query(`
    with nearest as (
      select l.id as location_id, s.id_zdc, ST_Distance(l.geom, s.geom) as distance_m
      from public.premise_location l
      cross join lateral (
        select st.id_zdc, st.geom
        from public.idfm_station st
        order by st.geom <-> l.geom
        limit 1
      ) s
      where l.geom is not null
    )
    update public.premise_location l
       set nearest_idfm_station_id = n.id_zdc,
           idfm_station_distance_m = n.distance_m
      from nearest n
     where l.id = n.location_id
  `)
  return result.rowCount ?? 0
}

async function main(): Promise<void> {
  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  try {
    const profileDataset = await resolveDataset(PROFILE_SEARCH_QUERY, isProfileTitle)
    log("jeu résolu", profileDataset)
    const sourceAsOf = await datasetModified(profileDataset)

    const [stations, profileRecords] = await Promise.all([
      buildParisStations(),
      exportJson<ProfileRecord>(profileDataset),
    ])
    log("stations Île-de-France Mobilités (Paris)", String(stations.size))
    log("lignes de profil (Île-de-France entière)", String(profileRecords.length))

    const parisZdc = new Set(stations.keys())
    const aggregated = aggregateProfiles(profileRecords, parisZdc)
    log("lignes de profil retenues (Paris, agrégées)", String(aggregated.size))

    // Only stations a profile row actually names survive into idfm_station — the foreign key
    // on idfm_validation_profile would refuse the rest anyway, and keeping them would attach
    // premises to a station with nothing to show (migration comment, idfm_station).
    const profiledZdc = new Set([...aggregated.values()].map((a) => a.idZdc))
    const stationsWithProfile = new Map(
      [...stations.entries()].filter(([id]) => profiledZdc.has(id)),
    )
    log("stations retenues (profil non vide)", String(stationsWithProfile.size))

    let stationCount = 0
    let profileCount = 0
    let attached = 0
    await inTransaction(client, async () => {
      stationCount = await loadStations(client, stationsWithProfile)
      profileCount = await loadProfiles(client, aggregated)
      attached = await attach(client)
    })

    log("terminé")
    log("  stations chargées", String(stationCount))
    log("  lignes de profil chargées", String(profileCount))
    log("  locaux rattachés", String(attached))

    await recordRun(client, "idfm", {
      rowCount: profileCount,
      sourceAsOf,
      durationMs: Date.now() - startedAt,
    })
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  log("ÉCHEC", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
