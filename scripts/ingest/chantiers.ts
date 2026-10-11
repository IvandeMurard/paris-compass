// Chantiers perturbants — disruptive worksites (chantiers-perturbants).
//
//   npx.cmd tsx scripts/ingest/chantiers.ts
//   npx.cmd tsx scripts/ingest/chantiers.ts --dry-run   # counts what would change, writes nothing
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
// already hold its geometry. Re-running is safe, and since #244 it writes only what
// changed: worksites are upserted by their own identifier, a premise is written only when
// its nearest worksite or its distance changes, and worksites the batch no longer has are
// removed LAST, once no premise points at them. It used to `delete` the table first — and
// premise_location.nearest_chantier_id is `on delete set null`, so that delete rewrote every
// exposed premise once, and the attachment a second time.

import type { Client } from "pg"

import { checkColumns, differs, type Columns } from "./lib/columns"
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

/**
 * Every column the loader writes, in the order `stage` binds them. The only copy:
 * `checkColumns` holds it to the table before the load, and the upsert and its comparison are
 * built from it (#265).
 */
const COLUMNS = [
  "id", "arrondissement", "typologie", "objet", "description", "voie", "precision_localisation",
  "date_debut", "date_fin", "impact_circulation", "impact_circulation_detail",
  "niveau_perturbation", "statut", "statut_label", "maitre_ouvrage", "geom",
]

/**
 * Refuses an empty batch before anything is written. Worksites absent from the batch are
 * removed, so an empty one would clear every premise's exposure while recording a success.
 * An empty week is not impossible in principle, but none has been seen since the source was
 * first loaded on 25 August 2026, and a broken export is the likelier reading — a real empty
 * week can be loaded by hand once it is confirmed on the portal. CE QUE CETTE GARDE NE
 * RATTRAPE PAS : le lot APPAUVRI.
 */
function refuseLotVide(count: number): void {
  if (count > 0) return
  throw new Error(
    "chantier_perturbant : lot vide, chargement refusé avant tout écrit. Vérifier d'abord que " +
      "le jeu source porte encore les champs que scripts/ingest/chantiers.ts lit (identifiant, " +
      "statut, dates, une géométrie Polygon ou MultiPolygon).",
  )
}

/** Downloaded before the transaction opens: a slow mirror must not hold it open. */
async function fetchChantiers(): Promise<{ rows: Feature[]; skipped: number }> {
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
  return { rows, skipped }
}

/**
 * Stages the batch in `tmp_chantier`. No `on conflict do nothing`: a repeated identifiant
 * violates the primary key and fails the load loudly rather than letting the first copy win in
 * silence. Same choice as filosofi.ts (review of #245).
 */
async function stage(client: Client, columns: Columns, rows: Feature[]): Promise<void> {
  await client.query(`
    create temporary table tmp_chantier (
      id text primary key, arrondissement smallint, typologie smallint, objet text,
      description text, voie text, precision_localisation text, date_debut date, date_fin date,
      impact_circulation text, impact_circulation_detail text, niveau_perturbation smallint,
      statut smallint, statut_label text, maitre_ouvrage text,
      geom geography(MultiPolygon, 4326)
    ) on commit drop
  `)
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
      `insert into tmp_chantier (${columns.names.join(", ")}) values ${tuples.join(", ")}`,
      values,
    )
  }
}

/** Upserts the worksites that are new or changed. Removal of the absent ones waits for attach. */
async function upsert(client: Client, columns: Columns, dryRun: boolean): Promise<number> {
  if (dryRun) {
    const r = await client.query<{ n: string }>(`
      select count(*)::text as n
        from tmp_chantier t
        left join public.chantier_perturbant c on c.id = t.id
       where c.id is null or ${differs(columns, "c", "t")}
    `)
    return Number(r.rows[0].n)
  }
  const result = await client.query(`
    insert into public.chantier_perturbant as c (${columns.names.join(", ")})
    select ${columns.names.join(", ")} from tmp_chantier
    on conflict (id) do update
       set ${columns.names.filter((c) => c !== "id").map((c) => `${c} = excluded.${c}`).join(", ")}
     where ${differs(columns, "c", "excluded")}
  `)
  return result.rowCount ?? 0
}

/** What `attach` found, and how many premises it actually had to write. */
interface Attachment {
  exposed: number
  changed: number
}

async function attach(client: Client, dryRun: boolean): Promise<Attachment> {
  // Nearest chantier per premise, not every chantier within tolerance — the
  // many-to-many trap w0-plu found and fixed: matching every candidate within
  // tolerance rather than the single nearest one over-counts near a cluster of
  // sites. Going from the premise side (distinct on l.id) rather than the
  // chantier side sidesteps the fan-out that caused the PLU over-match in the
  // first place — each premise picks exactly one nearest worksite, never several.
  //
  // Searched among the batch's worksites only, never the whole table: the table still holds
  // the worksites this week dropped, which dropStale removes right after. Searched there, a
  // premise would keep pointing at a worksite about to go, and lose it to `on delete set null`
  // with no other candidate considered — the defect the review of #245 found in filosofi.ts.
  //
  // `c.id` last: a premise inside two overlapping worksites sits at 0 m from both, and without
  // it the pick follows the rows' physical order — which a VACUUM or an upsert changes, so an
  // unchanged feed would rewrite premises. The same tie, far more frequent, was found in
  // plu.ts on 10 October 2026.
  await client.query(
    `create temporary table tmp_chantier_attach on commit drop as
     select distinct on (l.id)
            l.id, c.id as chantier_id, ST_Distance(l.geom, c.geom) as distance_m
       from public.premise_location l
       join tmp_chantier c on ST_DWithin(l.geom, c.geom, $1)
      order by l.id, l.geom <-> c.geom, c.id`,
    [MATCH_TOLERANCE_M],
  )
  const exposed = await client.query<{ n: string }>(
    "select count(*)::text as n from tmp_chantier_attach",
  )

  // A premise with no worksite within tolerance appears on the left side only, and is
  // cleared only if it held one.
  const target = `(select p.id, a.chantier_id, a.distance_m
                     from public.premise_location p
                     left join tmp_chantier_attach a on a.id = p.id) t`
  const exposureDiffers = `t.id = l.id
       and (l.nearest_chantier_id, l.chantier_distance_m)
           is distinct from (t.chantier_id, t.distance_m)`
  const changed = dryRun
    ? Number(
        (await client.query<{ n: string }>(
          `select count(*)::text as n from public.premise_location l, ${target} where ${exposureDiffers}`,
        )).rows[0].n,
      )
    : ((await client.query(`
        update public.premise_location l
           set nearest_chantier_id = t.chantier_id,
               chantier_distance_m = t.distance_m
          from ${target}
         where ${exposureDiffers}
      `)).rowCount ?? 0)

  return { exposed: Number(exposed.rows[0].n), changed }
}

/** Worksites this week no longer has: removed after attach(), when no premise points at them. */
async function dropStale(client: Client, dryRun: boolean): Promise<number> {
  const gone = `from public.chantier_perturbant c
     where not exists (select 1 from tmp_chantier t where t.id = c.id)`
  if (dryRun) {
    const r = await client.query<{ n: string }>(`select count(*)::text as n ${gone}`)
    return Number(r.rows[0].n)
  }
  return (await client.query(`delete ${gone}`)).rowCount ?? 0
}

/**
 * Sentinel for --dry-run, as in terrasses.ts: the whole load runs inside the transaction and
 * is rolled back, every write to a real table replaced by the count it would have made — so
 * it leaves no dead row behind, whatever it finds.
 *
 * CE QUE ÇA NE RATTRAPE PAS : the real-table statements themselves never run in a dry run. It
 * proves what a load would change, not that the upsert, `update` and `delete` that would change
 * it are correct; a fault in one of them shows at the first real run, which rolls back and
 * turns the gate red. Proved on the remote on 11 October 2026: a real run (8 written, 5
 * removed, 358 premises, run 38141609039) then a dry run at 0 / 0 / 0 (#265).
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
  let written = 0
  let stale = 0
  let attached: Attachment = { exposed: 0, changed: 0 }
  try {
    const sourceAsOf = await datasetModified(DATASET)
    const { rows, skipped } = await fetchChantiers()
    refuseLotVide(rows.length)
    log(
      "chantiers perturbants",
      `${rows.length} lus${skipped ? `, ${skipped} ignorés (géométrie absente)` : ""}`,
    )
    const columns = await checkColumns(client, "chantier_perturbant", COLUMNS)

    await inTransaction(client, async () => {
      await stage(client, columns, rows)
      written = await upsert(client, columns, dryRun)
      attached = await attach(client, dryRun)
      stale = await dropStale(client, dryRun)
      if (dryRun) throw new DryRunComplete()
    })

    log("terminé")
    log("  chantiers écrits (nouveaux ou changés)", String(written))
    log("  chantiers retirés (absents du lot)", String(stale))
    log("  locaux exposés", String(attached.exposed))
    log("  locaux dont l'exposition a changé (écrits)", String(attached.changed))

    await recordRun(client, "chantiers", {
      rowCount: rows.length,
      sourceAsOf,
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    if (error instanceof DryRunComplete) {
      log("ESSAI — tout est annulé, rien n'est écrit")
      log("  chantiers à écrire", String(written))
      log("  chantiers à retirer", String(stale))
      log("  locaux exposés", String(attached.exposed))
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
