// The control that plays the served-versus-tracked rule without a network — #142.
//
// Two halves, as arms.test.ts, catalogue.test.ts, ledger.test.ts and avis.test.ts have them. The
// first plays the rule against substituted inputs, and that is where the sabotage lives: the
// founding incident of 13 September 2026 is replayed against the REAL route table, with a served
// bundle that carries the old routes and not the new ones. The second plays what can be checked
// against the repository as it stands.
//
// Nothing here touches the network. Fetching the published site is the arm's job,
// scripts/porte/servi-verify.ts, which is planned on porte.yml.

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import { readAppSource } from "./sitemap"
import { UI } from "../../src/i18n/ui"

import { jetonDeRoute, jetonsAttendus, LONGUEUR_MINIMALE, verdictServi, type Jeton } from "./servi"

const REGISTRE = resolve(__dirname, "servi.json")

const TABLE_FICTIVE = `
  import Index from "./pages/Index"
  <Route path="/" element={<Index />} />
  <Route path="/carte" element={<Carte />} />
  <Route path="/contexte/:slug" element={<Context />} />
  <Route path="*" element={<NotFound />} />
`

function jeton(surcharge: Partial<Jeton> = {}): Jeton {
  return { nom: "/carte", origine: "route", jeton: "/carte", discriminant: true, ...surcharge }
}

describe("le jeton qu'une route laisse dans un bundle", () => {
  it("est le chemin lui-même pour une route statique", () => {
    expect(jetonDeRoute("/carte")).toBe("/carte")
    expect(jetonDeRoute("/en/map")).toBe("/en/map")
  })

  it("est le préfixe fixe, barre comprise, pour une route paramétrée", () => {
    // `/contexte/:slug` s'écrit `/contexte/` dans le bundle, et c'est cette forme que le relevé
    // fondateur a cherchée. Sans la barre, `/contexte` trouverait aussi `/contextes` un jour.
    expect(jetonDeRoute("/contexte/:slug")).toBe("/contexte/")
    expect(jetonDeRoute("/en/context/:slug")).toBe("/en/context/")
  })

  it("n'existe pas pour `/` ni pour `/en`, qui vivent dans tous les autres chemins", () => {
    expect(jetonDeRoute("/")).toBeNull()
    expect(jetonDeRoute("/en")).toBeNull()
  })
})

/** Une table de libellés substituée : les tests de routes n'ont rien à dire de la vraie. */
const SANS_LIBELLE = {} as typeof UI

describe("la population, dérivée des tables plutôt que listée", () => {
  it("retient les routes, et déduplique les paramétrées sur leur préfixe", () => {
    const jetons = jetonsAttendus(TABLE_FICTIVE, SANS_LIBELLE)
    expect(jetons.map((j) => j.jeton)).toEqual(["/carte", "/contexte/"])
    expect(jetons.every((j) => j.origine === "route")).toBe(true)
  })

  it("marque non discriminante une route dont le jeton vit dans celui d'une autre", () => {
    const jetons = jetonsAttendus(
      `
      <Route path="/presentation" element={<P />} />
      <Route path="/en/presentation" element={<P />} />
      <Route path="/carte" element={<C />} />
    `,
      SANS_LIBELLE,
    )
    const par = Object.fromEntries(jetons.map((j) => [j.jeton, j.discriminant]))
    // Trouver `/presentation` ne dit pas LAQUELLE des deux est arrivée : la route française ne
    // peut pas se prouver elle-même, et le bras refuse de prétendre le contraire.
    expect(par["/presentation"]).toBe(false)
    expect(par["/en/presentation"]).toBe(true)
    expect(par["/carte"]).toBe(true)
  })
})

describe("les libellés, seconde population dérivée — #152", () => {
  const UI_FICTIVE = {
    'a.long': { fr: 'Une phrase assez longue pour prouver', en: 'A sentence long enough to prove' },
    'a.court': { fr: 'Carte', en: 'Map' },
    'a.contenu': { fr: 'Une phrase assez longue', en: 'A sentence long enough' },
  } as unknown as typeof UI

  it("tire ses jetons de la table i18n, dans les deux langues", () => {
    const jetons = jetonsAttendus("", UI_FICTIVE).filter((j) => j.origine === "libellé")
    expect(jetons).toHaveLength(6)
    // Le nom porte la clé ET la langue : un rouge doit dire quelle entrée ouvrir, pas seulement
    // quelle phrase manque.
    expect(jetons[0].nom).toBe("a.long [fr]")
  })

  it("tient pour non discriminant un libellé plus court que le seuil mesuré", () => {
    // « Map » apparaît 91 fois dans le bundle servi — le constructeur `Map`. Le trouver ne dit
    // rien de la table i18n, donc il témoigne et ne rougit jamais.
    const par = Object.fromEntries(
      jetonsAttendus("", UI_FICTIVE).map((j) => [j.jeton, j.discriminant]),
    )
    expect("Carte".length).toBeLessThan(LONGUEUR_MINIMALE)
    expect(par["Carte"]).toBe(false)
    expect(par["Map"]).toBe(false)
    expect(par["Une phrase assez longue pour prouver"]).toBe(true)
  })

  it("tient pour non discriminant un libellé contenu dans un autre", () => {
    // Même raison que `/presentation` dans `/en/presentation` : trouver la phrase courte ne dit
    // pas laquelle des deux est arrivée. La règle est la même pour les deux populations.
    const par = Object.fromEntries(
      jetonsAttendus("", UI_FICTIVE).map((j) => [j.jeton, j.discriminant]),
    )
    expect(par["Une phrase assez longue"]).toBe(false)
  })

  it("rougit sur un bundle qui porte les routes mais pas un libellé neuf", () => {
    // L'incident qui a écrit #152, en miniature : #145 a ajouté `source injoignable`, la
    // production a gardé l'ancien bundle, et l'ancien bras restait vert faute de regarder ailleurs
    // que les routes.
    const jetons = jetonsAttendus(TABLE_FICTIVE, UI_FICTIVE)
    const sansLeNeuf = jetons
      .filter((j) => j.jeton !== "Une phrase assez longue pour prouver")
      .map((j) => `"${j.jeton}"`)
      .join(";")
    const v = verdictServi(jetons, sansLeNeuf)
    expect(v.issue).toBe("en retard")
    expect(v.manquantes.map((m) => m.nom)).toEqual(["a.long [fr]"])
  })
})

describe("la vraie table i18n, telle qu'elle est", () => {
  const libelles = jetonsAttendus(readAppSource()).filter((j) => j.origine === "libellé")

  it("fournit une population non vide et majoritairement prouvable", () => {
    // Mesuré le 13 septembre 2026 : 258 chaînes, dont 256 servies par la production. Si ce
    // rapport s'effondrait — une refonte qui sortirait les libellés de `UI`, par exemple — le
    // bras deviendrait un témoin sans pouvoir de décision, en silence. Ce test le dit tout haut.
    expect(libelles.length).toBeGreaterThan(150)
    const prouvables = libelles.filter((j) => j.discriminant)
    expect(prouvables.length / libelles.length).toBeGreaterThan(0.5)
  })

  it("porte les deux chaînes de #145, et les tient pour prouvables", () => {
    const par = Object.fromEntries(libelles.map((j) => [j.jeton, j.discriminant]))
    expect(par["source injoignable"]).toBe(true)
    expect(par["source unreachable"]).toBe(true)
  })
})

describe("la règle, jouée sur des entrées substituées", () => {
  it("passe au vert quand chaque route prouvable est dans le JavaScript lu", () => {
    const v = verdictServi([jeton(), jeton({ nom: "/contexte/:slug", jeton: "/contexte/" })], 'a="/carte";b="/contexte/x"')
    expect(v.issue).toBe("servi")
    expect(v.manquantes).toEqual([])
    expect(v.temoins).toBe(2)
  })

  it("passe au rouge sur une route prouvable absente, et la nomme", () => {
    const v = verdictServi([jeton(), jeton({ nom: "/faq", jeton: "/faq" })], 'a="/faq"')
    expect(v.issue).toBe("en retard")
    expect(v.manquantes.map((m) => m.jeton)).toEqual(["/carte"])
    // Le rouge doit dire ce qu'il faut entendre, pas seulement qu'il est rouge.
    expect(v.dire).toContain("antérieur à une fusion")
  })

  it("ne rougit jamais sur une route non discriminante absente", () => {
    // Son absence ne prouve rien : le jeton qui la contient pourrait être là et elle pas, ou
    // l'inverse. Elle est imprimée comme muette et n'entre pas dans le verdict.
    const v = verdictServi([jeton(), jeton({ nom: "/presentation", jeton: "/presentation", discriminant: false })], 'a="/carte"')
    expect(v.issue).toBe("servi")
    expect(v.constats.find((c) => c.jeton === "/presentation")?.etat).toBe("témoin absent")
  })

  it("rend « mesure cassée » plutôt qu'un rouge quand AUCUN jeton n'est trouvé", () => {
    // Les deux premières passes du relevé fondateur rendaient zéro sur les huit chaînes, témoins
    // compris, faute de suivre le morceau à la demande. Publier ça comme un rouge aurait dit « le
    // site est vide » quand c'était la mesure qui l'était.
    const v = verdictServi([jeton(), jeton({ nom: "/faq", jeton: "/faq" })], "aucun de ces chemins")
    expect(v.issue).toBe("mesure cassée")
    expect(v.manquantes).toEqual([])
    expect(v.dire).toContain("Rien n'est jugé")
  })

  it("respecte une dispense écrite, et elle seule", () => {
    const jetons = [jeton(), jeton({ nom: "/faq", jeton: "/faq" })]
    const js = 'a="/faq"'
    const avec = verdictServi(jetons, js, [
      { nom: "/carte", raison: "chemin construit à l'exécution", mesureLe: "2026-09-13" },
    ])
    expect(avec.issue).toBe("servi")
    const autre = verdictServi(jetons, js, [
      { nom: "/autre-chose", raison: "sans rapport", mesureLe: "2026-09-13" },
    ])
    expect(autre.issue).toBe("en retard")
  })
})

describe("l'incident fondateur, rejoué sur la vraie table de routes", () => {
  const jetons = jetonsAttendus(readAppSource())

  it("tient les quatre routes de w6-contexte pour prouvables", () => {
    // Si l'une d'elles devenait non discriminante — une jumelle anglaise à l'orthographe
    // identique, par exemple — le bras cesserait de pouvoir attraper cet incident-là, en silence.
    // Ce test est ce qui rend ce silence bruyant.
    const par = Object.fromEntries(jetons.map((j) => [j.jeton, j.discriminant]))
    for (const j of ["/contexte/", "/carte", "/en/context/", "/en/map"]) {
      expect(par[j], `${j} n'est plus prouvable`).toBe(true)
    }
  })

  it("rougit sur un bundle qui porte les anciennes routes et pas les neuves", () => {
    // Le bundle du 13 septembre au matin, reconstitué : les témoins répondent, les quatre non.
    const avant = jetons
      .filter((j) => !["/contexte/", "/carte", "/en/context/", "/en/map"].includes(j.jeton))
      .map((j) => `"${j.jeton}"`)
      .join(";")
    const v = verdictServi(jetons, avant)
    expect(v.issue).toBe("en retard")
    expect(v.manquantes.map((m) => m.jeton).sort()).toEqual(
      ["/carte", "/contexte/", "/en/context/", "/en/map"].sort(),
    )
    expect(v.temoins).toBeGreaterThan(0)
  })

  it("verdit sur un bundle qui les porte toutes", () => {
    const apres = jetons.map((j) => `"${j.jeton}"`).join(";")
    expect(verdictServi(jetons, apres).issue).toBe("servi")
  })
})

describe("le registre de dispenses que ce dépôt embarque", () => {
  const brut = JSON.parse(readFileSync(REGISTRE, "utf8")) as Record<string, unknown>

  it("porte la clé que le bras attend", () => {
    expect(Array.isArray(brut.dispenses)).toBe(true)
  })

  it("n'a aucune dispense à demi écrite", () => {
    for (const d of brut.dispenses as { nom?: string; raison?: string; mesureLe?: string }[]) {
      expect(d.nom?.trim(), "dispense sans route").toBeTruthy()
      expect(d.raison?.trim(), `${d.nom} sans raison`).toBeTruthy()
      expect(d.mesureLe?.trim(), `${d.nom} sans date`).toBeTruthy()
    }
  })

  it("ne dispense que des routes qui existent encore", () => {
    // Le symétrique du script disparu de cadence.json : une dispense pour une route retirée est
    // de la prose qui ne décrit plus rien, et un registre que personne n'élague cesse d'être lu.
    const chemins = new Set(jetonsAttendus(readAppSource()).map((j) => j.nom))
    for (const d of brut.dispenses as { nom: string }[]) {
      expect(chemins, `${d.nom} n'est plus déclarée dans src/App.tsx`).toContain(d.nom)
    }
  })
})
