// The proof that the scheduled gate actually closes the door — w1-porte-planifiee (#71).
//
//   npm.cmd run porte:sabotage
//
// Three acts, on the model of `eval:sabotage`: a rule nobody plays is a comment, and the rules
// here claim things about an arm that does not exist yet and about an outage that has not
// happened yet. Nothing touches the database and nothing touches a file — the acts run against
// the real modules with substituted inputs, because a proof that runs a COPY of the check
// proves something about the copy (scripts/eval/census.ts says so first).
//
//   1. UN NEUVIÈME BRAS — a script added to package.json and scheduled by nobody. The arms
//      check must go red, and green again once the probe is removed.
//   2. UN ROUGE — an arm exiting 1. The report must put it in « Décision requise », say which
//      decision is expected, and ask for somebody.
//   3. UNE PANNE AMONT — an arm exiting 3 because the upstream would not answer. The report
//      must stay three lines and wake nobody. This is the act that matters most: an alert that
//      cries on a 429 from an Overpass mirror will be muted within a fortnight, and a muted
//      alert removed the vigilance without supplying the guarantee.
//
// A fourth thing is checked in passing, because the repository is public: neither the red nor
// the outage may carry a database identifier out of the machine.
//
// Exit codes follow the runner's convention: 0 PASS, 1 FAIL, 2 ERROR.

import { classifyArms, readExcuses, readScripts, readWorkflows } from "./arms"
import { carriesDatabaseIdentifier } from "./redaction"
import { buildReport, EXIT, type ArmOutcome } from "./report"

let failures = 0
const out = (s: string): void => void process.stdout.write(s + "\n")
const pass = (what: string, detail: string): void => out(`  ok    ${what} — ${detail}`)
const fail = (what: string, detail: string): void => {
  failures += 1
  out(`  FAIL  ${what} — ${detail}`)
}

/**
 * A ninth arm, written the way the four unscheduled sources of #70 were born: plausible,
 * useful, and registered nowhere. Not a strawman — `eval:anon` looked exactly like this on
 * the day it was added.
 */
const PROBE = { name: "eval:sonde", command: "tsx scripts/eval/sonde.ts" }

/** A real red, in the shape `eval` produces one. */
const RED: ArmOutcome = {
  name: "eval",
  exitCode: EXIT.fail,
  output:
    "[07:31:02] CIBLE — dbefhvmyfmmhjeetdddu via aws-1-eu-west-1.pooler.supabase.com\n" +
    "  FAIL  I9 — un appelant anonyme voit le contenu d'un millésime non redistribuable — 12 ligne(s)\n" +
    "[07:36:44] ÉCHEC — 1 défaillance(s), 11 avertissement(s) — dbefhvmyfmmhjeetdddu via aws-1-eu-west-1.pooler.supabase.com",
}

/** A real upstream outage, in the shape `eval:anon` and `verify:mcp` produce one. */
const OUTAGE: ArmOutcome = {
  name: "eval:anon",
  exitCode: EXIT.unsettled,
  output:
    "CIBLE — dbefhvmyfmmhjeetdddu.supabase.co, clé publiable, aucune chaîne DATABASE_URL\n" +
    "  susp  premises_within 2023 — 57014 query_canceled — la requête a dépassé les 3000 ms accordées à anon\n" +
    "INDÉTERMINÉ — 1 contrôle(s) suspendu(s) sur panne amont (57014 query_canceled) : premises_within 2023",
}

const ON = new Date(2026, 7, 31)

function acteUn(): void {
  out("\nActe 1 — un neuvième bras, ajouté à package.json et planifié par personne")

  const scripts = readScripts()
  const workflows = readWorkflows()
  const excuses = readExcuses()

  const clean = classifyArms(scripts, workflows, excuses)
  const silentBefore = clean.filter((v) => v.state !== "planifie" && v.state !== "excuse")
  if (silentBefore.length === 0) {
    pass("état de départ", `${clean.length} scripts, tous planifiés ou excusés — la porte est au vert`)
  } else {
    fail(
      "état de départ",
      `${silentBefore.length} script(s) déjà sans classement (${silentBefore.map((v) => v.name).join(", ")}) : ` +
        "le sabotage ne prouverait rien puisque la porte est déjà rouge",
    )
  }

  const sabotaged = classifyArms([...scripts, PROBE], workflows, excuses)
  const probe = sabotaged.find((v) => v.name === PROBE.name)
  if (probe?.state === "muet") {
    pass(PROBE.name, `passe au rouge — ${probe.detail}`)
  } else {
    fail(PROBE.name, `attendu « muet », obtenu « ${probe?.state ?? "absent"} » : la règle ne voit pas le bras ajouté`)
  }

  const others = sabotaged.filter((v) => v.name !== PROBE.name)
  if (others.every((v) => v.state === "planifie" || v.state === "excuse")) {
    pass("les autres bras", "restent au vert — le rouge vient de la sonde, pas d'une règle cassée")
  } else {
    fail("les autres bras", "le sabotage a rougi autre chose que la sonde")
  }

  // The counter-test, and it is the half a sabotage usually forgets. A check that went red for
  // every input would pass act one and be worthless: removing the probe has to bring the green
  // back, otherwise the red proved nothing about the probe.
  const restored = classifyArms(scripts, workflows, excuses)
  if (restored.every((v) => v.state === "planifie" || v.state === "excuse")) {
    pass("sonde retirée", "la porte revient au vert")
  } else {
    fail("sonde retirée", "la porte reste rouge sans la sonde — le rouge ne venait pas d'elle")
  }

  // And the other direction of the same rule: an excuse written for a script that no longer
  // exists is prose that has stopped describing the repository.
  const orphan = classifyArms(scripts, workflows, { ...excuses, "eval:disparu": "raison quelconque" })
  if (orphan.find((v) => v.name === "eval:disparu")?.state === "orphelin") {
    pass("excuse orpheline", "une raison écrite pour un script disparu passe au rouge aussi")
  } else {
    fail("excuse orpheline", "une raison écrite pour un script disparu ne rougit pas")
  }
}

function acteDeux(): void {
  out("\nActe 2 — un rouge : le rapport doit crier, et dire quelle décision est attendue")

  const report = buildReport([RED, { name: "verify:mcp", exitCode: EXIT.pass, output: "41 contrôles — 41 au vert" }], ON)

  if (report.decisionRequired) pass("signal", "décision requise — quelqu'un est réveillé")
  else fail("signal", "aucun signal produit sur un bras sorti en 1")

  if (/Décision requise\*\* — 1 bras/.test(report.markdown)) {
    pass("bloc 3", "le bras rouge y est, et lui seul")
  } else {
    fail("bloc 3", "le bras rouge n'est pas dans le troisième bloc")
  }

  if (/Jamais desserrer un seuil/.test(report.markdown)) {
    pass("décision attendue", "corriger le défaut, jamais desserrer le seuil")
  } else {
    fail("décision attendue", "le rapport ne dit pas quelle décision est attendue")
  }

  if (carriesDatabaseIdentifier(report.markdown)) {
    fail("dépôt public", "le rapport porte encore un identifiant de base")
  } else {
    pass("dépôt public", "ni référence de projet ni hôte dans le corps publié")
  }
}

function acteTrois(): void {
  out("\nActe 3 — une panne amont : le rapport doit rester muet, et c'est le seul risque sérieux")

  const report = buildReport(
    [
      OUTAGE,
      { name: "eval", exitCode: EXIT.pass, output: "[07:36:44] PASS — invariants, baselines, jeu doré et budget anon au vert" },
      { name: "verify:mcp", exitCode: EXIT.pass, output: "41 contrôles — 39 au vert, 0 en échec, 2 suspendus (panne amont)" },
    ],
    ON,
  )

  if (!report.decisionRequired) pass("silence", "personne n'est réveillé sur un 57014")
  else fail("silence", "une panne amont a produit un signal — l'alerte sera coupée en deux semaines")

  if (/\*\*Décision requise\.\*\* Aucune\./.test(report.markdown)) {
    pass("bloc 3", "vide, et le rapport tient en trois lignes")
  } else {
    fail("bloc 3", "le troisième bloc n'est pas vide sur une panne amont")
  }

  if (/Changé, sans décision requise/.test(report.markdown) && /`eval:anon`/.test(report.markdown)) {
    pass("bloc 2", "la suspension est nommée et datée — muette n'est pas cachée")
  } else {
    fail("bloc 2", "la suspension n'est pas nommée : une non-vérification passée sous silence est un faux vert")
  }

  if (carriesDatabaseIdentifier(report.markdown)) {
    fail("dépôt public", "le rapport porte encore un identifiant de base")
  } else {
    pass("dépôt public", "ni référence de projet ni hôte dans le corps publié")
  }
}

out("Sabotage de la porte planifiée — trois actes, aucun accès à la base, aucun fichier écrit")
acteUn()
acteDeux()
acteTrois()

out("")
if (failures > 0) {
  out(`FAIL — ${failures} contrôle(s) en échec : la porte planifiée ne tient pas ce qu'elle annonce`)
  process.exitCode = 1
} else {
  out("PASS — un bras non planifié rougit, un rouge crie, une panne amont ne crie pas")
}
