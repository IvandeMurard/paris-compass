// Terrasses et étalages autorisés — an authorisation on file, never a terrace installed
// today.
//
//   npx.cmd tsx scripts/ingest/terrasses.ts
//   npx.cmd tsx scripts/ingest/terrasses.ts --dry-run   # counts what would change, writes nothing
//
// "Pour un café, c'est binaire : une terrasse est-elle déjà autorisée sur cette façade ?"
// (w1-terrasses, PLAN-ACTION-VACANCE.md §5.4). Fait administratif, measured — never a CA
// terrasse deduced from an authorisation.
//
// Unlike PLU and chantiers, this is matched by ADDRESS, not by nearest point. Measured
// 25 August 2026 before writing the attachment: the nearest BDCom premise to a terrace
// point sits at a median of 4.4 m, tight enough to look safe — until a spot check of named
// terraces showed a third of them pointing at the wrong shop (a neighbouring premise a few
// metres closer). Street key plus house number, reusing the BODACC join
// (20260809000002_bodacc_address_matching.sql), is the same discipline this codebase
// already settled on for exactly this failure mode. See the migration header
// (20260825000009_terrasse_autorisation.sql) for the full measurement.
//
// The address parser itself lives in ./lib/terrasseAddress.ts, where a test can reach it:
// importing this file would run main().
//
// Run after scripts/ingest/geography.ts — premise_location.street_key needs the attachment
// geography.ts computes. Re-running is safe, and since #244 it writes only what changed: the
// batch is staged in a temporary table, the reference table loses the rows the batch no longer
// has and gains the ones it did not have, and a premise is written only when its terrace
// status changes. It used to `delete` the whole table, reinsert it, reset 23 610 premises to
// 'non' and attach them again — two versions of each of those premises per run, and `npm run
// disque` priced the 8 November 2026 reload at 455 MB against a 450 MB threshold.

import type { Client } from "pg"

import { assertPrivileged, connect, inTransaction, log, recordRun } from "./lib/db"
import { datasetModified, exportJson } from "./lib/parisOpendata"
import { parseAddress } from "./lib/terrasseAddress"

const DATASET = "terrasses-autorisations"

/**
 * The source's own vocabulary for `typologie` has no code table (unlike
 * chantiers-perturbants). Read from the linked paris.fr regulatory page instead
 * (measured 25 August 2026): "Les terrasses estivales sont autorisées pour 7 mois chaque
 * année, du 1er avril au 31 octobre" against "terrasse annuelle" for the year-round kind —
 * this project's "permanente" is the source's "annuelle". Never invented: ESTIVALE and
 * (É)TALAGE are substrings the source writes itself.
 */
function categorie(typologie: string | null): "permanente" | "estivale" | "etalage" | null {
  if (!typologie) return null
  const upper = typologie.toUpperCase()
  if (upper.includes("ESTIVALE")) return "estivale"
  if (upper.includes("TALAGE")) return "etalage"
  return "permanente"
}

interface Feature {
  geometry: { type: string; coordinates: unknown } | null
  properties: {
    typologie: string | null
    adresse: string | null
    arrondissement: string | null
    nom_enseigne: string | null
    nom_societe: string | null
    siret: string | null
    longueur: number | null
    largeur: number | null
    lien_affichette: string | null
  }
}

/** Every column the loader writes — `id` and the generated `street_key` excepted. */
const COLUMNS = [
  "typologie", "categorie", "adresse", "arrondissement", "nom_enseigne", "nom_societe", "siret",
  "longueur", "largeur", "lien_affichette", "house_number", "way_type", "way_name", "geom",
]

/**
 * What identifies a row: its whole content. The source publishes no identifier, so a row is
 * "the same" when every column is — the geometry compared as binary, never by the `=` of
 * geography, which compares bounding boxes. Identical rows do occur in a source like this one;
 * they are told apart by their rank (`rn`), so two copies in the batch keep two in the table.
 */
const ROW_KEY = `md5(row(typologie, categorie, adresse, arrondissement, nom_enseigne, nom_societe,
  siret, longueur, largeur, lien_affichette, house_number, way_type, way_name,
  ST_AsBinary(geom))::text)`

/**
 * Refuses an empty batch before anything is written. The table is now synchronised to the
 * batch, so an empty one would remove every authorisation and send every premise back to
 * 'non' while recording a success. CE QUE CETTE GARDE NE RATTRAPE PAS : le lot APPAUVRI — un
 * champ renommé à la source qui ferait tomber la moitié des lignes passerait ici sans un mot.
 */
function refuseLotVide(count: number): void {
  if (count > 0) return
  throw new Error(
    "terrasse_autorisation : lot vide, chargement refusé avant tout écrit. Vérifier d'abord que " +
      "le jeu source porte encore les champs que scripts/ingest/terrasses.ts lit (typologie, " +
      "adresse, arrondissement, une géométrie Point).",
  )
}

/** Downloaded before the transaction opens: a slow mirror must not hold it open. */
async function fetchTerrasses(): Promise<{ rows: Feature[]; skipped: number }> {
  const collection = await exportJson<{ features: Feature[] }>(DATASET, "geojson")
  let skipped = 0
  const rows = collection.features.filter((f) => {
    if (!categorie(f.properties.typologie)) {
      skipped += 1
      return false
    }
    return true
  })
  return { rows, skipped }
}

/**
 * Stages the batch in `tmp_terrasse_new` and ranks the table's current rows in
 * `tmp_terrasse_old`, both keyed by ROW_KEY and rank. Nothing outside the transaction's
 * temporary tables is written here.
 */
async function stage(client: Client, rows: Feature[]): Promise<void> {
  await client.query(`
    create temporary table tmp_terrasse_batch (
      typologie text, categorie text, adresse text, arrondissement smallint, nom_enseigne text,
      nom_societe text, siret text, longueur double precision, largeur double precision,
      lien_affichette text, house_number integer, way_type text, way_name text,
      geom geography(Point, 4326)
    ) on commit drop
  `)
  const chunk = 500
  for (let start = 0; start < rows.length; start += chunk) {
    const slice = rows.slice(start, start + chunk)
    const values: unknown[] = []
    const tuples = slice.map((f, i) => {
      const p = f.properties
      const parsed = parseAddress(p.adresse)
      const geom = f.geometry?.type === "Point" ? JSON.stringify(f.geometry) : null
      values.push(
        p.typologie,
        categorie(p.typologie),
        p.adresse,
        p.arrondissement ? Number(p.arrondissement) - 75000 : null,
        p.nom_enseigne,
        p.nom_societe,
        p.siret,
        p.longueur,
        p.largeur,
        p.lien_affichette,
        parsed?.houseNumber ?? null,
        parsed?.wayType ?? null,
        parsed?.wayName ?? null,
        geom,
      )
      const b = i * 14
      return (
        `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, ` +
        `$${b + 8}, $${b + 9}, $${b + 10}, $${b + 11}, $${b + 12}, $${b + 13}, ` +
        `ST_GeomFromGeoJSON($${b + 14})::geography)`
      )
    })
    await client.query(
      `insert into tmp_terrasse_batch (${COLUMNS.join(", ")}) values ${tuples.join(", ")}`,
      values,
    )
  }

  // The street key the real table would generate, computed with the same function, so the
  // attachment can read the batch rather than the table — a dry run then measures exactly what
  // a real run would attach.
  await client.query(`
    create temporary table tmp_terrasse_new on commit drop as
    select b.*, public.compass_bodacc_street_key(b.way_type, b.way_name) as street_key,
           row_number() over (partition by k) as rn
      from (select *, ${ROW_KEY} as k from tmp_terrasse_batch) b
  `)
  await client.query(`
    create temporary table tmp_terrasse_old on commit drop as
    select id, k, row_number() over (partition by k order by id) as rn
      from (select id, ${ROW_KEY} as k from public.terrasse_autorisation) a
  `)
}

/** The table brought to the batch: rows it no longer has removed, rows it lacked added. */
async function syncTable(client: Client, dryRun: boolean): Promise<{ removed: number; added: number }> {
  const gone = `from tmp_terrasse_old o
     where not exists (select 1 from tmp_terrasse_new n where n.k = o.k and n.rn = o.rn)`
  const fresh = `from tmp_terrasse_new n
     where not exists (select 1 from tmp_terrasse_old o where o.k = n.k and o.rn = n.rn)`
  if (dryRun) {
    const r = await client.query<{ removed: string; added: string }>(
      `select (select count(*) ${gone})::text as removed, (select count(*) ${fresh})::text as added`,
    )
    return { removed: Number(r.rows[0].removed), added: Number(r.rows[0].added) }
  }
  const removed = await client.query(
    `delete from public.terrasse_autorisation a
      where a.id in (select o.id ${gone})`,
  )
  const added = await client.query(
    `insert into public.terrasse_autorisation (${COLUMNS.join(", ")})
     select ${COLUMNS.map((c) => `n.${c}`).join(", ")} ${fresh}`,
  )
  return { removed: removed.rowCount ?? 0, added: added.rowCount ?? 0 }
}

/** What `attach` found, and how many premises it actually had to write. */
interface Attachment {
  oui: number
  inconnu: number
  changed: number
}

async function attach(client: Client, dryRun: boolean): Promise<Attachment> {
  // Every premise's status, computed from the batch: a premise with no authorisation at its
  // address is 'non' with all three flags false, so an authorisation that lapsed since the last
  // load is cleared by the same UPDATE that writes the new ones — no reset pass any more.
  await client.query(`
    create temporary table tmp_terrasse_attach on commit drop as
    with terrace_addr as (
      select street_key, house_number,
             bool_or(categorie = 'permanente') as has_permanente,
             bool_or(categorie = 'estivale')   as has_estivale,
             bool_or(categorie = 'etalage')    as has_etalage
        from tmp_terrasse_new
       where street_key is not null and house_number is not null
       group by street_key, house_number
    ),
    addr_premise_count as (
      select street_key, num, count(*) as n
        from public.premise_location
       where street_key is not null and num is not null
       group by street_key, num
    )
    select
      l.id,
      case when ta.street_key is null then 'non'
           when apc.n = 1 then 'oui'
           else 'inconnu'
      end as status,
      coalesce(ta.has_permanente, false) as has_permanente,
      coalesce(ta.has_estivale, false)   as has_estivale,
      coalesce(ta.has_etalage, false)    as has_etalage
      from public.premise_location l
      left join terrace_addr ta
        on ta.street_key = l.street_key and ta.house_number = l.num
      left join addr_premise_count apc
        on apc.street_key = l.street_key and apc.num = l.num
  `)

  const counts = await client.query<{ oui: string; inconnu: string }>(`
    select count(*) filter (where status = 'oui')::text as oui,
           count(*) filter (where status = 'inconnu')::text as inconnu
      from tmp_terrasse_attach
  `)

  const differs = `l.id = t.id
       and (l.terrasse_status, l.terrasse_permanente, l.terrasse_estivale, l.terrasse_etalage)
           is distinct from (t.status, t.has_permanente, t.has_estivale, t.has_etalage)`
  const changed = dryRun
    ? Number(
        (await client.query<{ n: string }>(
          `select count(*)::text as n from public.premise_location l, tmp_terrasse_attach t where ${differs}`,
        )).rows[0].n,
      )
    : ((await client.query(`
        update public.premise_location l
           set terrasse_status = t.status,
               terrasse_permanente = t.has_permanente,
               terrasse_estivale = t.has_estivale,
               terrasse_etalage = t.has_etalage
          from tmp_terrasse_attach t
         where ${differs}
      `)).rowCount ?? 0)

  return { oui: Number(counts.rows[0].oui), inconnu: Number(counts.rows[0].inconnu), changed }
}

/**
 * Sentinel for --dry-run, as in bdcom.ts: the whole load runs inside the transaction and is
 * rolled back. Unlike bdcom.ts, a dry run here writes nothing but temporary tables — every
 * write to a real table is replaced by the count it would have made — so it leaves no dead
 * row behind, whatever it finds.
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
  let table = { removed: 0, added: 0 }
  let attached: Attachment = { oui: 0, inconnu: 0, changed: 0 }
  try {
    const sourceAsOf = await datasetModified(DATASET)
    const { rows, skipped } = await fetchTerrasses()
    refuseLotVide(rows.length)
    log(
      "terrasses et étalages",
      `${rows.length} lus${skipped ? `, ${skipped} ignorés (aucune typologie)` : ""}`,
    )

    await inTransaction(client, async () => {
      await stage(client, rows)
      table = await syncTable(client, dryRun)
      attached = await attach(client, dryRun)
      if (dryRun) throw new DryRunComplete()
    })

    log("terminé")
    log("  autorisations retirées (absentes du lot)", String(table.removed))
    log("  autorisations ajoutées (absentes de la table)", String(table.added))
    log("  locaux 'oui' (adresse non partagée)", String(attached.oui))
    log("  locaux 'inconnu' (adresse partagée)", String(attached.inconnu))
    log("  locaux dont le statut a changé (écrits)", String(attached.changed))

    await recordRun(client, "terrasses", {
      rowCount: rows.length,
      sourceAsOf,
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    if (error instanceof DryRunComplete) {
      log("ESSAI — tout est annulé, rien n'est écrit")
      log("  autorisations à retirer", String(table.removed))
      log("  autorisations à ajouter", String(table.added))
      log("  locaux 'oui'", String(attached.oui))
      log("  locaux 'inconnu'", String(attached.inconnu))
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
