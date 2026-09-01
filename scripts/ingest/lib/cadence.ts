// What a declared cadence tolerates, and what it means to be past it — w1-cadence (#70), point 3.
//
// Split out of freshness.ts so that both the reading side (freshness.ts, which asks the remote)
// and the rule side (scripts/porte/cadences.ts, which asks the repository) settle the vocabulary
// in one place, and so a test can reach the decision without a database.
//
// ── The tolerance is the tolerance of the VERIFICATION, not of the data ───────────────────
//
// `ingestion_run` keeps two facts apart on purpose: `source_as_of` says how current the data
// is, `last_success_at` says when our copy was refreshed. `age_days` is derived from the
// second, so what these numbers bound is how long we may go without *checking* — never how
// long the data may stay old. A 2023 BDCom survey verified this morning is in date here and
// still three years old, and that is correct.
//
// This is why `rare` carries a number rather than a null. Until 1 September 2026 it carried
// null, with the comment "nothing to say: these layers do not age in days" — true of the
// layers, false of our verification of them. A PLU reload that stopped firing a year ago is
// exactly the silence this table exists to break.
//
// ── Every cadence of the enum, and no silent default ──────────────────────────────────────
//
// `weekly` was added to `public.ingestion_cadence` on 25 August 2026 by
// 20260825000006_chantier_cadence.sql and never reached the tolerance table, which read
// `TOLERANCE_DAYS[cadence] ?? null`. `chantiers` — the one source declared weekly, and the one
// reloaded by hand — was therefore reported "à jour" at any age whatsoever. DIAGNOSTIC.md §31.
// Hence `toleranceOf` throws on a cadence it does not know rather than falling back: an
// unknown cadence is a migration this file has not caught up with, and reading it as "nothing
// to say" is how the defect happened the first time.

/** The values of `public.ingestion_cadence`, in the order the enum declares them. */
export const CADENCES = ["continuous", "monthly", "triennial", "rare", "weekly"] as const

export type Cadence = (typeof CADENCES)[number]

/**
 * Days our copy may go unrefreshed before it is visibly behind, per declared cadence.
 *
 * Each number is the source's own rhythm plus one grace period, so that a single missed run
 * shows and a scheduling lag does not. GitHub's scheduled runs are commonly late by tens of
 * minutes and occasionally skipped outright, which is precisely a thing worth seeing once and
 * not worth waking anybody for twice.
 */
export const TOLERANCE_DAYS: Record<Cadence, number> = {
  // BODACC publishes every working day and the cron runs daily: three days covers a long
  // weekend plus one skipped run.
  continuous: 3,
  // The weekly cron plus three days. One missed week shows on the tenth day.
  weekly: 10,
  // INSEE republishes monthly, the crons run on the 2nd and the 3rd: 45 days is one missed
  // month and a half, and cannot be reached by a cron that fires.
  monthly: 45,
  // BDCom is surveyed every three years; the cron verifies quarterly. 400 days is more than
  // four missed verifications — it catches a workflow that has stopped, not a slow quarter.
  triennial: 400,
  // Twice-a-year verification cadence for the layers that barely move (geography, PLU,
  // terrasses). Same reading as `triennial`: it catches a cron that died, not a stale layer.
  rare: 400,
}

export function toleranceOf(cadence: string): number {
  const days = TOLERANCE_DAYS[cadence as Cadence]
  if (days === undefined) {
    throw new Error(
      `cadence « ${cadence} » inconnue de scripts/ingest/lib/cadence.ts. ` +
        "Une valeur ajoutée à public.ingestion_cadence doit recevoir sa tolérance ici — " +
        "la lire comme « rien à dire » est le défaut §31.",
    )
  }
  return days
}

/**
 * The remote's own list of sources, against the one the migrations declare.
 *
 * scripts/porte/cadences.ts enumerates the second in `npm run test`, with no database, and that
 * is where the ninth source is caught on the day its migration is written. This is the other
 * direction, and it is the one no repository check can do: a row inserted out of band — psql,
 * the Supabase console, a migration applied and never committed — carries a declared cadence
 * that no workflow will ever hold, and nothing in the repository would ever see it.
 *
 * Both directions are reported, because they are two different failures: a row the repository
 * does not know is an ungoverned cadence, a row the repository declares and the remote lacks is
 * a migration that has not been applied.
 */
export function reconcileSources(remote: string[], declared: string[]): string[] {
  const known = new Set(declared)
  const present = new Set(remote)
  const complaints: string[] = []
  for (const source of remote) {
    if (!known.has(source)) {
      complaints.push(
        `« ${source} » existe sur le distant et aucune migration ne la déclare : sa cadence ` +
          "n'est donc tenue par rien, et scripts/porte/cadences.ts ne peut pas la voir",
      )
    }
  }
  for (const source of declared) {
    if (!present.has(source)) {
      complaints.push(
        `« ${source} » est déclarée par une migration et absente du distant : la migration ` +
          "n'est pas appliquée, ou la ligne a été supprimée",
      )
    }
  }
  return complaints
}

export type FreshnessState = "a-jour" | "jamais-charge" | "en-retard"

export interface FreshnessVerdict {
  state: FreshnessState
  /** The tolerance the verdict was taken against, for a caller that prints it. */
  toleranceDays: number
  label: string
}

/**
 * The verdict on one row of `compass_source_freshness()`.
 *
 * "Never loaded" is not "very old": it is an absence of measurement, and the two are different
 * answers — the same rule that governs every figure in this product. It does not count as late,
 * and it is not silent either: it gets its own state and its own line.
 */
export function verdictOf(row: { cadence: string; ageDays: number | null }): FreshnessVerdict {
  const toleranceDays = toleranceOf(row.cadence)
  if (row.ageDays === null) {
    return { state: "jamais-charge", toleranceDays, label: "jamais chargé" }
  }
  if (row.ageDays > toleranceDays) {
    return { state: "en-retard", toleranceDays, label: `EN RETARD (> ${toleranceDays} j)` }
  }
  return { state: "a-jour", toleranceDays, label: "à jour" }
}
