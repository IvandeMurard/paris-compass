// Le douzième bras — w1-ledger (#82).
//
//   npm.cmd run ledger
//
// Reads `supabase_migrations.schema_migrations` on the remote, reads the migrations git tracks,
// and compares them in both directions. The rule itself is in scripts/porte/ledger.ts, which
// touches neither database nor network: this file is the half that measures, that one is the
// half that decides, and the seventh act of `porte:sabotage` plays the deciding half for real
// rather than a copy of it.
//
// Why the arm is cheap, and why that matters for a daily cadence: one query on a table of 53
// rows, no scan, no join against anything modelled. It sits beside `freshness` in that respect
// — the two arms that cost nothing and answer a question no other arm asks.
//
// ── The exit codes, and what each asks of a reader — the convention of report.ts ───────────
//
//   0  every applied migration is tracked, every tracked migration is applied, every body
//      matches or its divergence is recorded. Nothing to do.
//   3  something is in flight or unmeasurable: a tracked migration the remote has not applied
//      yet — normal between writing a file and pushing it — or a ledger row that kept no text,
//      so only its identifier could be compared. Changed, no decision required.
//   1  a migration is applied and tracked by nobody; or a body diverges with nothing saying
//      why; or a recorded divergence no longer describes what is there. Decision required.
//   2  the arm could not measure. An unreachable remote is NOT this: it is classified as an
//      upstream outage by scripts/eval/upstream.ts, the way #61, #69 and #71 already do, and it
//      leaves at 3. An alert that cries when the pooler is briefly down gets muted within a
//      fortnight, and a muted alert removed the vigilance without supplying the guarantee.

import {
  classifyLedger,
  demandeUneDecision,
  estApparie,
  migrationsSuivies,
  readDivergencesAdmises,
  type LedgerRow,
} from "./ledger"
import { buildReport, EXIT, type ArmOutcome } from "./report"
import { connect, connectionTarget } from "../ingest/lib/db"
import { isUnreachable, unreachableCode } from "../eval/upstream"

const DECISION_ABSENTE =
  "committer le fichier de migration manquant, ou dire pourquoi le schéma appliqué n'aura " +
  "jamais de fichier — auquel cas plus personne ne peut reconstruire cette base. Regarder " +
  "d'abord `git status supabase/migrations/` : le fichier est peut-être sur le disque et non " +
  "suivi, ce qui est exactement l'incident du 5 septembre 2026."

const DECISION_CORPS =
  "établir laquelle des deux causes s'applique, et l'écrire. Un fichier réécrit après son " +
  "application est un fait du passé : il se consigne dans `corps-diverge` de " +
  "scripts/porte/ledger.json, avec sa raison et les deux empreintes que le bras vient " +
  "d'imprimer. Un fichier suivi qui n'est pas celui qui a été posé est un défaut : il se " +
  "corrige, et une migration de plus le rattrape."

const DECISION_PERIMEE =
  "remesurer. La raison écrite dans scripts/porte/ledger.json couvre un état qui a changé — " +
  "soit le fichier a été réécrit une seconde fois, soit la migration a été rejouée. Reprendre " +
  "les deux empreintes imprimées ci-dessus, et redater la raison plutôt que de la reporter."

async function lireLedger(): Promise<LedgerRow[]> {
  const client = await connect()
  try {
    const { rows } = await client.query<LedgerRow>(
      "select version, name, statements from supabase_migrations.schema_migrations order by version",
    )
    return rows
  } finally {
    await client.end()
  }
}

async function main(): Promise<void> {
  const cible = connectionTarget()
  process.stdout.write(`CIBLE — ${cible}\n`)

  const files = migrationsSuivies()
  const admises = readDivergencesAdmises()

  let rows: LedgerRow[]
  try {
    rows = await lireLedger()
  } catch (error) {
    // The remote being unreachable is an upstream outage, not a defect of this repository —
    // and the classification is taken HERE, where the error object and its `code` exist, never
    // in the report, which holds a string. #61 refused to classify on text once and for all.
    if (isUnreachable(error)) {
      process.stdout.write(
        `\nINDÉTERMINÉ — le distant n'a pas répondu (${unreachableCode(error)}) : ` +
          "le ledger n'a pas pu être lu, et rien n'est affirmé sur l'écart.\n",
      )
      process.exitCode = EXIT.unsettled
      return
    }
    process.stdout.write(`\nERREUR — ${String(error).slice(0, 300)}\n`)
    process.exitCode = EXIT.error
    return
  }

  const verdicts = classifyLedger(rows, files, admises)

  for (const v of verdicts) {
    const marque = estApparie(v.state) ? "ok   " : demandeUneDecision(v.state) ? "FAIL " : "susp "
    // The green rows are the bulk and they carry no news: one line each would bury the two or
    // three that do. Only what is not plainly matched is printed.
    if (v.state === "apparie") continue
    process.stdout.write(`  ${marque} ${v.version}  ${v.state} — ${v.detail}\n`)
  }

  const apparies = verdicts.filter((v) => v.state === "apparie").length
  const admis = verdicts.filter((v) => v.state === "corps-admis").length
  const rouges = verdicts.filter((v) => demandeUneDecision(v.state))
  const bouges = verdicts.filter((v) => !estApparie(v.state) && !demandeUneDecision(v.state))

  const outcomes: ArmOutcome[] = []
  const decisionPour = (state: string): string => {
    if (state === "absent-du-depot") return DECISION_ABSENTE
    if (state === "corps-admis-perime") return DECISION_PERIMEE
    return DECISION_CORPS
  }
  for (const v of rouges) {
    outcomes.push({
      name: `ledger ${v.version}`,
      exitCode: EXIT.fail,
      output: `FAIL  ${v.state} — ${v.detail}`,
      expected: decisionPour(v.state),
    })
  }
  for (const v of bouges) {
    outcomes.push({
      name: `ledger ${v.version}`,
      exitCode: EXIT.unsettled,
      output: `susp  ${v.state} — ${v.detail}`,
    })
  }
  if (outcomes.length === 0) {
    outcomes.push({
      name: "ledger",
      exitCode: EXIT.pass,
      output:
        `${rows.length} migrations posées sur le distant, ${files.length} suivies par git, ` +
        `${apparies} appariées corps compris, ${admis} divergence(s) consignée(s). Aucun écart.`,
    })
  }

  const report = buildReport(outcomes, new Date(), "Ledger de migrations")
  process.stdout.write("\n" + report.markdown + "\n")

  const resume =
    `${rows.length} au ledger, ${files.length} suivies par git — ${apparies} appariées, ` +
    `${admis} consignée(s), ${bouges.length} en vol ou incomparable(s), ${rouges.length} en écart`

  if (rouges.length > 0) {
    process.stdout.write(`\nÉCHEC — ${resume}\n`)
    process.exitCode = EXIT.fail
    return
  }
  if (bouges.length > 0) {
    process.stdout.write(`\nINDÉTERMINÉ — ${resume}\n`)
    process.exitCode = EXIT.unsettled
    return
  }
  process.stdout.write(`\nPASS — ${resume}\n`)
}

await main()
