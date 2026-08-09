// Eval-by-design gate for Compass.
//
//   npx.cmd tsx scripts/eval/run.ts
//
// Three arms, run in order, cheapest first:
//   A — invariants (eval/invariants.sql), each must return zero rows
//   B — ingestion baselines (eval/baselines/ingestion.json), drift over 1% fails
//   C — golden cases (eval/golden.jsonl), hand-verified chronologies
//
// Exit codes follow the Aetherix convention (ADR-0007 §D2.f):
//   0 PASS · 1 FAIL · 2 ERROR · 3 WARN
//
// Contract and rationale: eval/FAILURE_MODES.md.

import { readFileSync } from "fs"
import { resolve } from "path"

import type { Client } from "pg"

import { connect, log } from "../ingest/lib/db"

const ROOT = resolve(import.meta.dirname, "../..")

let failures = 0
let warnings = 0

const fail = (what: string, detail: string): void => {
  failures += 1
  process.stdout.write(`  FAIL  ${what} — ${detail}\n`)
}
const warn = (what: string, detail: string): void => {
  warnings += 1
  process.stdout.write(`  WARN  ${what} — ${detail}\n`)
}
const pass = (what: string, detail = ""): void => {
  process.stdout.write(`  ok    ${what}${detail ? ` — ${detail}` : ""}\n`)
}

// ---------------------------------------------------------------------------
// A — invariants
// ---------------------------------------------------------------------------

interface Invariant {
  id: string
  description: string
  sql: string
}

/** Splits invariants.sql on its `-- @invariant <id> :: <description>` markers. */
function readInvariants(): Invariant[] {
  const source = readFileSync(resolve(ROOT, "eval/invariants.sql"), "utf8")
  const blocks = source.split(/^--\s*@invariant\s+/m).slice(1)
  return blocks.map((block) => {
    const [header, ...rest] = block.split("\n")
    const [id, description] = header.split("::").map((s) => s.trim())
    return { id, description, sql: rest.join("\n").trim() }
  })
}

async function runInvariants(client: Client): Promise<void> {
  log("A — invariants", "chaque requête doit renvoyer zéro ligne")
  for (const invariant of readInvariants()) {
    const started = Date.now()
    const result = await client.query(invariant.sql)
    const seconds = ((Date.now() - started) / 1000).toFixed(1)
    if (result.rowCount === 0) {
      pass(invariant.id, `${invariant.description} (${seconds}s)`)
    } else {
      fail(
        invariant.id,
        `${invariant.description} — ${result.rowCount} ligne(s), ex. ${JSON.stringify(result.rows[0])}`,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// B — ingestion baselines
// ---------------------------------------------------------------------------
// A change is not necessarily a fault — the APUR can republish — but it must
// never pass unnoticed. Beyond 1% it stops being a source correction and becomes
// a change in how the pipeline behaves.

const DRIFT_FAIL = 0.01

interface Baseline {
  measured_on: string
  note: string
  counts: Record<string, { value: number; sql: string }>
}

async function runBaselines(client: Client): Promise<void> {
  const baseline = JSON.parse(
    readFileSync(resolve(ROOT, "eval/baselines/ingestion.json"), "utf8"),
  ) as Baseline
  log("B — baselines", `gelées le ${baseline.measured_on}`)

  for (const [name, expected] of Object.entries(baseline.counts)) {
    const result = await client.query<{ n: string }>(expected.sql)
    const actual = Number(result.rows[0]?.n ?? 0)
    if (actual === expected.value) {
      pass(name, `${actual}`)
      continue
    }
    const drift = Math.abs(actual - expected.value) / Math.max(expected.value, 1)
    const detail = `attendu ${expected.value}, mesuré ${actual} (${(drift * 100).toFixed(2)}%)`
    if (drift > DRIFT_FAIL) fail(name, detail)
    else warn(name, detail)
  }
}

// ---------------------------------------------------------------------------
// C — golden cases
// ---------------------------------------------------------------------------

interface GoldenRow {
  occurred_on?: string
  kind?: string
  observed?: boolean
  label?: string | null
  detail?: string | null
  amount_eur?: number
  confidence?: string
  evidence_contains?: string
  reason_contains?: string
}

interface Golden {
  id: string
  category: string
  why: string
  input: { way_type?: string; way_name?: string; house_number?: number; ordre?: number }
  expect?: GoldenRow[]
  /** Passes when at least one timeline row matches — for cases about a class. */
  expect_any?: GoldenRow[]
}

interface TimelineRow {
  occurred_on: string
  kind: string
  observed: boolean
  label: string | null
  detail: string | null
  amount_eur: string | null
  confidence: string
  evidence: string | null
  confidence_reason: string | null
}

async function timelineFor(client: Client, input: Golden["input"]): Promise<TimelineRow[]> {
  const located = await client.query<{ id: string }>(
    input.ordre !== undefined && input.way_name === undefined
      ? `select id from public.premise_location where ordre = $1 order by id`
      : `select id from public.premise_location
          where street_key = public.compass_street_key($1, $2) and num = $3
            and ($4::integer is null or ordre = $4)
          order by id`,
    input.ordre !== undefined && input.way_name === undefined
      ? [input.ordre]
      : [input.way_type, input.way_name, input.house_number, input.ordre ?? null],
  )
  if (located.rowCount === 0) return []

  const rows: TimelineRow[] = []
  for (const { id } of located.rows) {
    const timeline = await client.query<TimelineRow>(
      `select occurred_on::text, kind, observed, label, detail, amount_eur::text,
              confidence::text, evidence, confidence_reason
         from public.compass_address_timeline($1)`,
      [id],
    )
    rows.push(...timeline.rows)
  }
  return rows
}

/** Only the fields the scenario names are compared; the rest are free. */
function matches(row: TimelineRow, expected: GoldenRow): boolean {
  const checks: [boolean | undefined, boolean][] = [
    [expected.occurred_on !== undefined, row.occurred_on === expected.occurred_on],
    [expected.kind !== undefined, row.kind === expected.kind],
    [expected.observed !== undefined, row.observed === expected.observed],
    [expected.label !== undefined, row.label === expected.label],
    [expected.detail !== undefined, row.detail === expected.detail],
    [expected.confidence !== undefined, row.confidence === expected.confidence],
    [expected.amount_eur !== undefined, Number(row.amount_eur) === expected.amount_eur],
    [
      expected.evidence_contains !== undefined,
      (row.evidence ?? "").includes(expected.evidence_contains ?? ""),
    ],
    [
      expected.reason_contains !== undefined,
      (row.confidence_reason ?? "").includes(expected.reason_contains ?? ""),
    ],
  ]
  return checks.every(([applies, ok]) => !applies || ok)
}

async function runGolden(client: Client): Promise<void> {
  const lines = readFileSync(resolve(ROOT, "eval/golden.jsonl"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  log("C — jeu doré", `${lines.length} cas vérifiés à la main`)

  for (const line of lines) {
    const scenario = JSON.parse(line) as Golden
    const timeline = await timelineFor(client, scenario.input)
    if (timeline.length === 0) {
      fail(scenario.id, "aucun local ne correspond à l'entrée du scénario")
      continue
    }

    if (scenario.expect_any) {
      const ok = scenario.expect_any.every((e) => timeline.some((r) => matches(r, e)))
      if (ok) pass(scenario.id, scenario.category)
      else fail(scenario.id, `${scenario.category} — aucune ligne ne satisfait le scénario`)
      continue
    }

    const missing = (scenario.expect ?? []).filter((e) => !timeline.some((r) => matches(r, e)))
    if (missing.length === 0) pass(scenario.id, scenario.category)
    else
      fail(
        scenario.id,
        `${scenario.category} — ${missing.length} attente(s) non satisfaite(s) : ${JSON.stringify(missing[0])}`,
      )
  }
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const client = await connect()
  try {
    await runInvariants(client)
    await runBaselines(client)
    await runGolden(client)
  } finally {
    await client.end()
  }

  process.stdout.write("\n")
  if (failures > 0) {
    log("ÉCHEC", `${failures} défaillance(s), ${warnings} avertissement(s)`)
    process.exitCode = 1
  } else if (warnings > 0) {
    log("AVERTISSEMENT", `${warnings} écart(s) sous le seuil bloquant`)
    process.exitCode = 3
  } else {
    log("PASS", "invariants, baselines et jeu doré au vert")
  }
}

main().catch((error) => {
  log("ERREUR", error instanceof Error ? error.message : String(error))
  process.exitCode = 2
})
