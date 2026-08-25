// Eval-by-design gate for Compass.
//
//   npx.cmd tsx scripts/eval/run.ts
//
// Three arms, run in order, cheapest first:
//   A — invariants (eval/invariants.sql), each must return zero rows — except a
//       `@census` block, whose rows are a population to be checked for coverage
//   B — ingestion baselines (eval/baselines/ingestion.json), drift over 1% fails
//   C — golden cases (eval/golden.jsonl), hand-verified chronologies
//
// Exit codes follow the Aetherix convention (ADR-0007 §D2.f):
//   0 PASS · 1 FAIL · 2 ERROR · 3 WARN
//
// Contract and rationale: eval/FAILURE_MODES.md.

import { existsSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

import type { Client } from "pg"

import { connect, connectionTarget, log } from "../ingest/lib/db"
import { anonymousCoverage, censusVerdict, readInvariants } from "./census"

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

async function runInvariants(client: Client): Promise<void> {
  log("A — invariants", "chaque requête doit renvoyer zéro ligne")
  const invariants = readInvariants()
  const covered = anonymousCoverage(invariants)
  for (const invariant of invariants) {
    const started = Date.now()
    // Impersonation is transaction-local, so the privileged connection is
    // restored whatever the invariant does. Without this the gate could only
    // ever exercise the privileged path — the one that always works.
    await client.query("begin")
    if (invariant.as) {
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ role: invariant.as }),
      ])
    }
    const result = await client.query(invariant.sql)
    await client.query("rollback")
    const seconds = ((Date.now() - started) / 1000).toFixed(1)

    // A census block returns the population, not violations: each row names a
    // function the licence rule applies to, and the failure is a name no `@as
    // anon` invariant calls. Verdict in ./census.ts, shared with the sabotage
    // proof (npm.cmd run eval:sabotage) so the demonstration exercises the
    // check that ships rather than a copy of it.
    if (invariant.census) {
      const verdict = censusVerdict(result.rows as Record<string, unknown>[], invariant.census, covered)
      if (verdict.ok) pass(invariant.id, `${verdict.detail} (${seconds}s)`)
      else fail(invariant.id, `${invariant.description} — ${verdict.detail}`)
      continue
    }

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

/** Actual values measured this run, keyed by baseline name — `confiance_*` feeds runConfidenceHistory. */
async function runBaselines(client: Client): Promise<Record<string, number>> {
  const baseline = JSON.parse(
    readFileSync(resolve(ROOT, "eval/baselines/ingestion.json"), "utf8"),
  ) as Baseline
  log("B — baselines", `gelées le ${baseline.measured_on}`)

  const actuals: Record<string, number> = {}
  for (const [name, expected] of Object.entries(baseline.counts)) {
    const result = await client.query<{ n: string }>(expected.sql)
    const actual = Number(result.rows[0]?.n ?? 0)
    actuals[name] = actual
    if (actual === expected.value) {
      pass(name, `${actual}`)
      continue
    }
    const drift = Math.abs(actual - expected.value) / Math.max(expected.value, 1)
    const detail = `attendu ${expected.value}, mesuré ${actual} (${(drift * 100).toFixed(2)}%)`
    if (drift > DRIFT_FAIL) fail(name, detail)
    else warn(name, detail)
  }
  return actuals
}

// ---------------------------------------------------------------------------
// B bis — historique de la composition de fiabilité
// ---------------------------------------------------------------------------
// La baseline gelée (ci-dessus) dit seulement si on s'est écarté du 9 août. Elle
// ne dit jamais si la composition avance ou recule d'une exécution à l'autre —
// PLAN.md §6.8, troisième manque : « la porte sait dire si la qualité a dérivé,
// jamais de combien elle a avancé ». Ce bloc journalise un point par (cible,
// jour) dans eval/confidence_history.jsonl, git-suivi, et rapporte le delta
// contre le point précédent, quelle que soit sa cible.

const CONFIDENCE_KEYS = ["confiance_etabli", "confiance_corrobore", "confiance_probable", "confiance_indetermine"] as const
type ConfidenceKey = (typeof CONFIDENCE_KEYS)[number]

interface ConfidencePoint {
  measured_on: string
  target: string
  confiance_etabli: number
  confiance_corrobore: number
  confiance_probable: number
  confiance_indetermine: number
}

function recordConfidenceHistory(target: string, actuals: Record<string, number>): void {
  const path = resolve(ROOT, "eval/confidence_history.jsonl")
  const lines = existsSync(path)
    ? readFileSync(path, "utf8").split("\n").map((l) => l.trim()).filter(Boolean)
    : []
  const history = lines.map((l) => JSON.parse(l) as ConfidencePoint)

  const today = new Date().toISOString().slice(0, 10)
  const previous = history.length > 0 ? history[history.length - 1] : undefined

  const point: ConfidencePoint = {
    measured_on: today,
    target,
    confiance_etabli: actuals.confiance_etabli ?? 0,
    confiance_corrobore: actuals.confiance_corrobore ?? 0,
    confiance_probable: actuals.confiance_probable ?? 0,
    confiance_indetermine: actuals.confiance_indetermine ?? 0,
  }

  // One entry per (target, day): replays on the same day overwrite rather than
  // pile up, so the file grows with the calendar, not with how often the gate
  // is run while iterating.
  const kept = history.filter((p) => !(p.target === target && p.measured_on === today))
  kept.push(point)
  writeFileSync(path, kept.map((p) => JSON.stringify(p)).join("\n") + "\n", "utf8")

  log("B bis — composition de fiabilité", `journalisée pour ${target}`)
  if (!previous) {
    pass("historique", "premier point, rien à comparer")
    return
  }
  const LEFT: ConfidenceKey[] = ["confiance_etabli", "confiance_corrobore"]
  const totalOf = (p: ConfidencePoint) => CONFIDENCE_KEYS.reduce((s, k) => s + p[k], 0)
  const totalNow = totalOf(point)
  const totalBefore = totalOf(previous)
  // Each point's share is taken against its own total, not the current run's —
  // otherwise a cohort-size change between runs would distort the "before" side.
  const leftShare = (p: ConfidencePoint) => LEFT.reduce((s, k) => s + p[k], 0) / Math.max(totalOf(p), 1)
  for (const key of CONFIDENCE_KEYS) {
    const delta = point[key] - previous[key]
    const sign = delta > 0 ? "+" : ""
    pass(key, `${previous[key]} → ${point[key]} (${sign}${delta})`)
  }
  if (totalNow !== totalBefore) {
    pass("cohorte", `taille ${totalBefore} → ${totalNow} — comparaison sur cohorte fixe de 10 000, un écart signale une dérive du chargement`)
  }
  const shareBefore = leftShare(previous)
  const shareNow = leftShare(point)
  const shareDeltaPts = (shareNow - shareBefore) * 100
  const verdict = shareDeltaPts > 0.01 ? "s'améliore" : shareDeltaPts < -0.01 ? "recule" : "stable"
  pass(
    "tendance établi+corroboré",
    `${(shareBefore * 100).toFixed(2)}% → ${(shareNow * 100).toFixed(2)}% (${shareDeltaPts >= 0 ? "+" : ""}${shareDeltaPts.toFixed(2)} pt) — ${verdict} depuis ${previous.measured_on} (${previous.target})`,
  )
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
  rule?: string
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
  confidence_rule: string | null
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
              confidence::text, confidence_rule::text, evidence, confidence_reason
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
    [expected.rule !== undefined, row.confidence_rule === expected.rule],
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
  // Both ends of the run name the database, because a verdict that does not say what it
  // judged is worth nothing — and the failure mode is real: two hours were once lost to a
  // config pointing at an unrelated project. The header is for watching it run, the
  // footer for the line that gets pasted into a report. `connectionTarget()` never
  // returns the password.
  const target = connectionTarget()
  log("CIBLE", target)

  const client = await connect()
  try {
    await runInvariants(client)
    const baselineActuals = await runBaselines(client)
    recordConfidenceHistory(target, baselineActuals)
    await runGolden(client)
  } finally {
    await client.end()
  }

  process.stdout.write("\n")
  if (failures > 0) {
    log("ÉCHEC", `${failures} défaillance(s), ${warnings} avertissement(s) — ${target}`)
    process.exitCode = 1
  } else if (warnings > 0) {
    log("AVERTISSEMENT", `${warnings} écart(s) sous le seuil bloquant — ${target}`)
    process.exitCode = 3
  } else {
    log("PASS", `invariants, baselines et jeu doré au vert — ${target}`)
  }
}

main().catch((error) => {
  log("ERREUR", error instanceof Error ? error.message : String(error))
  process.exitCode = 2
})
