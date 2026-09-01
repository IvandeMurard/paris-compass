// The control that fails if a source exists with a declared cadence and no scheduled trigger —
// w1-cadence (#70), point 2, and the « Fait quand » of that ticket.
//
// Two halves, and both are needed — the shape scripts/porte/arms.test.ts settled on. The first
// plays the rule against substituted inputs, which is where the sabotage lives: a ninth source
// added and the check must go red, the probe removed and it must go green again. The second
// plays it against the repository as it stands, which is what will catch the source somebody
// adds in three months — the case no fixture can anticipate, and the only one that matters.

import { describe, expect, it } from "vitest"

import {
  cadencesOfTheSources,
  classifySources,
  readDeclaredSources,
  readSourceExcuses,
  readWorkflows,
  scheduledSources,
  type DeclaredSource,
} from "./cadences"
import { CADENCES, TOLERANCE_DAYS, reconcileSources, toleranceOf, verdictOf } from "../ingest/lib/cadence"

/** ingestion.yml in miniature: one schedule, its `case` arm, and nothing else. */
const SCHEDULED = [
  {
    file: "ingestion.yml",
    text:
      'on:\n  schedule:\n    - cron: "17 3 * * *"\n    - cron: "7 2 * * 2"\n' +
      '        case "${SCHEDULE:-}" in\n' +
      '            "17 3 * * *")  source=bodacc ;;\n' +
      '            "7 2 * * 2")   source=chantiers ;;\n' +
      "        esac\n",
  },
]

const BODACC: DeclaredSource = { source: "bodacc", cadence: "continuous", migration: "20260825000001.sql" }
const CHANTIERS: DeclaredSource = { source: "chantiers", cadence: "weekly", migration: "20260825000007.sql" }

/**
 * A ninth source, written the way the four of #70 were born: plausible, useful, loaded once by
 * hand, and registered nowhere. Not a strawman — `chantiers` looked exactly like this.
 */
const SONDE: DeclaredSource = { source: "marches", cadence: "weekly", migration: "20260901000001.sql" }

describe("la règle, jouée sur des entrées substituées", () => {
  it("tient pour planifiée une source nommée par une entrée cron", () => {
    const verdicts = classifySources([BODACC], scheduledSources(SCHEDULED), {})
    expect(verdicts[0].state).toBe("planifie")
    expect(verdicts[0].detail).toContain("17 3 * * *")
  })

  it("rougit sur une source ajoutée sans déclencheur — le sabotage", () => {
    const verdicts = classifySources([BODACC, CHANTIERS, SONDE], scheduledSources(SCHEDULED), {})
    const probe = verdicts.find((v) => v.source === SONDE.source)
    expect(probe?.state).toBe("muet")
    expect(probe?.detail).toContain("weekly")
    expect(probe?.detail).toContain("cadence.json")
    // The red must come from the probe alone, not from a rule that broke.
    expect(verdicts.filter((v) => v.source !== SONDE.source).every((v) => v.state === "planifie")).toBe(true)
  })

  it("revient au vert quand la sonde est retirée — le contre-test", () => {
    // Without this half, a check that went red on every input would pass the sabotage and be
    // worth nothing.
    const verdicts = classifySources([BODACC, CHANTIERS], scheduledSources(SCHEDULED), {})
    expect(verdicts.every((v) => v.state === "planifie")).toBe(true)
  })

  it("accepte une raison écrite, et refuse une raison vide", () => {
    const orphaned = [{ ...SONDE }]
    expect(classifySources(orphaned, new Map(), { marches: "raison écrite" })[0].state).toBe("excuse")
    expect(classifySources(orphaned, new Map(), { marches: "   " })[0].state).toBe("muet")
  })

  it("rougit sur une raison écrite pour une source disparue", () => {
    const verdicts = classifySources([BODACC], scheduledSources(SCHEDULED), { disparue: "une raison" })
    expect(verdicts.find((v) => v.source === "disparue")?.state).toBe("orphelin")
  })

  it("rougit quand une source est à la fois planifiée et excusée", () => {
    const verdicts = classifySources([BODACC], scheduledSources(SCHEDULED), { bodacc: "pas besoin" })
    expect(verdicts[0].state).toBe("contradictoire")
  })

  it("ne compte pas un workflow_dispatch pour une cadence", () => {
    // A button is exactly what this ticket exists to stop relying on, and `run_by =
    // 'workflow-dispatch'` is the distinction ingestion_run already draws.
    const bouton = [
      {
        file: "manuel.yml",
        text: 'on:\n  workflow_dispatch:\n        case "$X" in\n            "rien") source=bodacc ;;\n        esac\n',
      },
    ]
    expect(classifySources([BODACC], scheduledSources(bouton), {})[0].state).toBe("muet")
  })

  it("ne compte pas une branche dont la planification a disparu", () => {
    // The `case` arm survives, the cron does not. Reading the arm alone would let a deleted
    // schedule go on vouching for its source — the silent breakage this file exists against.
    const orphelin = [
      {
        file: "ingestion.yml",
        text: 'on:\n  schedule:\n    - cron: "17 3 * * *"\n        case "$X" in\n            "43 4 3 * *") source=sirene ;;\n        esac\n',
      },
    ]
    const sirene: DeclaredSource = { source: "sirene", cadence: "monthly", migration: "x.sql" }
    expect(classifySources([sirene], scheduledSources(orphelin), {})[0].state).toBe("muet")
  })

  it("ne laisse pas un chargeur enchaîné répondre pour la source qu'il charge en passant", () => {
    // The trap #71 met one level up, transposed: two scripts pointing at the same file cannot
    // be told apart by a path. Here the `bdcom` arm runs geography.ts too, so a match on
    // loader FILE PATHS would have made the BDCom cron vouch for the geography source.
    const enchaine = [
      {
        file: "ingestion.yml",
        text:
          'on:\n  schedule:\n    - cron: "11 5 5 1,4,7,10 *"\n' +
          '        case "$X" in\n            "11 5 5 1,4,7,10 *") source=bdcom ;;\n        esac\n' +
          "            bdcom)\n              npx tsx scripts/ingest/bdcom.ts\n" +
          "              npx tsx scripts/ingest/geography.ts ;;\n",
      },
    ]
    const geography: DeclaredSource = { source: "geography", cadence: "rare", migration: "x.sql" }
    expect(classifySources([geography], scheduledSources(enchaine), {})[0].state).toBe("muet")
  })

  it("ne lit pas une ligne de commentaire comme une déclaration", () => {
    // The lesson scripts/ingest/workflow.test.ts learned first: a file that *explains* why it
    // does not schedule something must not be read as scheduling it. `readWorkflows` and
    // `readDeclaredSources` both strip comments, so this is checked on the real readers.
    expect(readWorkflows().every((w) => !/^\s*#/m.test(w.text))).toBe(true)
    expect(readDeclaredSources().every((d) => /^[a-z][a-z0-9_]*$/.test(d.source))).toBe(true)
  })
})

describe("la règle, jouée sur ce dépôt-ci", () => {
  it("ne laisse aucune source sans déclencheur planifié ni raison écrite", () => {
    const silent = cadencesOfTheSources().filter((v) => v.state === "muet")
    expect(
      silent.map((v) => `${v.source} (${v.cadence})`),
      "une source porte une cadence déclarée que rien ne tient : lui donner une entrée cron " +
        "dans .github/workflows/ingestion.yml, ou écrire dans scripts/porte/cadence.json " +
        "pourquoi elle n'en a pas",
    ).toEqual([])
  })

  it("ne garde aucune raison écrite pour une source disparue", () => {
    expect(cadencesOfTheSources().filter((v) => v.state === "orphelin").map((v) => v.source)).toEqual([])
  })

  it("n'excuse aucune source par ailleurs planifiée", () => {
    expect(cadencesOfTheSources().filter((v) => v.state === "contradictoire").map((v) => v.source)).toEqual([])
  })

  it("recense les huit sources, et les quatre que #70 nomme sont planifiées", () => {
    // Measured 1 September 2026 against the remote, `compass_source_freshness()`: eight rows,
    // the same eight the migrations declare. If the enumeration ever finds nothing it has
    // stopped working, and reporting that as success is the silent-absence defect this whole
    // family of checks refuses (scripts/eval/census.ts says so first).
    const verdicts = cadencesOfTheSources()
    expect(verdicts.length).toBe(8)
    for (const source of ["chantiers", "sirene_stock", "plu", "terrasses"]) {
      expect(verdicts.find((v) => v.source === source)?.state, `${source} n'est pas planifiée`).toBe("planifie")
    }
  })

  it("donne à chaque source déclarée une cadence que la table de tolérance connaît", () => {
    // The other half of the same rule, and the one that was missing: `weekly` reached the
    // enum on 25 August 2026 and never reached the tolerance table, so `chantiers` was
    // reported "à jour" at any age. DIAGNOSTIC.md §31.
    for (const { source, cadence } of readDeclaredSources()) {
      expect(() => toleranceOf(cadence), `${source} porte une cadence sans tolérance`).not.toThrow()
    }
  })

  it("lit au moins un workflow qui porte une cadence, et au moins une migration qui déclare", () => {
    // If the workflows directory were renamed or the migrations moved, every source would read
    // as unscheduled and the first test would go red for the right reason — this one names it.
    expect(scheduledSources(readWorkflows()).size).toBeGreaterThan(0)
    expect(readDeclaredSources().length).toBeGreaterThan(0)
    expect(readSourceExcuses()).toBeTypeOf("object")
  })
})

describe("le dépassement de cadence a un comportement décidé", () => {
  it("ne laisse aucune valeur de l'énumération sans décision écrite", () => {
    // A number or an explicit null — never an absent key. The two are different things since
    // 1 September 2026, and the whole fix of §31 is that they are told apart.
    for (const cadence of CADENCES) {
      expect(Object.prototype.hasOwnProperty.call(TOLERANCE_DAYS, cadence), `${cadence} non tranchée`).toBe(true)
      const days = TOLERANCE_DAYS[cadence]
      expect(days === null || days > 0, `${cadence} porte une tolérance absurde`).toBe(true)
    }
  })

  it("refuse une cadence inconnue au lieu de la lire comme « rien à dire »", () => {
    // The exact shape of §31: `TOLERANCE_DAYS[cadence] ?? null` turned an unhandled enum value
    // into a source that could never be late. A key absent still throws; a key written `null`
    // is a decision and does not.
    expect(() => toleranceOf("quinquennal")).toThrow(/inconnue/)
    expect(() => toleranceOf("rare")).not.toThrow()
    expect(toleranceOf("rare")).toBeNull()
  })

  it("distingue jamais chargé de très vieux", () => {
    expect(verdictOf({ cadence: "weekly", ageDays: null }).state).toBe("jamais-charge")
    expect(verdictOf({ cadence: "weekly", ageDays: 999 }).state).toBe("en-retard")
  })

  it("tolère un retard de planification, pas une semaine manquée", () => {
    expect(verdictOf({ cadence: "weekly", ageDays: 8 }).state).toBe("a-jour")
    expect(verdictOf({ cadence: "weekly", ageDays: 11 }).state).toBe("en-retard")
    expect(verdictOf({ cadence: "continuous", ageDays: 4 }).state).toBe("en-retard")
  })

  it("voit une source née sur le distant sans passer par une migration", () => {
    // The half no repository check can do, and the reason freshness.ts is an arm of the gate:
    // a row inserted from psql or the Supabase console carries a declared cadence that no
    // workflow will ever hold, and scripts/porte/cadences.ts would never see it.
    const drift = reconcileSources(["bodacc", "marches"], ["bodacc"])
    expect(drift).toHaveLength(1)
    expect(drift[0]).toContain("marches")
    expect(drift[0]).toContain("aucune migration")
  })

  it("voit une migration déclarée que le distant n'a pas", () => {
    const drift = reconcileSources(["bodacc"], ["bodacc", "marches"])
    expect(drift).toHaveLength(1)
    expect(drift[0]).toContain("absente du distant")
  })

  it("ne dit rien quand les deux listes coïncident", () => {
    // Measured 1 September 2026: the eight rows of compass_source_freshness() are exactly the
    // eight the migrations declare.
    expect(reconcileSources(["a", "b"], ["b", "a"])).toEqual([])
  })

  it("ne met jamais en retard une cadence de vérification, et ne la dit pas à jour non plus", () => {
    // Decision of 1 September 2026: `rare` and `triennial` carry no threshold. Any threshold
    // worth having would have sat beyond a year, which is past the point where anybody could
    // act on it. But an unjudged row must not be rendered "à jour" — saying up-to-date about
    // something nothing checked is the small lie §31 was made of.
    for (const ageDays of [200, 401, 5000]) {
      expect(verdictOf({ cadence: "rare", ageDays }).state).toBe("sans-seuil")
      expect(verdictOf({ cadence: "triennial", ageDays }).state).toBe("sans-seuil")
    }
    expect(verdictOf({ cadence: "rare", ageDays: 5000 }).label).not.toContain("à jour")
    // And "never loaded" still wins over "no threshold": an absence of measurement is not the
    // same answer as a measurement nobody judged.
    expect(verdictOf({ cadence: "rare", ageDays: null }).state).toBe("jamais-charge")
  })

  it("garde un seuil là où la donnée vieillit vraiment en jours", () => {
    // The counter-test of the decision above: dropping the thresholds for the verification
    // cadences must not have dropped them for the sources that do age.
    expect(TOLERANCE_DAYS.continuous).toBe(3)
    expect(TOLERANCE_DAYS.weekly).toBe(10)
    expect(TOLERANCE_DAYS.monthly).toBe(45)
  })

  it("laisse bodacc surveiller le fichier de workflow entier", () => {
    // The reason the nulls above cost little, and it is the half that is not obvious: the
    // eight crons live in ONE workflow file, and the liveness risk these layers run is GitHub
    // disabling that file after 60 quiet days — which disables it whole. `bodacc` is in the
    // same file with a three-day threshold, so it answers for all eight.
    const crons = readWorkflows()
      .map((w) => [...w.text.matchAll(/^\s*-\s*cron:/gm)].length)
      .filter((n) => n > 0)
    expect(crons, "les crons d'ingestion ne sont plus dans un seul fichier").toContain(readDeclaredSources().length)
    expect(TOLERANCE_DAYS.continuous).not.toBeNull()
  })
})
