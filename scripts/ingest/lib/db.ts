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

/** The datasets `ingestion_run` tracks. Keys, not labels — the labels live in the table. */
export type IngestionSource = "bdcom" | "geography" | "bodacc" | "sirene" | "plu"

/**
 * Records a successful load.
 *
 * Called *after* the transaction commits, never inside it. A run that rolled back has not
 * loaded anything, and a freshness date that advanced on a rollback would be the exact
 * failure this table exists to prevent — a date that looks current and is not.
 *
 * `sourceAsOf` is the recency of the *data*, read from the source, and it is deliberately a
 * required argument rather than an optional one: every caller has to decide what it means for
 * its own dataset, and a default of `now()` is the mistake that would be silently inherited.
 */
export async function recordRun(
  client: Client,
  source: IngestionSource,
  measured: { rowCount: number; sourceAsOf: string; durationMs: number },
): Promise<void> {
  // Three triggers, not two — and the distinction is the one w0-cron's criterion turns on.
  //
  // A run started from the Actions tab sets GITHUB_ACTIONS=true exactly like a scheduled one:
  // reading only that variable would record a button press as a kept cadence, and list_sources
  // would answer "Refreshed by a scheduled job". GITHUB_EVENT_NAME is what separates them, and
  // only `schedule` demonstrates that a cadence is actually held.
  const onRunner = process.env.GITHUB_ACTIONS === "true"
  const runBy = onRunner
    ? process.env.GITHUB_EVENT_NAME === "schedule"
      ? "schedule"
      : "workflow-dispatch"
    : "manual"
  const runRef =
    onRunner && process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null

  await client.query(
    `update public.ingestion_run
        set last_success_at = now(),
            row_count       = $2,
            source_as_of    = $3,
            duration_ms     = $4,
            run_by          = $5,
            run_ref         = $6
      where source = $1`,
    [
      source,
      measured.rowCount,
      measured.sourceAsOf,
      measured.durationMs,
      runBy,
      runRef,
    ],
  )
  log("fraîcheur", `${source} — ${measured.rowCount} lignes, source datée ${measured.sourceAsOf}`)
}

/**
 * Refuses to run against anything but a privileged Postgres connection.
 *
 * The pipeline writes to tables that carry no insert policy, so it needs a role that bypasses
 * row level security. Handing it an anon key would not fail loudly — PostgREST would refuse
 * each write and a careless caller could read that as "nothing to do". Worse, the anon key is
 * public: it ships in the browser bundle. Naming the failure here costs one call and removes
 * the possibility.
 */
export function assertPrivileged(): void {
  const url = process.env.DATABASE_URL
  const automated = process.env.GITHUB_ACTIONS === "true" || process.env.CI === "true"

  if (!url) {
    // On a workstation, no DATABASE_URL means "the local aggregate", which is the documented
    // default. On a runner it means the secret is missing — and falling back to 127.0.0.1
    // there would spend the job's minutes failing to reach a database that was never going to
    // be present, with a connection error instead of the real cause.
    if (automated) {
      throw new Error(
        "DATABASE_URL est absente sur un runner. Le secret de dépôt du même nom n'est pas posé, " +
          "ou n'est pas exposé à ce job. Poser la chaîne du pooler session (port 5432) — jamais " +
          "la clé anon, qui est publique.",
      )
    }
    return // local default: the postgres superuser on the port `supabase start` prints
  }
  if (/^sb_publishable_|^eyJ|^sbp_/.test(url.trim())) {
    throw new Error(
      "DATABASE_URL ressemble à une clé Supabase et non à une chaîne de connexion Postgres. " +
        "Ce chargeur écrit dans des tables sans politique d'insertion : il lui faut le rôle " +
        "privilégié, jamais la clé anon.",
    )
  }
  if (!/^postgres(ql)?:\/\//.test(url.trim())) {
    // Diagnose without disclosing. A badly set secret is a thirty-second fix *if* the message
    // says where to look; "not a postgres:// URL" sends someone searching blind.
    throw new Error(
      `DATABASE_URL n'est pas une URL postgres:// — refus de démarrer. ${describeShape(url)}`,
    )
  }
  // The pooler, not the direct connection. `db.<ref>.supabase.co` has only an AAAA record and
  // GitHub runners have no IPv6: the connection fails with EAI_AGAIN, an opaque network error
  // where the cause is a choice of host. Measured on this workstation and on the runner alike.
  if (automated && /@db\.[a-z0-9]{20}\.supabase\.co/.test(url)) {
    throw new Error(
      "DATABASE_URL vise la connexion directe (db.<ref>.supabase.co), qui n'a qu'un " +
        "enregistrement AAAA. Les runners GitHub n'ont pas d'IPv6. Utiliser le pooler session : " +
        "postgres.<ref>@aws-1-eu-west-1.pooler.supabase.com:5432.",
    )
  }
}

/**
 * Describes the *shape* of a badly set secret without revealing its contents.
 *
 * These are the cases that actually happen when a secret is pasted by hand: the whole .env
 * line rather than its value, quotes picked up along the way, a dashboard template still
 * carrying its placeholder. Every hint below is a property of form, never a fragment of the
 * string — on a runner nobody can inspect the value, so the message has to do the work.
 */
function describeShape(raw: string): string {
  const url = raw.trim()
  const hints: string[] = []
  if (/^[A-Z_]+\s*=/.test(url)) {
    hints.push(
      "elle commence par « NOM= » : c'est la ligne entière de .env.local qui a été collée, " +
        "pas seulement sa valeur. Ne coller que ce qui suit le premier « = ».",
    )
  }
  if (/^["']|["']$/.test(url)) hints.push("elle est entourée de guillemets — les retirer.")
  if (/\[[^\]]*\]/.test(url)) {
    hints.push("elle contient un marque-place entre crochets, du type [YOUR-PASSWORD], à remplacer.")
  }
  if (/^psql\b/.test(url)) hints.push("c'est une commande psql, pas une URL : n'en garder que l'URL.")
  if (raw !== url) hints.push("elle porte des espaces ou un retour à la ligne en tête ou en fin.")
  if (hints.length === 0) {
    hints.push(
      "attendu : postgresql://postgres.<ref>:<mot de passe>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres " +
        `(reçu ${url.length} caractères commençant par « ${url.slice(0, 4)} »).`,
    )
  }
  return hints.join(" ")
}
