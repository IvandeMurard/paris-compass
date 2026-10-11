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
import { proseDuDepot, type BrinProse } from "./prose"

import { jetonDeRoute, jetonsAttendus, LONGUEUR_MINIMALE, verdictServi, type Jeton } from "./servi"

/** Derived once: the walk reads a few hundred files, and every block below wants the same. */
const PROSE = proseDuDepot()

const REGISTRE = resolve(__dirname, "servi.json")

const TABLE_FICTIVE = `
  import Index from "./pages/Index"
  <Route path="/" element={<Index />} />
  <Route path="/carte" element={<Carte />} />
  <Route path="/contexte/:slug" element={<Context />} />
  <Route path="*" element={<NotFound />} />
`

function jeton(surcharge: Partial<Jeton> = {}): Jeton {
  return {
    nom: "/carte",
    origine: "route",
    fichier: null,
    jeton: "/carte",
    discriminant: true,
    ...surcharge,
  }
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

/** Une prose substituée : les tests de routes n'ont rien à dire de la vraie. */
const SANS_PROSE: BrinProse[] = []

describe("la population, dérivée des tables plutôt que listée", () => {
  it("retient les routes, et déduplique les paramétrées sur leur préfixe", () => {
    const jetons = jetonsAttendus(TABLE_FICTIVE, SANS_PROSE)
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
      SANS_PROSE,
    )
    const par = Object.fromEntries(jetons.map((j) => [j.jeton, j.discriminant]))
    // Trouver `/presentation` ne dit pas LAQUELLE des deux est arrivée : la route française ne
    // peut pas se prouver elle-même, et le bras refuse de prétendre le contraire.
    expect(par["/presentation"]).toBe(false)
    expect(par["/en/presentation"]).toBe(true)
    expect(par["/carte"]).toBe(true)
  })
})

describe("la prose, seconde population dérivée — #152 puis #217", () => {
  const PROSE_FICTIVE: BrinProse[] = [
    { fichier: "src/i18n/faux.ts", cle: "a.long.fr", valeur: "Une phrase assez longue pour prouver" },
    { fichier: "src/i18n/faux.ts", cle: "a.long.en", valeur: "A sentence long enough to prove" },
    { fichier: "src/i18n/faux.ts", cle: "a.court.fr", valeur: "Carte" },
    { fichier: "src/i18n/faux.ts", cle: "a.court.en", valeur: "Map" },
    { fichier: "src/i18n/faux.ts", cle: "a.contenu.fr", valeur: "Une phrase assez longue" },
    { fichier: "src/i18n/faux.ts", cle: "a.contenu.en", valeur: "A sentence long enough" },
  ]

  it("tire ses jetons de la prose dérivée, dans les deux langues", () => {
    const jetons = jetonsAttendus("", PROSE_FICTIVE).filter((j) => j.origine === "prose")
    expect(jetons).toHaveLength(6)
    // Le nom porte le MODULE et la clé : depuis #217 la population couvre une douzaine de
    // fichiers, donc « quelle entrée ouvrir » commence par « lequel ».
    expect(jetons[0].nom).toBe("src/i18n/faux.ts · a.long.fr")
    expect(jetons[0].fichier).toBe("src/i18n/faux.ts")
  })

  it("tient pour non discriminante une chaîne plus courte que le seuil mesuré", () => {
    // « Map » apparaît 91 fois dans le bundle servi — le constructeur `Map`. Le trouver ne dit
    // rien des tables de prose, donc il témoigne et ne rougit jamais.
    const par = Object.fromEntries(
      jetonsAttendus("", PROSE_FICTIVE).map((j) => [j.jeton, j.discriminant]),
    )
    expect("Carte".length).toBeLessThan(LONGUEUR_MINIMALE)
    expect(par["Carte"]).toBe(false)
    expect(par["Map"]).toBe(false)
    expect(par["Une phrase assez longue pour prouver"]).toBe(true)
  })

  it("tient pour non discriminante une chaîne contenue dans une autre", () => {
    // Même raison que `/presentation` dans `/en/presentation` : trouver la phrase courte ne dit
    // pas laquelle des deux est arrivée. La règle est la même pour les deux populations.
    const par = Object.fromEntries(
      jetonsAttendus("", PROSE_FICTIVE).map((j) => [j.jeton, j.discriminant]),
    )
    expect(par["Une phrase assez longue"]).toBe(false)
  })

  it("déduplique sur la CHAÎNE, pas sur la clé : deux modules d'accord ne pèsent qu'une fois", () => {
    // Deux tables qui écrivent la même phrase ne laissent qu'un littéral dans le bundle. La
    // compter deux fois gonflerait la population sans rien ajouter que la mesure sache distinguer.
    const jetons = jetonsAttendus("", [
      ...PROSE_FICTIVE,
      { fichier: "src/pages/Autre.tsx", cle: "b.fr", valeur: "Une phrase assez longue pour prouver" },
    ])
    expect(jetons.filter((j) => j.jeton === "Une phrase assez longue pour prouver")).toHaveLength(1)
    expect(jetons.find((j) => j.jeton === "Une phrase assez longue pour prouver")?.fichier).toBe(
      "src/i18n/faux.ts",
    )
  })

  it("rougit sur un bundle qui porte les routes mais pas une chaîne neuve", () => {
    // L'incident qui a écrit #152, en miniature : #145 a ajouté `source injoignable`, la
    // production a gardé l'ancien bundle, et l'ancien bras restait vert faute de regarder ailleurs
    // que les routes.
    const jetons = jetonsAttendus(TABLE_FICTIVE, PROSE_FICTIVE)
    const sansLeNeuf = jetons
      .filter((j) => j.jeton !== "Une phrase assez longue pour prouver")
      .map((j) => `"${j.jeton}"`)
      .join(";")
    const v = verdictServi(jetons, sansLeNeuf)
    expect(v.issue).toBe("en retard")
    expect(v.manquantes.map((m) => m.nom)).toEqual(["src/i18n/faux.ts · a.long.fr"])
    // Et le rouge nomme le MODULE, parce que c'est lui le diagnostic.
    expect(v.dire).toContain("1 dans src/i18n/faux.ts")
  })
})

describe("la vraie prose du dépôt, telle qu'elle est", () => {
  const prose = jetonsAttendus(readAppSource(), PROSE.brins).filter((j) => j.origine === "prose")

  it("fournit une population non vide et majoritairement prouvable", () => {
    // Mesuré le 17 septembre 2026 : 920 chaînes distinctes, toutes présentes dans le build de
    // `main`. Si ce rapport s'effondrait — une refonte qui sortirait la prose des tables par
    // langue, par exemple — le bras deviendrait un témoin sans pouvoir de décision, en silence.
    // Ce test le dit tout haut.
    expect(prose.length).toBeGreaterThan(600)
    const prouvables = prose.filter((j) => j.discriminant)
    expect(prouvables.length / prose.length).toBeGreaterThan(0.5)
  })

  it("porte encore les deux chaînes de #145, mais ne les prouve PLUS — et c'est le prix de #217", () => {
    // Mesuré le 17 septembre 2026, et c'est une perte, pas un détail. Les deux chaînes que #145
    // avait ajoutées — celles-là mêmes qui ont écrit #152 — sont désormais CITÉES dans une phrase
    // plus longue de `src/pages/Methodology.tsx`, laquelle est entrée dans la population avec
    // #217. La règle de contenance s'applique alors telle quelle : trouver « source injoignable »
    // ne dit plus si c'est le libellé ou la phrase de méthodologie qui est servie, donc le jeton
    // témoigne et ne décide plus.
    //
    // L'élargissement ne coûte donc pas rien, et le solde se mesure : `main` portait 330 jetons
    // dont 223 décisifs, la population élargie en porte 1 168 dont 869 — 646 de plus, dont
    // celui-ci retiré. Le refuser reviendrait à prétendre décider sur une mesure ambiguë, ce que
    // ce bras refuse partout ailleurs.
    const par = Object.fromEntries(prose.map((j) => [j.jeton, j.discriminant]))
    expect(par["source injoignable"]).toBe(false)
    expect(par["source unreachable"]).toBe(false)
    // La phrase qui les contient, elle, est prouvable — donc le retard qu'elles signalaient
    // reste visible, par un autre jeton du même module.
    const contenantes = prose.filter(
      (j) => j.discriminant && j.jeton.includes("source injoignable"),
    )
    expect(contenantes.length).toBeGreaterThan(0)
  })

  it("porte enfin la prose qu'un bloc neuf apporte, et c'est tout l'objet de #217", () => {
    // Les quatre modules que #152 ne voyait pas. Chacun est arrivé par un bloc posé sur une page
    // existante — ni route neuve, ni libellé de `UI` — donc chacun était invisible.
    const fichiers = new Set(prose.map((j) => j.fichier))
    for (const f of [
      "src/i18n/modeText.ts",
      "src/i18n/contextText.ts",
      "src/i18n/rythmeText.ts",
      "src/core/verdict.ts",
    ]) {
      expect(fichiers, `${f} hors population`).toContain(f)
    }
    // Et `ui.ts` reste dedans : #217 élargit, il ne remplace pas.
    expect(fichiers).toContain("src/i18n/ui.ts")
  })

  it("n'admet aucune fixture de test dans sa propre population", () => {
    // Le piège du 6 septembre 2026, refermé par construction plutôt que par un filtre : la
    // marche part de `src/main.tsx` et suit des imports, et aucun test n'est importé par
    // l'application. Un `*.test.*` ne peut donc pas y entrer, quoi qu'il écrive en littéral.
    expect(PROSE.modules.filter((m) => m.includes(".test."))).toEqual([])
    expect(prose.filter((j) => (j.fichier ?? "").includes(".test."))).toEqual([])
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
  const jetons = jetonsAttendus(readAppSource(), PROSE.brins)

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

describe("la production du 17 septembre 2026, gardée comme témoin — #217", () => {
  // La contre-preuve du ticket, et elle n'était disponible que ce jour-là : la production
  // servait un bundle antérieur à `w6-contexte` (#119), donc plusieurs fusions de retard. Dès
  // qu'Ivan republie, ce cas disparaît du réseau — il ne vit plus qu'ici.
  //
  // Ce que le témoin garde, et pourquoi c'est fidèle : la règle ne demande à chaque jeton qu'une
  // chose, est-il contenu dans le JavaScript lu. Rejouer sur la jointure des chaînes TROUVÉES ce
  // jour-là rend donc exactement le même verdict qu'un `includes` sur les 1 196 859 octets, sans
  // garder un mégaoctet de JavaScript minifié tiers dans un dépôt public. Une chaîne absente ne
  // peut pas réapparaître dans la jointure : si elle vivait dans une chaîne trouvée, elle aurait
  // été trouvée aussi.
  const temoin = JSON.parse(
    readFileSync(resolve(__dirname, "servi-temoin-2026-09-17.json"), "utf8"),
  ) as {
    entree: string
    octets: number
    fichiers: { nom: string; octets: number }[]
    mesure: { absents: number; trouves: number; "absents-par-module": Record<string, number> }
    trouves: string[]
  }
  const js = temoin.trouves.join("\n")
  const jetons = jetonsAttendus(readAppSource(), PROSE.brins)
  const v = verdictServi(jetons, js)

  it("est bien le relevé d'un site en retard, et pas d'une mesure cassée", () => {
    // La distinction que #142 a payée deux fois : zéro partout est un instrument cassé, pas un
    // site vide. Ici 758 jetons répondent, donc la mesure fonctionne et le rouge veut dire
    // quelque chose.
    expect(v.issue).toBe("en retard")
    expect(v.temoins).toBeGreaterThan(500)
    expect(temoin.octets).toBe(1196859)
    expect(temoin.fichiers).toHaveLength(21)
  })

  it("rougit sur la prose des blocs restés en soute, et nomme leurs modules", () => {
    // Le cœur du ticket. Chacun de ces modules est arrivé par un bloc posé sur une page
    // existante : ni route neuve, ni libellé de `UI`. Le bras d'avant #217 ne pouvait pas les
    // voir, et il a laissé sept livraisons dormir.
    const parModule = new Map<string, number>()
    for (const m of v.manquantes) parModule.set(m.fichier ?? "src/App.tsx", (parModule.get(m.fichier ?? "src/App.tsx") ?? 0) + 1)
    for (const [module, mesure] of Object.entries(temoin.mesure["absents-par-module"])) {
      // `au moins` et non `exactement` : une chaîne écrite après la capture est absente du
      // témoin, donc elle grossit le rouge. Elle ne peut pas l'éteindre.
      expect(parModule.get(module) ?? 0, `${module} n'est plus vu absent`).toBeGreaterThanOrEqual(mesure)
    }
    expect(parModule.get("src/i18n/rythmeText.ts") ?? 0).toBeGreaterThanOrEqual(28)
  })

  it("montre que le retard portait aussi les quatre routes de l'incident fondateur", () => {
    // Mesuré le 17 septembre : la production ne DÉCLARE ni `/carte` ni `/contexte/:slug`. Elle
    // sert un bundle d'avant `w6-contexte` (#119), donc l'incident de #142 était revenu — et
    // `servi` sortait déjà en 1 avant #217 sur cette part-là. Ce que #217 ajoute est tout le
    // reste : 354 jetons de prose que personne ne pouvait voir manquer.
    const routes = v.manquantes.filter((m) => m.origine === "route").map((m) => m.nom).sort()
    expect(routes).toEqual(["/carte", "/contexte/:slug", "/en/context/:slug", "/en/map"])
    expect(v.manquantes.filter((m) => m.origine === "prose").length).toBeGreaterThan(300)
  })

  it("verdit dès que le servi porte tout ce que le dépôt déclare", () => {
    // Les deux sens, et c'est le critère 2 du ticket. Le vert est démontré ici sur la population
    // entière ; il l'est aussi CONTRE UN VRAI BUILD, hors test parce qu'un `dist/` ne se commite
    // pas : `npm.cmd run build` puis le bras avec `PORTE_SERVI_URL` sur un serveur statique du
    // dossier. Mesuré le 17 septembre 2026 — 1 247 018 octets, 30 morceaux, 1 168 jetons sur
    // 1 168 trouvés, PASS, sortie 0. Le geste est dans l'en-tête de `servi-verify.ts`.
    expect(verdictServi(jetons, jetons.map((j) => j.jeton).join("\n")).issue).toBe("servi")
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
    const chemins = new Set(jetonsAttendus(readAppSource(), PROSE.brins).map((j) => j.nom))
    for (const d of brut.dispenses as { nom: string }[]) {
      expect(chemins, `${d.nom} n'est plus déclarée dans src/App.tsx`).toContain(d.nom)
    }
  })
})
