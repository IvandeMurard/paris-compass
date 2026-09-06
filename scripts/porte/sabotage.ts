// The proof that the scheduled gate actually closes the door — w1-porte-planifiee (#71), then
// w1-cadence (#70) one level down on the ingestion sources, then w1-catalogue (#73) one level
// further out on the catalogue itself.
//
//   npm.cmd run porte:sabotage
//
// Seven acts, on the model of `eval:sabotage`: a rule nobody plays is a comment, and the rules
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
//   4. UNE NEUVIÈME SOURCE — a row inserted into `ingestion_run` with a declared cadence and
//      no cron. Same shape as act one, one level down: this is the hole #70 closes, and the
//      four sources that fell into it between 25 and 31 August 2026 looked exactly like the
//      probe used here.
//   5. UNE SOURCE AU CATALOGUE — a dataset written into the catalogue table of
//      docs/PLAN-ACTION-VACANCE.md and cross-checked by nothing. Same shape again, one level
//      further out: this is the hole w1-catalogue (#73) closes, and every one of the
//      thirty-five rows in that table looked exactly like the probe on the day it was written.
//   6. UN DOUZIÈME BRAS QUI SE COMPTE — a file reaching PostgREST without the escapement, and
//      then the sharper half: an arm that HAD the escapement and lost it. This is the hole
//      w1-observabilite-echappement (#81) closes, and #72 measured what falls into it — ten
//      buckets on a product with no traffic, all at Châtelet, written by the gate itself.
//   7. UNE MIGRATION POSÉE ET SUIVIE PAR PERSONNE — the remote carrying a schema the
//      repository does not track. Not a hypothesis: it is 5 September 2026 replayed, when
//      `20260905000006_geometrie_finie.sql` sat in the ledger for twenty-four hours while
//      `supabase/migrations/` tracked 52 files, and eleven arms saw nothing because not one
//      of them compared those two lists — w1-ledger (#82).
//
// One more thing is checked in passing, because the repository is public: neither the red nor
// the outage may carry a database identifier out of the machine.
//
// Exit codes follow the runner's convention: 0 PASS, 1 FAIL, 2 ERROR.

import { classifyArms, readExcuses, readScripts, readWorkflows } from "./arms"
import {
  classifyCatalogue,
  estClasse,
  readCatalogue,
  readProbes,
  type CatalogueEntry,
} from "./catalogue"
import {
  appelantsDePostgrest,
  classifyCallers,
  estClasse as appelantClasse,
  readCallers,
  readReasons,
  testsImportingClient,
  type Appelant,
} from "./observabilite"
import {
  classifyLedger,
  demandeUneDecision,
  estApparie,
  migrationsSuivies,
  readDivergencesAdmises,
  type LedgerRow,
  type Migration,
} from "./ledger"
import {
  classifySources,
  readDeclaredSources,
  readSourceExcuses,
  scheduledSources,
  readWorkflows as readSourceWorkflows,
  type DeclaredSource,
} from "./cadences"
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

/**
 * A ninth source, written the way the four of #70 were born: plausible, useful, loaded once by
 * hand, and registered in no `on.schedule`. `chantiers` looked exactly like this on 25 August.
 */
const SOURCE_PROBE: DeclaredSource = {
  source: "marches",
  cadence: "weekly",
  migration: "20260901000001_marches.sql",
}

function acteQuatre(): void {
  out("\nActe 4 — une neuvième source, déclarée avec une cadence et rechargée par personne")

  const declared = readDeclaredSources()
  const triggers = scheduledSources(readSourceWorkflows())
  const excuses = readSourceExcuses()

  const clean = classifySources(declared, triggers, excuses)
  const silentBefore = clean.filter((v) => v.state !== "planifie" && v.state !== "excuse")
  if (silentBefore.length === 0) {
    pass("état de départ", `${clean.length} sources, toutes planifiées ou excusées — la porte est au vert`)
  } else {
    fail(
      "état de départ",
      `${silentBefore.length} source(s) déjà sans classement (${silentBefore.map((v) => v.source).join(", ")}) : ` +
        "le sabotage ne prouverait rien puisque la porte est déjà rouge",
    )
  }

  const sabotaged = classifySources([...declared, SOURCE_PROBE], triggers, excuses)
  const probe = sabotaged.find((v) => v.source === SOURCE_PROBE.source)
  if (probe?.state === "muet") {
    pass(SOURCE_PROBE.source, `passe au rouge — cadence « ${probe.cadence} » déclarée, aucun cron ne la tient`)
  } else {
    fail(SOURCE_PROBE.source, `attendu « muet », obtenu « ${probe?.state ?? "absent"} » : la règle ne voit pas la source ajoutée`)
  }

  const others = sabotaged.filter((v) => v.source !== SOURCE_PROBE.source)
  if (others.every((v) => v.state === "planifie" || v.state === "excuse")) {
    pass("les autres sources", "restent au vert — le rouge vient de la sonde, pas d'une règle cassée")
  } else {
    fail("les autres sources", "le sabotage a rougi autre chose que la sonde")
  }

  // The counter-test, the half a sabotage usually forgets: a check that went red on every
  // input would pass this act and be worth nothing.
  const restored = classifySources(declared, triggers, excuses)
  if (restored.every((v) => v.state === "planifie" || v.state === "excuse")) {
    pass("sonde retirée", "la porte revient au vert")
  } else {
    fail("sonde retirée", "la porte reste rouge sans la sonde — le rouge ne venait pas d'elle")
  }

  // And the trap #71 met one level up, transposed: two npm scripts pointing at the same file
  // could not be told apart by a path, and the `bdcom` arm of ingestion.yml runs geography.ts
  // in passing. A match on loader paths would have made the BDCom cron vouch for geography.
  const chained: DeclaredSource = { source: "enchainee", cadence: "rare", migration: "sonde.sql" }
  const viaPath = classifySources([chained], triggers, excuses)
  if (viaPath[0]?.state === "muet") {
    pass("chargeur enchaîné", "une source qu'aucun cron ne nomme reste muette, même chargée en passant")
  } else {
    fail("chargeur enchaîné", "un chargeur enchaîné répond pour une source que rien ne planifie")
  }
}

/**
 * A source written into the catalogue the way a candidate dataset actually arrives: plausible,
 * named, given a status and a licence, and cross-checked by nothing. Every row of that table
 * looked exactly like this on the day it was written.
 */
const CATALOGUE_PROBE: CatalogueEntry = {
  name: "Registre des enseignes (sonde)",
  producteur: "Ville de Paris",
  statutBrut: "nouvelle",
  canonical: "nouvelle",
  affichee: false,
  licence: "Open data Paris",
}

function acteCinq(): void {
  out("\nActe 5 — une source ajoutée au catalogue, vérifiée par personne")

  const entries = readCatalogue()
  const { verifications, "sans-verification": excuses } = readProbes()

  const clean = classifyCatalogue(entries, verifications, excuses)
  const silentBefore = clean.filter((v) => !estClasse(v.state))
  if (silentBefore.length === 0) {
    pass("état de départ", `${clean.length} sources au catalogue, toutes classées — la porte est au vert`)
  } else {
    fail(
      "état de départ",
      `${silentBefore.length} source(s) déjà sans classement (${silentBefore.map((v) => v.name).join(", ")}) : ` +
        "le sabotage ne prouverait rien puisque la porte est déjà rouge",
    )
  }

  const sabotaged = classifyCatalogue([...entries, CATALOGUE_PROBE], verifications, excuses)
  const probe = sabotaged.find((v) => v.name === CATALOGUE_PROBE.name)
  if (probe?.state === "muette") {
    pass(CATALOGUE_PROBE.name, "passe au rouge — licence annoncée, et rien ne la recoupe")
  } else {
    fail(
      CATALOGUE_PROBE.name,
      `attendu « muette », obtenu « ${probe?.state ?? "absente"} » : la règle ne voit pas la source ajoutée`,
    )
  }

  const others = sabotaged.filter((v) => v.name !== CATALOGUE_PROBE.name)
  if (others.every((v) => estClasse(v.state))) {
    pass("les autres sources", "restent au vert — le rouge vient de la sonde, pas d'une règle cassée")
  } else {
    fail("les autres sources", "le sabotage a rougi autre chose que la sonde")
  }

  // The counter-test, again: a check that went red on every input would pass this act and be
  // worth nothing.
  const restored = classifyCatalogue(entries, verifications, excuses)
  if (restored.every((v) => estClasse(v.state))) {
    pass("sonde retirée", "la porte revient au vert")
  } else {
    fail("sonde retirée", "la porte reste rouge sans la sonde — le rouge ne venait pas d'elle")
  }

  // And the direction the catalogue makes possible and the two populations above did not: a
  // refusal is a decision, not an outage to watch. Asking SeLoger every morning whether its
  // terms still forbid reuse is an alert that can only ever say the same thing.
  const refusee: CatalogueEntry = {
    ...CATALOGUE_PROBE,
    name: "Portail d'annonces (sonde)",
    statutBrut: "refusée",
    canonical: "refusee",
    licence: "CGU, réutilisation interdite",
  }
  const horsPopulation = classifyCatalogue([refusee], {}, {})
  if (horsPopulation[0]?.state === "hors-population") {
    pass("source refusée", "n'est pas interrogée — un refus est une décision, pas une panne à surveiller")
  } else {
    fail("source refusée", `attendu « hors-population », obtenu « ${horsPopulation[0]?.state ?? "absente"} »`)
  }

  // The report of a red catalogue, built by the SAME module as the gate's — #73 reuses #71
  // rather than describing the three blocks a second time.
  const rapport = buildReport(
    [
      {
        name: "catalogue",
        exitCode: EXIT.fail,
        output: `ÉCHEC — 1 source du catalogue sans vérification ni raison écrite : ${CATALOGUE_PROBE.name}`,
        expected:
          "vérifier la source, ou écrire dans `sans-verification` de scripts/porte/catalogue.json " +
          "pourquoi elle ne l'est pas.",
      },
    ],
    ON,
    "Catalogue des sources",
  )
  if (rapport.decisionRequired && /catalogue\.json/.test(rapport.markdown)) {
    pass("compte rendu", "le même que celui de la porte, et il nomme la décision attendue")
  } else {
    fail("compte rendu", "le rapport du catalogue ne nomme pas la décision attendue")
  }
}


/**
 * A twelfth arm, written the way `eval:anon` looked on the day it was added: plausible, useful,
 * and reaching PostgREST with the real publishable key without saying so.
 */
const APPELANT_PROBE: Appelant = {
  path: "scripts/eval/sonde-http.ts",
  acces: ["rest"],
  declare: false,
}

function acteSix(): void {
  out("\nActe 6 — un douzième bras qui atteint PostgREST, et se compte dans le journal")

  const callers = readCallers()
  const reasons = readReasons()

  const clean = classifyCallers(callers, reasons)
  const muetsBefore = clean.filter((v) => !appelantClasse(v.state))
  if (muetsBefore.length === 0) {
    pass(
      "état de départ",
      `${clean.length} fichier(s) atteignent PostgREST, tous classés — la porte est au vert`,
    )
  } else {
    fail(
      "état de départ",
      `${muetsBefore.length} appelant(s) déjà sans classement (${muetsBefore.map((v) => v.path).join(", ")}) : ` +
        "le sabotage ne prouverait rien puisque la porte est déjà rouge",
    )
  }

  const sabotaged = classifyCallers([...callers, APPELANT_PROBE], reasons)
  const probe = sabotaged.find((v) => v.path === APPELANT_PROBE.path)
  if (probe?.state === "muet") {
    pass(APPELANT_PROBE.path, "passe au rouge — il atteint PostgREST et ne déclare rien")
  } else {
    fail(
      APPELANT_PROBE.path,
      `attendu « muet », obtenu « ${probe?.state ?? "absent"} » : la règle ne voit pas le bras ajouté`,
    )
  }

  const others = sabotaged.filter((v) => v.path !== APPELANT_PROBE.path)
  if (others.every((v) => appelantClasse(v.state))) {
    pass("les autres appelants", "restent au vert — le rouge vient de la sonde, pas d'une règle cassée")
  } else {
    fail("les autres appelants", "le sabotage a rougi autre chose que la sonde")
  }

  const restored = classifyCallers(callers, reasons)
  if (restored.every((v) => appelantClasse(v.state))) {
    pass("sonde retirée", "la porte revient au vert")
  } else {
    fail("sonde retirée", "la porte reste rouge sans la sonde — le rouge ne venait pas d'elle")
  }

  // The sharper half, and the one #72 actually paid for: not an arm that never had the
  // escapement, but an arm that HAD it and lost it. A refactor of a fetch wrapper does exactly
  // this, and it is silent — the calls keep working, and the journal quietly starts counting
  // Châtelet every morning.
  const ARM = "scripts/eval/anon-http.ts"
  const real = callers.find((c) => c.path === ARM)
  if (!real) {
    fail("échappement retiré", `${ARM} n'est plus dans la population : la sonde ne peut rien montrer`)
  } else {
    const perdu = classifyCallers(
      callers.map((c) => (c.path === ARM ? { ...c, declare: false } : c)),
      reasons,
    )
    const arm = perdu.find((v) => v.path === ARM)
    if (arm?.state === "muet") {
      pass("échappement retiré", `${ARM} passe au rouge — c'est le défaut que #72 a payé en dix seaux`)
    } else {
      fail("échappement retiré", `attendu « muet », obtenu « ${arm?.state ?? "absent"} »`)
    }
  }

  // And the direction a table of exemptions always forgets, checked here as acts one, four and
  // five check it: a reason left behind for a file that no longer calls anything.
  const orphelin = classifyCallers(callers, { ...reasons, "scripts/eval/parti.ts": "raison restée" })
  if (orphelin.find((v) => v.path === "scripts/eval/parti.ts")?.state === "orphelin") {
    pass("raison orpheline", "observabilite.json ne peut pas couvrir un fichier qui n'existe plus")
  } else {
    fail("raison orpheline", "une excuse pour un fichier disparu passe pour un classement")
  }

  // The report of a red escapement, built by the SAME module as the gate's — #81 reuses #71
  // rather than describing the three blocks a fifth time.
  const rapport = buildReport(
    [
      {
        name: "test",
        exitCode: EXIT.fail,
        output:
          "FAIL  un fichier atteint PostgREST sans échappement ni raison écrite : " +
          APPELANT_PROBE.path,
        expected:
          "poser `x-compass-observabilite: off`, ou écrire dans `sans-echappement` de " +
          "scripts/porte/observabilite.json la raison d'être compté.",
      },
    ],
    ON,
    "Échappement d'observabilité",
  )
  if (rapport.decisionRequired && /observabilite\.json/.test(rapport.markdown)) {
    pass("compte rendu", "le même que celui de la porte, et il nomme la décision attendue")
  } else {
    fail("compte rendu", "le rapport de l'échappement ne nomme pas la décision attendue")
  }

  // Played once against the repository itself, and not only against substituted inputs: the
  // acts above prove the rule reacts, this proves it is pointed at the real tree.
  const reel = appelantsDePostgrest()
  if (reel.length > 0 && reel.every((v) => appelantClasse(v.state))) {
    pass("le dépôt tel qu'il est", `${reel.length} appelant(s), tous classés`)
  } else {
    fail("le dépôt tel qu'il est", "la règle jouée sur le dépôt ne rend pas un vert")
  }

  // And the hole the population deliberately opens: `*.test.*` is out, because a test carries
  // the rule's own fixtures. An import is how a test would really reach the base.
  const testsFuyants = testsImportingClient()
  if (testsFuyants.length === 0) {
    pass("les tests", "aucun n'importe de client PostgREST — l'exclusion ne cache rien")
  } else {
    fail("les tests", `hors population et pourtant appelants : ${testsFuyants.join(", ")}`)
  }
}


/**
 * The 5 September 2026 incident, in the shape the ledger held it.
 *
 * Not a strawman and not a fixture invented for the occasion: this is the row that actually sat
 * on dbefhvmyfmmhjeetdddu for twenty-four hours, with the file present on disk and tracked by
 * nobody. The statements are abridged — what is being proved here is that the comparison reacts
 * to a missing FILE, and the body half is proved by the acts below it.
 */
const MIGRATION_POSEE: LedgerRow = {
  version: "20260905000006",
  name: "geometrie_finie",
  statements: ["alter table public.premise_location alter column geom drop not null"],
}

/** The same migration, as git would carry it once somebody committed the file. */
const MIGRATION_SUIVIE: Migration = {
  version: "20260905000006",
  name: "geometrie_finie",
  path: "supabase/migrations/20260905000006_geometrie_finie.sql",
  body: "alter table public.premise_location alter column geom drop not null;",
}

/**
 * No recorded divergence, for the substituted rows.
 *
 * The real `ledger.json` names two migrations of 25 August that these fixtures do not carry,
 * and handing it a one-row ledger would make both of them orphans — a red the sabotage caused
 * rather than one it demonstrated. The repository's real table is asserted separately, at the
 * end of the act, against the real tree.
 */
const AUCUNE = {}

function acteSept(): void {
  out("\nActe 7 — une migration posée sur le distant et suivie par personne, le 5 septembre rejoué")

  // The state the repository is actually in, first: a sabotage played on a tree that is already
  // red proves nothing, and acts one, four, five and six each open the same way.
  const suivies = migrationsSuivies()
  const admises = readDivergencesAdmises()
  if (suivies.length >= 53) {
    pass(
      "état de départ",
      `${suivies.length} migrations suivies par git, ${Object.keys(admises).length} divergence(s) consignée(s)`,
    )
  } else {
    fail(
      "état de départ",
      `${suivies.length} migrations suivies : git ls-files ne rend plus l'arbre, la règle ne mesure rien`,
    )
  }

  const sabote = classifyLedger([MIGRATION_POSEE], [], AUCUNE)
  const manquante = sabote.find((v) => v.version === MIGRATION_POSEE.version)
  if (manquante?.state === "absent-du-depot" && demandeUneDecision(manquante.state)) {
    pass(
      "le fichier retiré du suivi",
      "passe au rouge et nomme l'identifiant — c'est le rouge qu'on aurait voulu voir le 5 septembre",
    )
  } else {
    fail(
      "le fichier retiré du suivi",
      `attendu « absent-du-depot », obtenu « ${manquante?.state ?? "absent"} » : la règle ne voit pas l'incident`,
    )
  }

  const remis = classifyLedger([MIGRATION_POSEE], [MIGRATION_SUIVIE], AUCUNE)
  if (remis.every((v) => estApparie(v.state))) {
    pass("le fichier remis au suivi", "la porte revient au vert — le rouge venait bien de l'écart")
  } else {
    fail(
      "le fichier remis au suivi",
      "la porte reste rouge une fois le fichier suivi : le rouge ne venait pas de lui",
    )
  }

  // The other direction, and it must NOT wake anybody: a file written and not yet pushed is the
  // normal state of a session in flight. Adding the two directions into one count would ask for
  // a decision on the half that does not need one.
  const enVol = classifyLedger([], [MIGRATION_SUIVIE], AUCUNE)
  const attente = enVol.find((v) => v.version === MIGRATION_SUIVIE.version)
  if (attente?.state === "absent-du-ledger" && !demandeUneDecision(attente.state)) {
    pass("le sens inverse", "une migration écrite et pas encore posée est signalée sans réveiller personne")
  } else {
    fail("le sens inverse", `attendu « absent-du-ledger » sans décision, obtenu « ${attente?.state ?? "absent"} »`)
  }

  // The body half — the part `_cmp-fn.ts` took with it on 26 August, and the reason this arm
  // goes past the identifiers at all. Same identifier, same name, one word of SQL changed.
  const corpsChange: Migration = {
    ...MIGRATION_SUIVIE,
    body: "alter table public.premise_location alter column geom set not null;",
  }
  const diverge = classifyLedger([MIGRATION_POSEE], [corpsChange], AUCUNE)
  const corpsVu = diverge.find((v) => v.version === MIGRATION_POSEE.version)
  if (corpsVu?.state === "corps-diverge") {
    pass("le corps modifié", "même identifiant, corps différent — le bras le voit et imprime les deux empreintes")
  } else {
    fail("le corps modifié", `attendu « corps-diverge », obtenu « ${corpsVu?.state ?? "absent"} »`)
  }

  // And the direction a table of recorded divergences always forgets: a reason that has stopped
  // describing what is there. Acts one, four, five and six each check the orphan; this one adds
  // the stale, because `ledger.json` pins fingerprints and prose does not age with them.
  const perime = classifyLedger([MIGRATION_POSEE], [corpsChange], {
    [MIGRATION_POSEE.version]: {
      raison: "Consignée sur un état mesuré, et cet état a changé depuis.",
      depot: "000000000000",
      ledger: "000000000000",
    },
  })
  const perimeVu = perime.find((v) => v.version === MIGRATION_POSEE.version)
  if (perimeVu?.state === "corps-admis-perime") {
    pass("la raison périmée", "ledger.json ne couvre plus un corps qui a bougé depuis qu'on l'a consigné")
  } else {
    fail("la raison périmée", `attendu « corps-admis-perime », obtenu « ${perimeVu?.state ?? "absent"} »`)
  }

  // The report of a red ledger, built by the SAME module as the gate's — #82 reuses #71 rather
  // than describing the three blocks a sixth time.
  const rapport = buildReport(
    [
      {
        name: "ledger 20260905000006",
        exitCode: EXIT.fail,
        output:
          "FAIL  absent-du-depot — « geometrie_finie » est posée sur le distant et aucun fichier " +
          "suivi par git ne la porte",
        expected:
          "committer le fichier de migration manquant, ou dire pourquoi le schéma appliqué " +
          "n'aura jamais de fichier. Regarder d'abord `git status supabase/migrations/`.",
      },
    ],
    ON,
    "Ledger de migrations",
  )
  if (rapport.decisionRequired && /git status/.test(rapport.markdown)) {
    pass("compte rendu", "le même que celui de la porte, et il nomme la décision attendue")
  } else {
    fail("compte rendu", "le rapport du ledger ne nomme pas la décision attendue")
  }

  // Played once against the repository as it stands, not only against substituted rows: the
  // acts above prove the rule reacts, this proves it is pointed at the real tree. The ledger
  // side is absent by design — this script touches no database — so what is asserted is the
  // half that needs none: every recorded divergence still names a tracked file.
  const orphelines = Object.keys(admises).filter((v) => !suivies.some((m) => m.version === v))
  if (orphelines.length === 0) {
    pass("le dépôt tel qu'il est", "aucune divergence consignée ne nomme une migration disparue")
  } else {
    fail("le dépôt tel qu'il est", `divergence(s) consignée(s) sans fichier suivi : ${orphelines.join(", ")}`)
  }
}

out("Sabotage de la porte planifiée — sept actes, aucun accès à la base, aucun fichier écrit")
acteUn()
acteDeux()
acteTrois()
acteQuatre()
acteCinq()
acteSix()
acteSept()

out("")
if (failures > 0) {
  out(`FAIL — ${failures} contrôle(s) en échec : la porte planifiée ne tient pas ce qu'elle annonce`)
  process.exitCode = 1
} else {
  out(
    "PASS — un bras non planifié rougit, un rouge crie, une panne amont ne crie pas, " +
      "une source sans cadence rougit, une source du catalogue sans vérification rougit, " +
      "un appelant de PostgREST sans échappement rougit, une migration posée et suivie par " +
      "personne rougit",
  )
}
