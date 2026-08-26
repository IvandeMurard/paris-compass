// Temporary: dumps the deployed definition of the six withholding functions so
// the migration that rewrites their bodies starts from what is actually in the
// database rather than from a file that may have drifted. Not committed.

import { mkdirSync, writeFileSync } from "fs"
import { resolve } from "path"

import { connect, connectionTarget, log } from "../ingest/lib/db"

const NAMES = [
  "compass_address_timeline",
  "compass_premise_history",
  "compass_premises_within",
  "compass_scoring_context_within",
  "compass_street_rotation",
  "compass_survival_by_trade",
]

async function main(): Promise<void> {
  const client = await connect()
  log("CIBLE", connectionTarget())
  const dir = resolve(import.meta.dirname, "../../.fn-dump")
  mkdirSync(dir, { recursive: true })

  for (const name of NAMES) {
    const r = await client.query<{ def: string; secdef: boolean }>(
      `select pg_get_functiondef(p.oid) as def, p.prosecdef as secdef
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = $1`,
      [name],
    )
    for (const [i, row] of r.rows.entries()) {
      const file = resolve(dir, `${name}${r.rows.length > 1 ? `.${i}` : ""}.sql`)
      writeFileSync(file, row.def.replace(/\r/g, ""), "utf8")
      process.stdout.write(`${name} — secdef=${row.secdef} — ${row.def.length} octets\n`)
    }
  }
  await client.end()
}

main().catch((e: unknown) => {
  process.stdout.write(`ERREUR — ${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(2)
})
