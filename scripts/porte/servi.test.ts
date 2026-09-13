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
import { jetonDeRoute, jetonsAttendus, verdictServi, type Jeton } from "./servi"

const REGISTRE = resolve(__dirname, "servi.json")

const TABLE_FICTIVE = `
  import Index from "./pages/Index"
  <Route path="/" element={<Index />} />
  <Route path="/carte" element={<Carte />} />
  <Route path="/contexte/:slug" element={<Context />} />
  <Route path="*" element={<NotFound />} />
`

function jeton(surcharge: Partial<Jeton> = {}): Jeton {
  return { path: "/carte", jeton: "/carte", discriminant: true, ...surcharge }
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

describe("la population, dérivée de la table plutôt que listée", () => {
  it("ne retient que des routes, et déduplique les paramétrées sur leur préfixe", () => {
    const jetons = jetonsAttendus(TABLE_FICTIVE)
    expect(jetons.map((j) => j.jeton)).toEqual(["/carte", "/contexte/"])
  })

  it("marque non discriminante une route dont le jeton vit dans celui d'une autre", () => {
    const jetons = jetonsAttendus(`
      <Route path="/presentation" element={<P />} />
      <Route path="/en/presentation" element={<P />} />
      <Route path="/carte" element={<C />} />
    `)
    const par = Object.fromEntries(jetons.map((j) => [j.jeton, j.discriminant]))
    // Trouver `/presentation` ne dit pas LAQUELLE des deux est arrivée : la route française ne
    // peut pas se prouver elle-même, et le bras refuse de prétendre le contraire.
    expect(par["/presentation"]).toBe(false)
    expect(par["/en/presentation"]).toBe(true)
    expect(par["/carte"]).toBe(true)
  })
})

describe("la règle, jouée sur des entrées substituées", () => {
  it("passe au vert quand chaque route prouvable est dans le JavaScript lu", () => {
    const v = verdictServi([jeton(), jeton({ path: "/contexte/:slug", jeton: "/contexte/" })], 'a="/carte";b="/contexte/x"')
    expect(v.issue).toBe("servi")
    expect(v.manquantes).toEqual([])
    expect(v.temoins).toBe(2)
  })

  it("passe au rouge sur une route prouvable absente, et la nomme", () => {
    const v = verdictServi([jeton(), jeton({ path: "/faq", jeton: "/faq" })], 'a="/faq"')
    expect(v.issue).toBe("en retard")
    expect(v.manquantes.map((m) => m.jeton)).toEqual(["/carte"])
    // Le rouge doit dire ce qu'il faut entendre, pas seulement qu'il est rouge.
    expect(v.dire).toContain("antérieur à une fusion")
  })

  it("ne rougit jamais sur une route non discriminante absente", () => {
    // Son absence ne prouve rien : le jeton qui la contient pourrait être là et elle pas, ou
    // l'inverse. Elle est imprimée comme muette et n'entre pas dans le verdict.
    const v = verdictServi([jeton(), jeton({ path: "/presentation", jeton: "/presentation", discriminant: false })], 'a="/carte"')
    expect(v.issue).toBe("servi")
    expect(v.constats.find((c) => c.jeton === "/presentation")?.etat).toBe("témoin absent")
  })

  it("rend « mesure cassée » plutôt qu'un rouge quand AUCUN jeton n'est trouvé", () => {
    // Les deux premières passes du relevé fondateur rendaient zéro sur les huit chaînes, témoins
    // compris, faute de suivre le morceau à la demande. Publier ça comme un rouge aurait dit « le
    // site est vide » quand c'était la mesure qui l'était.
    const v = verdictServi([jeton(), jeton({ path: "/faq", jeton: "/faq" })], "aucun de ces chemins")
    expect(v.issue).toBe("mesure cassée")
    expect(v.manquantes).toEqual([])
    expect(v.dire).toContain("Rien n'est jugé")
  })

  it("respecte une dispense écrite, et elle seule", () => {
    const jetons = [jeton(), jeton({ path: "/faq", jeton: "/faq" })]
    const js = 'a="/faq"'
    const avec = verdictServi(jetons, js, [
      { route: "/carte", raison: "chemin construit à l'exécution", mesureLe: "2026-09-13" },
    ])
    expect(avec.issue).toBe("servi")
    const autre = verdictServi(jetons, js, [
      { route: "/autre-chose", raison: "sans rapport", mesureLe: "2026-09-13" },
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
    for (const d of brut.dispenses as { route?: string; raison?: string; mesureLe?: string }[]) {
      expect(d.route?.trim(), "dispense sans route").toBeTruthy()
      expect(d.raison?.trim(), `${d.route} sans raison`).toBeTruthy()
      expect(d.mesureLe?.trim(), `${d.route} sans date`).toBeTruthy()
    }
  })

  it("ne dispense que des routes qui existent encore", () => {
    // Le symétrique du script disparu de cadence.json : une dispense pour une route retirée est
    // de la prose qui ne décrit plus rien, et un registre que personne n'élague cesse d'être lu.
    const chemins = new Set(jetonsAttendus(readAppSource()).map((j) => j.path))
    for (const d of brut.dispenses as { route: string }[]) {
      expect(chemins, `${d.route} n'est plus déclarée dans src/App.tsx`).toContain(d.route)
    }
  })
})
