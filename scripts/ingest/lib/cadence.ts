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
// ── `rare` has no threshold at all, and that is a decision rather than an omission ────────
//
// Decided by Ivan on 1 September 2026, reversing the 400 days this file carried for a few
// hours: more than a year is not a threshold, it is a number that would fire long after
// anybody could act on it, and a threshold nobody acts on is the alert that gets muted.
//
// The reason it costs little is worth writing down, because it is not obvious and it is what
// makes the null honest rather than lazy: **all eight crons live in one workflow file**. The
// liveness risk these layers actually face is not a slow quarter — it is GitHub disabling the
// scheduled workflows of a quiet public repository after 60 days, which disables
// `ingestion.yml` whole, not one entry. `bodacc` sits in the same file with a three-day
// tolerance, so it goes red within three days of that happening and takes the answer for all
// eight with it. A per-cron threshold on `rare` would buy the case that `bodacc` does not
// already cover, and only that case.
//
// What it therefore does NOT catch, and it must be named: a failure specific to one of these
// crons — the PLU loader throwing every 9 March while the rest of the file runs. That fails
// the job, and the ingestion workflow opens an issue for it (#71, point 4). It is caught by
// the run failing, never by this table.
//
// ── Every cadence of the enum, and no silent default ──────────────────────────────────────
//
// `weekly` was added to `public.ingestion_cadence` on 25 August 2026 by
// 20260825000006_chantier_cadence.sql and never reached the tolerance table, which read
// `TOLERANCE_DAYS[cadence] ?? null`. `chantiers` — the one source declared weekly, and the one
// reloaded by hand — was therefore reported "à jour" at any age whatsoever. DIAGNOSTIC.md §31.
//
// So the distinction this file turns on is between a null WRITTEN here and a key MISSING from
// here. The first is a decision, taken above, with its reason. The second is a migration this
// file has not caught up with, and `toleranceOf` throws on it. `?? null` collapsed the two,
// which is precisely how the defect happened: it answered "nothing to say" to a question
// nobody had been asked.

/** The values of `public.ingestion_cadence`, in the order the enum declares them. */
export const CADENCES = ["continuous", "monthly", "triennial", "rare", "weekly"] as const

export type Cadence = (typeof CADENCES)[number]

/**
 * Days our copy may go unrefreshed before it is visibly behind, per declared cadence. `null`
 * means "no threshold, deliberately" — see the header; a MISSING key means "not decided", and
 * `toleranceOf` throws on it.
 *
 * Each number is the source's own rhythm plus one grace period, so that a single missed run
 * shows and a scheduling lag does not. GitHub's scheduled runs are commonly late by tens of
 * minutes and occasionally skipped outright, which is precisely a thing worth seeing once and
 * not worth waking anybody for twice.
 */
export const TOLERANCE_DAYS: Record<Cadence, number | null> = {
  // BODACC publishes every working day and the cron runs daily: three days covers a long
  // weekend plus one skipped run. This is also the canary for the whole workflow file — see
  // the header on why `rare` and `triennial` can then do without a threshold of their own.
  continuous: 3,
  // The weekly cron plus three days. One missed week shows on the tenth day.
  weekly: 10,
  // INSEE republishes monthly, the crons run on the 2nd and the 3rd: 45 days is one missed
  // month and a half, and cannot be reached by a cron that fires.
  monthly: 45,
  // No threshold. Same decision, and the same reason, as `rare` below: BDCom is surveyed every
  // three years and the quarterly cron only verifies, so any threshold worth having would sit
  // beyond a year — far past the point where somebody could still act on it.
  triennial: null,
  // No threshold, decided 1 September 2026. Geography, PLU and terrasses are verification
  // cadences on layers that do not age in days; the liveness risk they run is the workflow
  // being disabled, and `continuous` above catches that for the whole file in three days.
  rare: null,
}

/** The tolerance for a cadence, or `null` for the cadences deliberately given no threshold. */
export function toleranceOf(cadence: string): number | null {
  if (!Object.prototype.hasOwnProperty.call(TOLERANCE_DAYS, cadence)) {
    throw new Error(
      `cadence « ${cadence} » inconnue de scripts/ingest/lib/cadence.ts. ` +
        "Une valeur ajoutée à public.ingestion_cadence doit être tranchée ici — un seuil, ou " +
        "un null avec sa raison écrite. La lire comme « rien à dire » est le défaut §31.",
    )
  }
  return TOLERANCE_DAYS[cadence as Cadence]
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

export type FreshnessState = "a-jour" | "jamais-charge" | "en-retard" | "sans-seuil"

export interface FreshnessVerdict {
  state: FreshnessState
  /** The tolerance the verdict was taken against, or `null` where there is none. */
  toleranceDays: number | null
  label: string
}

/**
 * The verdict on one row of `compass_source_freshness()`.
 *
 * Four states, and the three that are not "à jour" are three different answers rather than
 * three flavours of the same one:
 *
 *   jamais-charge  an absence of measurement, never "very old". The rule that governs every
 *                  figure in this product.
 *   sans-seuil     loaded, and this table has not judged how recently — the cadence carries no
 *                  threshold by decision. It is deliberately NOT reported as "à jour": saying
 *                  "up to date" about something nothing checked is the small lie DIAGNOSTIC.md
 *                  §31 was made of, and the decision to have no threshold does not licence it.
 *   en-retard      measured past its declared tolerance.
 */
export function verdictOf(row: { cadence: string; ageDays: number | null }): FreshnessVerdict {
  const toleranceDays = toleranceOf(row.cadence)
  if (row.ageDays === null) {
    return { state: "jamais-charge", toleranceDays, label: "jamais chargé" }
  }
  if (toleranceDays === null) {
    return { state: "sans-seuil", toleranceDays, label: "sans seuil (vérification)" }
  }
  if (row.ageDays > toleranceDays) {
    return { state: "en-retard", toleranceDays, label: `EN RETARD (> ${toleranceDays} j)` }
  }
  return { state: "a-jour", toleranceDays, label: "à jour" }
}
