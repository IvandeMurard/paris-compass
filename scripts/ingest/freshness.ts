// Lit `compass_source_freshness()` et l'imprime. Aucun effet de bord.
//
//   npm.cmd run freshness
//
// Utilisé par .github/workflows/ingestion.yml en fin de job, y compris quand le chargement a
// échoué : c'est là que le relevé compte le plus, puisqu'il montre que `last_success_at` n'a
// pas bougé. Une exécution ratée ne rajeunit rien.
//
// Les deux colonnes de dates répondent à deux questions différentes et ne doivent jamais être
// fondues en une : `source datée` dit à quel point la donnée est récente, `chargé le` dit à
// quand remonte notre copie. Recharger BODACC aujourd'hui rend la seconde à jour et laisse la
// première où elle est — et un millésime BDCom rechargé ce matin reste un recensement de 2023.

import { connect, connectionTarget, log } from "./lib/db"

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

/** Ce que la cadence déclarée tolère avant qu'une copie ne soit visiblement en retard. */
const TOLERANCE_DAYS: Record<string, number | null> = {
  continuous: 3,
  monthly: 45,
  triennial: 400,
  rare: null, // rien à dire : ces couches ne vieillissent pas en jours
}

async function main(): Promise<void> {
  const client = await connect()
  try {
    log("fraîcheur", connectionTarget())
    const { rows } = await client.query<Row>("select * from public.compass_source_freshness()")

    const cell = (s: string, w: number) => s.padEnd(w)
    process.stdout.write(
      `\n${cell("source", 11)}${cell("cadence", 12)}${cell("source datée", 14)}${cell("chargé le", 12)}` +
        `${cell("âge", 7)}${cell("lignes", 10)}${cell("par", 15)}état\n`,
    )
    process.stdout.write(`${"-".repeat(88)}\n`)

    let late = 0
    for (const r of rows) {
      const tolerance = TOLERANCE_DAYS[r.cadence] ?? null
      let state: string
      if (r.ingested_at === null) {
        // Jamais chargé n'est pas « très vieux » : c'est une absence de mesure, et la
        // distinguer est la même règle que partout ailleurs dans ce produit.
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
          cell(r.run_by ?? "—", 15) +
          state +
          "\n",
      )
    }

    // Seul `schedule` compte comme cadence tenue. Un `workflow-dispatch` tourne sur un runner
    // mais reste une intervention humaine — le « Fait quand » de w0-cron demande un cron qui
    // s'est déclenché seul, et confondre les deux rendrait le critère inatteignable à vérifier.
    const scheduled = rows.filter((r) => r.run_by === "schedule").length
    process.stdout.write(
      `\n${rows.length} sources — ${scheduled} rafraîchie(s) par un cron, ` +
        `${rows.filter((r) => r.run_by === "workflow-dispatch").length} par un lancement manuel du workflow, ` +
        `${rows.filter((r) => r.run_by === "manual").length} depuis un terminal, ` +
        `${rows.filter((r) => r.run_by === null).length} jamais chargée(s) depuis cette table.\n`,
    )

    // Déclaré, pas affirmé. Tant que ce compteur est à zéro, aucune date de cette table n'est
    // adossée à un rafraîchissement réel — et c'est la faute que PLAN.md §2.2ter décrit comme
    // le loyer fabriqué sous une autre forme.
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
