// Chantiers perturbants — disruptive worksites (chantiers-perturbants).
//
//   npx.cmd tsx scripts/ingest/chantiers.ts
//
// A fait d'exposition, never a prediction of impact on turnover (PLAN.md §5.1,
// PLAN-ACTION-VACANCE.md — w1-chantiers doctrine): the phrase is dated and sourced,
// an administrative fact. "Les chantiers principaux ayant un impact sur la
// circulation" — perturb car or bike traffic, last more than a week, sit on a main
// road outside the périphérique, polygons drawn by hand by the city.
//
// Weekly update, per the dataset's own description (metas.default.description,
// read 25 August 2026) — docs/tickets/w1-chantiers.md and
// docs/PLAN-ACTION-VACANCE.md §5.1 both said "quotidien" (daily) and were wrong;
// both corrected alongside this file (docs/REPRISE.md).
//
// Run after scripts/ingest/geography.ts and bdcom.ts — premise_location must
// already hold its geometry. Re-running is safe: the reference table is rebuilt
// and the attachment recomputed from scratch, exactly like plu.ts.

import type { Client } from "pg"

import { assertPrivileged, connect, inTransaction, log, recordRun } from "./lib/db"
import { datasetModified, exportJson } from "./lib/parisOpendata"

const DATASET = "chantiers-perturbants"

/**
 * How far a worksite may sit from a premise before it counts as exposure. Named
 * directly by w1-chantiers' "Fait quand": "un local à 40 m d'un polygone
 * perturbant".
 */
const MATCH_TOLERANCE_M = 40

/**
 * The dataset's own "Description des codes" (catalogue metadata, read 25 August
 * 2026) documents this table; `objet`, by contrast, is not documented anywhere in
 * the source and is kept as the raw enum value rather than guessed at.
 */
const STATUT_LABEL: Record<number, string> = {
  1: "à venir",
  2: "en cours",
  3: "suspendu",
  4: "prolongé",
  5: "terminé",
}

interface Feature {
  geometry: { type: string; coordinates: unknown } | null
  properties: {
    identifiant: string
    cp_arrondissement: string | null
    typologie: number | null
    objet: string | null
    description: string | null
    voie: string | null
    precision_localisation: string | null
    date_debut: string | null
    date_fin: string | null
    impact_circulation: string | null
    impact_circulation_detail: string | null
    niveau_perturbation: number | null
    statut: number
    maitre_ouvrage: string | null
  }
}

async function loadChantiers(client: Client): Promise<number> {
  const collection = await exportJson<{ features: Feature[] }>(DATASET, "geojson")
  let skipped = 0
  // The source publishes one entirely empty row alongside the geometry — no
  // geometry, no dates, no statut (CP003069, measured 25 August 2026) — which a
  // Polygon/MultiPolygon filter drops along with anything else malformed.
  const rows = collection.features.filter((f) => {
    if (f.geometry?.type !== "Polygon" && f.geometry?.type !== "MultiPolygon") {
      skipped += 1
      return false
    }
    return true
  })

  await client.query("delete from public.chantier_perturbant")
  const chunk = 500
  for (let start = 0; start < rows.length; start += chunk) {
    const slice = rows.slice(start, start + chunk)
    const values: unknown[] = []
    const tuples = slice.map((f, i) => {
      const p = f.properties
      const statutLabel = STATUT_LABEL[p.statut]
      if (!statutLabel) throw new Error(`${p.identifiant}: statut inconnu ${p.statut}`)
      values.push(
        p.identifiant,
        p.cp_arrondissement ? Number(p.cp_arrondissement) - 75000 : null,
        p.typologie,
        p.objet,
        p.description,
        p.voie,
        p.precision_localisation,
        p.date_debut,
        p.date_fin,
        p.impact_circulation,
        p.impact_circulation_detail,
        p.niveau_perturbation,
        p.statut,
        statutLabel,
        p.maitre_ouvrage,
        JSON.stringify(f.geometry),
      )
      const b = i * 16
      return (
        `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, ` +
        `$${b + 9}, $${b + 10}, $${b + 11}, $${b + 12}, $${b + 13}, $${b + 14}, $${b + 15}, ` +
        `ST_Multi(ST_GeomFromGeoJSON($${b + 16}))::geography)`
      )
    })
    await client.query(
      `insert into public.chantier_perturbant
         (id, arrondissement, typologie, objet, description, voie, precision_localisation,
          date_debut, date_fin, impact_circulation, impact_circulation_detail,
          niveau_perturbation, statut, statut_label, maitre_ouvrage, geom)
       values ${tuples.join(", ")}
       on conflict (id) do nothing`,
      values,
    )
  }
  log(
    "chantiers perturbants",
    `${rows.length} chargés${skipped ? `, ${skipped} ignorés (géométrie absente)` : ""}`,
  )
  return rows.length
}

async function attach(client: Client): Promise<{ premises: number }> {
  // Reset first, exactly like plu.ts: a premise whose nearest worksite has since
  // ended and dropped off this week's feed must not keep a stale exposure.
  await client.query(`
    update public.premise_location
       set nearest_chantier_id = null, chantier_distance_m = null
     where nearest_chantier_id is not null
  `)

  // Nearest chantier per premise, not every chantier within tolerance — the
  // many-to-many trap w0-plu found and fixed: matching every candidate within
  // tolerance rather than the single nearest one over-counts near a cluster of
  // sites. Going from the premise side (distinct on l.id) rather than the
  // chantier side sidesteps the fan-out that caused the PLU over-match in the
  // first place — each premise picks exactly one nearest worksite, never several.
  const result = await client.query(
    `with nearest as (
       select distinct on (l.id)
              l.id as location_id, c.id as chantier_id, ST_Distance(l.geom, c.geom) as distance_m
         from public.premise_location l
         join public.chantier_perturbant c on ST_DWithin(l.geom, c.geom, $1)
        order by l.id, l.geom <-> c.geom
     )
     update public.premise_location l
        set nearest_chantier_id = n.chantier_id,
            chantier_distance_m = n.distance_m
       from nearest n
      where l.id = n.location_id`,
    [MATCH_TOLERANCE_M],
  )

  log("rattachement", `${result.rowCount} locaux exposés`)
  return { premises: result.rowCount ?? 0 }
}

async function main(): Promise<void> {
  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  try {
    const sourceAsOf = await datasetModified(DATASET)

    let loaded = 0
    let attached: { premises: number } = { premises: 0 }
    await inTransaction(client, async () => {
      loaded = await loadChantiers(client)
      attached = await attach(client)
    })

    log("terminé")
    log("  locaux exposés", String(attached.premises))

    await recordRun(client, "chantiers", {
      rowCount: loaded,
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
