// La règle du sitemap, jouée hors ligne — w6-contexte (#119), critère 6.
//
// Deux moitiés, et la seconde est celle qui vaut. La première joue la règle sur des fixtures :
// une route en `noindex` annoncée au sitemap rougit, une route indexable oubliée rougit, une
// entrée que plus aucune route ne sert rougit, une URL anglaise mal orthographiée rougit. La
// seconde la joue sur LE DÉPÔT — les vraies routes, les vraies pages, la vraie liste d'entrées —
// et c'est elle qui tombera le jour où quelqu'un ajoutera une page sans l'annoncer, ou
// annoncera une page qu'il vient de passer en `noindex`.

import { describe, expect, it } from "vitest"

import { canonicalEntries, allEntries } from "../generate-sitemap"
import { localizePath } from "../../src/i18n/routes"
import {
  declaresNoindex,
  prefixOf,
  readAppSource,
  readPageModules,
  readRoutes,
  readWaivers,
  routeFacts,
  verdictSitemap,
  type RouteFact,
} from "./sitemap"

const en = (path: string) => localizePath(path, "en")

const fact = (path: string, noindex: boolean, file = `src/pages/X.tsx`): RouteFact => ({
  path,
  component: "X",
  file,
  noindex,
  prefix: prefixOf(path),
})

/** Le sitemap qu'une liste canonique produirait, les deux locales comprises. */
const both = (paths: string[]) => [...paths, ...paths.map(en)]

describe("lecture de la table des routes", () => {
  const source = `
    import Index from "./pages/Index";
    const Carte = lazy(() => import("./pages/Carte"));
    // <Route path="/piege" element={<Jamais />} />
    <Route path="/" element={<Index />} />
    <Route path="/carte" element={<Carte />} />
    <Route path="*" element={<NotFound />} />
  `

  it("retient les routes déclarées et jette la capture-tout", () => {
    expect(readRoutes(source).map((r) => r.path)).toEqual(["/", "/carte"])
  })

  it("ne lit pas une route mise en commentaire", () => {
    expect(readRoutes(source).some((r) => r.path === "/piege")).toBe(false)
  })

  it("résout un composant vers son fichier, import direct comme import différé", () => {
    const modules = readPageModules(source)
    expect(modules.get("Index")).toBe("src/pages/Index.tsx")
    expect(modules.get("Carte")).toBe("src/pages/Carte.tsx")
  })
})

describe("lecture du noindex", () => {
  it("voit la balise posée sur Seo, sur une ligne comme sur plusieurs", () => {
    expect(declaresNoindex(`<Seo title="x" path="/y" noindex />`)).toBe(true)
    expect(declaresNoindex(`<Seo\n  title="x"\n  path="/y"\n  noindex\n/>`)).toBe(true)
  })

  it("ne lit pas une page qui PARLE de noindex sans le poser", () => {
    // Le vrai cas : src/pages/Context.tsx explique en tête pourquoi il est en noindex.
    expect(declaresNoindex(`// cette page part en noindex, décidé le 10 septembre\n<Seo path="/y" />`)).toBe(
      false,
    )
    expect(declaresNoindex(`/* noindex, et ce que ça coûte */\n<Seo path="/y" />`)).toBe(false)
  })

  it("ne prend pas une page sans Seo pour une page en noindex", () => {
    expect(declaresNoindex(`const P = () => <div>noindex</div>;`)).toBe(false)
  })
})

describe("le verdict", () => {
  it("passe quand chaque route indexable est annoncée et chaque noindex tue", () => {
    const facts = [fact("/", false), fact("/contexte/:slug", true), fact("/guides/:slug", false)]
    const canonical = ["/", "/guides/ouvrir-un-commerce"]
    const verdict = verdictSitemap(facts, canonical, both(canonical), [], en)
    expect(verdict.ok).toBe(true)
    expect(verdict.population).toHaveLength(3)
  })

  it("rougit sur une route en noindex annoncée au sitemap", () => {
    const canonical = ["/", "/contexte/12-rue-de-bretagne"]
    const verdict = verdictSitemap(
      [fact("/", false), fact("/contexte/:slug", true)],
      canonical,
      both(canonical),
      [],
      en,
    )
    expect(verdict.ok).toBe(false)
    expect(verdict.problems.map((p) => p.regle)).toContain("noindex-au-sitemap")
  })

  it("rougit sur une route indexable que le sitemap oublie", () => {
    const canonical = ["/"]
    const verdict = verdictSitemap([fact("/", false), fact("/carte", false)], canonical, both(canonical), [], en)
    expect(verdict.problems.map((p) => p.regle)).toContain("indexable-absente")
  })

  it("accepte cette même absence quand elle porte une raison écrite", () => {
    const canonical = ["/"]
    const verdict = verdictSitemap(
      [fact("/", false), fact("/carte", false)],
      canonical,
      both(canonical),
      [{ route: "/carte", raison: "essai", date: "2026-09-11" }],
      en,
    )
    expect(verdict.ok).toBe(true)
  })

  it("rougit sur une raison écrite pour une route qui n'existe plus", () => {
    const canonical = ["/"]
    const verdict = verdictSitemap(
      [fact("/", false)],
      canonical,
      both(canonical),
      [{ route: "/disparue", raison: "essai", date: "2026-09-11" }],
      en,
    )
    expect(verdict.problems.map((p) => p.regle)).toContain("raison-orpheline")
  })

  it("rougit sur une entrée du sitemap qu'aucune route ne sert — le sens inverse", () => {
    const canonical = ["/", "/fantome"]
    const verdict = verdictSitemap([fact("/", false)], canonical, both(canonical), [], en)
    expect(verdict.problems.map((p) => p.regle)).toContain("sitemap-sans-route")
  })

  it("rougit quand l'URL anglaise annoncée n'est pas celle que la route sert", () => {
    // Le piège que /carte apporte : préfixer « /en » donnerait /en/carte, que rien ne sert.
    const canonical = ["/carte"]
    const verdict = verdictSitemap([fact("/carte", false)], canonical, ["/carte", "/en/carte"], [], en)
    expect(verdict.problems.map((p) => p.regle)).toContain("anglais-absent")
    expect(en("/carte")).toBe("/en/map")
  })

  it("rougit sur un recensement vide : l'énumération a cessé de trouver quoi que ce soit", () => {
    const verdict = verdictSitemap([], ["/"], ["/"], [], en)
    expect(verdict.ok).toBe(false)
    expect(verdict.detail).toContain("recensement vide")
  })
})

describe("le dépôt lui-même", () => {
  const facts = routeFacts(readAppSource())
  const canonical = canonicalEntries.map((e) => e.path)

  it("recense des routes — une table illisible est un échec, pas un vide", () => {
    expect(facts.length).toBeGreaterThan(5)
  })

  it("connaît au moins une route en noindex, sans quoi la règle ne garde rien", () => {
    expect(facts.filter((f) => f.noindex).length).toBeGreaterThan(0)
  })

  it("tient /contexte/:slug en noindex, comme la page le déclare", () => {
    const contexte = facts.find((f) => f.path === "/contexte/:slug")
    expect(contexte?.noindex).toBe(true)
  })

  it("porte /carte au sitemap, dans les deux locales", () => {
    expect(canonical).toContain("/carte")
    expect(allEntries.map((e) => e.path)).toContain("/en/map")
  })

  it("routes et sitemap s'accordent dans les deux sens", () => {
    const verdict = verdictSitemap(
      facts,
      canonical,
      allEntries.map((e) => e.path),
      readWaivers(),
      en,
    )
    expect(verdict.problems).toEqual([])
    expect(verdict.ok).toBe(true)
  })
})
