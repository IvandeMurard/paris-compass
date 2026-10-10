// PLU bioclimatique — protection du commerce et de l'artisanat (plub_protcom).
//
//   npx.cmd tsx scripts/ingest/plu.ts
//   npx.cmd tsx scripts/ingest/plu.ts --dry-run   # counts what would change, writes nothing
//
// A binary, mapped constraint, never a score (PLAN.md §2.4, PERIMETRE.md — "Sur la
// légalité"): on a protected linear, a ground-floor premise cannot change use. Version of
// the PLU voted by the Conseil de Paris on 20 November 2024, per the dataset's own
// description. Informational only, no regulatory value — the Portail des Règles d'Urbanisme
// is the authority, never this table.
//
// Run after scripts/ingest/geography.ts — the attachment step below joins through
// street_segment_id, which geography.ts computes. Re-running is safe, and since #244 it
// writes only what changed: the linears are upserted by their own identifier, the ones the
// batch no longer has are removed, and a premise is written only when its flags change. It
// used to `delete` the table, reinsert it, reset 29 338 premises to false and attach them
// again — two versions of each of those premises per run.

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

/**
 * Refuses an empty batch before anything is written. The table is now synchronised to the
 * batch, so an empty one would remove every linear and clear every premise's protection while
 * recording a success. CE QUE CETTE GARDE NE RATTRAPE PAS : le lot APPAUVRI.
 */
function refuseLotVide(count: number): void {
  if (count > 0) return
  throw new Error(
    "plu_linear_protection : lot vide, chargement refusé avant tout écrit. Vérifier d'abord " +
      "que le jeu source porte encore les champs que scripts/ingest/plu.ts lit (n_sq_pca, pca, " +
      "ppa, pcc, une géométrie LineString).",
  )
}

/** Downloaded before the transaction opens: a slow mirror must not hold it open. */
async function fetchLinears(): Promise<{ rows: Feature[]; skipped: number }> {
  const collection = await exportJson<{ features: Feature[] }>(DATASET, "geojson")
  let skipped = 0
  const rows = collection.features.filter((f) => {
    if (f.geometry?.type !== "LineString") {
      skipped += 1
      return false
    }
    return true
  })
  return { rows, skipped }
}

/**
 * Stages the batch in `tmp_plu`. No `on conflict do nothing`: a repeated n_sq_pca violates
 * the primary key and fails the load loudly — the first copy winning in silence, as it did
 * before #244, would hide a source defect. Same choice as filosofi.ts (review of #245).
 */
async function stage(client: Client, rows: Feature[]): Promise<void> {
  await client.query(`
    create temporary table tmp_plu (
      id integer primary key, arrondissement_min smallint, arrondissement_max smallint,
      commerce_artisanat boolean, commerce_proximite boolean, commerce_culturel boolean,
      length_m double precision, geom geography(LineString, 4326)
    ) on commit drop
  `)
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
      `insert into tmp_plu
         (id, arrondissement_min, arrondissement_max, commerce_artisanat, commerce_proximite, commerce_culturel, length_m, geom)
       values ${tuples.join(", ")}`,
      values,
    )
  }
}

/** The table brought to the batch: changed or new linears upserted, absent ones removed. */
async function syncTable(client: Client, dryRun: boolean): Promise<{ written: number; removed: number }> {
  const differs = `(p.arrondissement_min, p.arrondissement_max, p.commerce_artisanat,
            p.commerce_proximite, p.commerce_culturel, p.length_m, ST_AsBinary(p.geom))
           is distinct from
           (t.arrondissement_min, t.arrondissement_max, t.commerce_artisanat,
            t.commerce_proximite, t.commerce_culturel, t.length_m, ST_AsBinary(t.geom))`
  const gone = `from public.plu_linear_protection p
     where not exists (select 1 from tmp_plu t where t.id = p.id)`
  if (dryRun) {
    const r = await client.query<{ written: string; removed: string }>(`
      select (select count(*) from tmp_plu t
                left join public.plu_linear_protection p on p.id = t.id
               where p.id is null or ${differs})::text as written,
             (select count(*) ${gone})::text as removed
    `)
    return { written: Number(r.rows[0].written), removed: Number(r.rows[0].removed) }
  }
  const written = await client.query(`
    insert into public.plu_linear_protection as p
      (id, arrondissement_min, arrondissement_max, commerce_artisanat, commerce_proximite,
       commerce_culturel, length_m, geom)
    select id, arrondissement_min, arrondissement_max, commerce_artisanat, commerce_proximite,
           commerce_culturel, length_m, geom
      from tmp_plu
    on conflict (id) do update
       set arrondissement_min = excluded.arrondissement_min,
           arrondissement_max = excluded.arrondissement_max,
           commerce_artisanat = excluded.commerce_artisanat,
           commerce_proximite = excluded.commerce_proximite,
           commerce_culturel  = excluded.commerce_culturel,
           length_m = excluded.length_m,
           geom = excluded.geom
     where (p.arrondissement_min, p.arrondissement_max, p.commerce_artisanat,
            p.commerce_proximite, p.commerce_culturel, p.length_m, ST_AsBinary(p.geom))
           is distinct from
           (excluded.arrondissement_min, excluded.arrondissement_max, excluded.commerce_artisanat,
            excluded.commerce_proximite, excluded.commerce_culturel, excluded.length_m,
            ST_AsBinary(excluded.geom))
  `)
  const removed = await client.query(`delete ${gone}`)
  return { written: written.rowCount ?? 0, removed: removed.rowCount ?? 0 }
}

/** What `attach` found, and how many premises it actually had to write. */
interface Attachment {
  segments: number
  premises: number
  changed: number
}

async function attach(client: Client, dryRun: boolean): Promise<Attachment> {
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
  //
  // Ties are broken by segment id. Measured 10 October 2026: 2 519 of the 5 107 linears sit
  // at the same minimal distance (0 m) from several segments, up to 13 — the linear runs
  // along one segment and touches its neighbours at the ends. Ordered by distance alone,
  // `distinct on` kept whichever tied row came first physically, so the VACUUM FULL of
  // 6 October alone left 13 424 premises disagreeing with what a fresh run would compute,
  // on unchanged source data. The id makes the choice reproducible, not right: picking the
  // segment a linear actually runs along is a matching-rule change, tracked in #263.
  //
  // Read from the batch, never the table: a dry run then measures exactly what a real run
  // would attach. Every premise gets a row — false on all three flags off a protected
  // segment — so a protection that lapsed is cleared by the same UPDATE that writes the new
  // ones, with no reset pass.
  await client.query(
    `create temporary table tmp_plu_segment on commit drop as
     select segment_id,
            bool_or(commerce_artisanat) as commerce_artisanat,
            bool_or(commerce_proximite) as commerce_proximite,
            bool_or(commerce_culturel)  as commerce_culturel
       from (
         select distinct on (t.id) s.id as segment_id,
                t.commerce_artisanat, t.commerce_proximite, t.commerce_culturel
           from tmp_plu t
           join public.street_segment s on ST_DWithin(t.geom, s.geom, $1)
          order by t.id, t.geom <-> s.geom, s.id
       ) nearest
      group by segment_id`,
    [MATCH_TOLERANCE_M],
  )
  await client.query(`
    create temporary table tmp_plu_attach on commit drop as
    select l.id,
           coalesce(f.commerce_artisanat, false) as commerce_artisanat,
           coalesce(f.commerce_proximite, false) as commerce_proximite,
           coalesce(f.commerce_culturel, false)  as commerce_culturel
      from public.premise_location l
      left join tmp_plu_segment f on f.segment_id = l.street_segment_id
  `)

  const counts = await client.query<{ segments: string; premises: string }>(`
    select (select count(*) from tmp_plu_segment)::text as segments,
           (select count(*) from tmp_plu_attach
             where commerce_artisanat or commerce_proximite or commerce_culturel)::text as premises
  `)

  const differs = `l.id = t.id
       and (l.plu_commerce_artisanat, l.plu_commerce_proximite, l.plu_commerce_culturel)
           is distinct from (t.commerce_artisanat, t.commerce_proximite, t.commerce_culturel)`
  const changed = dryRun
    ? Number(
        (await client.query<{ n: string }>(
          `select count(*)::text as n from public.premise_location l, tmp_plu_attach t where ${differs}`,
        )).rows[0].n,
      )
    : ((await client.query(`
        update public.premise_location l
           set plu_commerce_artisanat = t.commerce_artisanat,
               plu_commerce_proximite = t.commerce_proximite,
               plu_commerce_culturel  = t.commerce_culturel
          from tmp_plu_attach t
         where ${differs}
      `)).rowCount ?? 0)

  return {
    segments: Number(counts.rows[0].segments),
    premises: Number(counts.rows[0].premises),
    changed,
  }
}

/**
 * Sentinel for --dry-run, as in terrasses.ts: the whole load runs inside the transaction and
 * is rolled back, every write to a real table replaced by the count it would have made — so
 * it leaves no dead row behind, whatever it finds.
 */
class DryRunComplete extends Error {}

async function main(): Promise<void> {
  // An unknown option is refused, never ignored: a mistyped `--dryrun` would otherwise run a
  // REAL load against the remote. Review of #246.
  const options = process.argv.slice(2)
  const unknown = options.filter((a) => a !== "--dry-run")
  if (unknown.length > 0) {
    throw new Error(`option inconnue : ${unknown.join(", ")} (seule --dry-run existe)`)
  }
  const dryRun = options.includes("--dry-run")

  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  let table = { written: 0, removed: 0 }
  let attached: Attachment = { segments: 0, premises: 0, changed: 0 }
  try {
    const { rows, skipped } = await fetchLinears()
    refuseLotVide(rows.length)
    log(
      "linéaires PLU",
      `${rows.length} lus${skipped ? `, ${skipped} ignorés (géométrie non linéaire)` : ""}`,
    )

    await inTransaction(client, async () => {
      await stage(client, rows)
      table = await syncTable(client, dryRun)
      attached = await attach(client, dryRun)
      if (dryRun) throw new DryRunComplete()
    })

    log("terminé")
    log("  linéaires écrits (nouveaux ou changés)", String(table.written))
    log("  linéaires retirés (absents du lot)", String(table.removed))
    log("  tronçons protégés", String(attached.segments))
    log("  locaux protégés", String(attached.premises))
    log("  locaux dont la protection a changé (écrits)", String(attached.changed))

    await recordRun(client, "plu", {
      rowCount: rows.length,
      sourceAsOf: VOTED_ON,
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    if (error instanceof DryRunComplete) {
      log("ESSAI — tout est annulé, rien n'est écrit")
      log("  linéaires à écrire", String(table.written))
      log("  linéaires à retirer", String(table.removed))
      log("  tronçons protégés", String(attached.segments))
      log("  locaux protégés", String(attached.premises))
      log("  locaux à écrire", String(attached.changed))
      return
    }
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  log("ÉCHEC", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
