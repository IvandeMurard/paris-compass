// The control that fails if a source joins the catalogue without a verification — w1-catalogue
// (#73), point 3, and the third application of « énumérer, pas lister » after #71 on the npm
// scripts and #70 on the ingestion sources.
//
// Two halves, and both are needed, exactly as scripts/porte/arms.test.ts has them. The first
// plays the rule against substituted inputs, which is where the sabotage lives: a source added
// and the check must go red, the source removed and it must go green again. The second plays
// it against the repository as it stands, which is what will catch the source somebody writes
// into the catalogue in three months — the case no fixture can anticipate, and the only one
// that actually matters.

import { describe, expect, it } from "vitest"

import {
  catalogueDesSources,
  classifyCatalogue,
  estClasse,
  readCatalogue,
  readProbes,
  statusOf,
  type CatalogueEntry,
  type Probe,
} from "./catalogue"

const SONDE: Probe = {
  lecture: "opendatasoft",
  endpoint: "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/exemple",
  "licence-attendue": "Open Database License (ODbL)",
}

function entry(name: string, statutBrut: string, licence = "ODbL"): CatalogueEntry {
  return { name, producteur: "Producteur", statutBrut, licence, ...statusOf(statutBrut) }
}

describe("la règle, jouée sur des entrées substituées", () => {
  it("tient une source sondée pour vérifiée", () => {
    const verdicts = classifyCatalogue([entry("Chantiers", "planifiée")], { Chantiers: SONDE }, {})
    expect(verdicts[0].state).toBe("verifiee")
  })

  it("tient une source avec une raison écrite pour excusée", () => {
    const verdicts = classifyCatalogue([entry("Sitadel", "planifiée")], {}, { Sitadel: "Aucun endpoint épinglé." })
    expect(verdicts[0].state).toBe("excusee")
  })

  it("rougit sur une source ajoutée sans vérification — le sabotage", () => {
    const verdicts = classifyCatalogue(
      [entry("Chantiers", "planifiée"), entry("Registre des enseignes", "nouvelle", "Licence Ouverte")],
      { Chantiers: SONDE },
      {},
    )
    const sonde = verdicts.find((v) => v.name === "Registre des enseignes")
    expect(sonde?.state).toBe("muette")
    expect(sonde?.detail).toContain("catalogue.json")
  })

  it("revient au vert une fois la sonde retirée", () => {
    // The counter-test, and the half a sabotage usually forgets: a check that went red for
    // every input would pass the case above and be worth nothing.
    const verdicts = classifyCatalogue([entry("Chantiers", "planifiée")], { Chantiers: SONDE }, {})
    expect(verdicts.every((v) => estClasse(v.state))).toBe(true)
  })

  it("n'interroge pas une source refusée, et refuse qu'on lui donne une sonde", () => {
    const refusee = entry("Portails d'annonces", "refusée", "CGU, réutilisation interdite")
    expect(classifyCatalogue([refusee], {}, {})[0].state).toBe("hors-population")
    // A refusal is a decision, not an outage to watch: probing it every morning would be an
    // alert that can only ever say the same thing.
    expect(classifyCatalogue([refusee], { "Portails d'annonces": SONDE }, {})[0].state).toBe("contradictoire")
  })

  it("lit le statut malgré ce qui est écrit après lui", () => {
    expect(statusOf("ingérée · affichée").canonical).toBe("ingeree")
    expect(statusOf("ingérée · affichée").affichee).toBe(true)
    expect(statusOf("**écartée — non publiée, vérifié le 27/08**").canonical).toBe("ecartee")
  })

  it("rougit sur un statut que personne n'a lu, plutôt que de le ranger dans le voisin", () => {
    const verdicts = classifyCatalogue([entry("Source neuve", "pressentie")], {}, {})
    expect(verdicts[0].state).toBe("statut-inconnu")
  })

  it("rougit sur une source à la fois sondée et excusée", () => {
    const verdicts = classifyCatalogue([entry("Chantiers", "planifiée")], { Chantiers: SONDE }, { Chantiers: "raison" })
    expect(verdicts[0].state).toBe("contradictoire")
  })

  it("rougit sur une entrée orpheline — une raison pour une source disparue", () => {
    const verdicts = classifyCatalogue([entry("Chantiers", "planifiée")], { Chantiers: SONDE }, { Disparue: "raison" })
    expect(verdicts.find((v) => v.name === "Disparue")?.state).toBe("orpheline")
  })

  it("refuse une sonde sans licence attendue ni raison écrite de ne pas en attendre", () => {
    // An endpoint that publishes no licence is a fact to write down, not a check less. Two
    // ingested sources are in that case — BDCom's ArcGIS layer and BODACC's portal entry —
    // and leaving the field null in silence would read as « verified » on the report.
    const muette: Probe = { lecture: "arcgis", endpoint: "https://exemple/0", "licence-attendue": null }
    expect(classifyCatalogue([entry("BDCom", "ingérée")], { BDCom: muette }, {})[0].state).toBe("contradictoire")
    const dite: Probe = { ...muette, "licence-non-lisible": "copyrightText vide, mesuré le 5 septembre 2026" }
    expect(classifyCatalogue([entry("BDCom", "ingérée")], { BDCom: dite }, {})[0].state).toBe("verifiee")
  })
})

describe("la règle, jouée sur le dépôt tel qu'il est", () => {
  it("lit le catalogue de docs/PLAN-ACTION-VACANCE.md", () => {
    const entries = readCatalogue()
    // No expected count is asserted, deliberately: the catalogue is meant to grow, and a
    // number here would turn every new source into a red for the wrong reason. What is
    // asserted is that the table was found and that its cells are where they are believed
    // to be — a heading rename or a reordered column is the failure this catches.
    expect(entries.length).toBeGreaterThan(20)
    expect(entries.every((e) => e.name !== "" && e.statutBrut !== "")).toBe(true)
    expect(entries.some((e) => e.name.includes("BDCom"))).toBe(true)
  })

  it("classe chaque source exactement une fois — jamais un silence", () => {
    const verdicts = catalogueDesSources()
    const silencieuses = verdicts.filter((v) => !estClasse(v.state))
    expect(
      silencieuses.map((v) => `${v.state} — ${v.name} : ${v.detail}`),
      "une source du catalogue sans vérification ni raison écrite",
    ).toEqual([])
  })

  it("n'accepte aucune raison vide dans catalogue.json", () => {
    // « pas besoin » is the beginning of the complacency #71 refuses; an empty string is the
    // same thing with less honesty, and it would classify as excused.
    for (const [name, reason] of Object.entries(readProbes()["sans-verification"])) {
      expect(reason.trim().length, `raison vide pour ${name}`).toBeGreaterThan(30)
    }
  })

  it("épingle un endpoint, jamais la page du portail qui en parle", () => {
    // A documentation is not a measurement (CLAUDE.md). `explore/dataset/...` is the page a
    // human reads; `api/explore/...` is the record. Cross-checking one page against another
    // is exactly the mistake this ticket exists to stop.
    for (const [name, probe] of Object.entries(readProbes().verifications)) {
      expect(probe.endpoint, `${name} épingle une page de portail`).not.toMatch(/\/explore\/dataset\//)
      expect(probe.endpoint.startsWith("https://"), `${name} n'est pas en https`).toBe(true)
    }
  })
})
