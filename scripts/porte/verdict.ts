// Qui compose un verdict, et par où — w6-contexte (#119), critère 2, moitié statique.
// Sixième application de « énumérer, pas lister », après arms.ts (#71), cadences.ts (#70),
// catalogue.ts (#73), observabilite.ts (#81) et sitemap.ts (ce même ticket).
//
// ── Pourquoi une moitié statique, alors que verify:mcp éprouve déjà le serveur ────────────
//
// La famille PARITE de `mcp-server/src/verify.ts` prouve une chose et une seule : que la phrase
// rendue par le SERVEUR PUBLIÉ est celle que le noyau recompose à partir des chiffres que ce
// serveur publie. C'est le contrôle qui manquait, et il est le bon — mais il n'exécute aucun
// navigateur, et il ne le fera jamais : il parle MCP à un binaire, pas HTTP à une page.
//
// Donc la moitié « l'écran passe par la même fonction » ne peut pas venir de là. Elle vient
// d'ici, et elle est statique parce que c'est la seule forme qui puisse voir les DEUX surfaces
// sans en exécuter aucune. Les deux moitiés sont nécessaires ; aucune ne remplace l'autre.
//
// ── Ce qui est recensé, et comment la population est dérivée ──────────────────────────────
//
// Deux populations, et chacune est lue sur l'arbre plutôt qu'écrite à la main :
//
//   1. LES COMPOSEURS — les fichiers qui appellent `composeVerdict(`. Chacun doit l'importer
//      du noyau : un fichier qui appelle une fonction de ce nom sans l'importer de là en a
//      écrit une seconde. Et l'ensemble doit couvrir les DEUX surfaces — au moins un fichier
//      sous `src/`, au moins un sous `mcp-server/`. C'est cette exigence-là qui tient le
//      critère 2 : le jour où quelqu'un retire la composition du serveur MCP, `test` rougit,
//      sans base, sans réseau et sans attendre la porte du matin.
//
//   2. LA PROSE DE VERDICT — les fichiers qui portent verbatim une clause du verdict. Les
//      clauses ne sont PAS listées ici : elles sont dérivées à l'exécution en interrogeant
//      `clauseText` sur tous les axes, toutes les bandes et toutes les locales. Une clause
//      reformulée dans le noyau change donc ce que ce module cherche, le même jour. Un fichier
//      qui porte une de ces phrases en a recopié une : c'est la manière dont une seconde
//      implémentation naît sans qu'aucun import ne la trahisse.
//
// ── Ce que ça NE rattrape PAS, et la limite est nette ─────────────────────────────────────
//
//   - Ça voit qu'un fichier APPELLE le noyau, jamais qu'il AFFICHE ce que le noyau a rendu.
//     Un composant qui appellerait `composeVerdict` puis peindrait sa propre phrase passerait
//     ici au vert. Même limite que l'échappement d'observabilité (#81) : on vérifie la
//     déclaration, pas l'application.
//   - Une prose reconstruite par concaténation — « desserte » + « forte » — n'est pas vue.
//   - Les fichiers de test sortent de la population, parce qu'ils portent les fixtures de la
//     règle : `src/core/verdict.test.ts` écrit des clauses attendues, et une population qui les
//     lirait compterait le contrôle parmi les choses qu'il contrôle. C'est la leçon déjà payée
//     par observabilite.ts, le 6 septembre 2026.
//   - Ça ne dit rien des CHIFFRES : les deux surfaces lisent des corpus différents, et c'est
//     assumé. Ce qui est partagé est la règle de composition.

import { execFileSync } from "child_process"
import { readFileSync } from "fs"
import { resolve } from "path"

import {
  VERDICT_AXIS_ORDER,
  clauseText,
  noFindingText,
  type Band,
  type VerdictLocale,
} from "../../src/core"

const ROOT = resolve(import.meta.dirname, "../..")

/** Les répertoires de code où un verdict peut naître. Rien d'autre n'est lu. */
const CODE_DIRS = ["src", "mcp-server/src"]

const SOURCE = /\.(?:ts|tsx|mjs|cjs|js|jsx)$/
export const TEST = /\.test\.(?:ts|tsx|mjs|cjs|js|jsx)$/

/** Le fichier qui DÉTIENT la règle. Il porte les clauses par définition et sort du recensement. */
export const CORE_VERDICT = "src/core/verdict.ts"

/** Les bandes et les locales, telles que le noyau les déclare. */
const BANDS: readonly Band[] = ["fort", "moyen", "faible"]
const LOCALES: readonly VerdictLocale[] = ["fr", "en"]

/**
 * Toutes les phrases qu'un verdict peut contenir, dérivées du noyau à l'exécution.
 *
 * Jamais recopiées : `clauseText` est interrogé sur le produit des axes, des bandes et des
 * locales. Une clause reformulée change ce que ce module cherche le jour même, et un axe neuf
 * y entre sans que personne n'ait à y penser.
 */
export function verdictPhrases(): string[] {
  const phrases = new Set<string>()
  for (const locale of LOCALES) {
    phrases.add(noFindingText(locale))
    for (const axis of VERDICT_AXIS_ORDER) {
      for (const band of BANDS) phrases.add(clauseText(axis, band, locale))
    }
  }
  return [...phrases]
}

/** Le texte d'un fichier, commentaires retirés — même précaution qu'observabilite.ts. */
export function code(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n")
}

function git(root: string, args: string[]): string[] {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

/** Les fichiers de code que le dépôt porte, suivis ou simplement écrits par une session. */
export function repositoryFiles(root = ROOT): string[] {
  const carried = git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "--", ...CODE_DIRS])
  return [...new Set(carried)].filter((f) => SOURCE.test(f) && !TEST.test(f))
}

export interface Composer {
  path: string
  /** Vrai quand le fichier importe `composeVerdict` d'un chemin qui désigne le noyau. */
  importsCore: boolean
  /** « front » ou « agent » — la surface à laquelle ce fichier appartient. */
  surface: "front" | "agent"
}

/** Vrai quand ce texte appelle la composition. */
export const callsCompose = (body: string): boolean => /\bcomposeVerdict\s*\(/.test(body)

/**
 * Vrai quand ce texte importe `composeVerdict` du noyau.
 *
 * Les trois orthographes que le dépôt utilise réellement : l'alias `@/core` du navigateur, le
 * chemin relatif `../../src/core` du serveur MCP, et `./verdict` à l'intérieur du noyau. Une
 * quatrième orthographe rougit — ce qui est la bonne direction : elle sera lue par quelqu'un.
 */
export function importsComposeFromCore(body: string): boolean {
  const imports = body.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)
  for (const m of imports) {
    if (!/\bcomposeVerdict\b/.test(m[1])) continue
    if (/(^@\/core$)|(\/src\/core$)|(^\.\/verdict$)|(^\.\.\/core$)/.test(m[2])) return true
  }
  return false
}

export const surfaceOf = (path: string): "front" | "agent" =>
  path.startsWith("mcp-server/") ? "agent" : "front"

/** L'entrée du serveur MCP. Ce que le paquet publié démarre, et rien d'autre. */
export const AGENT_ENTRY = "mcp-server/src/index.ts"

/**
 * Les fichiers que le serveur ATTEINT depuis son entrée, en suivant les imports relatifs.
 *
 * Mesuré, pas supposé, et la raison a été payée le 11 septembre 2026. La première écriture de
 * cette règle demandait « au moins un composeur sous `mcp-server/` ». La contre-preuve — retirer
 * la composition de `scorePoint.ts` — est restée VERTE, parce que `mcp-server/src/verify.ts`
 * appelle lui aussi `composeVerdict` : le CONTRÔLEUR se comptait comme la chose contrôlée, et la
 * règle aurait survécu à la disparition de ce qu'elle garde.
 *
 * Suivre les imports depuis l'entrée écarte le harnais sans avoir à le nommer — `verify.ts` et
 * `smoke-test.ts` sont des entrées à eux, que rien n'importe — et écarte du même coup un outil
 * qu'on cesserait d'enregistrer, ce qui est exactement le bon comportement : un outil que le
 * serveur n'atteint plus ne sert plus personne.
 *
 * **Ce que ça ne rattrape pas** : les imports dynamiques et les chemins construits ne sont pas
 * suivis. Le serveur n'en a aucun aujourd'hui ; le jour où il en aurait un, la direction de
 * l'erreur est le rouge — le fichier sortirait du surface servi et le recensement le dirait.
 */
export function reachableFrom(entry: string, read: (path: string) => string): Set<string> {
  const seen = new Set<string>()
  const queue = [entry]
  const candidates = (from: string, spec: string): string[] => {
    const parts = from.split("/").slice(0, -1)
    for (const segment of spec.split("/")) {
      if (segment === ".") continue
      else if (segment === "..") parts.pop()
      else parts.push(segment)
    }
    const base = parts.join("/")
    return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base]
  }

  while (queue.length > 0) {
    const path = queue.pop() as string
    if (seen.has(path)) continue
    let body: string
    try {
      body = code(read(path))
    } catch {
      continue
    }
    seen.add(path)
    for (const m of body.matchAll(/from\s*["'](\.[^"']*)["']/g)) {
      for (const candidate of candidates(path, m[1])) {
        if (seen.has(candidate)) break
        try {
          read(candidate)
          queue.push(candidate)
          break
        } catch {
          // pas ce candidat : on essaie l'extension suivante
        }
      }
    }
  }
  return seen
}

export interface VerdictCensus {
  ok: boolean
  composers: Composer[]
  /** Les fichiers qui composent sans importer du noyau — une seconde implémentation. */
  detached: string[]
  /** Les fichiers qui portent verbatim une phrase de verdict, hors noyau et hors dérogation. */
  copiedProse: { path: string; phrase: string }[]
  detail: string
}

export interface ProseWaiver {
  path: string
  raison: string
  date: string
}

/**
 * Le recensement.
 *
 * Un recensement VIDE échoue, comme `censusVerdict` de `scripts/eval/census.ts` : une
 * énumération qui ne trouve plus rien a cessé de fonctionner, et le rapporter comme un succès
 * est le défaut d'absence silencieuse que toute cette famille refuse.
 */
export function censusVerdictComposers(
  files: readonly string[],
  read: (path: string) => string,
  phrases: readonly string[],
  waivers: readonly ProseWaiver[],
  /** Le surface réellement servi par l'agent. Voir `reachableFrom` pour ce qu'il écarte. */
  served: ReadonlySet<string> = reachableFrom(AGENT_ENTRY, read),
): VerdictCensus {
  const waived = new Set(waivers.map((w) => w.path))
  const composers: Composer[] = []
  const detached: string[] = []
  const copiedProse: { path: string; phrase: string }[] = []

  for (const path of files) {
    const body = code(read(path))

    // Le noyau DÉFINIT `composeVerdict` ; la définition ressemble à un appel et n'en est pas
    // un. Il n'est pas un consommateur de la règle, il EST la règle, donc il ne fait partie
    // d'aucune des deux populations.
    if (path === CORE_VERDICT) continue

    if (callsCompose(body)) {
      const importsCore = importsComposeFromCore(body)
      composers.push({ path, importsCore, surface: surfaceOf(path) })
      if (!importsCore) detached.push(path)
    }

    if (waived.has(path)) continue
    const found = phrases.find((phrase) => body.includes(phrase))
    if (found) copiedProse.push({ path, phrase: found })
  }

  const problems: string[] = []
  if (composers.length === 0) problems.push("recensement vide : plus aucun appelant de composeVerdict")
  if (!composers.some((c) => c.surface === "front"))
    problems.push("aucun composeur sous src/ : l'écran ne compose plus de verdict")
  // Le composeur de l'agent doit être SERVI, pas seulement présent : un contrôleur qui compose
  // pour vérifier ne rend de verdict à personne. C'est le trou que la contre-preuve a montré.
  if (!composers.some((c) => c.surface === "agent" && served.has(c.path)))
    problems.push(
      `aucun composeur atteint depuis ${AGENT_ENTRY} : « la même réponse pour un agent » est redevenue fausse`,
    )
  if (detached.length > 0) problems.push(`composent sans importer le noyau : ${detached.join(", ")}`)
  if (copiedProse.length > 0)
    problems.push(`portent une clause recopiée : ${copiedProse.map((c) => `${c.path} (« ${c.phrase} »)`).join(", ")}`)

  if (problems.length > 0)
    return { ok: false, composers, detached, copiedProse, detail: problems.join(" · ") }

  return {
    ok: true,
    composers,
    detached,
    copiedProse,
    detail: `${composers.length} composeur(s), les deux surfaces couvertes, toutes les clauses viennent du noyau`,
  }
}

export function readWaivers(path = resolve(ROOT, "scripts/porte/verdict.json")): ProseWaiver[] {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { "prose-autorisee"?: ProseWaiver[] }
  return parsed["prose-autorisee"] ?? []
}

export const readFile = (path: string, root = ROOT): string => readFileSync(resolve(root, path), "utf8")
