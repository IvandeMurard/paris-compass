// The shared report — #71, reused by #73.
//
// The outputs below are real, copied from the 31 August 2026 run. The classification is tested
// on exit codes alone, which is the whole design: the arms decide what stops being a failure,
// on `error.code`, in scripts/eval/upstream.ts. If this module ever starts reading text to
// decide, these tests are where it will show.

import { describe, expect, it } from "vitest"

import { blockOf, buildReport, EXIT, headlineOf, type ArmOutcome } from "./report"

const ON = new Date(2026, 7, 31)

const GREEN: ArmOutcome = {
  name: "eval:anon",
  exitCode: 0,
  output: "PASS — la règle de licence tient pour un visiteur sans clé, 15 contrôles — dbefhvmyfmmhjeetdddu.supabase.co",
}
const WARNED: ArmOutcome = {
  name: "eval",
  exitCode: 3,
  output: "[20:09:31] AVERTISSEMENT — 11 écart(s) sous le seuil bloquant — dbefhvmyfmmhjeetdddu via aws-1-eu-west-1.pooler.supabase.com",
}
const RED: ArmOutcome = {
  name: "verify:mcp",
  exitCode: 1,
  output: "41 contrôles — 38 au vert, 1 en échec, 2 suspendus (panne amont), 0 défaut(s) connu(s)",
}

describe("classement d'un bras", () => {
  it("suit la convention de sortie et rien d'autre", () => {
    expect(blockOf(EXIT.pass)).toBe("rien")
    expect(blockOf(EXIT.unsettled)).toBe("change")
    expect(blockOf(EXIT.fail)).toBe("decision")
    expect(blockOf(EXIT.error)).toBe("decision")
  })

  it("traite un code inconnu comme une décision, jamais comme un vert", () => {
    // Guessing in the generous direction is how a gate stops gating — and a runner that
    // invents an exit code has done something nobody described.
    expect(blockOf(42)).toBe("decision")
    expect(blockOf(-1)).toBe("decision")
  })

  it("ne lit pas le texte pour décider", () => {
    // A red whose output happens to contain the word PASS stays red; a green whose output
    // contains FAIL stays green. #61 refused to classify on text for the same reason.
    expect(blockOf(EXIT.fail)).toBe("decision")
    const trap = buildReport([{ name: "eval", exitCode: EXIT.fail, output: "PASS partout, sauf que non" }], ON)
    expect(trap.decisionRequired).toBe(true)
  })
})

describe("le compte rendu", () => {
  it("tient en trois lignes quand tout est au vert", () => {
    const report = buildReport([GREEN, { ...RED, exitCode: 0 }], ON)
    expect(report.decisionRequired).toBe(false)
    expect(report.markdown).toContain("**Rien à faire.** 2 bras joués le 31 août 2026, tous au vert.")
    expect(report.markdown).toContain("**Changé, sans décision requise.** Rien.")
    expect(report.markdown).toContain("**Décision requise.** Aucune.")
  })

  it("dit « rien à faire » en une ligne pour l'ensemble, pas une par contrôle", () => {
    const report = buildReport([GREEN, { ...RED, exitCode: 0 }, { ...WARNED, exitCode: 0 }], ON)
    const rien = report.markdown.split("\n").filter((l) => l.startsWith("**Rien à faire."))
    expect(rien).toHaveLength(1)
  })

  it("nomme et date une suspension sans en faire une décision", () => {
    const report = buildReport([GREEN, WARNED], ON)
    expect(report.decisionRequired).toBe(false)
    expect(report.markdown).toContain("**Changé, sans décision requise.**")
    expect(report.markdown).toContain("`eval`")
    expect(report.markdown).toContain("31 août 2026")
  })

  it("met un rouge dans le troisième bloc, avec la mesure, sa date et la décision attendue", () => {
    const report = buildReport([GREEN, RED], ON)
    expect(report.decisionRequired).toBe(true)
    expect(report.markdown).toContain("**Décision requise** — 1 bras")
    expect(report.markdown).toContain("**Mesuré** le 31 août 2026")
    expect(report.markdown).toContain("**Décision attendue**")
    expect(report.markdown).toContain("Jamais desserrer un seuil")
  })

  it("renvoie une sortie 2 vers le bras, jamais vers le rapport", () => {
    // The arm holds the error object and its code; this module holds a string. Teaching the
    // report to be lenient is how the alert learns to lie.
    const report = buildReport([{ name: "eval", exitCode: 2, output: "ERREUR — connect ETIMEDOUT" }], ON)
    expect(report.markdown).toContain("scripts/eval/upstream.ts")
  })

  it("accepte la décision qu'un appelant écrit lui-même", () => {
    const report = buildReport(
      [{ name: "ingestion (bodacc)", exitCode: 1, output: "le chargement n'est pas allé au bout", expected: "relancer le chargement" }],
      ON,
    )
    expect(report.markdown).toContain("**Décision attendue** — relancer le chargement")
    expect(report.markdown).not.toContain("Jamais desserrer un seuil")
  })

  it("ne laisse sortir aucun identifiant de base, sortie repliée comprise", () => {
    const report = buildReport([GREEN, WARNED, RED], ON)
    expect(report.markdown).not.toContain("dbefhvmyfmmhjeetdddu")
    expect(report.markdown).not.toContain("pooler.supabase.com")
  })

  it("retient une sortie qu'il ne sait pas masquer plutôt que de la publier", () => {
    // Fails closed. The shape below is not one redaction.ts knows, and the honest answer is
    // to say so rather than to publish on the chance that it was harmless.
    const opaque: ArmOutcome = {
      name: "eval",
      exitCode: 1,
      output: "ÉCHEC — projet postgres://abc:def@10.0.0.1:5432/x",
    }
    const report = buildReport([opaque], ON)
    expect(report.markdown).not.toContain("10.0.0.1")
  })
})

describe("la ligne de verdict reprise dans le rapport", () => {
  it("prend la dernière ligne de verdict, pas la dernière ligne", () => {
    const output = "PASS — tout va bien\n\n  requête la plus coûteuse : compass_premises_within — 1470 ms"
    expect(headlineOf(output)).toContain("PASS")
  })

  it("ne rend jamais vide", () => {
    expect(headlineOf("")).toBe("(aucune sortie)")
  })
})
