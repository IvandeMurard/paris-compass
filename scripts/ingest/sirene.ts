// SIRENE establishment geolocation, for the companies BODACC names in Paris.
//
//   npx.cmd tsx scripts/ingest/sirene.ts                 # resolve, load, confirm
//   npx.cmd tsx scripts/ingest/sirene.ts --dry-run       # load, measure the delta, roll back
//   npx.cmd tsx scripts/ingest/sirene.ts --confirm-only  # replay confirmation, no INSEE read
//
// Run after bodacc.ts: the SIREN to load are read from the notices already
// stored, and the confirmation step needs their addresses. A BODACC reload destroys the
// confirmations, which is why the daily job chains --confirm-only behind it.
//
// --dry-run exists because a change of vintage moves the confirmations, and the confirmations
// decide the `corrobore` level — the project's headline quality metric. Measuring the delta
// before committing it is cheaper than measuring it afterwards.
//
// Answers one question — does the company filing at this address actually have
// an establishment there — because that is the single largest quality lever
// measured on the base: every `probable` row in a chronology comes from BODACC
// publishing a registered office rather than an establishment.

import { writeFileSync, unlinkSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

import { DuckDBInstance } from "@duckdb/node-api"
import type { Client } from "pg"

import { assertPrivileged, connect, inTransaction, insertRows, log, recordRun } from "./lib/db"

/**
 * INSEE's geolocated establishment file, resolved from data.gouv.fr rather than pinned.
 *
 * It used to be pinned, for a good reason: "a silent change of vintage would move every
 * confirmation without anything saying so". That reasoning was right, and **its premise
 * changed**. There was then nowhere to record which vintage had been loaded, so pinning was
 * the only way to make a change deliberate. Since 20260825000001 there is such a place —
 * `ingestion_run.source_as_of`, which this loader writes and `compass_source_freshness()`
 * publishes. The change is no longer silent, so it no longer has to be prevented.
 *
 * And pinning had stopped working anyway. data.gouv.fr **replaces** the resource rather than
 * archiving it: measured 25 August 2026, the URL pinned on 21 July returned HTTP 404 and the
 * loader could not run at all. A pin on this dataset guarantees a breakage within the month —
 * it held from 15 July to 21 August. Issue #56.
 */
const DATASET =
  "https://www.data.gouv.fr/api/1/datasets/geolocalisation-des-etablissements-du-repertoire-sirene-pour-les-etudes-statistiques/"

/** Identifies this pipeline to data.gouv.fr, as the portal asks reusers to do. */
const USER_AGENT = "paris-compass ingestion (github.com/IvandeMurard/paris-compass)"

interface ResolvedParquet {
  url: string
  /** INSEE's own publication stamp, read from the URL. Becomes `source_as_of`. */
  asOf: string
}

/**
 * The parquet the dataset currently publishes, and the date it carries.
 *
 * Throws rather than falling back to a previous URL. A fallback would be the defect this whole
 * project is built against: the loader would appear to succeed, `last_success_at` would move,
 * and the data would be a vintage nobody chose. An unreachable portal is an outage, and an
 * outage must read as an outage.
 */
async function resolveParquet(): Promise<ResolvedParquet> {
  const response = await fetch(DATASET, { headers: { "User-Agent": USER_AGENT } })
  if (!response.ok) {
    throw new Error(
      `data.gouv.fr a répondu ${response.status} pour le jeu SIRENE géolocalisé. ` +
        `Sans lui, le millésime à charger est inconnu — et charger un millésime inconnu est ` +
        `exactement ce que ce chargeur refuse de faire.`,
    )
  }
  const payload = (await response.json()) as { resources?: { url?: string; title?: string }[] }
  const parquets = (payload.resources ?? []).filter((r) => /\.parquet$/.test(r.url ?? ""))

  // The dataset has held exactly one parquet on every look. More than one is not an error we
  // can resolve by guessing — picking "the newest" would be a choice this file is not entitled
  // to make silently, and the whole point of resolving is that the choice is recorded.
  if (parquets.length !== 1) {
    throw new Error(
      `Le jeu SIRENE publie ${parquets.length} ressources parquet, une seule était attendue. ` +
        `Choisir à l'aveugle reviendrait à charger un millésime que personne n'a désigné.`,
    )
  }

  const url = parquets[0].url as string
  const stamp = /\/(\d{8})-\d+\//.exec(url)?.[1]
  if (!stamp) {
    throw new Error(
      `L'URL du parquet ne porte pas de millésime lisible : ${url}. La date de la donnée serait ` +
        `inconnue, et un chiffre sans sa date n'est pas publié.`,
    )
  }
  return { url, asOf: `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}` }
}

/** Paris communes are 75101..75120. */
const PARIS_COMMUNE_PREFIX = "751"

/**
 * INSEE geocoding quality 11 = located to the exact street number, 98% of Paris
 * rows. Coarser codes place a point somewhere on the street or in the commune,
 * which cannot confirm an address and would manufacture confirmations.
 */
const EXACT_GEOCODING = "11"

/**
 * How close a SIRENE point must be to count as "the same address". The BODACC
 * point is borrowed from the BDCom premises at that number, and both sides are
 * geocoded to the number, so the gap is geocoding noise rather than distance.
 */
const SAME_ADDRESS_M = 50

async function sirenToResolve(client: Client): Promise<string[]> {
  const result = await client.query<{ siren: string }>(`
    select distinct a.siren
    from public.bodacc_establishment e
    join public.bodacc_announcement a on a.id = e.announcement_id
    where e.address_source = 'siege_social'
      and e.geom is not null
      and a.siren is not null and a.siren ~ '^[0-9]{9}$'
  `)
  return result.rows.map((r) => r.siren)
}

async function readFromInsee(parquetUrl: string, siren: string[]): Promise<[string, string, number, number, string][]> {
  const db = await DuckDBInstance.create(":memory:")
  const connection = await db.connect()
  await connection.run("install httpfs; load httpfs;")

  // The SIREN list goes through a file rather than a literal IN (…) of 38 000
  // values: DuckDB hash-joins it against the scan, and a statement that size is
  // neither readable nor reliably parsed. A file rather than the appender API
  // because reading a CSV is a stable contract across DuckDB versions.
  const listPath = join(tmpdir(), `compass-siren-${process.pid}.csv`)
  writeFileSync(listPath, `siren\n${siren.join("\n")}\n`, "utf8")

  const reader = await connection.runAndReadAll(`
    with wanted as (
      select siren from read_csv('${listPath.replace(/\\/g, "/")}',
                                 columns = {'siren': 'VARCHAR'}, header = true)
    )
    select e.siret,
           substr(e.siret, 1, 9) as siren,
           e.x_longitude,
           e.y_latitude,
           e.qualite_xy
    from read_parquet('${parquetUrl}') e
    join wanted w on w.siren = substr(e.siret, 1, 9)
    where e.plg_code_commune like '${PARIS_COMMUNE_PREFIX}%'
      and e.qualite_xy = '${EXACT_GEOCODING}'
      and e.x_longitude is not null and e.y_latitude is not null
  `)

  const rows = reader.getRows().map((row): [string, string, number, number, string] => [
    String(row[0]),
    String(row[1]),
    Number(row[2]),
    Number(row[3]),
    String(row[4]),
  ])
  unlinkSync(listPath)
  return rows
}

/**
 * Marks a notice as operator-confirmed when its company has an establishment
 * within reach. False is a real finding — the company files here but operates
 * elsewhere — while null stays null: absence from the slice we loaded is not
 * evidence of absence from Paris.
 */
async function confirm(client: Client): Promise<void> {
  const result = await client.query(
    `
    update public.bodacc_establishment e
       set operator_confirmed = exists (
             select 1 from public.sirene_establishment s
             where s.siren = a.siren
               and ST_DWithin(s.geom, e.geom, $1)
           )
      from public.bodacc_announcement a
     where a.id = e.announcement_id
       and e.address_source = 'siege_social'
       and e.geom is not null
       and a.siren is not null
       and exists (select 1 from public.sirene_establishment s where s.siren = a.siren)
    `,
    [SAME_ADDRESS_M],
  )
  log("  confirmation", `${result.rowCount} avis évalués`)
}

/**
 * Replays the confirmation step alone, without re-reading INSEE.
 *
 * Needed because bodacc.ts rebuilds bodacc_announcement wholesale, which cascades to
 * bodacc_establishment and takes `operator_confirmed` with it. **A BODACC reload therefore
 * destroys every SIRENE confirmation**, and nothing said so: measured 25 August, the
 * evaluation gate fell from 3 147 `corrobore` levels to zero — 5.92 points of the
 * established+corroborated composition, which is the project's headline quality metric.
 *
 * That is why the daily BODACC job chains this step. Confirmation reads only
 * sirene_establishment, which a BODACC reload does not touch, so there is no reason to re-read
 * the several hundred megabytes of INSEE parquet to rebuild it — which is fortunate, since the
 * pinned URL now answers 404 (#56) and the confirmations would otherwise be unrecoverable.
 *
 *   npx tsx scripts/ingest/sirene.ts --confirm-only
 */
async function confirmOnly(): Promise<void> {
  assertPrivileged()
  const client = await connect()
  try {
    const held = await client.query<{ n: string }>(
      "select count(*)::text as n from public.sirene_establishment",
    )
    if (Number(held.rows[0]?.n ?? 0) === 0) {
      throw new Error(
        "sirene_establishment est vide : il n'y a rien avec quoi confirmer. Lancer le " +
          "chargement complet — mais voir #56, l'URL du parquet épinglée rend 404.",
      )
    }
    log("confirmation seule", `${held.rows[0].n} établissements SIRENE en base`)
    await inTransaction(client, () => confirm(client))

    const after = await client.query<{ label: string; n: string }>(`
      select 'avis confirmés sur place' as label, count(*)::text as n
        from public.bodacc_establishment where operator_confirmed
      union all select 'avis infirmés', count(*)::text
        from public.bodacc_establishment where operator_confirmed = false
    `)
    for (const row of after.rows) log(`  ${row.label}`, row.n)
  } finally {
    await client.end()
  }
}

/** Sentinel: rolls the trial transaction back through inTransaction's catch, then exits 0. */
class DryRunComplete extends Error {}

async function main(): Promise<void> {
  if (process.argv.includes("--confirm-only")) {
    await confirmOnly()
    return
  }

  // --dry-run charge, mesure, puis annule. Écrit pour ne plus avoir à choisir entre « lancer
  // pour savoir » et « ne pas savoir » : un changement de millésime déplace les confirmations,
  // donc le niveau `corrobore`, donc la composition de fiabilité — la métrique de qualité du
  // projet. Ce mode donne l'écart exact avant de le commettre.
  const dryRun = process.argv.includes("--dry-run")

  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  try {
    const parquet = await resolveParquet()
    const previous = await client.query<{ as_of: string | null }>(
      "select source_as_of as as_of from public.ingestion_run where source = 'sirene'",
    )
    const held = previous.rows[0]?.as_of ?? null
    log("millésime publié", `${parquet.asOf}${held ? ` — en base : ${held}` : " — rien en base"}`)
    if (held && held !== parquet.asOf) {
      // Loud on purpose. This is the moment the pin used to prevent, and the point of removing
      // it is that the moment is announced and recorded, not that it stops happening.
      log("CHANGEMENT DE MILLÉSIME", `${held} -> ${parquet.asOf} — les confirmations vont bouger`)
    }

    const siren = await sirenToResolve(client)
    log("SIREN à résoudre", `${siren.length}`)

    log("lecture INSEE", "parquet distant, filtré à Paris — comptez quelques minutes")
    const started = Date.now()
    const rows = await readFromInsee(parquet.url, siren)
    log("  lu", `${rows.length} établissements en ${((Date.now() - started) / 1000).toFixed(0)}s`)

    const countConfirmations = async () =>
      (
        await client.query<{ confirmes: string; infirmes: string; total: string }>(`
          select (select count(*)::text from public.bodacc_establishment where operator_confirmed) as confirmes,
                 (select count(*)::text from public.bodacc_establishment where operator_confirmed = false) as infirmes,
                 (select count(*)::text from public.sirene_establishment) as total
        `)
      ).rows[0]

    const before = await countConfirmations()

    await inTransaction(client, async () => {
      await client.query("delete from public.sirene_establishment")
      // Written through a staging select so the geography cast happens once, in
      // SQL, rather than per row in the client.
      await client.query(`
        create temporary table stg_sirene (
          siret text, siren text, lon double precision, lat double precision, quality text
        ) on commit drop
      `)
      await insertRows(client, "stg_sirene", ["siret", "siren", "lon", "lat", "quality"], rows)
      await client.query(`
        insert into public.sirene_establishment (siret, siren, geom, geocoding_quality)
        select siret, siren, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, quality
        from stg_sirene
        on conflict (siret) do nothing
      `)
      await confirm(client)

      // Measured here, *inside* the transaction, and this placement is the whole mechanism:
      // inTransaction commits when its callback returns, so anything after it would already be
      // committed. Throwing from within is what rolls the work back.
      if (dryRun) {
        const after = await countConfirmations()
        const delta = (a: string, b: string) => {
          const d = Number(b) - Number(a)
          return `${a} -> ${b} (${d >= 0 ? "+" : ""}${d})`
        }
        log("ESSAI — rien ne sera commis")
        log("  établissements SIRENE", delta(before.total, after.total))
        log("  avis confirmés", delta(before.confirmes, after.confirmes))
        log("  avis infirmés", delta(before.infirmes, after.infirmes))
        log("  millésime", `${held ?? "aucun"} -> ${parquet.asOf}`)
        throw new DryRunComplete()
      }
    })

    const summary = await client.query<{ label: string; n: string }>(`
      select 'établissements SIRENE'        as label, count(*)::text as n from public.sirene_establishment
      union all select 'entreprises couvertes',       count(distinct siren)::text from public.sirene_establishment
      union all select 'avis confirmés sur place',    count(*)::text from public.bodacc_establishment where operator_confirmed
      union all select 'avis infirmés',               count(*)::text from public.bodacc_establishment where operator_confirmed = false
      union all select 'avis non vérifiables',        count(*)::text from public.bodacc_establishment
                                                      where address_source = 'siege_social' and geom is not null
                                                        and operator_confirmed is null
    `)
    log("terminé")
    for (const row of summary.rows) log(`  ${row.label}`, row.n)

    // The vintage actually loaded, read from the URL that was actually used. This is the
    // column that makes a change of vintage visible instead of hiding it — the objection that
    // once justified pinning, answered by recording rather than by prevention.
    const counted = await client.query<{ n: string }>(
      "select count(*)::text as n from public.sirene_establishment",
    )
    await recordRun(client, "sirene", {
      rowCount: Number(counted.rows[0]?.n ?? 0),
      sourceAsOf: parquet.asOf,
      durationMs: Date.now() - startedAt,
    })
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  if (error instanceof DryRunComplete) {
    log("essai terminé", "transaction annulée, base inchangée")
    return
  }
  log("ÉCHEC", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
