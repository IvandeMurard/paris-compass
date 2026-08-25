// SIRENE stock: creation and closure dates, for the survival curves of w1-survie (#14).
//
//   npx.cmd tsx scripts/ingest/sirene-stock.ts            # resolve, load, attach
//   npx.cmd tsx scripts/ingest/sirene-stock.ts --dry-run  # load, measure, roll back
//
// Not to be confused with sirene.ts, which loads the *geolocated* slice — SIRET and a point,
// no dates, no state (20260809000006). That slice answers "is this company here"; this one
// answers "when did it open, and had it closed by now". They are two files of the same
// producer, and w1-survie needs the second one the ticket says does not exist.
//
// Run after geography.ts and bdcom.ts: the quartier attachment reads
// premise_location.street_key, which geography.ts computes.

import { DuckDBInstance } from "@duckdb/node-api"
import type { Client } from "pg"

import { assertPrivileged, connect, inTransaction, insertRows, log, recordRun } from "./lib/db"

const DATASET =
  "https://www.data.gouv.fr/api/1/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/"

/** Identifies this pipeline to data.gouv.fr, as the portal asks reusers to do. */
const USER_AGENT = "paris-compass ingestion (github.com/IvandeMurard/paris-compass)"

/** Paris communes are 75101..75120. */
const PARIS_COMMUNE_PREFIX = "751"

/**
 * NAF divisions kept, and why these five.
 *
 * The stock holds 3 759 919 Paris establishments of all kinds — head offices, consultancies,
 * holding companies, one-person businesses registered at a flat. Loading all of them would
 * put the survival denominator on a population that has nothing to do with a shopfront, which
 * is the comparison this whole product refuses to make.
 *
 * These five are the street-level trades, the closest NAF equivalent of BDCom's retail scope:
 *   45  automobile and motorcycle trade and repair
 *   47  retail trade
 *   56  food and beverage service
 *   95  repair of computers and personal goods
 *   96  other personal services (hairdressing, laundry, beauty)
 *
 * Measured 25 August 2026 on the parquet: 371 511 rows after this filter plus diffusibility
 * and a usable address, against 3 255 080 addressable Paris rows without it.
 *
 * This is an editorial choice and it is written here rather than hidden in a WHERE clause:
 * a trade absent from this list is absent from every survival figure the product can serve.
 */
const STREET_LEVEL_NAF = ["45", "47", "56", "95", "96"]

interface ResolvedParquet {
  url: string
  /** INSEE's own publication stamp, read from the URL. Becomes `source_as_of`. */
  asOf: string
}

/**
 * The StockEtablissement parquet the dataset currently publishes, and the date it carries.
 *
 * Same refusal to fall back as sirene.ts: an unreachable portal is an outage, and an outage
 * must read as an outage rather than as a successful load of a vintage nobody chose.
 *
 * One difference, and it is the trap of this dataset. sirene.ts requires *exactly one*
 * parquet and throws otherwise; this dataset publishes **six** — StockUniteLegale,
 * StockEtablissement, StockEtablissementHistorique, StockUniteLegaleHistorique,
 * StockEtablissementLiensSuccession, StockDoublons. So the selection is by name, and it still
 * throws when the name does not resolve to exactly one: picking "the newest" or "the biggest"
 * would be a choice this file is not entitled to make silently, which is the whole reason
 * sirene.ts refuses to guess in the first place.
 */
async function resolveParquet(): Promise<ResolvedParquet> {
  const response = await fetch(DATASET, { headers: { "User-Agent": USER_AGENT } })
  if (!response.ok) {
    throw new Error(
      `data.gouv.fr a répondu ${response.status} pour le jeu SIRENE stock. Sans lui, le ` +
        `millésime à charger est inconnu — et charger un millésime inconnu est exactement ce ` +
        `que ce chargeur refuse de faire.`,
    )
  }
  const payload = (await response.json()) as { resources?: { url?: string; title?: string }[] }

  // `Historique` is excluded explicitly rather than by relying on the title being an exact
  // match: "StockEtablissementHistorique" contains "StockEtablissement" as a substring, and a
  // naive filter would resolve to two resources and throw on every run.
  const wanted = (payload.resources ?? []).filter(
    (r) =>
      /\.parquet$/.test(r.url ?? "") &&
      /StockEtablissement\b/i.test(r.title ?? "") &&
      !/Historique|LiensSuccession/i.test(r.title ?? ""),
  )

  if (wanted.length !== 1) {
    throw new Error(
      `Le jeu SIRENE publie ${wanted.length} ressources parquet nommées StockEtablissement, ` +
        `une seule était attendue. Choisir à l'aveugle reviendrait à charger un fichier que ` +
        `personne n'a désigné.`,
    )
  }

  const url = wanted[0].url as string
  const stamp = /\/(\d{8})-\d+\//.exec(url)?.[1]
  if (!stamp) {
    throw new Error(
      `L'URL du parquet ne porte pas de millésime lisible : ${url}. La date de la donnée ` +
        `serait inconnue, et un chiffre sans sa date n'est pas publié.`,
    )
  }
  return { url, asOf: `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}` }
}

type StockRow = [
  string, // siret
  string, // siren
  string | null, // date_creation
  string, // etat_administratif
  string | null, // date_debut
  string | null, // activite_naf
  string | null, // enseigne
  string | null, // denomination
  number | null, // house_number
  string | null, // way_type
  string | null, // way_name
  string | null, // code_postal
]

/**
 * Reads the Paris street-level slice out of the remote parquet.
 *
 * DuckDB pushes the commune and NAF predicates into the parquet's row groups, so this reads a
 * fraction of the 2.2 GB rather than all of it — measured at 10 s over the network on
 * 25 August 2026, against several minutes for the geolocated file sirene.ts scans.
 *
 * `try_cast` on the house number rather than a plain cast: INSEE publishes it as text and a
 * handful of Paris rows carry things a number cannot hold. A row whose number does not parse
 * keeps its address and simply attaches to nothing, which is the same treatment terrasses.ts
 * gives its 59 unparsed addresses — left unattached rather than guessed at.
 */
async function readFromInsee(parquetUrl: string): Promise<StockRow[]> {
  const db = await DuckDBInstance.create(":memory:")
  const connection = await db.connect()
  await connection.run("install httpfs; load httpfs;")

  const nafList = STREET_LEVEL_NAF.map((d) => `'${d}'`).join(", ")
  const reader = await connection.runAndReadAll(`
    select e.siret,
           substr(e.siret, 1, 9)                        as siren,
           e.dateCreationEtablissement                  as date_creation,
           e.etatAdministratifEtablissement             as etat_administratif,
           e.dateDebut                                  as date_debut,
           e.activitePrincipaleEtablissement            as activite_naf,
           e.enseigne1Etablissement                     as enseigne,
           e.denominationUsuelleEtablissement           as denomination,
           try_cast(e.numeroVoieEtablissement as integer) as house_number,
           e.typeVoieEtablissement                      as way_type,
           e.libelleVoieEtablissement                   as way_name,
           e.codePostalEtablissement                    as code_postal
    from read_parquet('${parquetUrl}') e
    where e.codeCommuneEtablissement like '${PARIS_COMMUNE_PREFIX}%'
      -- Non-diffusible rows have their address masked by INSEE, so they can never be
      -- attached to a quartier. Keeping them would inflate the Paris denominator with rows
      -- that are structurally absent from every quartier numerator.
      and e.statutDiffusionEtablissement = 'O'
      and e.etatAdministratifEtablissement in ('A', 'F')
      and substr(e.activitePrincipaleEtablissement, 1, 2) in (${nafList})
      and e.libelleVoieEtablissement is not null
      and e.numeroVoieEtablissement is not null
  `)

  return reader.getRows().map(
    (row): StockRow => [
      String(row[0]),
      String(row[1]),
      row[2] === null ? null : String(row[2]),
      String(row[3]),
      row[4] === null ? null : String(row[4]),
      row[5] === null ? null : String(row[5]),
      row[6] === null ? null : String(row[6]),
      row[7] === null ? null : String(row[7]),
      row[8] === null ? null : Number(row[8]),
      row[9] === null ? null : String(row[9]),
      row[10] === null ? null : String(row[10]),
      row[11] === null ? null : String(row[11]),
    ],
  )
}

/**
 * Attaches each establishment to the quartier of its address.
 *
 * By address, never by distance, and never to a premise. The full reasoning is in the
 * migration header (20260825000011): an address determines its quartier however many premises
 * stand at it, so this is a fact; a location_id would be a guess, and 69 % of BDCom premises
 * share their street number.
 */
async function attach(client: Client): Promise<{ attached: number; total: number }> {
  const result = await client.query(`
    update public.sirene_etablissement_stock s
       set quartier_id = q.quartier_id
      from (
        select street_key, num, min(quartier_id) as quartier_id
          from public.premise_location
         where street_key is not null and num is not null and quartier_id is not null
         group by street_key, num
      ) q
     where q.street_key = s.street_key and q.num = s.house_number
  `)
  const total = await client.query<{ n: string }>(
    "select count(*)::text as n from public.sirene_etablissement_stock",
  )
  return { attached: result.rowCount ?? 0, total: Number(total.rows[0]?.n ?? 0) }
}

/** Sentinel: rolls the trial transaction back through inTransaction's catch, then exits 0. */
class DryRunComplete extends Error {}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run")

  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  try {
    const parquet = await resolveParquet()
    const previous = await client.query<{ as_of: string | null }>(
      "select source_as_of as as_of from public.ingestion_run where source = 'sirene_stock'",
    )
    const held = previous.rows[0]?.as_of ?? null
    log("millésime publié", `${parquet.asOf}${held ? ` — en base : ${held}` : " — rien en base"}`)
    if (held && held !== parquet.asOf) {
      log("CHANGEMENT DE MILLÉSIME", `${held} -> ${parquet.asOf} — les cohortes vont bouger`)
    }

    log("lecture INSEE", "parquet distant, filtré à Paris et aux métiers de pied de rue")
    const started = Date.now()
    const rows = await readFromInsee(parquet.url)
    log("  lu", `${rows.length} établissements en ${((Date.now() - started) / 1000).toFixed(0)}s`)

    let attached = { attached: 0, total: 0 }
    await inTransaction(client, async () => {
      await client.query("delete from public.sirene_etablissement_stock")
      await insertRows(
        client,
        "public.sirene_etablissement_stock",
        [
          "siret",
          "siren",
          "date_creation",
          "etat_administratif",
          "date_debut",
          "activite_naf",
          "enseigne",
          "denomination",
          "house_number",
          "way_type",
          "way_name",
          "code_postal",
        ],
        rows,
        "on conflict (siret) do nothing",
      )
      attached = await attach(client)

      // Measured inside the transaction, like sirene.ts --dry-run: inTransaction commits when
      // its callback returns, so throwing from within is what rolls the work back.
      if (dryRun) {
        log("ESSAI — rien ne sera commis")
        log("  établissements", `${attached.total}`)
        log("  rattachés à un quartier", `${attached.attached}`)
        log("  millésime", `${held ?? "aucun"} -> ${parquet.asOf}`)
        throw new DryRunComplete()
      }
    })

    const summary = await client.query<{ label: string; n: string }>(`
      select 'établissements chargés'        as label, count(*)::text as n
        from public.sirene_etablissement_stock
      union all select 'rattachés à un quartier', count(*)::text
        from public.sirene_etablissement_stock where quartier_id is not null
      union all select 'actifs',                 count(*)::text
        from public.sirene_etablissement_stock where etat_administratif = 'A'
      union all select 'fermés, date connue',    count(*)::text
        from public.sirene_etablissement_stock where date_fermeture is not null
      union all select 'sans date de création',  count(*)::text
        from public.sirene_etablissement_stock where date_creation is null
    `)
    log("terminé")
    for (const row of summary.rows) log(`  ${row.label}`, row.n)

    await recordRun(client, "sirene_stock", {
      rowCount: attached.total,
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
