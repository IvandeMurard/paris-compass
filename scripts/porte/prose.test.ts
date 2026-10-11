// The control that plays the prose derivation without a network and without the repository —
// w1-servi-contenu (#217).
//
// Two halves, as servi.test.ts has them. The first plays the three steps against a substituted
// file system, which is where the sabotage lives: a dead module, a test that shouts the right
// words, a template that cannot be searched. The second measures the real `src/` and says what
// it found, so a refactor that quietly empties the population cannot pass in silence.

import { describe, expect, it } from "vitest"

import {
  brinsDeProse,
  lecteurDuDepot,
  modulesAtteignables,
  proseDuDepot,
  resoudre,
  specificateurs,
  type Lecteur,
} from "./prose"

/** Un dépôt substitué : un objet, pas un disque. */
function lecteurDe(fichiers: Record<string, string>): Lecteur {
  return (chemin) => fichiers[chemin] ?? null
}

describe("les spécificateurs qu'un module importe", () => {
  it("lit l'import statique, l'export réexporté et l'import dynamique", () => {
    const specs = specificateurs(
      `
      import A from "./a"
      export { B } from "@/b"
      const C = lazy(() => import("./pages/C"))
      `,
      false,
    )
    expect(specs).toEqual(["./a", "@/b", "./pages/C"])
  })

  it("ignore un appel qui ressemble à un import sans en être un", () => {
    // `importer("x")` n'est pas `import("x")`, et une règle qui les confondrait suivrait des
    // chemins qu'aucun bundler ne suit.
    expect(specificateurs(`importer("./a"); const s = "import(\\"./b\\")"`, false)).toEqual([])
  })
})

describe("la résolution d'un spécificateur vers un fichier du dépôt", () => {
  const lire = lecteurDe({
    "src/b.ts": "",
    "src/c/index.tsx": "",
    "src/pages/D.tsx": "",
  })

  it("résout `@/` vers `src/`, comme tsconfig le déclare", () => {
    expect(resoudre("@/b", "src/main.tsx", lire)).toBe("src/b.ts")
  })

  it("résout un chemin relatif, `..` compris, et essaie les extensions puis l'index", () => {
    expect(resoudre("./pages/D", "src/main.tsx", lire)).toBe("src/pages/D.tsx")
    expect(resoudre("../b", "src/pages/D.tsx", lire)).toBe("src/b.ts")
    expect(resoudre("@/c", "src/main.tsx", lire)).toBe("src/c/index.tsx")
  })

  it("rend null sur une dépendance : elle est hors du dépôt, donc hors de la population", () => {
    expect(resoudre("react", "src/main.tsx", lire)).toBeNull()
    expect(resoudre("@tanstack/react-query", "src/main.tsx", lire)).toBeNull()
  })

  it("rend null sur un fichier qui n'existe pas, sans inventer de chemin", () => {
    expect(resoudre("./disparu", "src/main.tsx", lire)).toBeNull()
  })
})

describe("l'atteignabilité, premier filtre de la population", () => {
  it("ne retient que ce qu'un import atteint depuis l'entrée", () => {
    const lire = lecteurDe({
      "src/main.tsx": `import "./vivant"`,
      "src/vivant.ts": `export const X = 1`,
      "src/mort.ts": `export const COPY = { fr: { a: "une phrase assez longue" } }`,
    })
    expect(modulesAtteignables(lire)).toEqual(["src/main.tsx", "src/vivant.ts"])
  })

  it("laisse dehors la prose d'un module que personne n'importe — le cas de survivalText.ts", () => {
    // Mesuré le 17 septembre 2026 : `src/i18n/survivalText.ts` n'est importé par personne, et
    // aucune de ses douze chaînes n'est dans le 1 247 018 octets qu'un build de `main` émet. Les
    // exiger de la production aurait été un rouge permanent sans défaut derrière — celui qu'une
    // session éteint.
    const lire = lecteurDe({
      "src/main.tsx": `import "./vivant"`,
      "src/vivant.ts": `export const A = { fr: { x: "une phrase vivante assez longue" } }`,
      "src/mort.ts": `export const B = { fr: { y: "une phrase morte assez longue" } }`,
    })
    const valeurs = proseDuDepot(lire).brins.map((b) => b.valeur)
    expect(valeurs).toContain("une phrase vivante assez longue")
    expect(valeurs).not.toContain("une phrase morte assez longue")
  })

  it("ne boucle pas sur un cycle d'imports", () => {
    const lire = lecteurDe({
      "src/main.tsx": `import "./a"`,
      "src/a.ts": `import "./b"`,
      "src/b.ts": `import "./a"`,
    })
    expect(modulesAtteignables(lire).sort()).toEqual(["src/a.ts", "src/b.ts", "src/main.tsx"])
  })

  it("exclut les tests sans les nommer : aucun n'est importé par l'application", () => {
    // Le piège du 6 septembre 2026 — les fixtures d'une règle entrant dans sa propre population —
    // se referme ici par construction. Le test écrit les mots exacts, et reste dehors.
    const lire = lecteurDe({
      "src/main.tsx": `import "./vivant"`,
      "src/vivant.ts": `export const A = { fr: { x: "une phrase vivante assez longue" } }`,
      "src/vivant.test.ts": `const faux = { fr: { x: "une phrase de fixture assez longue" } }`,
    })
    expect(modulesAtteignables(lire)).not.toContain("src/vivant.test.ts")
    expect(proseDuDepot(lire).brins.map((b) => b.valeur)).not.toContain(
      "une phrase de fixture assez longue",
    )
  })
})

describe("ce qui fait entrer une chaîne : elle est choisie par la langue", () => {
  it("attrape les deux formes de table que ce dépôt utilise", () => {
    // `{ clé: { fr, en } }` comme `UI`, et `{ fr: { clé }, en: { clé } }` comme `RYTHME_COPY` et
    // `CLAUSES`. Une seule règle, parce que la descente s'allume sur la PREMIÈRE clé de langue
    // rencontrée et reste allumée en dessous.
    const { brins } = brinsDeProse(
      "src/x.ts",
      `
      export const UI = { "home.submit": { fr: "Voir le contexte", en: "See the context" } }
      const CLAUSES = { fr: { density: { fort: "tissu commercial dense" } } }
      `,
    )
    expect(brins.map((b) => [b.cle, b.valeur])).toEqual([
      ["home.submit.fr", "Voir le contexte"],
      ["home.submit.en", "See the context"],
      ["fr.density.fort", "tissu commercial dense"],
    ])
  })

  it("laisse dehors une chaîne que la langue ne choisit pas", () => {
    // `src/core/verdict.ts` porte ses clauses À CÔTÉ de ses membres d'enum et de ses imports :
    // 62 littéraux au `grep`, 52 de prose. C'est pourquoi le compte ne peut pas être un `grep`.
    const { brins } = brinsDeProse(
      "src/x.ts",
      `
      import { a } from "./observational"
      const AXES = ["retenue_licence", "source_injoignable"]
      const style = { className: "flex items-center gap-2" }
      export const C = { fr: { x: "une phrase choisie par la langue" } }
      `,
    )
    expect(brins.map((b) => b.valeur)).toEqual(["une phrase choisie par la langue"])
  })

  it("écarte un modèle interpolé, et le compte plutôt que de le taire", () => {
    // Le bundle porte les morceaux et la jointure, jamais la phrase assemblée : la chercher
    // entière serait un rouge qui ne veut rien dire. `RYTHME_COPY.fr.intro` est de cette forme.
    const { brins, interpoles } = brinsDeProse(
      "src/x.ts",
      "export const C = { fr: { a: `code ${CODE} de la source`, b: `sans substitution` } }",
    )
    expect(interpoles).toBe(1)
    expect(brins.map((b) => b.valeur)).toEqual(["sans substitution"])
  })
})

describe("la vraie prose de ce dépôt, mesurée", () => {
  const prose = proseDuDepot(lecteurDuDepot())

  it("atteint l'application entière et y trouve une population substantielle", () => {
    // Mesuré le 17 septembre 2026 : 136 modules atteints depuis `src/main.tsx`, 29 en portent,
    // 1 310 chaînes choisies par langue et 20 modèles interpolés écartés. Les bornes sont larges
    // exprès — c'est un effondrement qu'elles doivent voir, pas une variation.
    expect(prose.modules.length).toBeGreaterThan(80)
    expect(prose.modulesParlants.length).toBeGreaterThan(20)
    expect(prose.brins.length).toBeGreaterThan(900)
  })

  it("atteint les modules que #152 ne voyait pas, et c'est tout l'objet de #217", () => {
    for (const f of [
      "src/i18n/ui.ts",
      "src/i18n/modeText.ts",
      "src/i18n/contextText.ts",
      "src/i18n/rythmeText.ts",
      "src/core/verdict.ts",
    ]) {
      expect(prose.modulesParlants, `${f} n'est plus atteint`).toContain(f)
    }
  })

  it("n'atteint aucun fichier hors de `src/`, ni aucun test", () => {
    expect(prose.modules.filter((m) => !m.startsWith("src/"))).toEqual([])
    expect(prose.modules.filter((m) => m.includes(".test."))).toEqual([])
  })
})
