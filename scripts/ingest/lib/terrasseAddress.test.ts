// The address pattern of `terrasses-autorisations`, as assertions rather than as a run.
//
// Why this file exists when no other loader has one, and the 25 August decision said so.
// That decision was taken when nothing read the result: the four terrace columns had no
// consumer. Since 26 August the premise sheet renders them, and an address that fails to
// parse attaches to no premise — which reads on screen as "no authorisation at this
// address". A silent parse failure became a wrong answer to a reader, and the pattern grew
// a suffix rule the same day. Two reasons where there were none.
//
// The cases below are real strings from the export, not invented ones. The regression half
// matters more than the new half: widening a pattern is how one quietly stops parsing what
// already worked, and the greedy-match trap named in terrasseAddress.ts is exactly that.

import { describe, expect, it } from "vitest"

import { parseAddress } from "./terrasseAddress"

const flat = (raw: string | null) => {
  const p = parseAddress(raw)
  return p ? `${p.houseNumber}|${p.wayType}|${p.wayName}` : null
}

describe("parseAddress — ce qui marchait doit continuer", () => {
  it("lit la forme courante", () => {
    expect(flat("125 AVENUE DE CHOISY")).toBe("125|AVENUE|DE CHOISY")
    expect(flat("22B AVENUE RAPP")).toBe("22|AVENUE|RAPP")
    expect(flat("3 RUE DU JOUR")).toBe("3|RUE|DU JOUR")
  })

  it("ne laisse pas le suffixe avaler un type de voie de trois lettres", () => {
    // Le piège : un suffixe autorisé après une espace rendrait « RUE » comme type de voie
    // et « DES » comme… type de voie aussi. Mesuré sur 24 199 adresses : 0 parse changé.
    expect(flat("12 RUE DES PLANTES")).toBe("12|RUE|DES PLANTES")
    expect(flat("8 RUE ARCHIVES")).toBe("8|RUE|ARCHIVES")
  })

  it("accepte la lettre écrite à part et les formes en toutes lettres", () => {
    expect(flat("10 B RUE DE LA PAIX")).toBe("10|RUE|DE LA PAIX")
    expect(flat("14 BIS RUE DE PARADIS")).toBe("14|RUE|DE PARADIS")
    expect(flat("14 TER RUE DE PARADIS")).toBe("14|RUE|DE PARADIS")
  })

  it("prend le premier numéro d'une plage", () => {
    expect(flat("1-3 RUE MONTORGUEIL")).toBe("1|RUE|MONTORGUEIL")
    expect(flat("1/3/5 PLACE JEAN MARAIS")).toBe("1|PLACE|JEAN MARAIS")
  })
})

describe("parseAddress — les suffixes collés au numéro", () => {
  // Les quatorze adresses que l'ancien motif rendait nulles, mesurées sur l'export du
  // 26 août 2026. Le suffixe n'est jamais le numéro : seul le nombre de tête est rattaché.
  it.each([
    ["32BV RUE DES PLANTES", "32|RUE|DES PLANTES"],
    ["12BV PLACE DE LA REPUBLIQUE", "12|PLACE|DE LA REPUBLIQUE"],
    ["110BV AVENUE JEAN JAURES", "110|AVENUE|JEAN JAURES"],
    ["70BV BOULEVARD DE STRASBOURG", "70|BOULEVARD|DE STRASBOURG"],
    ["1P2 PLACE JEAN PRONTEAU", "1|PLACE|JEAN PRONTEAU"],
    ["3P1 PLACE GRACE MURRAY HOPPER", "3|PLACE|GRACE MURRAY HOPPER"],
    ["183P41 AVENUE DE CLICHY", "183|AVENUE|DE CLICHY"],
    ["14U2 AVENUE PIERRE MENDES FRANCE", "14|AVENUE|PIERRE MENDES FRANCE"],
    ["1Z1 RUE GABRIEL LAME", "1|RUE|GABRIEL LAME"],
  ])("%s", (raw, expected) => {
    expect(flat(raw)).toBe(expected)
  })
})

describe("parseAddress — ce qui doit rester non parsé", () => {
  // Deviner ici attacherait une autorisation à un local qui ne la porte pas. Une adresse
  // non parsée ne s'attache à rien, et la fiche le dit dans sa réserve du « non ».
  it.each([
    ["null", null],
    ["", null],
    ["RUE FERDINAND DUVAL", null],
    ["BOULEVARD FLANDRIN NORD", null],
    ["PLACE DE L ABBE LEBOEUF", null],
    ["565850124 003", null],
    ["GOUROLMDA@YAHOO.FR", null],
    ["SSSS", null],
    // Lettre de lot AVANT le numéro : « A - 26 » est-il le 26 ? La source ne le dit pas,
    // et quatre lignes ne justifient pas de trancher à sa place.
    ["A - 26 RUE CUSTINE", null],
    ["- 143 BOULEVARD LEFEBVRE", null],
  ])("%s", (raw, expected) => {
    expect(flat(raw === "null" ? null : raw)).toBe(expected)
  })
})
