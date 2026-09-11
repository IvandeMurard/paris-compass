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

  it("range un fichier sur sa surface", () => {
    expect(surfaceOf("mcp-server/src/scorePoint.ts")).toBe("agent")
    expect(surfaceOf("src/pages/Context.tsx")).toBe("front")
  })
})

describe("le recensement", () => {
  const phrases = ["desserte forte", "passage faible"]

  it("passe quand les deux surfaces composent par le noyau", () => {
    const { files, read } = repo({
      [AGENT_ENTRY]: AGENT_INDEX,
      "src/pages/Context.tsx": FRONT_OK,
      "mcp-server/src/scorePoint.ts": AGENT_OK,
    })
    expect(censusVerdictComposers(files, read, phrases, []).ok).toBe(true)
  })

  it("ROUGIT quand le serveur MCP cesse de composer — le critère 2, mécaniquement", () => {
    const { files, read } = repo({ [AGENT_ENTRY]: AGENT_INDEX, "src/pages/Context.tsx": FRONT_OK })
    const census = censusVerdictComposers(files, read, phrases, [])
    expect(census.ok).toBe(false)
    expect(census.detail).toContain("aucun composeur atteint depuis")
  })

  it("ne prend PAS le contrôleur pour le serveur — le trou que la contre-preuve a montré", () => {
    // verify.ts appelle composeVerdict pour recouper la reponse du serveur. Il n'est atteint
    // par aucun import depuis l'entree, donc il ne peut pas tenir lieu de composeur servi.
    const { files, read } = repo({
      [AGENT_ENTRY]: AGENT_INDEX,
      "mcp-server/src/scorePoint.ts": `import { rien } from "./rien"`,
      "mcp-server/src/verify.ts": AGENT_OK,
      "src/pages/Context.tsx": FRONT_OK,
    })
    const census = censusVerdictComposers(files, read, phrases, [])
    expect(census.composers.map((c) => c.path)).toContain("mcp-server/src/verify.ts")
    expect(census.ok).toBe(false)
    expect(census.detail).toContain("aucun composeur atteint depuis")
  })

  it("rougit quand l’écran cesse de composer", () => {
    const { files, read } = repo({ [AGENT_ENTRY]: AGENT_INDEX, "mcp-server/src/scorePoint.ts": AGENT_OK })
    expect(censusVerdictComposers(files, read, phrases, []).detail).toContain("aucun composeur sous src/")
  })

  it("rougit sur une seconde implémentation : composer sans importer le noyau", () => {
    const { files, read } = repo({
      [AGENT_ENTRY]: AGENT_INDEX,
      "src/pages/Context.tsx": FRONT_OK,
      "mcp-server/src/scorePoint.ts": `import { composeVerdict } from "./maCopie"\nconst v = composeVerdict(f)`,
    })
    const census = censusVerdictComposers(files, read, phrases, [])
    expect(census.detached).toEqual(["mcp-server/src/scorePoint.ts"])
    expect(census.ok).toBe(false)
  })

  it("rougit sur une clause recopiée hors du noyau", () => {
    const { files, read } = repo({
      [AGENT_ENTRY]: AGENT_INDEX,
      "src/pages/Context.tsx": FRONT_OK,
      "mcp-server/src/scorePoint.ts": AGENT_OK,
      "src/components/Triche.tsx": `const phrase = 'desserte forte';`,
    })
    const census = censusVerdictComposers(files, read, phrases, [])
    expect(census.copiedProse).toEqual([{ path: "src/components/Triche.tsx", phrase: "desserte forte" }])
  })

  it("accepte cette clause quand une raison écrite la porte", () => {
    const { files, read } = repo({
      [AGENT_ENTRY]: AGENT_INDEX,
      "src/pages/Context.tsx": FRONT_OK,
      "mcp-server/src/scorePoint.ts": AGENT_OK,
      "src/components/Triche.tsx": `const phrase = 'desserte forte';`,
    })
    const waived = [{ path: "src/components/Triche.tsx", raison: "essai", date: "2026-09-11" }]
    expect(censusVerdictComposers(files, read, phrases, waived).ok).toBe(true)
  })

  it("ne reproche pas au noyau de porter ses propres clauses", () => {
    const { files, read } = repo({
      [CORE_VERDICT]: `const CLAUSES = { transit: { fort: 'desserte forte' } };`,
      [AGENT_ENTRY]: AGENT_INDEX,
      "src/pages/Context.tsx": FRONT_OK,
      "mcp-server/src/scorePoint.ts": AGENT_OK,
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

  it("le surface servi par l’agent atteint scorePoint, et n’atteint pas verify", () => {
    const served = reachableFrom(AGENT_ENTRY, (p) => readFile(p))
    expect(served.has("mcp-server/src/scorePoint.ts")).toBe(true)
    expect(served.has("mcp-server/src/verify.ts")).toBe(false)
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
