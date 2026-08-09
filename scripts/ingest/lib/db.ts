// Postgres access for the ingestion pipeline.
//
// The pipeline writes to staging and to the modelled tables, which carry no
// insert policy — so it must connect with a role that bypasses row level
// security, never with the anon key the browser uses. Locally that is the
// `postgres` superuser on the port `supabase start` prints; against a hosted
// instance it is the service connection string, which belongs in .env.local and
// never in the repository.

import { existsSync } from "fs"
import { resolve } from "path"

import { Client } from "pg"

/**
 * `.env.local` is read here rather than exported by hand, so the connection
 * string to a hosted instance never has to be typed on a command line — where it
 * would land in shell history. The file is gitignored.
 */
const ENV_FILE = resolve(import.meta.dirname, "../../../.env.local")
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)

/** Local default: the port `supabase start` exposes. Overridden by DATABASE_URL. */
const LOCAL_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

export function connectionString(): string {
  return process.env.DATABASE_URL ?? LOCAL_URL
}

/**
 * The project the URL points at, for confirming a load is aimed where it should
 * be. Never returns the password — this is printed.
 */
export function connectionTarget(url = connectionString()): string {
  if (isLocal(url)) return "base locale"
  const ref = /(?:db\.|postgres\.)([a-z0-9]{20})/.exec(url)?.[1]
  const host = /@([^:/]+)/.exec(url)?.[1] ?? "hôte inconnu"
  return `${ref ?? "réf. inconnue"} via ${host}`
}

export async function connect(): Promise<Client> {
  const url = connectionString()
  const client = new Client({ connectionString: url })
  await client.connect()
  return client
}

/** True when we are talking to a throwaway local database rather than a hosted one. */
export function isLocal(url = connectionString()): boolean {
  return url.includes("127.0.0.1") || url.includes("localhost")
}

/**
 * Insert rows in batches.
 *
 * Postgres caps a statement at 65535 bound parameters, so the batch size has to
 * fall as the column count rises — hence the computed chunk rather than a fixed
 * one. `onConflict` is appended verbatim, which is what makes a reload idempotent.
 */
export async function insertRows(
  client: Client,
  table: string,
  columns: string[],
  rows: unknown[][],
  onConflict = "",
): Promise<number> {
  if (rows.length === 0) return 0

  const perRow = columns.length
  const maxRows = Math.max(1, Math.floor(60000 / perRow))
  const columnList = columns.map((c) => `"${c}"`).join(", ")
  let written = 0

  for (let start = 0; start < rows.length; start += maxRows) {
    const chunk = rows.slice(start, start + maxRows)
    const values: unknown[] = []
    const tuples = chunk.map((row, rowIndex) => {
      const placeholders = row.map((value, columnIndex) => {
        values.push(value)
        return `$${rowIndex * perRow + columnIndex + 1}`
      })
      return `(${placeholders.join(", ")})`
    })

    const result = await client.query(
      `insert into ${table} (${columnList}) values ${tuples.join(", ")} ${onConflict}`,
      values,
    )
    written += result.rowCount ?? 0
  }
  return written
}

/** Runs `work` in a transaction, rolling back on any throw. */
export async function inTransaction<T>(
  client: Client,
  work: () => Promise<T>,
): Promise<T> {
  await client.query("begin")
  try {
    const result = await work()
    await client.query("commit")
    return result
  } catch (error) {
    await client.query("rollback")
    throw error
  }
}

export function log(step: string, detail = ""): void {
  const stamp = new Date().toISOString().slice(11, 19)
  process.stdout.write(`[${stamp}] ${step}${detail ? ` — ${detail}` : ""}\n`)
}
