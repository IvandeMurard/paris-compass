// The one channel a red reaches a human through — w1-porte-planifiee (#71), points 2 and 4.
//
//   npm.cmd run porte:signal -- --corps .porte/rapport.md --titre "Porte planifiée" --label porte-rouge
//
// One open issue at a time per label. A second red the next morning becomes a comment on the
// issue that is already open, never a second issue: an alert that produces one notification a
// day for the same defect is an alert somebody will filter, and a filtered alert removed the
// vigilance without supplying the guarantee. Same reasoning as refusing to cry on an upstream
// outage, applied to repetition instead of to cause.
//
// The evaluation gate and the ingestion cron both come through here, which is what « sur le
// même canal » means: same label, same de-duplication, same three-block body.
//
// Last boundary before a public repository. The body is checked once more for anything that
// names a database, and the script refuses rather than publishes — scripts/porte/report.ts
// already drops output it cannot fully mask, so a refusal here means a shape neither of them
// knows, and guessing at that point would be the one mistake that cannot be taken back.

import { execFileSync } from "child_process"
import { readFileSync } from "fs"

import { ageEnHeures, PALIERS_JOURS, titreEscalade } from "./etat"
import { carriesDatabaseIdentifier } from "./redaction"

function argument(flag: string, fallback?: string): string {
  const at = process.argv.indexOf(flag)
  const value = at === -1 ? undefined : process.argv[at + 1]
  if (value === undefined && fallback === undefined) {
    throw new Error(`${flag} est obligatoire`)
  }
  return value ?? (fallback as string)
}

/** `gh`, with its output captured. It is the only way to know whether an issue is still open. */
function gh(args: string[], input?: string): string {
  return execFileSync("gh", args, {
    encoding: "utf8",
    input,
    maxBuffer: 16 * 1024 * 1024,
  }).trim()
}

/**
 * Carry the age in the title, at the steps `etat.ts` declares and nowhere else — w1-porte-lue
 * (#77).
 *
 * The comment above has already gone out; this adds no notification of its own on the mornings
 * it changes nothing, and `titreEscalade` is idempotent, so it changes nothing on all but two
 * mornings of an issue's whole life. Renaming every morning would rebuild, one level up, the
 * very filter this file refuses: what it wrote about a second issue holds for a second title.
 *
 * What it does NOT catch, and `porte:etat` is the answer: this runs only on a morning the gate
 * is red. An issue left open while the gate goes green never ages in its own title. The reader
 * computes the age live; the title is a convenience for the issue list, not the measure.
 */
function escalade(issue: { number: number; title: string; createdAt: string }): void {
  const jours = ageEnHeures(issue.createdAt, new Date()) / 24
  const voulu = titreEscalade(issue.title, jours)
  if (voulu === issue.title) return
  gh(["issue", "edit", String(issue.number), "--title", voulu])
  process.stdout.write(
    `Titre porté à « ${voulu} » — paliers ${PALIERS_JOURS.join(" et ")} jours, jamais quotidien.\n`,
  )
}

function main(): void {
  const body = readFileSync(argument("--corps"), "utf8")
  const title = argument("--titre")
  const label = argument("--label", "porte-rouge")

  if (carriesDatabaseIdentifier(body)) {
    process.stderr.write(
      "Le corps porte encore une forme d'identifiant de base après masquage, et ce dépôt est " +
        "public. Rien n'est publié. Ajouter la forme à scripts/porte/redaction.ts, avec son test.\n",
    )
    process.exitCode = 1
    return
  }

  // The label has to exist before an issue can carry it, and a runner cannot be assumed to
  // have been set up by hand. Creating it is idempotent; `gh` fails when it is already there,
  // which is the expected case and not an error.
  try {
    gh(["label", "create", label, "--description", "Rouge d'une porte planifiée — #71", "--color", "B60205"])
  } catch {
    // Already exists.
  }

  const open = gh([
    "issue", "list", "--label", label, "--state", "open", "--limit", "1",
    "--json", "number,title,createdAt",
  ])
  const existing = (JSON.parse(open || "[]") as { number: number; title: string; createdAt: string }[])[0]

  if (existing) {
    gh(["issue", "comment", String(existing.number), "--body-file", "-"], body)
    process.stdout.write(`Commenté sur l'issue #${existing.number} — un rouge ouvert le reste.\n`)
    escalade(existing)
    return
  }

  const url = gh(["issue", "create", "--title", title, "--label", label, "--body-file", "-"], body)
  process.stdout.write(`Issue ouverte : ${url}\n`)
}

main()
