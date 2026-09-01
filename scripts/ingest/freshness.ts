// Reads compass_source_freshness(), prints it, and settles a verdict on it.
//
//   npm.cmd run freshness                  # relevé + verdict, exit code as below
//   npx.cmd tsx scripts/ingest/freshness.ts --releve-seul   # relevé only, always exit 0
//
// Played twice, for two different questions:
//
//   .github/workflows/ingestion.yml  at the end of every job, including a failed one, with
//                                    `--releve-seul`. There the reading matters most on
//                                    failure, because it shows `last_success_at` did not move
//                                    — a failed run refreshes nothing. It must not judge the
//                                    other seven sources: a red there would name the wrong
//                                    dataset in an issue titled « chargement en échec ».
//   .github/workflows/porte.yml      as an arm of the scheduled gate, every morning, with the
//                                    verdict on. That is where the state of the remote as a
//                                    whole is judged — w1-cadence (#70), point 3.
//
// ── The exit codes, and what each one asks of a reader — #70 point 3 ──────────────────────
//
// Until 1 September 2026 nothing was decided here: the script printed « EN RETARD » and left
// with 0, so a source three weeks past a weekly cadence produced a line nobody was shown. The
// convention is the gate's own — scripts/porte/report.ts — and the classification is taken
// HERE, where the measurement exists, never in the report, which holds a string.
//
//   0  every source within its declared tolerance. Nothing to do.
//   3  at least one source never loaded, or loaded but never by a cron. Changed, no decision:
//      a cadence declared and not yet demonstrated is a known state of this project, not a
//      defect, and waking somebody for it every morning is how an alert gets muted.
//   1  at least one source past its declared tolerance, or the remote's list of sources
//      differing from the one the migrations declare. Decision required, and the decision is
//      never « widen the tolerance ».
//
// ── What this does NOT catch, and it must be named ────────────────────────────────────────
//
// A cadence held is not a load that succeeded, and neither is a load that succeeded a load
// that loaded the right thing. `last_success_at` moves when the loader did not throw; a source
// that starts publishing an empty layer would refresh this date every week and stay green here
// forever. That is the business of the evaluation gate and its baselines, not of this table.
//
// Output strings stay in French: this is product-facing reporting, read by whoever runs the
// pipeline (CLAUDE.md — comments in English, product documentation in French).

import { readDeclaredSources } from "../porte/cadences"
import { reconcileSources, verdictOf } from "./lib/cadence"
import { assertPrivileged, connect, connectionTarget, log } from "./lib/db"

interface Row {
  source: string
  label: string
  cadence: string
  cadence_note: string
  source_as_of: string | null
  /** `node-postgres` renders timestamptz as a Date, not a string — hence the parse below. */
  ingested_at: Date | null
  row_count: number | null
  run_by: string | null
  run_ref: string | null
  age_days: number | null
}

/** ISO day, in UTC. `Date.toString()` gives "Tue Aug 25 …", which is not a date a log should carry. */
const isoDay = (d: Date | null): string => (d === null ? "—" : d.toISOString().slice(0, 10))

/** 0 PASS · 1 FAIL · 3 WARN — scripts/porte/report.ts, the convention every arm follows. */
const EXIT = { pass: 0, fail: 1, unsettled: 3 } as const

async function main(): Promise<void> {
  const releveSeul = process.argv.includes("--releve-seul")

  // Same guard as the loaders, although this script only reads: run at the end of a job with
  // `if: always()`, it is often the first thing read when something broke. Without the guard a
  // badly set secret surfaced here as "getaddrinfo EAI_AGAIN db" — an apparent network outage
  // where the cause was the value of the secret.
  assertPrivileged()
  const client = await connect()
  try {
    log("fraîcheur", connectionTarget())
    const { rows } = await client.query<Row>("select * from public.compass_source_freshness()")

    const cell = (s: string, w: number) => s.padEnd(w) + " "
    process.stdout.write(
      `\n${cell("source", 13)}${cell("cadence", 11)}${cell("source datée", 13)}${cell("chargé le", 11)}` +
        `${cell("âge", 6)}${cell("lignes", 9)}${cell("par", 18)}état\n`,
    )
    process.stdout.write(`${"-".repeat(96)}\n`)

    let late = 0
    let never = 0
    let unjudged = 0
    for (const r of rows) {
      // Throws on a cadence the tolerance table has no ENTRY for, rather than reading it as
      // "nothing to say" — that fallback is exactly how `weekly` went unwatched for a week
      // (DIAGNOSTIC.md §31). A cadence entered as `null` is a decision, and comes back as
      // `sans-seuil` rather than as `à jour`.
      const verdict = verdictOf({ cadence: r.cadence, ageDays: r.age_days })
      if (verdict.state === "en-retard") late += 1
      if (verdict.state === "jamais-charge") never += 1
      if (verdict.state === "sans-seuil") unjudged += 1

      process.stdout.write(
        cell(r.source, 13) +
          cell(r.cadence, 11) +
          cell(r.source_as_of ?? "—", 13) +
          cell(isoDay(r.ingested_at), 11) +
          cell(r.age_days === null ? "—" : `${r.age_days} j`, 6) +
          cell(r.row_count === null ? "—" : r.row_count.toLocaleString("fr-FR"), 9) +
          cell(r.run_by ?? "—", 18) +
          verdict.label +
          "\n",
      )
    }

    // Only `schedule` counts as a cadence actually kept. A `workflow-dispatch` runs on a
    // runner but is still a human action — w0-cron's criterion asks for a cron that fired on
    // its own, and conflating the two would make that criterion impossible to check.
    const scheduled = rows.filter((r) => r.run_by === "schedule").length
    process.stdout.write(
      `\n${rows.length} sources — ${scheduled} rafraîchie(s) par un cron, ` +
        `${rows.filter((r) => r.run_by === "workflow-dispatch").length} par un lancement manuel du workflow, ` +
        `${rows.filter((r) => r.run_by === "manual").length} depuis un terminal, ` +
        `${rows.filter((r) => r.run_by === null).length} jamais chargée(s) depuis cette table.\n`,
    )

    const drift = reconcileSources(rows.map((r) => r.source), readDeclaredSources().map((d) => d.source))
    for (const complaint of drift) process.stdout.write(`\n  ÉCART  ${complaint}\n`)

    if (late > 0) process.stdout.write(`\n${late} source(s) au-delà de leur cadence déclarée.\n`)
    if (unjudged > 0) {
      // Named rather than counted silently: these rows are not green, they are unjudged, and
      // a reader must be able to tell which. Decision of 1 September 2026 — the threshold that
      // would have covered them sat beyond a year, and `bodacc` covers the case that matters
      // (the workflow being disabled) for the whole file in three days.
      process.stdout.write(
        `\n${unjudged} source(s) sans seuil de retard, par décision : leur cadence est une cadence\n` +
          "de vérification sur des couches qui ne vieillissent pas en jours. Ce qui les surveille est\n" +
          "`bodacc`, dans le même fichier de workflow — voir scripts/ingest/lib/cadence.ts.\n",
      )
    }

    // Declared, not asserted. While this counter is zero, no date in this table is backed by a
    // real refresh — the failure PLAN.md §2.2ter calls the fabricated rent in another form.
    if (scheduled === 0) {
      process.stdout.write(
        "\nAucune source n'a encore été rafraîchie par un cron. Les dates ci-dessus sont donc\n" +
          "réelles mais leur entretien n'est pas démontré : cadence déclarée, pas tenue.\n",
      )
    }

    if (releveSeul) {
      process.stdout.write("\nRELEVÉ SEUL — aucun verdict rendu (--releve-seul).\n")
      return
    }

    if (late > 0 || drift.length > 0) {
      process.stdout.write(
        `\nÉCHEC — ${late} source(s) au-delà de leur cadence, ${drift.length} écart(s) entre le distant\n` +
          "et les migrations. Corriger le déclencheur ou le chargeur ; jamais élargir la tolérance de\n" +
          "scripts/ingest/lib/cadence.ts pour éteindre ce rouge.\n",
      )
      process.exitCode = EXIT.fail
      return
    }
    if (never > 0 || scheduled < rows.length) {
      process.stdout.write(
        `\nINDÉTERMINÉ — ${never} source(s) jamais chargée(s), ` +
          `${rows.length - scheduled} dont l'entretien n'est pas encore démontré par un cron.\n` +
          "Aucune décision attendue : les cadences les plus lentes n'ont pas encore eu leur tour.\n",
      )
      process.exitCode = EXIT.unsettled
      return
    }
    process.stdout.write(
      `\nPASS — ${rows.length} sources rafraîchies par un cron, ${rows.length - unjudged} dans leur cadence, ` +
        `${unjudged} sans seuil par décision.\n`,
    )
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  log("ÉCHEC", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
