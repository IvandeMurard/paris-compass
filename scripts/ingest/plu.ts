// PLU bioclimatique — protection du commerce et de l'artisanat (plub_protcom).
//
//   npx.cmd tsx scripts/ingest/plu.ts
//
// A binary, mapped constraint, never a score (PLAN.md §2.4, PERIMETRE.md — "Sur la
// légalité"): on a protected linear, a ground-floor premise cannot change use. Version of
// the PLU voted by the Conseil de Paris on 20 November 2024, per the dataset's own
// description. Informational only, no regulatory value — the Portail des Règles d'Urbanisme
// is the authority, never this table.
//
// Run after scripts/ingest/geography.ts — the attachment step below joins through
// street_segment_id, which geography.ts computes. Re-running is safe: the reference table
// is rebuilt and the attachment recomputed from scratch, exactly like geography.ts.

import type { Client } from "pg"

import { assertPrivileged, connect, inTransaction, log, recordRun } from "./lib/db"
import { exportJson } from "./lib/parisOpendata"

const DATASET = "plub_protcom"

// The dataset's own description states the vote date; there is no queryable "as of" field
// on the layer itself, so this is read here rather than derived. If the Ville de Paris
// publishes a new PLU revision, this constant is the one line to change — and it will be
// visibly wrong the day it is, because ingestion_run.source_as_of will not have moved.
const VOTED_ON = "2024-11-20"

/**
 * How far a PLU linear may sit from the street_segment it protects before the match is
 * refused. Measured 25 August 2026 against the live street_segment table: nearest-segment
 * distance for all 5 107 linears has p50 = 0 m, p99 = 0.0003 m, and a max of 10.06 m — the
 * two networks are drawn on essentially the same centreline, with a handful of outliers up
 * to 10 m. 15 m captures all 5 107 with margin, and stays far tighter than the 40 m fallback
 * geography.ts uses for a *different* street entirely — here both sides describe the same
 * street, so a wrong-street match at this distance is not a realistic risk.
 */
const MATCH_TOLERANCE_M = 15

interface Feature {
  geometry: { type: string; coordinates: [number, number][] } | null
  properties: {
    n_sq_pca: number
    arrdt_min: number
    arrdt_max: number
    pca: "O" | "N"
    ppa: "O" | "N"
    pcc: "O" | "N"
    st_length_shape: number
  }
}

async function loadLinears(client: Client): Promise<number> {
  const collection = await exportJson<{ features: Feature[] }>(DATASET, "geojson")
  let skipped = 0
  const rows = collection.features.filter((f) => {
    if (f.geometry?.type !== "LineString") {
      skipped += 1
      return false
    }
    return true
  })

  await client.query("delete from public.plu_linear_protection")
  const chunk = 500
  for (let start = 0; start < rows.length; start += chunk) {
    const slice = rows.slice(start, start + chunk)
    const values: unknown[] = []
    const tuples = slice.map((f, i) => {
      const p = f.properties
      values.push(
        p.n_sq_pca,
        p.arrdt_min,
        p.arrdt_max,
        p.pca === "O",
        p.ppa === "O",
        p.pcc === "O",
        p.st_length_shape,
        JSON.stringify(f.geometry),
      )
      const b = i * 8
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, ST_GeomFromGeoJSON($${b + 8})::geography)`
    })
    await client.query(
      `insert into public.plu_linear_protection
         (id, arrondissement_min, arrondissement_max, commerce_artisanat, commerce_proximite, commerce_culturel, length_m, geom)
       values ${tuples.join(", ")}
       on conflict (id) do nothing`,
      values,
    )
  }
  log(
    "linéaires PLU",
    `${rows.length} chargés${skipped ? `, ${skipped} ignorés (géométrie non linéaire)` : ""}`,
  )
  return rows.length
}

async function attach(client: Client): Promise<{ segments: number; premises: number }> {
  // Reset first, exactly like geography.ts detaches before rebuilding: a premise whose
  // protection lapsed on reload (a segment no longer near any linear) must not keep a stale
  // `true` from a previous run.
  await client.query(`
    update public.premise_location
       set plu_commerce_artisanat = false,
           plu_commerce_proximite = false,
           plu_commerce_culturel  = false
     where plu_commerce_artisanat or plu_commerce_proximite or plu_commerce_culturel
  `)

  // Each PLU linear is matched to its single *nearest* street_segment within tolerance, not
  // to every segment ST_DWithin happens to reach. Measured 25 August: short blocks near an
  // intersection can sit within 15 m of two or three neighbouring segments at once, so a
  // "within tolerance" join without the nearest-only restriction spread protection onto
  // segments the linear does not describe — a first version of this script did exactly that
  // and over-matched by roughly 2.5× (10 800 segments and 65 589 premises instead of the
  // ~4 300 / ~29 000 a nearest-only match gives on the same data).
  //
  // A segment can still end up flagged by more than one linear once restricted this way —
  // the source publishes overlapping protections (a general and a cultural protection on the
  // same stretch, as two rows) rather than one row per segment — so the flags are OR'd across
  // whichever linears nearest-match to it.
  const result = await client.query(
    `with nearest as (
       select distinct on (t.id)
              t.id as plu_id, s.id as segment_id,
              t.commerce_artisanat, t.commerce_proximite, t.commerce_culturel
       from public.plu_linear_protection t
       join public.street_segment s on ST_DWithin(t.geom, s.geom, $1)
       order by t.id, t.geom <-> s.geom
     ),
     segment_flags as (
       select segment_id,
              bool_or(commerce_artisanat) as commerce_artisanat,
              bool_or(commerce_proximite) as commerce_proximite,
              bool_or(commerce_culturel)  as commerce_culturel
       from nearest
       group by segment_id
     )
     update public.premise_location l
        set plu_commerce_artisanat = f.commerce_artisanat,
            plu_commerce_proximite = f.commerce_proximite,
            plu_commerce_culturel  = f.commerce_culturel
       from segment_flags f
      where l.street_segment_id = f.segment_id`,
    [MATCH_TOLERANCE_M],
  )

  const segments = await client.query<{ n: string }>(
    `select count(distinct segment_id)::text as n
       from (
         select distinct on (t.id) s.id as segment_id
         from public.plu_linear_protection t
         join public.street_segment s on ST_DWithin(t.geom, s.geom, $1)
         order by t.id, t.geom <-> s.geom
       ) nearest`,
    [MATCH_TOLERANCE_M],
  )

  log("rattachement", `${result.rowCount} locaux mis à jour, ${segments.rows[0]?.n} tronçons protégés`)
  return { segments: Number(segments.rows[0]?.n ?? 0), premises: result.rowCount ?? 0 }
}

async function main(): Promise<void> {
  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  try {
    let loaded = 0
    let attached: { segments: number; premises: number } = { segments: 0, premises: 0 }
    await inTransaction(client, async () => {
      loaded = await loadLinears(client)
      attached = await attach(client)
    })

    log("terminé")
    log("  locaux protégés", String(attached.premises))
    log("  tronçons protégés", String(attached.segments))

    await recordRun(client, "plu", {
      rowCount: loaded,
      sourceAsOf: VOTED_ON,
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
