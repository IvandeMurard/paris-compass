// Meublés touristiques déclarés — registre des autorisations de changement d'usage
// (registre-des-autorisations-de-changement-dusage-pour-les-meubles).
//
//   npx.cmd tsx scripts/ingest/meubles.ts
//
// Densité d'autorisations DÉCLARÉES, jamais un taux Airbnb réel (w4-meubles, PLAN-ACTION-
// VACANCE.md doctrine) : le registre ne connaît que ce qui a été autorisé. Voir la migration
// 20260908000002 pour le raisonnement complet — endpoint choisi, ce que "millésime" veut dire
// ici, et pourquoi rien n'est rattaché à premise_location.
//
// Registered as the tenth ingestion source by 20260910000002, wired into
// .github/workflows/ingestion.yml (annual cron, 20 June) in the same window — the enum value,
// the ingestion_run row, the cron entry and this loader's first run, together, per #70's rule
// (docs/REPRISE-PIEGES.md).

import type { Client } from "pg"

import { assertPrivileged, connect, inTransaction, log, recordRun } from "./lib/db"
import { datasetModified, exportJson } from "./lib/parisOpendata"

const DATASET = "registre-des-autorisations-de-changement-dusage-pour-les-meubles"

/**
 * The source carries no primary key of its own; `commentaire` packs one anyway, verified
 * against all 265 rows on 8 September 2026 (three paginated reads, zero mismatches):
 * "n°NNNNNN - JJ/MM/AAAA". Anything that does not match is skipped rather than guessed at —
 * the same discipline chantiers.ts applies to a row with no geometry.
 */
const COMMENTAIRE_RE = /^n°(\d+)\s*-\s*(\d{2})\/(\d{2})\/(\d{4})$/

interface Feature {
  geometry: { type: string; coordinates: unknown } | null
  properties: {
    annee: string
    adresse: string
    arrondissement: string | null
    nb_de_decisions: number
    nb_de_logements: number | null
    commentaire: string | null
  }
}

interface Row {
  decisionNumber: number
  decisionDate: string
  annee: number
  adresse: string
  arrondissement: number | null
  nbDecisions: number
  nbLogements: number | null
  geometry: Feature["geometry"]
}

/**
 * A DELETE THAT IS NEVER FOLLOWED BY AN INSERT IS THE FAILURE MODE THIS GUARD REFUSES — the
 * same discipline scripts/ingest/idfm.ts applies after the review of #97 found it missing
 * there. This table is rebuilt wholesale (delete then reinsert) on every run; on an empty
 * batch the delete would still run while the insert loop never turned, silently emptying the
 * table and recording a success. CE QUE CETTE GARDE NE RATTRAPE PAS : elle refuse le lot VIDE,
 * jamais le lot APPAUVRI — un jeu source retombé de 265 à 12 lignes passerait ici sans un mot.
 * C'est pourquoi le livrable de ce ticket est l'invariant miroir d'eval/invariants.sql, pas ce
 * `throw` : il rougit sur une table vide quel qu'en soit le chemin, y compris un `delete` fait
 * à la main sur le distant que ce fichier ne verra jamais passer.
 */
function refuseLotVide(count: number): void {
  if (count > 0) return
  throw new Error(
    "meuble_autorisation : lot vide, chargement refusé avant le delete. Vérifier d'abord que " +
      "le jeu source porte encore les champs que scripts/ingest/meubles.ts lit (annee, adresse, " +
      "arrondissement, nb_de_decisions, nb_de_logements, commentaire, une géométrie Point).",
  )
}

async function loadMeubles(client: Client): Promise<number> {
  const collection = await exportJson<{ features: Feature[] }>(DATASET, "geojson")
  let skipped = 0
  const rows: Row[] = []
  for (const f of collection.features) {
    const p = f.properties
    const match = p.commentaire ? COMMENTAIRE_RE.exec(p.commentaire) : null
    if (!match || f.geometry?.type !== "Point") {
      skipped += 1
      continue
    }
    const [, decisionNumber, day, month, year] = match
    rows.push({
      decisionNumber: Number(decisionNumber),
      decisionDate: `${year}-${month}-${day}`,
      annee: Number(p.annee),
      adresse: p.adresse,
      arrondissement: p.arrondissement ? Number(p.arrondissement) - 75000 : null,
      nbDecisions: p.nb_de_decisions,
      nbLogements: p.nb_de_logements,
      geometry: f.geometry,
    })
  }

  refuseLotVide(rows.length)

  await client.query("delete from public.meuble_autorisation")
  const chunk = 500
  for (let start = 0; start < rows.length; start += chunk) {
    const slice = rows.slice(start, start + chunk)
    const values: unknown[] = []
    const tuples = slice.map((r, i) => {
      values.push(
        r.decisionNumber,
        r.decisionDate,
        r.annee,
        r.adresse,
        r.arrondissement,
        r.nbDecisions,
        r.nbLogements,
        JSON.stringify(r.geometry),
      )
      const b = i * 8
      return (
        `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, ` +
        `ST_GeomFromGeoJSON($${b + 8})::geography)`
      )
    })
    await client.query(
      `insert into public.meuble_autorisation
         (decision_number, decision_date, annee, adresse, arrondissement, nb_decisions,
          nb_logements, geom)
       values ${tuples.join(", ")}
       on conflict (decision_number) do nothing`,
      values,
    )
  }
  log(
    "meublés touristiques",
    `${rows.length} chargés${skipped ? `, ${skipped} ignorés (commentaire imprévisible ou géométrie absente)` : ""}`,
  )
  return rows.length
}

async function main(): Promise<void> {
  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  try {
    const sourceAsOf = await datasetModified(DATASET)

    let loaded = 0
    await inTransaction(client, async () => {
      loaded = await loadMeubles(client)
    })

    log("terminé")

    await recordRun(client, "meubles", {
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
