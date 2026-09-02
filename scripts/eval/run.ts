// Eval-by-design gate for Compass.
//
//   npx.cmd tsx scripts/eval/run.ts
//
// Four arms, run in order, cheapest first:
//   A — invariants (eval/invariants.sql), each must return zero rows — except a
//       `@census` block, whose rows are a population to be checked for coverage
//   B — ingestion baselines (eval/baselines/ingestion.json): a count fails over 1% drift,
//       a quantile fails when the figure the product publishes changes — scripts/eval/drift.ts
//   C — golden cases (eval/golden.jsonl), hand-verified chronologies
//   E — the anon window budget (eval/baselines/anon-budget.json): every radius
//       function anon may call, measured at the maximum radius the product
//       promises. D is taken — it is the anonymous gate, run separately by
//       `npm.cmd run eval:anon`, which holds no database credentials.
//
// Exit codes follow the Aetherix convention (ADR-0007 §D2.f):
//   0 PASS · 1 FAIL · 2 ERROR · 3 WARN
//
// A cancelled invariant SUSPENDS and the run continues — #69. Until 2026-08-31 a `57014`
// in arm A escaped to `main().catch`, and arms B, C and E were never played: two passes out
// of three that day produced no verdict at all. The exit was honest about being an ERROR,
// which is why this was never mistaken for a licence fault the way DIAGNOSTIC.md §18 was;
// the defect is that the gate stopped judging, and a gate that regularly says nothing gets
// read as decoration. A suspension is now exit 3, never 0, with the ids named.
//
// Contract and rationale: eval/FAILURE_MODES.md.

import { existsSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

import type { Client } from "pg"

import { connect, connectionTarget, log } from "../ingest/lib/db"
import { type Attendu, verdictEcart } from "./drift"
import { runBudget } from "./budget"
import { runInvariantsArm } from "./invariants"
import { isUnreachable, unreachableCode } from "./upstream"

const ROOT = resolve(import.meta.dirname, "../..")

let failures = 0
let warnings = 0
/**
 * Invariants the database refused to finish — #69. Never a FAIL and never a PASS:
 * a cancellation says the gate could not look, not that it looked and disliked what
 * it saw. Named in the footer, because the one thing a gate must never do quietly is
 * skip a check.
 */
const suspensions: string[] = []

const fail = (what: string, detail: string): void => {
  failures += 1
  process.stdout.write(`  FAIL  ${what} — ${detail}\n`)
}
const warn = (what: string, detail: string): void => {
  warnings += 1
  process.stdout.write(`  WARN  ${what} — ${detail}\n`)
}
const suspend = (what: string, detail: string): void => {
  suspensions.push(what)
  process.stdout.write(`  susp  ${what} — ${detail}\n`)
}
const pass = (what: string, detail = ""): void => {
  process.stdout.write(`  ok    ${what}${detail ? ` — ${detail}` : ""}\n`)
}

// ---------------------------------------------------------------------------
// A — invariants
// ---------------------------------------------------------------------------

async function runInvariants(client: Client): Promise<void> {
  const outcome = await runInvariantsArm(client)
  log("A — invariants", outcome.header)
  for (const [what, detail] of outcome.passes) pass(what, detail)
  for (const [what, detail] of outcome.suspensions) suspend(what, detail)
  for (const [what, detail] of outcome.warnings) warn(what, detail)
  for (const [what, detail] of outcome.failures) fail(what, detail)
}

// ---------------------------------------------------------------------------
// B — ingestion baselines
// ---------------------------------------------------------------------------
// A change is not necessarily a fault — the APUR can republish — but it must
// never pass unnoticed. What « unnoticed » means is not the same for every
// figure, and that decision lives in scripts/eval/drift.ts, with its own tests:
// a count is judged on a percentage, a quantile on the figure the product
// publishes. The second rule was added on 2 September 2026, after a median sat
// on a step of its own distribution and blocked the gate — DIAGNOSTIC.md §34.

interface Baseline {
  measured_on: string
  note: string
  counts: Record<string, Attendu & { sql: string }>
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
    const { bloquant, detail } = verdictEcart(expected, actual)
    if (bloquant) fail(name, detail)
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
// E — le budget de la fenêtre anon
// ---------------------------------------------------------------------------
// La lettre saute D : le bras D est la porte anonyme, `npm.cmd run eval:anon`, qui tourne
// séparément parce qu'elle ne tient aucun identifiant de base. Celui-ci en a besoin — il lit
// des plans d'exécution — donc il vit ici. Le détail, et pourquoi il mesure deux nombres
// plutôt qu'un, sont dans scripts/eval/budget.ts.

async function runBudgetArm(client: Client): Promise<void> {
  const outcome = await runBudget(client)
  log("E — budget de la fenêtre anon", outcome.header)
  for (const [what, detail] of outcome.passes) pass(what, detail)
  for (const [what, detail] of outcome.warnings) warn(what, detail)
  for (const [what, detail] of outcome.failures) fail(what, detail)
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
    await runBudgetArm(client)
  } finally {
    await client.end()
  }

  process.stdout.write("\n")
  // A suspension outranks a warning and is outranked by a failure — #69. It can never
  // become a PASS: the arm did not look, and a gate that reports green on a check it
  // skipped is worse than one that goes red. INDÉTERMINÉ is written in full, and the
  // suspended ids are named, because « rejouer une sortie 3 est légitime, rejouer un FAIL
  // ne l'est pas » only works if the two are told apart at a glance.
  if (failures > 0) {
    log(
      "ÉCHEC",
      `${failures} défaillance(s), ${warnings} avertissement(s)` +
        `${suspensions.length > 0 ? `, ${suspensions.length} suspendu(s)` : ""} — ${target}`,
    )
    process.exitCode = 1
  } else if (suspensions.length > 0) {
    log(
      "INDÉTERMINÉ",
      `${suspensions.length} invariant(s) non joué(s) — ${suspensions.join(", ")} : ` +
        `la base a refusé de finir, ce n'est ni vert ni rouge. Rejouer. ` +
        `${warnings} avertissement(s) par ailleurs — ${target}`,
    )
    process.exitCode = 3
  } else if (warnings > 0) {
    log("AVERTISSEMENT", `${warnings} écart(s) sous le seuil bloquant — ${target}`)
    process.exitCode = 3
  } else {
    log("PASS", `invariants, baselines, jeu doré et budget anon au vert — ${target}`)
  }
}

main().catch((error) => {
  // A base that never answered is not a defect this repository owns — #71. Exit 3, like a
  // cancelled invariant: the gate did not look, which is neither green nor red, and the
  // scheduled job wakes nobody on it. Decided on `error.code`, never on the message.
  if (isUnreachable(error)) {
    log(
      "INDÉTERMINÉ",
      `la base n'a pas répondu (${unreachableCode(error)}) — panne amont, aucun invariant joué. Rejouer.`,
    )
    process.exitCode = 3
    return
  }
  log("ERREUR", error instanceof Error ? error.message : String(error))
  process.exitCode = 2
})
