// One list of columns per loader, checked against the catalog, and every comparison derived
// from it.
//
// Born of the reviews of #259 and #264 (#262, #265): terrasses.ts held its columns twice
// (COLUMNS, ROW_KEY) and plu.ts its "did this row change" clause twice (the dry-run count and
// the real upsert). Each copy was right the day it was written. A column added by a migration
// would have entered neither — never written, or, missing from a comparison, a changed value
// never rewritten — and nothing would have said so. Here the loader declares the columns it
// stages once; `checkColumns` refuses the load when the table has gained or lost one, and the
// comparisons are built from the checked list.
//
// CE QUE ÇA NE RATTRAPE PAS : the check compares names, not meaning. A column renamed in both
// the migration and the list passes, and so does a value the loader stages wrongly — the
// mapping from a source field to a column is still written by hand in each `stage`.

import type { Client } from "pg"

/** A column as the catalog describes it. */
export interface CatalogColumn {
  name: string
  /** `information_schema.columns.udt_name` — `geography`, `text`, `int2`… */
  type: string
}

/** The declared columns, checked, and which of them compare as binary. */
export interface Columns {
  names: readonly string[]
  /** Spatial columns: compared through ST_AsBinary, never `=`, which compares bounding boxes. */
  binary: ReadonlySet<string>
}

const SPATIAL = new Set(["geography", "geometry"])

/**
 * The difference between what a loader declares and what the table holds, as a sentence, or
 * null when they agree. Order is not compared: the loader's order is the one it binds in.
 */
export function columnDrift(table: string, declared: readonly string[], catalog: readonly CatalogColumn[]): string | null {
  const have = new Set(catalog.map((c) => c.name))
  const want = new Set(declared)
  const missing = [...have].filter((c) => !want.has(c))
  const extra = [...want].filter((c) => !have.has(c))
  const repeated = declared.filter((c, i) => declared.indexOf(c) !== i)
  if (missing.length === 0 && extra.length === 0 && repeated.length === 0) return null
  const parts = [
    missing.length > 0 ? `colonnes de la table que le chargeur n'écrit pas : ${missing.join(", ")}` : null,
    extra.length > 0 ? `colonnes déclarées absentes de la table : ${extra.join(", ")}` : null,
    repeated.length > 0 ? `colonnes déclarées deux fois : ${repeated.join(", ")}` : null,
  ].filter(Boolean)
  return (
    `${table} : la liste de colonnes du chargeur ne correspond plus à la table (${parts.join(" ; ")}). ` +
    "Une migration a changé la table : mettre à jour la liste et ce que `stage` y écrit, avant tout chargement."
  )
}

/** `checkColumns` without the database: the declared list against a catalog already read. */
export function columnsFrom(table: string, declared: readonly string[], catalog: readonly CatalogColumn[]): Columns {
  const drift = columnDrift(table, declared, catalog)
  if (drift) throw new Error(drift)
  return {
    names: declared,
    binary: new Set(catalog.filter((c) => SPATIAL.has(c.type)).map((c) => c.name)),
  }
}

/**
 * The columns a load must write — every column of `public.<table>` except the ones the
 * database fills itself (generated, identity) — checked against `declared`. Throws on any
 * difference, before anything is written.
 */
export async function checkColumns(client: Client, table: string, declared: readonly string[]): Promise<Columns> {
  const r = await client.query<CatalogColumn>(
    `select column_name as name, udt_name as type
       from information_schema.columns
      where table_schema = 'public' and table_name = $1
        and is_generated = 'NEVER' and is_identity = 'NO'
      order by ordinal_position`,
    [table],
  )
  if (r.rows.length === 0) throw new Error(`${table} : table introuvable dans public.`)
  return columnsFrom(table, declared, r.rows)
}

/** The columns as a comparable list, spatial ones as binary: `a.x, ST_AsBinary(a.geom)`. */
export function comparable(columns: Columns, alias?: string, only: readonly string[] = columns.names): string {
  const prefix = alias ? `${alias}.` : ""
  return only.map((c) => (columns.binary.has(c) ? `ST_AsBinary(${prefix}${c})` : `${prefix}${c}`)).join(", ")
}

/** True when two rows differ on `only` (all declared columns by default). */
export function differs(columns: Columns, left: string, right: string, only: readonly string[] = columns.names): string {
  return `(${comparable(columns, left, only)}) is distinct from (${comparable(columns, right, only)})`
}
