// Temporary: compares the deployed body of each withholding function to the body
// in the migration file that last defined it. CRLF normalised (REPRISE.md piège).

import { readFileSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(import.meta.dirname, "../..")

const PAIRS: [string, string][] = [
  ["compass_address_timeline", "20260826000001_timeline_scope_evidence.sql"],
  ["compass_premise_history", "20260824000002_premise_history_definer.sql"],
  ["compass_premises_within", "20260825000010_premises_within_terrasses.sql"],
  ["compass_scoring_context_within", "20260825000003_scoring_context_out_of_corpus.sql"],
  ["compass_street_rotation", "20260825000014_licence_withholding_rule.sql"],
  ["compass_survival_by_trade", "20260825000012_survival_by_trade.sql"],
]

/** The text between the outermost dollar-quote of a function definition. */
function body(sql: string, tag: string): string {
  const open = sql.indexOf(`$${tag}$`)
  const close = sql.lastIndexOf(`$${tag}$`)
  if (open < 0 || open === close) throw new Error(`corps introuvable ($${tag}$)`)
  return sql.slice(open + tag.length + 2, close).replace(/\r/g, "").trim()
}

for (const [name, migration] of PAIRS) {
  const deployed = readFileSync(resolve(ROOT, ".fn-dump", `${name}.sql`), "utf8")
  const tag = /\bAS (\$[a-z]*\$)/i.exec(deployed)?.[1].replace(/\$/g, "") ?? ""
  const fileText = readFileSync(resolve(ROOT, "supabase/migrations", migration), "utf8")

  // Isolate the create ... <name> ( ... ) block in the migration file.
  const start = fileText.search(new RegExp(`create (or replace )?function public\\.${name}\\b`))
  if (start < 0) throw new Error(`${name} absente de ${migration}`)
  const fromFile = fileText.slice(start)

  const a = body(deployed, tag)
  const b = body(fromFile, tag)
  process.stdout.write(`${name} — ${a === b ? "IDENTIQUE" : "DIFFERE"} (base ${a.length} / fichier ${b.length})\n`)
  if (a !== b) {
    const n = Math.min(a.length, b.length)
    let i = 0
    while (i < n && a[i] === b[i]) i += 1
    process.stdout.write(`   premier écart à ${i} :\n   base   « ${a.slice(i, i + 120)} »\n   fichier« ${b.slice(i, i + 120)} »\n`)
  }
}
