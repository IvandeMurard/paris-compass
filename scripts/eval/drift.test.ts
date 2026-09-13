// Les deux sens dans lesquels la règle d'origine se trompait, joués contre des nombres réels.
//
// Les valeurs viennent du passage de la porte du 2 septembre 2026 et de la mesure faite sur le
// distant le même jour, pas d'une invention : une règle de seuil éprouvée sur des chiffres
// arrondis à la main ne prouve rien de ce qu'elle fera sur la distribution qu'elle juge.

import { describe, expect, it } from "vitest"

import { derive, tranchePubliee, verdictEcart } from "./drift"

/** Le gel du 17 août, et ce que la porte a mesuré le 2 septembre. */
const MEDIANE = { value: 160868, publie: { pas: 10000, bas: 160000 } }

describe("un comptage garde la règle du 9 août", () => {
  it("laisse passer une republication de source en avertissement", () => {
    // sirene_etablissements, mesuré le 2 septembre : +0,16 %.
    const v = verdictEcart({ value: 68770 }, 68881)
    expect(v.bloquant).toBe(false)
    expect(v.detail).toContain("0.16%")
  })

  it("bloque au-delà de 1 %, où ce n'est plus la source mais le pipeline", () => {
    expect(verdictEcart({ value: 68770 }, 70000).bloquant).toBe(true)
  })
})

describe("un quantile ne se juge pas au pourcentage", () => {
  it("ne bloque plus sur une marche d'escalier qui ne change rien de publié", () => {
    // Le rouge du 2 septembre : +1,33 % sur la médiane, pour +0,29 % de population.
    const v = verdictEcart(MEDIANE, 163000)
    expect(v.bloquant).toBe(false)
    expect(v.detail).toContain("1.33%")
    expect(v.detail).toContain("tranche publiée inchangée")
  })

  it("bloque quand la tranche publiée change, si petit que soit l'écart brut", () => {
    // Le trou de la règle d'origine, joué sur le bord d'une TRANCHE et non d'un arrondi :
    // 0,0012 %, sous tous les seuils, et pourtant la phrase du README cesse d'être vraie.
    const v = verdictEcart({ value: 169999, publie: { pas: 10000, bas: 160000 } }, 170001)
    expect(derive(169999, 170001)).toBeLessThan(0.0001)
    expect(v.bloquant).toBe(true)
    expect(v.detail).toContain("160000-170000 → 170000-180000")
    expect(v.detail).toContain("README")
  })

  it("CONTRE-PREUVE : le passage qui faisait crier l'arrondi ne change aucune tranche", () => {
    // 164 999 → 165 001 était LE cas fondateur de la règle d'arrondi : il la faisait bloquer.
    // Sous une tranche, il ne bloque plus — et c'est correct, pas plus permissif : la phrase
    // publiée « entre 160 000 et 170 000 € » est vraie des deux côtés du passage. Rien à
    // corriger dans le produit, donc rien à signaler.
    const v = verdictEcart({ value: 164999, publie: { pas: 10000, bas: 160000 } }, 165001)
    expect(v.bloquant).toBe(false)
    expect(v.detail).toContain("tranche publiée inchangée")
  })

  it("les trois valeurs qu'a prises cette médiane tiennent dans une seule tranche", () => {
    // 160 868 le 9 août, 163 000 le 2 septembre, 165 000 le 11 — mesurées sur le distant, pas
    // choisies. L'arrondi aurait crié sur la troisième ; la tranche les contient toutes.
    for (const mesure of [160868, 163000, 165000]) {
      expect(tranchePubliee(mesure, 10000), String(mesure)).toBe(160000)
    }
  })

  it("bloque aussi vers le bas — une baisse publiée est un mensonge comme une hausse", () => {
    expect(verdictEcart(MEDIANE, 154000).bloquant).toBe(true)
  })
})

describe("une tranche contient sa mesure, un arrondi la place au bord", () => {
  it("descend au multiple inférieur, jamais au plus proche", () => {
    expect(tranchePubliee(163000, 10000)).toBe(160000)
    expect(tranchePubliee(165001, 10000)).toBe(160000)
    // Le cas qui a tout déclenché : 165 000 pile. `Math.round` serait monté à 170 000, soit
    // 5 000 € au-dessus de la mesure — un demi-pas, l'écart maximal possible. La tranche le
    // garde dedans, et à son milieu, l'endroit le plus stable qui soit.
    expect(tranchePubliee(165000, 10000)).toBe(160000)
  })

  it("ne bloque pas dans la tranche, bloque au franchissement du multiple", () => {
    const gel = { value: 165000, publie: { pas: 10000, bas: 160000 } }
    expect(verdictEcart(gel, 160000).bloquant).toBe(false)
    expect(verdictEcart(gel, 169999).bloquant).toBe(false)
    expect(verdictEcart(gel, 170000).bloquant).toBe(true)
    expect(verdictEcart(gel, 159999).bloquant).toBe(true)
  })
})
