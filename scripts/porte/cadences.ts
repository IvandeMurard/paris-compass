// Which sources of `compass_source_freshness()` actually have a scheduled trigger — w1-cadence
// (#70), point 2, and it is the deliverable rather than the four cron lines.
//
// `w0-cron` (#6) gave a cadence to the four sources that existed on 25 August 2026. The four
// that arrived in the days after — `chantiers`, `sirene_stock`, `plu`, `terrasses` — never
// registered, and nothing said so for a week. Adding them by hand would repeat the gesture
// that made the hole: a cadence laid down on the datasets of a given day is an inventory, and
// an inventory does not update itself.
//
// So the population is ENUMERATED, exactly as scripts/porte/arms.ts enumerates npm scripts and
// scripts/eval/census.ts enumerates functions from pg_proc. Every row a migration inserts into
// `public.ingestion_run` is a source, every source carries a declared cadence — the column is
// `not null` — and each must be classified exactly once: either a scheduled workflow names it,
// or scripts/porte/cadence.json carries a written reason why it has none. Never a silence.
//
// ── Where the population is read, and why the migrations rather than the database ─────────
//
// `ingestion_run` rows are created by migrations and only ever UPDATEd afterwards
// (scripts/ingest/lib/db.ts, `recordRun`). The migrations are therefore the place the value is
// PRODUCED, and a check that reads them catches the ninth source on the day its migration is
// written — before it is applied anywhere, in `npm run test`, with no database.
//
// The other direction is checked too, and elsewhere: scripts/ingest/freshness.ts asks the
// remote for its own list and refuses to differ from this one. A row created out of band —
// psql, the Supabase console — would be invisible here and is caught there, daily, in the gate.
//
// ── The trap this had to avoid ────────────────────────────────────────────────────────────
//
// #71 met it one level up: two npm scripts pointing at the same file cannot be told apart by a
// path. The equivalent here is real and present — the `bdcom` arm of ingestion.yml runs
// `bdcom.ts` and then `geography.ts`, so matching sources to loader FILE PATHS would have made
// the BDCom cron vouch for the geography source. The match is therefore on the workflow's own
// cron -> source table, which names one source per schedule, and never on what the arm runs.
//
// Deliberately without a YAML parser, and comment lines stripped first, for the reasons
// scripts/ingest/workflow.test.ts and scripts/porte/arms.ts already give — including the
// carriage returns, which cost half an hour on 31 August 2026.

import { readFileSync, readdirSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(import.meta.dirname, "../..")

export interface DeclaredSource {
  source: string
  cadence: string
  /** The migration that inserted the row. Named so a red says where to go. */
  migration: string
}

/** A SQL or YAML text with its whole-line comments and carriage returns removed. */
function structure(text: string, comment: RegExp): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !comment.test(line))
    .join("\n")
}

/**
 * The sources the migrations declare, with their cadence.
 *
 * Only `insert into public.ingestion_run` is read: that is the single statement that brings a
 * source into existence. Comments go first — 20260825000001 *explains* the table in prose that
 * quotes column names, and a check that read an explanation as a declaration would count
 * sources nobody loads.
 */
export function readDeclaredSources(dir = resolve(ROOT, "supabase/migrations")): DeclaredSource[] {
  const declared: DeclaredSource[] = []
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = structure(readFileSync(resolve(dir, file), "utf8"), /^\s*--/)
    for (const statement of sql.matchAll(/insert\s+into\s+public\.ingestion_run\s*\([^)]*\)\s*values([\s\S]*?);/gi)) {
      // `(source, label, cadence, …)` — the first, second and third literals of each tuple.
      // Doubled quotes are SQL's own escape and appear in every label here.
      for (const tuple of statement[1].matchAll(/\(\s*'((?:[^']|'')*)'\s*,\s*'(?:[^']|'')*'\s*,\s*'((?:[^']|'')*)'/g)) {
        declared.push({ source: tuple[1], cadence: tuple[2], migration: file })
      }
    }
  }
  return declared
}

/** The written reasons for a source having no scheduled trigger, keyed by source name. */
export function readSourceExcuses(path = resolve(ROOT, "scripts/porte/cadence.json")): Record<string, string> {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { sources?: Record<string, string> }
  return parsed.sources ?? {}
}

export interface Workflow {
  file: string
  text: string
}

/** Every workflow file, comment lines stripped. The cadence test lives in `scheduledSources`. */
export function readWorkflows(dir = resolve(ROOT, ".github/workflows")): Workflow[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((file) => ({ file, text: structure(readFileSync(resolve(dir, file), "utf8"), /^\s*#/) }))
}

/**
 * Sources named by a schedule, mapped to the trigger that names them.
 *
 * A cron is only counted when the workflow also translates it into a source name: the two
 * halves are aligned by scripts/ingest/workflow.test.ts, and requiring both here means a
 * schedule whose `case` arm was deleted stops vouching for its source instead of silently
 * going on doing so.
 *
 * `workflow_dispatch` is deliberately not a trigger. A button is what this ticket exists to
 * stop relying on — `run_by = 'workflow-dispatch'` is the very distinction the table draws.
 */
export function scheduledSources(workflows: Workflow[]): Map<string, string> {
  const found = new Map<string, string>()
  for (const { file, text } of workflows) {
    const crons = new Set([...text.matchAll(/^\s*-\s*cron:\s*"([^"]+)"/gm)].map((m) => m[1]))
    if (crons.size === 0) continue
    for (const arm of text.matchAll(/^\s*"([^"]+)"\)\s*source=(\w+)\s*;;/gm)) {
      const [, cron, source] = arm
      if (!crons.has(cron)) continue
      if (!found.has(source)) found.set(source, `${file} — ${cron}`)
    }
  }
  return found
}

export type SourceState = "planifie" | "excuse" | "muet" | "contradictoire" | "orphelin"

export interface SourceVerdict {
  source: string
  state: SourceState
  cadence: string
  /** Which schedule triggers it, or the written reason it has none. */
  detail: string
}

/**
 * Classifies every declared source, and reports the excuses that no longer name one.
 *
 * `orphelin` is the direction a table of exemptions always forgets: a reason kept for a source
 * that has gone is prose claiming to cover something that does not exist. `contradictoire` is
 * the other — a source both scheduled and excused means one of the two is a leftover, and
 * guessing which would be the check deciding on the author's behalf.
 */
export function classifySources(
  declared: DeclaredSource[],
  triggers: Map<string, string>,
  excuses: Record<string, string>,
): SourceVerdict[] {
  const verdicts: SourceVerdict[] = declared.map(({ source, cadence, migration }) => {
    const trigger = triggers.get(source)
    const excuse = excuses[source]
    if (trigger && excuse) {
      return {
        source,
        cadence,
        state: "contradictoire",
        detail: `planifiée par ${trigger} et pourtant excusée : « ${excuse} »`,
      }
    }
    if (trigger) return { source, cadence, state: "planifie", detail: trigger }
    if (excuse && excuse.trim() !== "") return { source, cadence, state: "excuse", detail: excuse }
    return {
      source,
      cadence,
      state: "muet",
      detail:
        `cadence « ${cadence} » déclarée par ${migration}, et aucun déclencheur planifié ne la tient. ` +
        "Lui donner une entrée cron dans .github/workflows/ingestion.yml, ou écrire dans " +
        "scripts/porte/cadence.json pourquoi elle n'en a pas.",
    }
  })

  const known = new Set(declared.map((d) => d.source))
  for (const source of Object.keys(excuses)) {
    if (!known.has(source)) {
      verdicts.push({
        source,
        cadence: "—",
        state: "orphelin",
        detail: "cadence.json excuse une source qu'aucune migration ne déclare",
      })
    }
  }

  return verdicts
}

/** The one call a check, a report or the sabotage needs: reads the repository and classifies it. */
export function cadencesOfTheSources(): SourceVerdict[] {
  return classifySources(readDeclaredSources(), scheduledSources(readWorkflows()), readSourceExcuses())
}
