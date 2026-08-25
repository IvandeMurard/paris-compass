// Terrasses et étalages autorisés — an authorisation on file, never a terrace installed
// today.
//
//   npx.cmd tsx scripts/ingest/terrasses.ts
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
// Run after scripts/ingest/geography.ts — premise_location.street_key needs the attachment
// geography.ts computes. Re-running is safe: the reference table is rebuilt and the
// attachment recomputed from scratch, exactly like plu.ts and chantiers.ts.

import type { Client } from "pg"

import { assertPrivileged, connect, inTransaction, log, recordRun } from "./lib/db"
import { datasetModified, exportJson } from "./lib/parisOpendata"

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

interface ParsedAddress {
  houseNumber: number
  wayType: string
  wayName: string
}

/**
 * The source gives one free-text address ("125 AVENUE DE CHOISY"), unlike BODACC's
 * already-split numeroVoie/typeVoie/nomVoie. Measured 25 August 2026 against the full
 * export: this pattern parses 24 145 of 24 204 addresses (99.8 %); the remainder are
 * addresses with no house number at all ("RUE FERDINAND DUVAL"), source-side garbage (an
 * email address in the field), or a handful of malformed suffixes ("1P2 PLACE…"). Left
 * unparsed rather than guessed at — they simply attach to nothing.
 */
function parseAddress(raw: string | null): ParsedAddress | null {
  if (!raw) return null
  const trimmed = raw.trim().toUpperCase()
  const match = /^(\d+)\s*[A-Z]?(?:\s*(?:BIS|TER|QUATER)\b)?(?:\s*[/-]\s*\d+\s*[A-Z]?)?\s+(\S+)\s+(.+)$/.exec(
    trimmed,
  )
  if (!match) return null
  return { houseNumber: Number(match[1]), wayType: match[2], wayName: match[3] }
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

async function loadTerrasses(client: Client): Promise<number> {
  const collection = await exportJson<{ features: Feature[] }>(DATASET, "geojson")
  let skipped = 0
  const rows = collection.features.filter((f) => {
    if (!categorie(f.properties.typologie)) {
      skipped += 1
      return false
    }
    return true
  })

  await client.query("delete from public.terrasse_autorisation")
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
      `insert into public.terrasse_autorisation
         (typologie, categorie, adresse, arrondissement, nom_enseigne, nom_societe, siret,
          longueur, largeur, lien_affichette, house_number, way_type, way_name, geom)
       values ${tuples.join(", ")}`,
      values,
    )
  }
  log(
    "terrasses et étalages",
    `${rows.length} chargés${skipped ? `, ${skipped} ignorés (aucune typologie)` : ""}`,
  )
  return rows.length
}

async function attach(client: Client): Promise<{ oui: number; inconnu: number }> {
  // Reset first, exactly like plu.ts and chantiers.ts: an authorisation that has lapsed
  // since the last load must not leave a stale 'oui' or 'inconnu' behind.
  await client.query(`
    update public.premise_location
       set terrasse_status = 'non',
           terrasse_permanente = false,
           terrasse_estivale = false,
           terrasse_etalage = false
     where terrasse_status <> 'non'
  `)

  const result = await client.query<{ status: string; n: string }>(`
    with terrace_addr as (
      select street_key, house_number,
             bool_or(categorie = 'permanente') as has_permanente,
             bool_or(categorie = 'estivale')   as has_estivale,
             bool_or(categorie = 'etalage')    as has_etalage
        from public.terrasse_autorisation
       where street_key is not null and house_number is not null
       group by street_key, house_number
    ),
    addr_premise_count as (
      select street_key, num, count(*) as n
        from public.premise_location
       where street_key is not null and num is not null
       group by street_key, num
    ),
    matched as (
      select
        l.id as location_id,
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
       where ta.street_key is not null
    )
    update public.premise_location l
       set terrasse_status = m.status,
           terrasse_permanente = m.has_permanente,
           terrasse_estivale = m.has_estivale,
           terrasse_etalage = m.has_etalage
      from matched m
     where l.id = m.location_id
    returning m.status
  `)

  const byStatus = { oui: 0, inconnu: 0 }
  for (const row of result.rows) {
    if (row.status === "oui" || row.status === "inconnu") byStatus[row.status] += 1
  }
  log(
    "rattachement",
    `${byStatus.oui} locaux à 'oui' (adresse non partagée), ${byStatus.inconnu} à 'inconnu' (adresse partagée)`,
  )
  return byStatus
}

async function main(): Promise<void> {
  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  try {
    const sourceAsOf = await datasetModified(DATASET)

    let loaded = 0
    let attached = { oui: 0, inconnu: 0 }
    await inTransaction(client, async () => {
      loaded = await loadTerrasses(client)
      attached = await attach(client)
    })

    log("terminé")
    log("  locaux 'oui'", String(attached.oui))
    log("  locaux 'inconnu'", String(attached.inconnu))

    await recordRun(client, "terrasses", {
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
