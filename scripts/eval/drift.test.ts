// Les deux sens dans lesquels la règle d'origine se trompait, joués contre des nombres réels.
//
// Les valeurs viennent du passage de la porte du 2 septembre 2026 et de la mesure faite sur le
// distant le même jour, pas d'une invention : une règle de seuil éprouvée sur des chiffres
// arrondis à la main ne prouve rien de ce qu'elle fera sur la distribution qu'elle juge.

import { describe, expect, it } from "vitest"

import { arrondiPublie, derive, verdictEcart } from "./drift"

/** Le gel du 17 août, et ce que la porte a mesuré le 2 septembre. */
const MEDIANE = { value: 160868, publie: { pas: 10000, valeur: 160000 } }

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
    expect(v.detail).toContain("chiffre publié inchangé")
  })

  it("bloque quand le chiffre publié change, si petit que soit l'écart brut", () => {
    // Le trou de l'ancienne règle : 0,0006 %, sous tous les seuils, et pourtant le README
    // passerait de 160 000 à 170 000 €.
    const v = verdictEcart({ value: 164999, publie: { pas: 10000, valeur: 160000 } }, 165001)
    expect(derive(164999, 165001)).toBeLessThan(0.0001)
    expect(v.bloquant).toBe(true)
    expect(v.detail).toContain("160000 → 170000")
    expect(v.detail).toContain("README")
  })

  it("bloque aussi vers le bas — une baisse publiée est un mensonge comme une hausse", () => {
    expect(verdictEcart(MEDIANE, 154000).bloquant).toBe(true)
  })
})

describe("l'arrondi est celui du produit, pas une troncature", () => {
  it("arrondit au plus proche", () => {
    expect(arrondiPublie(163000, 10000)).toBe(160000)
    expect(arrondiPublie(165001, 10000)).toBe(170000)
    // 165 000 pile : `Math.round` monte, et c'est ce que fait aussi le `round()` de Postgres
    // sur les demi-entiers positifs — les deux côtés de la porte doivent arrondir pareil.
    expect(arrondiPublie(165000, 10000)).toBe(170000)
  })
})
