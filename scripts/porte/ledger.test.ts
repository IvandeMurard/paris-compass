// The control that plays the ledger rule without a database — w1-ledger (#82), point 2.
//
// Two halves, as scripts/porte/arms.test.ts, catalogue.test.ts and observabilite.test.ts have
// them. The first plays the rule against substituted inputs, and that is where the sabotage
// lives: a migration taken out of git's tracking must go red, putting it back must go green.
// The second plays what can be played against the repository as it stands — and there is less
// of it here than in the three rules before, because the other side of this comparison lives on
// the remote. What CAN be checked without a network is checked, and it is not nothing: that
// every recorded divergence still names a tracked file, and that its `depot` fingerprint is
// still the fingerprint of that file. The day somebody edits 20260825000002 a second time,
// `npm.cmd run test` goes red on this file alone, with no secret and no connection.
//
// The half that genuinely needs the remote — a migration applied and tracked by nobody — is the
// arm's, `npm.cmd run ledger`, and the seventh act of `porte:sabotage` proves the same rule
// reacts to it using the real module with a substituted ledger.

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import {
  classifyLedger,
  demandeUneDecision,
  empreinte,
  estApparie,
  migrationsSuivies,
  normaliser,
  readDivergencesAdmises,
  type LedgerRow,
  type Migration,
} from "./ledger"

const ROOT = resolve(__dirname, "..", "..")

const fichier = (version: string, name: string, body: string): Migration => ({
  version,
  name,
  path: `supabase/migrations/${version}_${name}.sql`,
  body,
})

/** The shape the CLI writes: the file, cut into statements. */
const posee = (version: string, name: string, statements: string[]): LedgerRow => ({
  version,
  name,
  statements,
})

const CORPS = "create table public.t (id bigint);\n\ncomment on table public.t is 'x';\n"
const DECOUPE = ["create table public.t (id bigint)", "\n\ncomment on table public.t is 'x'"]

describe("la normalisation, mesurée avant d'être choisie", () => {
  it("est aveugle aux retours chariot de Windows", () => {
    expect(normaliser("select 1;\r\nselect 2;\r\n")).toBe(normaliser("select 1;\nselect 2;\n"))
  })

  it("est aveugle à la place des points-virgules — le découpage du CLI ne la conserve pas", () => {
    expect(normaliser("select 1; select 2")).toBe(normaliser("select 1 ;select 2"))
  })

  it("n'est pas aveugle au texte, y compris dans un commentaire", () => {
    // The two rows of 25 August diverge on nothing but comment text, and a normalisation that
    // stripped comments would have called them identical — which is precisely the finding
    // DIAGNOSTIC.md §39 records.
    expect(normaliser("-- règle en français\nselect 1")).not.toBe(normaliser("-- rule in English\nselect 1"))
  })

  it("rend la même empreinte des deux côtés quand le corps est le même", () => {
    expect(empreinte(CORPS)).toBe(empreinte(DECOUPE.join(" ")))
  })
})

describe("la règle, jouée sur des entrées substituées", () => {
  it("apparie une migration posée et suivie, corps compris", () => {
    const verdicts = classifyLedger([posee("20260101000001", "t", DECOUPE)], [fichier("20260101000001", "t", CORPS)], {})
    expect(verdicts[0].state).toBe("apparie")
    expect(estApparie(verdicts[0].state)).toBe(true)
  })

  it("rougit sur une migration posée que git ne suit pas — le sabotage, et l'incident du 5 septembre", () => {
    // The exact shape of 5 September 2026: 20260905000006 applied, ledger at 53, tracked files
    // at 52. The file was on disk; it was not tracked, and that nuance is the defect.
    const verdicts = classifyLedger([posee("20260905000006", "geometrie_finie", DECOUPE)], [], {})
    expect(verdicts[0].state).toBe("absent-du-depot")
    expect(demandeUneDecision(verdicts[0].state)).toBe(true)
    expect(verdicts[0].detail).toContain("git status")
  })

  it("reverdit dès que le fichier est remis au suivi — le contre-test", () => {
    // A check that went red on every input would pass the case above and be worth nothing.
    const verdicts = classifyLedger(
      [posee("20260905000006", "geometrie_finie", DECOUPE)],
      [fichier("20260905000006", "geometrie_finie", CORPS)],
      {},
    )
    expect(verdicts.every((v) => estApparie(v.state))).toBe(true)
  })

  it("distingue les deux sens plutôt que de les additionner", () => {
    const verdicts = classifyLedger(
      [posee("20260101000001", "posee", DECOUPE)],
      [fichier("20260101000002", "ecrite", CORPS)],
      {},
    )
    const posees = verdicts.find((v) => v.version === "20260101000001")
    const ecrite = verdicts.find((v) => v.version === "20260101000002")
    expect(posees?.state).toBe("absent-du-depot")
    expect(ecrite?.state).toBe("absent-du-ledger")
    // Une seule des deux réveille quelqu'un : du travail écrit et pas encore posé est l'état
    // normal entre l'écriture d'un fichier et la poussée.
    expect(demandeUneDecision("absent-du-depot")).toBe(true)
    expect(demandeUneDecision("absent-du-ledger")).toBe(false)
  })

  it("rougit sur un corps différent sous le même identifiant", () => {
    const verdicts = classifyLedger(
      [posee("20260101000001", "t", ["create table public.t (id bigint)"])],
      [fichier("20260101000001", "t", "create table public.t (id text);")],
      {},
    )
    expect(verdicts[0].state).toBe("corps-diverge")
    expect(verdicts[0].detail).toContain("corps différent")
  })

  it("accepte une divergence consignée avec ses deux empreintes", () => {
    const depot = "create table public.t (id text);"
    const led = ["create table public.t (id bigint)"]
    const verdicts = classifyLedger([posee("20260101000001", "t", led)], [fichier("20260101000001", "t", depot)], {
      "20260101000001": {
        raison: "Fichier réécrit après application, mesuré.",
        depot: empreinte(depot),
        ledger: empreinte(led.join(" ")),
      },
    })
    expect(verdicts[0].state).toBe("corps-admis")
    expect(estApparie(verdicts[0].state)).toBe(true)
  })

  it("rougit quand la raison consignée ne décrit plus l'état — l'empreinte du dépôt a bougé", () => {
    // The half that keeps `ledger.json` from being a blanket excuse. A recorded divergence
    // covers ONE measured state; a second edit of the same file is a new fact, and the entry
    // must stop covering it.
    const led = ["create table public.t (id bigint)"]
    const verdicts = classifyLedger(
      [posee("20260101000001", "t", led)],
      [fichier("20260101000001", "t", "create table public.t (id numeric);")],
      {
        "20260101000001": {
          raison: "Fichier réécrit après application, mesuré.",
          depot: empreinte("create table public.t (id text);"),
          ledger: empreinte(led.join(" ")),
        },
      },
    )
    expect(verdicts[0].state).toBe("corps-admis-perime")
    expect(verdicts[0].detail).toContain("le dépôt a bougé")
  })

  it("rougit sur une raison consignée pour une migration que personne ne porte", () => {
    // The direction a table of exemptions always forgets — arms.ts, catalogue.ts and
    // observabilite.ts each learned it before this one.
    const verdicts = classifyLedger([], [], {
      "20260101000009": { raison: "restée là", depot: "aaaaaaaaaaaa", ledger: "bbbbbbbbbbbb" },
    })
    expect(verdicts[0].state).toBe("admise-orpheline")
    expect(demandeUneDecision(verdicts[0].state)).toBe(true)
  })

  it("rougit sur un fichier renommé après son application", () => {
    const verdicts = classifyLedger(
      [posee("20260101000001", "ancien_nom", DECOUPE)],
      [fichier("20260101000001", "nouveau_nom", CORPS)],
      {},
    )
    expect(verdicts[0].state).toBe("nom-diverge")
  })

  it("ne prétend rien sur un corps que le distant n'a pas gardé", () => {
    const verdicts = classifyLedger(
      [{ version: "20260101000001", name: "t", statements: null }],
      [fichier("20260101000001", "t", CORPS)],
      {},
    )
    expect(verdicts[0].state).toBe("corps-inconnu")
    // Ni vert ni rouge : c'est une limite de la comptabilité du distant, pas un défaut d'ici.
    expect(estApparie(verdicts[0].state)).toBe(false)
    expect(demandeUneDecision(verdicts[0].state)).toBe(false)
  })
})

describe("le dépôt tel qu'il est, sans base", () => {
  const suivies = migrationsSuivies(ROOT)
  const admises = readDivergencesAdmises()

  it("suit au moins les 53 migrations mesurées le 6 septembre 2026", () => {
    // A floor rather than an equality: a migration written tomorrow must not fail this file.
    // What the number is FOR is catching a `git ls-files` that suddenly returns nothing —
    // the failure mode where a rule silently stops checking.
    expect(suivies.length).toBeGreaterThanOrEqual(53)
  })

  it("ne suit aucune migration en double sur un même identifiant", () => {
    const versions = suivies.map((m) => m.version)
    expect(new Set(versions).size).toBe(versions.length)
  })

  it("consigne des divergences qui nomment toutes un fichier suivi", () => {
    for (const version of Object.keys(admises)) {
      expect(suivies.some((m) => m.version === version)).toBe(true)
    }
  })

  it("porte, pour chaque divergence consignée, l'empreinte du fichier tel qu'il est aujourd'hui", () => {
    // The half that needs no remote, and the one that will actually fire: a second edit of
    // 20260825000002 moves this fingerprint, and `test` goes red naming the version — without
    // a database, without a secret, on a runner and on this machine alike.
    for (const [version, admise] of Object.entries(admises)) {
      const fichierSuivi = suivies.find((m) => m.version === version)
      expect(fichierSuivi, `${version} n'est plus suivie`).toBeDefined()
      expect(empreinte(fichierSuivi!.body), `${version} a été réécrite depuis`).toBe(admise.depot)
    }
  })

  it("écrit une raison pour chaque divergence consignée, jamais un silence", () => {
    for (const [version, admise] of Object.entries(admises)) {
      expect(admise.raison.trim(), `${version} sans raison`).not.toBe("")
      expect(admise.raison.length, `${version} : raison trop courte pour être une raison`).toBeGreaterThan(60)
    }
  })

  it("est déclaré comme bras dans porte.yml, sinon la règle de #71 le refuserait", () => {
    // Point 4 of the ticket, and it would be ironic to miss it: an arm that watches for
    // unclassified things must itself be classified. arms.test.ts already fails on an
    // unscheduled npm script; this asserts the specific step by name, so that a rename of the
    // script without a rename of the step is caught here rather than by inference.
    const yaml = readFileSync(resolve(ROOT, ".github/workflows/porte.yml"), "utf8")
    expect(yaml).toContain("npm run ledger")
  })
})
