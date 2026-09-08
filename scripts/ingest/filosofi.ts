// Filosofi carroyé 200 m — w2-filosofi (issue #18).
//
//   npx.cmd tsx scripts/ingest/filosofi.ts
//
// Replaces the IRIS-wide income figure with a 200 m grid cell: "l'IRIS est trop large — deux
// rues du même IRIS peuvent n'avoir rien à voir" (docs/tickets/w2-filosofi.md). See the header
// of the migration this loads into (20260908000001_filosofi_grid_200m.sql) for the endpoint
// choice, why it is RESOLVED rather than pinned, and — the finding that matters most — why
// what this file computes is an ESTIMATED MEAN standard of living per person, never a median:
// no median exists in this dataset at any grid size. Read that header before touching either
// file; this comment does not repeat it.

import type { Client } from "pg"
import { DuckDBInstance } from "@duckdb/node-api"

import { assertPrivileged, connect, inTransaction, insertRows, log, recordRun } from "./lib/db"

/** The current dataset page. NOT a resource id (see migration header: those rotate on IDFM's
 * portal, this page does not — INSEE adds a new parquet to the SAME page instead). If INSEE
 * ever replaces this page wholesale, the way it apparently did for the 2015/2017 generations,
 * this URL starts answering 404 and this loader throws — the same discipline sirene.ts already
 * uses for the same reason (#56). */
const DATASET_URL =
  "https://www.data.gouv.fr/api/1/datasets/revenus-pauvrete-et-niveau-de-vie-donnees-carroyees-2019-et-2021-dispositif-fichier-localise-social-et-fiscal-filosofi/"

const USER_AGENT = "paris-compass ingestion (github.com/IvandeMurard/paris-compass)"

/** Only a filename of exactly this shape is a candidate — matches
 * `carreaux-200m-met-3035_2019.parquet` and `…_2021.parquet`, measured 8 September 2026. A
 * resource of any other shape (a CSV, a shapefile archive, a DVF-style companion file) is
 * ignored rather than guessed at. */
const PARQUET_NAME = /carreaux-200m-met-3035_(\d{4})\.parquet$/

interface ResolvedParquet {
  url: string
  year: number
}

/**
 * Reads the dataset's own resource list and picks the HIGHEST year among its 200 m parquet
 * files — never a hardcoded year. See the migration header: two vintages coexist on this page
 * today (2019 and 2021), and the day INSEE adds a third the next run picks it up on its own,
 * with the chosen year recorded in `ingestion_run.source_as_of` so a REGRESSION (an older
 * vintage becoming the only one left) is visible there too, not silent.
 *
 * Throws rather than falling back to a previous URL or a previous year — the same choice
 * sirene.ts makes for the same reason: an unreachable or reshaped portal is an outage, and an
 * outage must read as one, never as a quietly older answer.
 */
export async function resolveParquet(): Promise<ResolvedParquet> {
  const response = await fetch(DATASET_URL, { headers: { "User-Agent": USER_AGENT } })
  if (!response.ok) {
    throw new Error(
      `data.gouv.fr a répondu ${response.status} pour le jeu Filosofi carroyé 200 m. Sans lui, ` +
        `le millésime à charger est inconnu — et charger un millésime inconnu est exactement ` +
        `ce que ce chargeur refuse de faire.`,
    )
  }
  const payload = (await response.json()) as { resources?: { url?: string; title?: string }[] }
  const candidates = (payload.resources ?? [])
    .map((r) => ({ url: r.url ?? "", match: PARQUET_NAME.exec(r.title ?? r.url ?? "") }))
    .filter((c): c is { url: string; match: RegExpExecArray } => c.match !== null && c.url !== "")

  if (candidates.length === 0) {
    throw new Error(
      `Le jeu Filosofi carroyé 200 m ne publie aucune ressource au format ` +
        `carreaux-200m-met-3035_AAAA.parquet. Choisir à l'aveugle reviendrait à charger un ` +
        `millésime que personne n'a désigné.`,
    )
  }

  const best = candidates.reduce((a, b) => (Number(b.match[1]) > Number(a.match[1]) ? b : a))
  return { url: best.url, year: Number(best.match[1]) }
}

/** A grid cell as read from the source, before its polygon is rebuilt in Postgres. `xmin` etc.
 * are EPSG:3035 metres, taken from the parquet's own `bbox` struct — measured 8 September 2026
 * to match the cell's full geometry envelope exactly, on every row sampled, so there is no need
 * to load DuckDB's spatial extension at all to get the square's four corners. */
interface GridCell {
  idcar200m: string
  ind: number
  men: number
  menPauv: number | null
  indSnv: number
  xmin: number
  ymin: number
  xmax: number
  ymax: number
}

/**
 * A generous EPSG:3035 candidate envelope around Paris — wider than the city on every side, on
 * purpose: this is only the CHEAP first filter (four comparisons, no geometry parsing), and the
 * precise cut against the 80 quartiers' actual outline happens afterwards, in
 * `restrictToQuartiers`. Measured 8 September 2026 against the real Paris bbox transformed to
 * EPSG:3035 (3 750 800 / 2 884 000 to 3 770 000 / 2 895 600): this envelope pads roughly 2 km on
 * every side, comfortably wider than one 200 m cell's worth of edge error.
 */
const PARIS_CANDIDATE_ENVELOPE = { xmin: 3_748_000, xmax: 3_772_000, ymin: 2_882_000, ymax: 2_898_000 }

/** Reads only the candidate envelope from the remote parquet — predicate pushdown on the
 * `bbox` struct's four scalar fields means DuckDB skips row groups outside it without reading
 * the geometry column at all, so this stays cheap even though the file itself covers all of
 * metropolitan France, Martinique and Réunion. */
export async function readParisCandidates(parquetUrl: string): Promise<GridCell[]> {
  const db = await DuckDBInstance.create(":memory:")
  const connection = await db.connect()
  await connection.run("install httpfs; load httpfs;")

  const e = PARIS_CANDIDATE_ENVELOPE
  const reader = await connection.runAndReadAll(`
    select idcar_200m, ind, men, men_pauv, ind_snv,
           bbox.xmin as xmin, bbox.ymin as ymin, bbox.xmax as xmax, bbox.ymax as ymax
    from read_parquet('${parquetUrl}')
    where bbox.xmin >= ${e.xmin} and bbox.xmax <= ${e.xmax}
      and bbox.ymin >= ${e.ymin} and bbox.ymax <= ${e.ymax}
  `)

  return reader.getRowObjects().map((row): GridCell => ({
    idcar200m: String(row.idcar_200m),
    ind: Number(row.ind),
    men: Number(row.men),
    menPauv: row.men_pauv == null ? null : Number(row.men_pauv),
    indSnv: Number(row.ind_snv),
    xmin: Number(row.xmin),
    ymin: Number(row.ymin),
    xmax: Number(row.xmax),
    ymax: Number(row.ymax),
  }))
}

/**
 * A DELETE THAT IS NEVER FOLLOWED BY AN INSERT IS THE FAILURE MODE w2-idfm's review (#97)
 * found the hard way — the same guard, applied here before it could repeat. Both loaders below
 * rebuild their table wholesale (delete then reinsert); on an empty batch the delete would
 * still run while the insert loop never turns, `premise_location.filosofi_idcar_200m` would
 * lose every pointer to `on delete set null`, and `recordRun` would still write a SUCCESS.
 *
 * What this does NOT catch, and it is the half that matters: a lot that shrank rather than
 * emptied — a field renamed upstream that silently drops half the candidates would pass this
 * guard and record a success. Catching THAT is `eval/invariants.sql` I51-I54's job, not this
 * throw's — see those invariants' headers.
 */
function refuseLotVide(quoi: string, count: number): void {
  if (count > 0) return
  throw new Error(
    `${quoi} : lot vide, chargement refusé avant le delete. filosofi_grid_200m est ` +
      `reconstruite en entier à chaque passage, donc vider sans réécrire effacerait aussi les ` +
      `rattachements de premise_location en enregistrant un succès. Vérifier d'abord que le ` +
      `jeu source porte encore les champs que scripts/ingest/filosofi.ts lit.`,
  )
}

export async function loadGrid(client: Client, cells: GridCell[], year: number): Promise<number> {
  refuseLotVide("filosofi_grid_200m", cells.length)
  await client.query("delete from public.filosofi_grid_200m")
  const rows = cells.map((c) => [c.idcar200m, year, c.ind, c.men, c.menPauv, c.indSnv, c.xmin, c.ymin, c.xmax, c.ymax])

  // insertRows cannot express the ST_Transform/ST_MakeEnvelope call the geometry column needs,
  // so this loader chunks by hand — the same 500-row chunking idfm.ts uses for the same reason.
  const chunk = 500
  let written = 0
  for (let start = 0; start < rows.length; start += chunk) {
    const slice = rows.slice(start, start + chunk)
    const values: unknown[] = []
    const tuples = slice.map((row, i) => {
      values.push(...row)
      const b = i * 10
      return (
        `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, ` +
        `ST_Transform(ST_MakeEnvelope($${b + 7}, $${b + 8}, $${b + 9}, $${b + 10}, 3035), 4326)::geography)`
      )
    })
    const result = await client.query(
      `insert into public.filosofi_grid_200m
         (idcar_200m, annee, individus, menages, menages_pauvres, niveau_vie_somme_winsorisee_eur, geom)
       values ${tuples.join(", ")}`,
      values,
    )
    written += result.rowCount ?? 0
  }
  return written
}

/**
 * Trims the bbox-candidate cells down to those that actually touch Paris, against the 80
 * quartiers' real outline — geography.ts's own reference geometry, never a second Paris
 * boundary invented here. `PARIS_CANDIDATE_ENVELOPE` is deliberately generous (see its own
 * comment), so this is not optional: without it, cells from parts of Hauts-de-Seine,
 * Seine-Saint-Denis and Val-de-Marne inside that rectangle would sit in the table right next to
 * Paris ones with nothing distinguishing them.
 */
export async function restrictToQuartiers(client: Client): Promise<number> {
  const result = await client.query(`
    delete from public.filosofi_grid_200m g
     where not exists (
       select 1 from public.quartier q where ST_Intersects(q.geom, g.geom)
     )
  `)
  return result.rowCount ?? 0
}

/**
 * Attaches every geolocated premise to its Filosofi cell. A grid TILES the territory with no
 * gaps, unlike the nearest-IDFM-station search: the correct cell is the one whose polygon
 * COVERS the point, which is exact rather than approximate. `ST_Covers` is tried first; a
 * premise whose true cell was trimmed out by `restrictToQuartiers` (its own polygon straddling
 * the quartier-union boundary, dropped on the far side) falls back to the nearest cell by
 * centroid rather than getting no cell at all — the same "no cutoff, always attach something"
 * choice w2-idfm made, for the analogous reason.
 */
export async function attach(client: Client): Promise<number> {
  const result = await client.query(`
    with nearest as (
      select l.id as location_id, g.idcar_200m
      from public.premise_location l
      cross join lateral (
        select g.idcar_200m
        from public.filosofi_grid_200m g
        order by (not ST_Covers(g.geom, l.geom)), g.geom <-> l.geom
        limit 1
      ) g
      where l.geom is not null
    )
    update public.premise_location l
       set filosofi_idcar_200m = n.idcar_200m
      from nearest n
     where l.id = n.location_id
  `)
  return result.rowCount ?? 0
}

async function main(): Promise<void> {
  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  try {
    const { url, year } = await resolveParquet()
    log("jeu résolu", `${url} (millésime ${year})`)

    const candidates = await readParisCandidates(url)
    log("carreaux candidats (enveloppe large)", String(candidates.length))

    let loaded = 0
    let trimmed = 0
    let attached = 0
    await inTransaction(client, async () => {
      loaded = await loadGrid(client, candidates, year)
      trimmed = await restrictToQuartiers(client)
      attached = await attach(client)
    })

    log("terminé")
    log("  carreaux chargés (avant recoupement quartiers)", String(loaded))
    log("  carreaux écartés (hors des 80 quartiers)", String(trimmed))
    log("  carreaux retenus", String(loaded - trimmed))
    log("  locaux rattachés", String(attached))

    await recordRun(client, "filosofi", {
      rowCount: loaded - trimmed,
      sourceAsOf: String(year),
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
