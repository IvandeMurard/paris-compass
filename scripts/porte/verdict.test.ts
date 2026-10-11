// Le recensement des composeurs de verdict — w6-contexte (#119), critère 2, moitié statique.
//
// Deux moitiés, et la seconde est celle qui tient le critère. La première joue la règle sur des
// fixtures ; la seconde la joue sur LE DÉPÔT, et rougira le jour où l'une des deux surfaces
// cessera de composer son verdict par le noyau — sans base, sans réseau, sans attendre la porte
// du matin.

import { describe, expect, it } from "vitest"

import { clauseText, VERDICT_AXIS_ORDER } from "../../src/core"
import {
  callsCompose,
  censusVerdictComposers,
  code,
  CORE_VERDICT,
  AGENT_ENTRY,
  FRONT_ENTRY,
  importsComposeFromCore,
  reachableFrom,
  readFile,
  readWaivers,
  repositoryFiles,
  surfaceOf,
  verdictPhrases,
} from "./verdict"

/**
 * Un dépôt de poche : chemin → contenu.
 *
 * `read` JETTE sur un chemin absent, comme `readFileSync`. C'est ce qui permet à
 * `reachableFrom` de distinguer une extension candidate d'une autre ; une lecture qui aurait
 * rendu la chaîne vide aurait fait exister tous les fichiers imaginables.
 */
const repo = (files: Record<string, string>) => ({
  files: Object.keys(files),
  read: (path: string) => {
    if (!(path in files)) throw new Error(`ENOENT ${path}`)
    return files[path]
  },
})

const FRONT_OK = `import { composeVerdict } from '@/core';\nconst v = composeVerdict(f);`
const AGENT_OK = `import { composeVerdict } from "../../src/core"\nconst v = composeVerdict(f)`
/** L'entrée du serveur : elle atteint scorePoint.ts, et rien d'autre dans ces fixtures. */
const AGENT_INDEX = `import { scorePoint } from "./scorePoint"\nscorePoint()`
/** L'entrée de l'écran : la page est montée en `lazy()`, comme les quinze vraies. */
const FRONT_INDEX = `const Context = lazy(() => import("./pages/Context"));\n<Route path="/contexte/:slug" element={<Context />} />`

/** Le dépôt de poche minimal où les deux surfaces composent. Chaque cas part de là. */
const BOTH_SURFACES = {
  [FRONT_ENTRY]: FRONT_INDEX,
  [AGENT_ENTRY]: AGENT_INDEX,
  "src/pages/Context.tsx": FRONT_OK,
  "mcp-server/src/scorePoint.ts": AGENT_OK,
}

describe("les phrases sont dérivées du noyau, pas recopiées", () => {
  it("contient chaque clause de chaque axe, dans les deux locales", () => {
    const phrases = verdictPhrases()
    for (const axis of VERDICT_AXIS_ORDER) {
      expect(phrases).toContain(clauseText(axis, "fort", "fr"))
      expect(phrases).toContain(clauseText(axis, "faible", "en"))
    }
    // La preuve de la dérivation : 5 axes × 3 bandes × 2 locales, plus les deux « non calculé ».
    expect(phrases.length).toBe(VERDICT_AXIS_ORDER.length * 3 * 2 + 2)
  })
})

describe("la détection", () => {
  it("voit un appel à la composition", () => {
    expect(callsCompose("const v = composeVerdict(f, 'fr')")).toBe(true)
    expect(callsCompose("const v = autreChose(f)")).toBe(false)
  })

  it("ne lit pas un appel mis en commentaire", () => {
    expect(callsCompose(code("// composeVerdict(f) était appelé ici\nconst x = 1;"))).toBe(false)
  })

  it("reconnaît les trois orthographes du noyau et rien d’autre", () => {
    expect(importsComposeFromCore(`import { composeVerdict } from '@/core';`)).toBe(true)
    expect(importsComposeFromCore(`import { composeVerdict } from "../../src/core"`)).toBe(true)
    expect(importsComposeFromCore(`import { composeVerdict } from './verdict';`)).toBe(true)
    expect(importsComposeFromCore(`import { composeVerdict } from './maCopie';`)).toBe(false)
  })

  it("range un fichier sur la surface qui l’ATTEINT, pas sur son chemin", () => {
    const mounted = new Set(["src/App.tsx", "src/pages/Context.tsx", "src/core/comparison.ts"])
    const served = new Set(["mcp-server/src/index.ts", "mcp-server/src/scorePoint.ts", "src/core/comparison.ts"])
    expect(surfaceOf("mcp-server/src/scorePoint.ts", mounted, served)).toBe("agent")
    expect(surfaceOf("src/pages/Context.tsx", mounted, served)).toBe("front")
    // Le défaut de #132 tenait dans cette ligne : un fichier de src/ que l'agent sert AUSSI
    // n'est pas du front, il est le noyau, et il ne crédite aucune des deux surfaces.
    expect(surfaceOf("src/core/comparison.ts", mounted, served)).toBe("partagee")
    expect(surfaceOf("mcp-server/src/verify.ts", mounted, served)).toBe("hors-surface")
  })
})

describe("la traversée des imports", () => {
  const read = (files: Record<string, string>) => (path: string) => {
    if (!(path in files)) throw new Error(`ENOENT ${path}`)
    return files[path]
  }

  it("suit l’alias @/ du navigateur et l’import différé", () => {
    const seen = reachableFrom(
      FRONT_ENTRY,
      read({
        [FRONT_ENTRY]: `const P = lazy(() => import("./pages/Context"));`,
        "src/pages/Context.tsx": `import { composeVerdict } from "@/core";`,
        "src/core/index.ts": `export * from "./verdict";`,
        "src/core/verdict.ts": `export const composeVerdict = () => {};`,
      }),
    )
    expect([...seen].sort()).toEqual(["src/App.tsx", "src/core/index.ts", "src/core/verdict.ts", "src/pages/Context.tsx"])
  })

  it("n’essaie pas de résoudre un paquet externe", () => {
    const seen = reachableFrom(FRONT_ENTRY, read({ [FRONT_ENTRY]: `import React from "react";` }))
    expect([...seen]).toEqual([FRONT_ENTRY])
  })
})

describe("le recensement", () => {
  const phrases = ["desserte forte", "passage faible"]

  it("passe quand les deux surfaces composent par le noyau", () => {
    const { files, read } = repo(BOTH_SURFACES)
    expect(censusVerdictComposers(files, read, phrases, []).ok).toBe(true)
  })

  it("passe quand l’écran compose depuis un fichier qu’il est seul à monter", () => {
    // Le geste courant qui ne doit PAS rougir : la composition déplacée de la page vers un
    // hook, un composant, un service — tant que l'écran est seul à l'atteindre.
    const { files, read } = repo({
      [FRONT_ENTRY]: `const P = lazy(() => import("./pages/Context"));`,
      [AGENT_ENTRY]: AGENT_INDEX,
      "src/pages/Context.tsx": `import { useVerdict } from "@/hooks/useVerdict";`,
      "src/hooks/useVerdict.ts": FRONT_OK,
      "mcp-server/src/scorePoint.ts": AGENT_OK,
    })
    expect(censusVerdictComposers(files, read, phrases, []).ok).toBe(true)
  })

  it("ROUGIT quand le serveur MCP cesse de composer — le critère 2, mécaniquement", () => {
    const { files, read } = repo({ ...BOTH_SURFACES, "mcp-server/src/scorePoint.ts": `const x = 1` })
    const census = censusVerdictComposers(files, read, phrases, [])
    expect(census.ok).toBe(false)
    expect(census.detail).toContain(`aucun composeur atteint depuis ${AGENT_ENTRY}`)
  })

  it("ne prend PAS le contrôleur pour le serveur — le trou que la contre-preuve a montré", () => {
    // verify.ts appelle composeVerdict pour recouper la reponse du serveur. Il n'est atteint
    // par aucun import depuis l'entree, donc il ne peut pas tenir lieu de composeur servi.
    const { files, read } = repo({
      ...BOTH_SURFACES,
      "mcp-server/src/scorePoint.ts": `import { rien } from "./rien"`,
      "mcp-server/src/verify.ts": AGENT_OK,
    })
    const census = censusVerdictComposers(files, read, phrases, [])
    expect(census.composers.find((c) => c.path === "mcp-server/src/verify.ts")?.surface).toBe("hors-surface")
    expect(census.ok).toBe(false)
    expect(census.detail).toContain(`aucun composeur atteint depuis ${AGENT_ENTRY}`)
  })

  it("ROUGIT quand l’écran cesse de composer — la moitié que #132 a trouvée ouverte", () => {
    const { files, read } = repo({ ...BOTH_SURFACES, "src/pages/Context.tsx": `const x = 1` })
    const census = censusVerdictComposers(files, read, phrases, [])
    expect(census.ok).toBe(false)
    expect(census.detail).toContain(`aucun composeur atteint depuis ${FRONT_ENTRY}`)
  })

  it("ne prend PAS le noyau partagé pour l’écran — la contre-preuve de #132", () => {
    // src/core/comparison.ts compose un verdict et est atteint par les DEUX entrées. Sous la
    // regle par chemin il tenait lieu de composeur front, et neutraliser la page laissait vert.
    const { files, read } = repo({
      [FRONT_ENTRY]: `import { compareAddresses } from "@/core";`,
      [AGENT_ENTRY]: `import { compareAddresses } from "../../src/core"\nimport { scorePoint } from "./scorePoint"`,
      "src/core/index.ts": `export * from "./comparison";`,
      "src/core/comparison.ts": AGENT_OK,
      "mcp-server/src/scorePoint.ts": AGENT_OK,
    })
    const census = censusVerdictComposers(files, read, phrases, [])
    expect(census.composers.find((c) => c.path === "src/core/comparison.ts")?.surface).toBe("partagee")
    expect(census.ok).toBe(false)
    expect(census.detail).toContain(`aucun composeur atteint depuis ${FRONT_ENTRY}`)
  })

  it("rougit sur une seconde implémentation : composer sans importer le noyau", () => {
    const { files, read } = repo({
      ...BOTH_SURFACES,
      "mcp-server/src/scorePoint.ts": `import { composeVerdict } from "./maCopie"\nconst v = composeVerdict(f)`,
    })
    const census = censusVerdictComposers(files, read, phrases, [])
    expect(census.detached).toEqual(["mcp-server/src/scorePoint.ts"])
    expect(census.ok).toBe(false)
  })

  it("rougit sur une clause recopiée hors du noyau", () => {
    const { files, read } = repo({ ...BOTH_SURFACES, "src/components/Triche.tsx": `const phrase = 'desserte forte';` })
    const census = censusVerdictComposers(files, read, phrases, [])
    expect(census.copiedProse).toEqual([{ path: "src/components/Triche.tsx", phrase: "desserte forte" }])
  })

  it("accepte cette clause quand une raison écrite la porte", () => {
    const { files, read } = repo({ ...BOTH_SURFACES, "src/components/Triche.tsx": `const phrase = 'desserte forte';` })
    const waived = [{ path: "src/components/Triche.tsx", raison: "essai", date: "2026-09-11" }]
    expect(censusVerdictComposers(files, read, phrases, waived).ok).toBe(true)
  })

  it("ne reproche pas au noyau de porter ses propres clauses", () => {
    const { files, read } = repo({
      ...BOTH_SURFACES,
      [CORE_VERDICT]: `const CLAUSES = { transit: { fort: 'desserte forte' } };`,
    })
    expect(censusVerdictComposers(files, read, phrases, []).copiedProse).toEqual([])
  })

  it("rougit sur un recensement vide", () => {
    const census = censusVerdictComposers([], () => "", phrases, [])
    expect(census.ok).toBe(false)
    expect(census.detail).toContain("recensement vide")
  })
})

describe("le dépôt lui-même", () => {
  const files = repositoryFiles()
  const census = censusVerdictComposers(files, (p) => readFile(p), verdictPhrases(), readWaivers())

  it("lit des fichiers — une énumération muette est un échec, pas un vide", () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it("la surface servie par l’agent atteint scorePoint, et n’atteint pas verify", () => {
    const served = reachableFrom(AGENT_ENTRY, (p) => readFile(p))
    expect(served.has("mcp-server/src/scorePoint.ts")).toBe(true)
    expect(served.has("mcp-server/src/verify.ts")).toBe(false)
  })

  it("la surface montée par l’écran atteint la page de contexte, et pas le serveur MCP", () => {
    const mounted = reachableFrom(FRONT_ENTRY, (p) => readFile(p))
    expect(mounted.has("src/pages/Context.tsx")).toBe(true)
    expect(mounted.has("mcp-server/src/scorePoint.ts")).toBe(false)
    // Une traversée qui ne résoudrait ni `@/` ni `import()` s'arrêterait à une poignée de
    // fichiers et déclarerait l'écran vide. 122 le 13 septembre 2026 ; le seuil est bas exprès.
    expect(mounted.size).toBeGreaterThan(50)
  })

  it("le partage entre les deux surfaces est exactement le noyau — dérivé, pas listé", () => {
    const mounted = reachableFrom(FRONT_ENTRY, (p) => readFile(p))
    const served = reachableFrom(AGENT_ENTRY, (p) => readFile(p))
    const shared = [...mounted].filter((f) => served.has(f))
    expect(shared.length).toBeGreaterThan(0)
    expect(shared.filter((f) => !f.startsWith("src/core/"))).toEqual([])
  })

  it("chaque surface a SON composeur, et le noyau ne se porte caution pour aucune", () => {
    const bySurface = (s: string) => census.composers.filter((c) => c.surface === s).map((c) => c.path)
    expect(bySurface("front")).toContain("src/pages/Context.tsx")
    expect(bySurface("agent")).toContain("mcp-server/src/scorePoint.ts")
    // Le fichier par lequel #132 passait : compté « front » sur son chemin, partagé en vérité.
    expect(bySurface("partagee")).toContain("src/core/comparison.ts")
  })

  it("l’écran ET l’agent composent leur verdict par le noyau", () => {
    expect(census.detail).toBe(
      `${census.composers.length} composeur(s), les deux surfaces couvertes, toutes les clauses viennent du noyau`,
    )
    expect(census.ok).toBe(true)
  })

  it("aucune clause de verdict ne vit hors de src/core/verdict.ts", () => {
    expect(census.copiedProse).toEqual([])
  })

  it("aucune seconde implémentation de la composition", () => {
    expect(census.detached).toEqual([])
  })
})
