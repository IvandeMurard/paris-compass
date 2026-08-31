// Turns what the scheduled workflow captured into the shared report — w1-porte-planifiee (#71).
//
//   npm.cmd run porte:rapport -- --bras .porte/bras.tsv --sortie .porte/rapport.md
//   npm.cmd run porte:rapport -- --echec-ingestion bodacc --sortie .porte/rapport.md
//
// One tab-separated line per arm, written by the workflow step that played it:
//
//   <nom>\t<code de sortie>\t<chemin du journal>
//
// The list of arms therefore lives in exactly one place — the workflow's own steps — and this
// script has no idea which arms exist. That matters: a second list here would be the inventory
// #70 spent a ticket removing, and it would drift on the first arm somebody adds.
//
// It writes the report and, on a runner, sets `decision=true|false` so the next step knows
// whether to wake anybody. It exits 0 either way: a red arm is news for a human, not a reason
// to fail the reporting job and lose the report with it.

import { appendFileSync, readFileSync, writeFileSync } from "fs"

import { buildReport, EXIT, type ArmOutcome } from "./report"

function argument(flag: string): string | undefined {
  const at = process.argv.indexOf(flag)
  return at === -1 ? undefined : process.argv[at + 1]
}

/** Reads the arms the workflow captured, in the order it played them. */
function armsFrom(tsv: string): ArmOutcome[] {
  let recueil: string
  try {
    recueil = readFileSync(tsv, "utf8")
  } catch {
    // No arm ever ran — the checkout, an install or the MCP environment gave way before the
    // first one. Silence here would be a green report on a gate that never opened, which is
    // the one outcome worse than a red.
    return [
      {
        name: "porte",
        exitCode: EXIT.error,
        output: `Aucun bras n'a été joué : ${tsv} est absent. La préparation du job a cédé avant le premier.`,
        expected:
          "lire le journal du run : c'est la mise en place du job qui a échoué, pas un contrôle. " +
          "Tant qu'elle échoue, la porte ne dit rien de l'état du distant.",
      },
    ]
  }
  return recueil
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const [name, code, log] = line.split("\t")
      let output = ""
      try {
        output = readFileSync(log, "utf8")
      } catch {
        // A missing log is not a missing verdict: the exit code is what decides, and saying
        // the log could not be read is more honest than pretending the arm was silent.
        output = `(journal illisible : ${log})`
      }
      return { name, exitCode: Number(code), output }
    })
}

/**
 * The failed scheduled load, as one arm — #71 point 4.
 *
 * Deliberately without the loader's log. The loaders print `connectionTarget()`, and while
 * scripts/porte/redaction.ts masks the shapes it knows, a body that carries nothing cannot
 * leak anything: the run's own journal is one click away for whoever is reading the issue,
 * and it is not public the way the issue is.
 */
function ingestionFailure(source: string, runUrl: string | undefined): ArmOutcome {
  return {
    name: `ingestion (${source})`,
    exitCode: EXIT.fail,
    output:
      `Le chargement planifié de « ${source} » n'est pas allé au bout.\n` +
      `last_success_at n'a donc pas bougé — c'est ce que la table de fraîcheur garantit, et ` +
      `c'est aussi ce qui rend l'échec invisible sans ce signal : run_by = 'schedule' continue ` +
      `d'affirmer que l'automatisation tourne pendant que la donnée vieillit.\n` +
      (runUrl ? `Journal du run : ${runUrl}` : "Journal du run : voir l'onglet Actions."),
    expected:
      "relancer le chargement de cette source, ou dire pourquoi il ne peut pas aboutir. " +
      "Tant que ni l'un ni l'autre n'est fait, la date de fraîcheur affichée par le produit " +
      "est vraie et sans intérêt : elle date la dernière réussite, pas la dernière tentative.",
  }
}

function main(): void {
  const out = argument("--sortie") ?? ".porte/rapport.md"
  const source = argument("--echec-ingestion")
  const arms = source
    ? [ingestionFailure(source, process.env.PORTE_RUN_URL)]
    : armsFrom(argument("--bras") ?? ".porte/bras.tsv")

  const title = source ? "Cron d'ingestion" : "Porte planifiée"
  const report = buildReport(arms, new Date(), title)

  writeFileSync(out, report.markdown, "utf8")
  process.stdout.write(report.markdown + "\n")

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `decision=${report.decisionRequired}\n`)
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, report.markdown + "\n")
  }
}

main()
