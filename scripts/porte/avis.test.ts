// The control that plays the advisories rule without a network — 9 September 2026.
//
// Two halves, as arms.test.ts, catalogue.test.ts, observabilite.test.ts and ledger.test.ts have
// them. The first plays the rule against substituted inputs, and that is where the sabotage
// lives: an advisory nobody judged must go red, and writing a verdict for it must go green.
// The second plays what can be checked against the repository as it stands — that the register
// this repository actually ships is well-formed, and that no entry in it is a half-written
// opinion.
//
// None of it touches npm. The gathering — asking npm what it knows today — is the arm's job,
// scripts/porte/avis-verify.ts, which is planned on porte.yml. `test` carries no secret and no
// registry, and a rule that can only be played online is a rule nobody plays.

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import {
  borneCorrigee,
  estRouge,
  lireRegistre,
  verdicts,
  type Avis,
  type Jugement,
  type Registre,
} from "./avis"

const REGISTRE = resolve(__dirname, "avis.json")

function avis(surcharge: Partial<Avis> = {}): Avis {
  return {
    ghsa: "GHSA-aaaa-bbbb-cccc",
    paquet: "un-paquet",
    severite: "moderate",
    titre: "Un titre",
    plage: ">=1.0.0 <2.3.4",
    borneCorrigee: "2.3.4",
    proposeParNpm: "3.0.0",
    proposeUneMajeure: true,
    developpement: true,
    manifeste: "package-lock.json",
    ...surcharge,
  }
}

function jugement(surcharge: Partial<Jugement> = {}): Jugement {
  return {
    paquet: "un-paquet",
    atteignable: false,
    raison: "Le chemin qui l'atteindrait n'existe pas dans ce produit.",
    redeviendraitAtteignableSi: "Quelqu'un monte un serveur HTTP.",
    mesureLe: "2026-09-09",
    ...surcharge,
  }
}

const vide: Registre = { juges: {} }

describe("la borne du correctif, lue sur la plage vulnérable", () => {
  // The whole point of the arm. `npm audit` proposed vitest@5.0.0 on 9 September 2026 while the
  // range said `<4.1.11` — and 4.1.11 was the version that fixed it, one major lower.
  it("lit la borne haute, qui est la plus petite version qui corrige", () => {
    expect(borneCorrigee(">=2.1.0 <4.1.11")).toBe("4.1.11")
    expect(borneCorrigee("<4.13.5")).toBe("4.13.5")
    expect(borneCorrigee(">=4.0.0 <4.3.2")).toBe("4.3.2")
  })

  it("tolère les espaces et les préversions", () => {
    expect(borneCorrigee("< 1.2.3")).toBe("1.2.3")
    expect(borneCorrigee(">=1.0.0 <2.0.0-rc.1")).toBe("2.0.0-rc.1")
  })

  it("rend null plutôt que d'inventer, quand la plage n'a pas de borne haute", () => {
    expect(borneCorrigee(">=1.0.0")).toBeNull()
    expect(borneCorrigee("")).toBeNull()
  })
})

describe("la règle, jouée sur des entrées substituées", () => {
  it("passe au rouge sur un avis que personne n'a jugé", () => {
    const rendus = verdicts([avis()], vide)
    expect(rendus).toHaveLength(1)
    expect(rendus[0].etat).toBe("non jugé")
    expect(estRouge(rendus[0])).toBe(true)
    // The red must hand the reader the advisory and the smallest fix, not just a name.
    expect(rendus[0].dire).toContain("GHSA-aaaa-bbbb-cccc")
    expect(rendus[0].dire).toContain("2.3.4")
  })

  it("passe au vert dès qu'un verdict complet est écrit", () => {
    const registre: Registre = { juges: { "GHSA-aaaa-bbbb-cccc": jugement() } }
    const rendus = verdicts([avis()], registre)
    expect(rendus[0].etat).toBe("jugé")
    expect(estRouge(rendus[0])).toBe(false)
    // The date travels into the verdict: a judgement is a measurement, and it carries its date.
    expect(rendus[0].dire).toContain("2026-09-09")
  })

  // Three fields, three ways of writing nothing. A register that accepted any of them would be
  // the « pas besoin » that cadence.json calls the beginning of complacency.
  it.each([
    ["une raison vide", { raison: "  " }],
    ["une condition vide", { redeviendraitAtteignableSi: "" }],
    ["une date vide", { mesureLe: "" }],
  ])("refuse %s comme elle refuserait un silence", (_nom, trou) => {
    const registre: Registre = { juges: { "GHSA-aaaa-bbbb-cccc": jugement(trou) } }
    const rendus = verdicts([avis()], registre)
    expect(rendus[0].etat).toBe("non jugé")
    expect(estRouge(rendus[0])).toBe(true)
  })

  it("garde le rouge quand le verdict écrit dit ATTEIGNABLE", () => {
    // Writing the truth must not buy silence. An advisory judged reachable is the one case where
    // the register can never make the arm green — only a version bump can.
    const registre: Registre = {
      juges: { "GHSA-aaaa-bbbb-cccc": jugement({ atteignable: true, raison: "Le front l'appelle." }) },
    }
    const rendus = verdicts([avis()], registre)
    expect(rendus[0].etat).toBe("atteignable")
    expect(estRouge(rendus[0])).toBe(true)
    expect(rendus[0].dire).toContain("2.3.4")
  })

  it("passe au rouge sur une entrée qu'aucun avis ne porte plus", () => {
    // The symmetric of cadence.json's vanished script: prose that no longer describes anything.
    const registre: Registre = { juges: { "GHSA-partie-partie-partie": jugement() } }
    const rendus = verdicts([], registre)
    expect(rendus).toHaveLength(1)
    expect(rendus[0].etat).toBe("prose morte")
    expect(estRouge(rendus[0])).toBe(true)
  })

  describe("la raison qui repose sur un fait du dépôt", () => {
    const registre: Registre = {
      juges: {
        "GHSA-aaaa-bbbb-cccc": jugement({
          raison: "Le serveur ne parle que par tube.",
          invalideSi: { motif: "StreamableHTTPServerTransport", dans: ["mcp-server/src/index.ts"] },
        }),
      },
    }

    it("reste verte tant que le dépôt ne la contredit pas", () => {
      const contenus = { "mcp-server/src/index.ts": "new StdioServerTransport()" }
      expect(verdicts([avis()], registre, contenus)[0].etat).toBe("jugé")
    })

    it("passe au rouge le jour où le dépôt la contredit", () => {
      // This is the half that protects a consumer who does not exist yet: the day somebody
      // mounts an HTTP transport, the hono verdicts stop being true, and the arm says so before
      // anybody happens to re-read the register.
      const contenus = { "mcp-server/src/index.ts": "new StreamableHTTPServerTransport()" }
      const rendus = verdicts([avis()], registre, contenus)
      expect(rendus[0].etat).toBe("raison caduque")
      expect(estRouge(rendus[0])).toBe(true)
      expect(rendus[0].dire).toContain("mcp-server/src/index.ts")
    })

    it("ne rougit pas sur un fichier absent : absent n'est pas contredit", () => {
      expect(verdicts([avis()], registre, {})[0].etat).toBe("jugé")
    })
  })

  it("juge chaque manifeste pour lui-même", () => {
    // The same advisory can hold on one manifest and not the other — hono is a runtime
    // dependency of the published MCP package and absent from the front. Two lines, two reads.
    const rendus = verdicts(
      [avis(), avis({ manifeste: "mcp-server/package-lock.json" })],
      vide,
    )
    expect(rendus).toHaveLength(2)
    expect(rendus.map((v) => v.manifeste)).toEqual([
      "package-lock.json",
      "mcp-server/package-lock.json",
    ])
  })
})

describe("le registre que ce dépôt embarque, tel qu'il est", () => {
  it("se lit, et porte la clé que la règle attend", () => {
    expect(() => lireRegistre(REGISTRE)).not.toThrow()
  })

  it("refuse un registre sans clé « juges » plutôt que de le lire vide", () => {
    // A register that silently reads as empty is a gate that silently stops gating.
    const ailleurs = resolve(__dirname, "cadence.json")
    expect(() => lireRegistre(ailleurs)).toThrow(/juges/)
  })

  it("n'a aucune entrée à demi écrite", () => {
    const registre = lireRegistre(REGISTRE)
    for (const [ghsa, juge] of Object.entries(registre.juges)) {
      expect(juge.raison?.trim(), `${ghsa} sans raison`).toBeTruthy()
      expect(juge.redeviendraitAtteignableSi?.trim(), `${ghsa} sans condition`).toBeTruthy()
      expect(juge.mesureLe?.trim(), `${ghsa} sans date`).toBeTruthy()
      expect(typeof juge.atteignable, `${ghsa} sans verdict`).toBe("boolean")
    }
  })

  it("garde le raisonnement des avis fermés hors de la population jugée", () => {
    // `_clos` holds what reading five advisories cost on 9 September 2026. It is deliberately
    // NOT read by the rule: kept inside `juges`, every one of those entries would be prose
    // describing an advisory no manifest carries any more — five reds for having taken notes.
    const brut = JSON.parse(readFileSync(REGISTRE, "utf8")) as Record<string, unknown>
    const clos = brut._clos as Record<string, unknown>
    expect(clos).toBeTruthy()
    const juges = Object.keys((brut.juges ?? {}) as object)
    for (const ghsa of Object.keys(clos)) {
      if (ghsa.startsWith("_")) continue
      expect(juges, `${ghsa} est dans les deux sections`).not.toContain(ghsa)
    }
  })
})
