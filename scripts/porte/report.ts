// The report the scheduled gate produces — w1-porte-planifiee (#71), shared with w1-catalogue
// (#73).
//
// Three blocks, and the shape is the deliverable:
//
//   Rien à faire            one line for the whole set, never one per control
//   Changé, sans décision   named and dated, no detail
//   Décision requise        what was measured, when, and which decision is expected.
//                           The only block allowed to be long; empty, the report is three lines.
//
// Three protocols producing three report formats is three things to read, therefore zero
// things read. #73 reuses this module rather than describing the shape again.
//
// The classification is the risk this whole ticket carries. An alert that cries on an upstream
// outage gets muted within a fortnight, and a muted alert is worse than no alert: it removed
// the vigilance without supplying the guarantee. So the decision of what stops being a failure
// is NOT taken here. It is taken inside each arm, on `error.code`, by scripts/eval/upstream.ts
// — #61 for the anonymous gate, #69 for the driver — and this module only reads the exit code
// the arm settled on. Text is never tested. If a class of upstream failure turns out to reach
// here as a red, the fix belongs in upstream.ts, not in a lenient rule at this level: the arm
// holds the error object, this module holds a string, and a string is exactly what #61 refused
// to classify on.

import { carriesDatabaseIdentifier, redact } from "./redaction"

/** 0 PASS · 1 FAIL · 2 ERROR · 3 WARN or INDÉTERMINÉ — the convention all three arms follow. */
export const EXIT = { pass: 0, fail: 1, error: 2, unsettled: 3 } as const

export interface ArmOutcome {
  /** The npm script played, as a human would type it: `eval`, `eval:anon`, `verify:mcp`. */
  name: string
  exitCode: number
  /** stdout and stderr, as captured. Redacted here, never before. */
  output: string
  /**
   * Overrides the decision asked for, for an arm that is not a gate.
   *
   * The ingestion cron reports through this same module — #71 point 4 — and « corriger le
   * défaut ou dire lequel il est » is the wrong sentence for a load that did not run. The
   * override is deliberately per-class and written by the caller, never derived from the
   * output: a decision guessed from a log is a decision nobody signed.
   */
  expected?: string
}

export type Block = "rien" | "change" | "decision"

export interface ArmReading {
  name: string
  exitCode: number
  block: Block
  /** The arm's own last verdict line, redacted — presentation, never classification. */
  headline: string
  /** Only for `decision`: which decision the reader is being asked for. */
  expected?: string
}

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
]

/** « 31 août 2026 ». A measured figure carries its date — CLAUDE.md. */
export function frenchDate(on: Date): string {
  return `${on.getDate()} ${MONTHS[on.getMonth()]} ${on.getFullYear()}`
}

/**
 * Which block an arm lands in, from its exit code alone.
 *
 * `3` is the code the arms use for both « écart sous le seuil bloquant » and « la base a
 * refusé de finir » — neither is a defect this repository owns, and neither asks anybody for
 * anything. An unknown code is treated as a decision: a runner that invents an exit code has
 * done something nobody described, and guessing in the generous direction is how a gate stops
 * gating.
 */
export function blockOf(exitCode: number): Block {
  if (exitCode === EXIT.pass) return "rien"
  if (exitCode === EXIT.unsettled) return "change"
  return "decision"
}

/** What the reader is being asked to decide. Constant per class — never invented per case. */
export function expectedDecision(exitCode: number): string {
  if (exitCode === EXIT.fail) {
    return (
      "corriger le défaut, ou dire lequel des défauts déjà consignés c'est. " +
      "Jamais desserrer un seuil ni regeler une baseline pour éteindre ce rouge."
    )
  }
  if (exitCode === EXIT.error) {
    return (
      "dire si c'est un défaut du dépôt ou une panne amont que la porte ne sait pas encore " +
      "nommer. Si c'est une panne amont, l'apprendre à `scripts/eval/upstream.ts` — au bras, " +
      "qui tient l'erreur et son code — jamais au rapport, qui ne tient qu'un texte."
    )
  }
  return `code de sortie ${exitCode}, hors convention : dire ce qu'il signifie, puis le supprimer.`
}

const VERDICT_LINE = /\b(PASS|FAIL|ÉCHEC|INDÉTERMINÉ|AVERTISSEMENT|ERREUR|contrôles)\b/

/** The arm's own last verdict line — what a human would read at the bottom of a terminal. */
export function headlineOf(output: string): string {
  const lines = output
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const verdict = [...lines].reverse().find((l) => VERDICT_LINE.test(l))
  const line = verdict ?? lines[lines.length - 1] ?? "(aucune sortie)"
  return redact(line).slice(0, 300)
}

export function read(outcome: ArmOutcome): ArmReading {
  const block = blockOf(outcome.exitCode)
  return {
    name: outcome.name,
    exitCode: outcome.exitCode,
    block,
    headline: headlineOf(outcome.output),
    ...(block === "decision" ? { expected: outcome.expected ?? expectedDecision(outcome.exitCode) } : {}),
  }
}

export interface Report {
  markdown: string
  /** True when the third block is non-empty — and only then does anybody get woken up. */
  decisionRequired: boolean
  readings: ArmReading[]
}

const FENCE = "```"

/**
 * Folds the captured output into the body, unless it still names a database.
 *
 * Fails closed: an output the redaction does not fully understand is dropped and its absence
 * is stated, rather than published on the chance that it was harmless.
 */
function foldedOutput(outcome: ArmOutcome): string {
  const cleaned = redact(outcome.output).trimEnd()
  if (cleaned === "") return "_Le bras n'a rien écrit._"
  if (carriesDatabaseIdentifier(cleaned)) {
    return (
      "_Sortie retenue : elle porte encore une forme d'identifiant de base que " +
      "`scripts/porte/redaction.ts` ne sait pas masquer, et ce dépôt est public. " +
      "Lire le journal du run._"
    )
  }
  const tail = cleaned.split(/\r?\n/).slice(-200).join("\n")
  return `<details><summary>Sortie de ${"`"}${outcome.name}${"`"}</summary>\n\n${FENCE}\n${tail}\n${FENCE}\n\n</details>`
}

/**
 * Builds the shared report.
 *
 * `title` names what was played — the same shape serves the evaluation gate and #73's
 * catalogue — so nothing here is specific to the three arms of this ticket.
 */
export function buildReport(outcomes: ArmOutcome[], on: Date, title = "Porte planifiée"): Report {
  const readings = outcomes.map(read)
  const date = frenchDate(on)
  const green = readings.filter((r) => r.block === "rien")
  const changed = readings.filter((r) => r.block === "change")
  const decisions = readings.filter((r) => r.block === "decision")

  const lines: string[] = [`# ${title} — ${date}`, ""]

  lines.push(
    green.length === readings.length
      ? `**Rien à faire.** ${readings.length} bras joués le ${date}, tous au vert.`
      : green.length === 0
        ? `**Rien à faire.** Aucun bras au vert le ${date}.`
        : `**Rien à faire.** ${green.length} bras sur ${readings.length} au vert le ${date} : ` +
          `${green.map((r) => `\`${r.name}\``).join(", ")}.`,
  )
  lines.push("")

  if (changed.length === 0) {
    lines.push("**Changé, sans décision requise.** Rien.")
  } else {
    lines.push("**Changé, sans décision requise.**")
    lines.push("")
    for (const r of changed) lines.push(`- \`${r.name}\` — ${r.headline} (${date}).`)
  }
  lines.push("")

  if (decisions.length === 0) {
    lines.push("**Décision requise.** Aucune.")
    lines.push("")
    return { markdown: lines.join("\n"), decisionRequired: false, readings }
  }

  lines.push(`**Décision requise** — ${decisions.length} bras.`)
  lines.push("")
  for (const r of decisions) {
    const outcome = outcomes.find((o) => o.name === r.name)
    lines.push(`### \`${r.name}\` — sortie ${r.exitCode}`)
    lines.push("")
    lines.push(`**Mesuré** le ${date} : ${r.headline}`)
    lines.push("")
    lines.push(`**Décision attendue** — ${r.expected}`)
    lines.push("")
    if (outcome) lines.push(foldedOutput(outcome))
    lines.push("")
  }
  lines.push(
    "> L'amélioration continue porte sur ce que la porte détecte, jamais sur ce qu'elle " +
      "tolère. Ce rapport n'autorise personne à ajuster un seuil pour éteindre un rouge.",
  )
  lines.push("")

  return { markdown: lines.join("\n"), decisionRequired: true, readings }
}
