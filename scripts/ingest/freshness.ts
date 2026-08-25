// Reads compass_source_freshness() and prints it. No side effects.
//
//   npm.cmd run freshness
//
// Used by .github/workflows/ingestion.yml at the end of every job, including one that failed:
// that is when the reading matters most, because it shows `last_success_at` did not move. A
// failed run refreshes nothing.
//
// The two date columns answer different questions and must never be melted into one:
// "source datée" says how current the data is, "chargé le" says when our copy was refreshed.
// Reloading BODACC today brings the second up to date and leaves the first where it was — and
// a BDCom vintage reloaded this morning is still a 2023 survey.
//
// Output strings stay in French: this is product-facing reporting, read by whoever runs the
// pipeline (CLAUDE.md — comments in English, product documentation in French).

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

/** What each declared cadence tolerates before a copy is visibly behind. */
const TOLERANCE_DAYS: Record<string, number | null> = {
  continuous: 3,
  monthly: 45,
  triennial: 400,
  rare: null, // nothing to say: these layers do not age in days
}

async function main(): Promise<void> {
  // Same guard as the loaders, although this script only reads: run at the end of a job with
  // `if: always()`, it is often the first thing read when something broke. Without the guard a
  // badly set secret surfaced here as "getaddrinfo EAI_AGAIN db" — an apparent network outage
  // where the cause was the value of the secret.
  assertPrivileged()
  const client = await connect()
  try {
    log("fraîcheur", connectionTarget())
    const { rows } = await client.query<Row>("select * from public.compass_source_freshness()")

    const cell = (s: string, w: number) => s.padEnd(w)
    process.stdout.write(
      `\n${cell("source", 11)}${cell("cadence", 12)}${cell("source datée", 14)}${cell("chargé le", 12)}` +
        `${cell("âge", 7)}${cell("lignes", 10)}${cell("par", 19)}état\n`,
    )
    process.stdout.write(`${"-".repeat(92)}\n`)

    let late = 0
    for (const r of rows) {
      const tolerance = TOLERANCE_DAYS[r.cadence] ?? null
      let state: string
      if (r.ingested_at === null) {
        // Never loaded is not "very old": it is an absence of measurement, and keeping the two
        // apart is the same rule that governs everything else in this product.
        state = "jamais chargé"
      } else if (tolerance !== null && r.age_days !== null && r.age_days > tolerance) {
        state = `EN RETARD (> ${tolerance} j)`
        late += 1
      } else {
        state = "à jour"
      }

      process.stdout.write(
        cell(r.source, 11) +
          cell(r.cadence, 12) +
          cell(r.source_as_of ?? "—", 14) +
          cell(isoDay(r.ingested_at), 12) +
          cell(r.age_days === null ? "—" : `${r.age_days} j`, 7) +
          cell(r.row_count === null ? "—" : r.row_count.toLocaleString("fr-FR"), 10) +
          cell(r.run_by ?? "—", 19) +
          state +
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

    // Declared, not asserted. While this counter is zero, no date in this table is backed by a
    // real refresh — the failure PLAN.md §2.2ter calls the fabricated rent in another form.
    if (scheduled === 0) {
      process.stdout.write(
        "\nAucune source n'a encore été rafraîchie par un cron. Les dates ci-dessus sont donc\n" +
          "réelles mais leur entretien n'est pas démontré : cadence déclarée, pas tenue.\n",
      )
    }
    if (late > 0) {
      process.stdout.write(`\n${late} source(s) au-delà de leur cadence déclarée.\n`)
    }
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  log("ÉCHEC", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
