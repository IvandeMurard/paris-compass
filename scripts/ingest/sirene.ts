// SIRENE establishment geolocation, for the companies BODACC names in Paris.
//
//   npx.cmd tsx scripts/ingest/sirene.ts
//
// Run after bodacc.ts: the SIREN to load are read from the notices already
// stored, and the confirmation step needs their addresses.
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

import { connect, inTransaction, insertRows, log } from "./lib/db"

/**
 * INSEE's geolocated establishment file, republished monthly on data.gouv.fr.
 * Pinned rather than resolved dynamically: a silent change of vintage would move
 * every confirmation without anything saying so. Bump it deliberately, and
 * expect the eval baselines to move with it.
 */
const PARQUET =
  "https://static.data.gouv.fr/resources/geolocalisation-des-etablissements-du-repertoire-sirene-pour-les-etudes-statistiques/20260721-131144/geoloc-geolocalisationetablissement-sirene-pour-etudes-statistiques-parquet.parquet"

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

async function readFromInsee(siren: string[]): Promise<[string, string, number, number, string][]> {
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
    from read_parquet('${PARQUET}') e
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

async function main(): Promise<void> {
  const client = await connect()
  try {
    const siren = await sirenToResolve(client)
    log("SIREN à résoudre", `${siren.length}`)

    log("lecture INSEE", "parquet distant, filtré à Paris — comptez quelques minutes")
    const started = Date.now()
    const rows = await readFromInsee(siren)
    log("  lu", `${rows.length} établissements en ${((Date.now() - started) / 1000).toFixed(0)}s`)

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
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  log("ÉCHEC", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
