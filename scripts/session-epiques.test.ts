// La règle des épics, jouée sur des entrées substituées — et seulement sur elles.
//
// **Why there is no second half here, unlike scripts/porte/arms.test.ts.** That file plays its
// rule against the repository as it stands, because the repository is on disk. This one cannot:
// the population is on GitHub, and `npm.cmd run test` must stay playable offline and without a
// token. The live half is `npm.cmd run sessions:check`, which the scheduled gate runs every
// morning with `GH_TOKEN` — the same split, and the same reason, as the order table.
//
// So what is proven here is the RULE, and the sabotage that shows it can go red. What is proven
// on GitHub is the STATE, once a day. Neither replaces the other.

import { describe, expect, it } from "vitest"

import {
  corpsRegenere,
  decouperBloc,
  lireLigne,
  recouperEpique,
  ticketsDeLaVague,
} from "./session-epiques"
import { Issue, enteteDuTitre, issuesDuTicket } from "./session-issues"

const issue = (
  number: number,
  title: string,
  state: string,
  labels: string[],
  body = "",
): Issue => ({ number, title, state, labels: labels.map((name) => ({ name })), body })

const CORPS = [
  "**Vague 9** · Q4 2026",
  "",
  "Une prose humaine que rien ne régénère.",
  "",
  "## Tickets",
  "- [x] #201 `w9-un` **P0** — Le premier",
  "- [ ] #202 `w9-deux` **P1** — Le second",
  "",
  "## Fait quand",
  "Tous les tickets de la vague sont clos.",
].join("\n")

const EPIQUE = issue(200, "[épic] Vague 9 — Essai", "OPEN", ["epic", "vague-9"], CORPS)
const UN = issue(201, "[P0] w9-un — Le premier", "CLOSED", ["vague-9"])
const DEUX = issue(202, "[P1] w9-deux — Le second", "OPEN", ["vague-9"])
const MONDE = [EPIQUE, UN, DEUX]

describe("l'état juste, pour que le reste veuille dire quelque chose", () => {
  it("ne trouve aucun écart quand la liste dit les étiquettes", () => {
    expect(recouperEpique(EPIQUE, MONDE)).toEqual([])
  })

  it("ne compte pas l'épic parmi les tickets de sa propre vague", () => {
    // L'épic porte `vague-9` comme ses tickets : sans ce retrait, il se réclamerait lui-même.
    expect(ticketsDeLaVague(MONDE, "vague-9").map((i) => i.number)).toEqual([201, 202])
  })

  it("ne réécrit rien quand rien n'a bougé", () => {
    expect(corpsRegenere(EPIQUE, MONDE)).toBeNull()
  })
})

describe("les trois écarts que le ticket demande", () => {
  it("rougit sur une issue étiquetée qui ne figure pas dans la liste", () => {
    const neuf = issue(203, "[P1] w9-trois — Le troisième", "OPEN", ["vague-9"])
    const ecarts = recouperEpique(EPIQUE, [...MONDE, neuf])
    expect(ecarts.map((e) => e.genre)).toEqual(["manquante"])
    expect(ecarts[0].dit).toContain("#203")
  })

  it("rougit sur une ligne dont l'issue ne porte plus l'étiquette", () => {
    const degrade = [EPIQUE, UN, issue(202, DEUX.title, "OPEN", ["vague-4"])]
    const ecarts = recouperEpique(EPIQUE, degrade)
    expect(ecarts.map((e) => e.genre)).toEqual(["intruse"])
    expect(ecarts[0].dit).toContain("vague-4")
  })

  it("rougit sur une ligne dont l'issue n'existe pas", () => {
    // Le cas jumeau du précédent, et il se dit autrement : « ne porte plus l'étiquette »
    // enverrait le lecteur regarder des étiquettes qui n'ont pas de porteur.
    const corps = CORPS.replace("#202", "#999")
    const ecarts = recouperEpique({ ...EPIQUE, body: corps }, [
      { ...EPIQUE, body: corps },
      UN,
      DEUX,
    ])
    expect(ecarts.map((e) => e.genre).sort()).toEqual(["intruse", "manquante"])
    expect(ecarts.find((e) => e.genre === "intruse")?.dit).toContain("n'existe pas")
  })

  it("rougit sur une case qui contredit l'état — close et non cochée", () => {
    const ecarts = recouperEpique(EPIQUE, [EPIQUE, UN, { ...DEUX, state: "CLOSED" }])
    expect(ecarts.map((e) => e.genre)).toEqual(["case"])
    expect(ecarts[0].dit).toContain("close")
  })

  it("rougit sur une case qui contredit l'état — cochée et ouverte", () => {
    const ecarts = recouperEpique(EPIQUE, [EPIQUE, { ...UN, state: "OPEN" }, DEUX])
    expect(ecarts.map((e) => e.genre)).toEqual(["case"])
    expect(ecarts[0].dit).toContain("cochée")
  })

  it("revient au vert quand l'état est rétabli — le contre-test", () => {
    // Sans cette moitié, un contrôle qui rougirait sur toute entrée passerait les cinq
    // sabotages ci-dessus et ne garderait rien.
    expect(recouperEpique(EPIQUE, MONDE)).toEqual([])
  })
})

describe("ce qu'un contrôle doit dire au lieu de conclure", () => {
  it("refuse un épic dont les étiquettes ne nomment pas une vague", () => {
    const muet = issue(200, EPIQUE.title, "OPEN", ["epic"], CORPS)
    expect(recouperEpique(muet, [muet, UN, DEUX])[0].genre).toBe("vague")
  })

  it("refuse un épic sans section `## Tickets`", () => {
    const sans = { ...EPIQUE, body: "**Vague 9**\n\nRien d'autre." }
    expect(recouperEpique(sans, [sans, UN, DEUX])[0].genre).toBe("bloc")
  })

  it("signale une ligne illisible plutôt que de l'ignorer", () => {
    const corps = CORPS.replace("- [ ] #202 `w9-deux` **P1** — Le second", "- [ ] w9-deux, un jour")
    const casse = { ...EPIQUE, body: corps }
    const genres = recouperEpique(casse, [casse, UN, DEUX]).map((e) => e.genre).sort()
    expect(genres).toEqual(["illisible", "manquante"])
  })

  it("signale une issue étiquetée dont le titre ne nomme aucun ticket", () => {
    const hors = issue(204, "Une remarque en passant sur w9-deux", "OPEN", ["vague-9"])
    const ecarts = recouperEpique(EPIQUE, [...MONDE, hors])
    expect(ecarts.map((e) => e.genre)).toEqual(["convention"])
  })
})

describe("l'ordre est une décision humaine, la population ne l'est pas", () => {
  it("garde l'ordre des lignes en place et pose la nouvelle à la fin", () => {
    // #43 à #46 et #48 sont ordonnés par ce qu'il faut faire d'abord, pas par numéro : les
    // remettre en ordre numérique détruirait une décision en prétendant corriger un fait.
    const inverse = {
      ...EPIQUE,
      body: CORPS.replace(
        "- [x] #201 `w9-un` **P0** — Le premier\n- [ ] #202 `w9-deux` **P1** — Le second",
        "- [ ] #202 `w9-deux` **P1** — Le second\n- [x] #201 `w9-un` **P0** — Le premier",
      ),
    }
    const neuf = issue(203, "[P1] w9-trois — Le troisième", "OPEN", ["vague-9"])
    const suivant = corpsRegenere(inverse, [inverse, UN, DEUX, neuf])!
    const lignes = suivant.split("\n").filter((l) => l.startsWith("- ["))
    expect(lignes).toEqual([
      "- [ ] #202 `w9-deux` **P1** — Le second",
      "- [x] #201 `w9-un` **P0** — Le premier",
      "- [ ] #203 `w9-trois` **P1** — Le troisième",
    ])
  })

  it("retire la ligne d'une issue qui a perdu son étiquette", () => {
    const degrade = [EPIQUE, UN, issue(202, DEUX.title, "OPEN", ["vague-4"])]
    const suivant = corpsRegenere(EPIQUE, degrade)!
    expect(suivant).not.toContain("#202")
    expect(suivant).toContain("#201")
  })

  it("recopie le préambule et le « Fait quand » sans les toucher", () => {
    const neuf = issue(203, "[P1] w9-trois — Le troisième", "OPEN", ["vague-9"])
    const suivant = corpsRegenere(EPIQUE, [...MONDE, neuf])!
    expect(suivant).toContain("Une prose humaine que rien ne régénère.")
    expect(suivant).toContain("## Fait quand\nTous les tickets de la vague sont clos.")
  })

  it("découpe le bloc sans avaler le titre suivant", () => {
    const bloc = decouperBloc(CORPS)!
    expect(bloc.avant.at(-1)).toBe("## Tickets")
    expect(bloc.apres[0]).toBe("## Fait quand")
    expect(bloc.brutes.filter((l) => l.startsWith("- ["))).toHaveLength(2)
  })
})

describe("l'appariement ancré, partagé avec la table d'ordre", () => {
  it("lit une ligne d'épic dont le titre porte son propre tiret cadratin", () => {
    const ligne = lireLigne("- [x] #57 `w0-retenue` **P0** — La règle — et sa 5e victime")!
    expect(ligne).toMatchObject({ coche: true, numero: 57, id: "w0-retenue", priorite: "P0" })
    expect(ligne.titre).toBe("La règle — et sa 5e victime")
  })

  it("ne laisse pas une issue qui MENTIONNE un ticket le revendiquer — #131", () => {
    // Le défaut du 11 septembre 2026 : « … et trois petites dettes de w6-contexte » avait pris
    // la ligne de #119. La règle vit maintenant dans session-issues.ts, et les deux côtés la
    // partagent — donc ce test garde la table d'ordre autant que les épics.
    const mention = issue(999, "[P1] Trois petites dettes de w6-contexte", "OPEN", [])
    const vraie = issue(119, "[P1] w6-contexte — La fiche de contexte devient le produit", "CLOSED", [])
    expect(issuesDuTicket([mention, vraie], "w6-contexte").map((i) => i.number)).toEqual([119])
  })

  it("ne prend pas pour un ticket une issue qui commence par [Pn] sans en nommer un", () => {
    // 79 issues commencent par `[Pn]` et 62 seulement nomment un ticket, mesuré le
    // 15 septembre 2026. Le tiret cadratin est ce qui les sépare.
    expect(enteteDuTitre("[P1] Le bras `servi` ne surveille qu'une catégorie de trace")).toBeNull()
    expect(enteteDuTitre("[P0] w1-porte-page — Quatorze bras")?.id).toBe("w1-porte-page")
  })
})
