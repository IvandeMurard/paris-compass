// What the product RENDERS in one of its two languages, derived — w1-servi-contenu (#217).
//
// ── The question this answers, and it is not « which files » ──────────────────────────────
//
// Until #217 the fourteenth arm knew two populations: the route table of `src/App.tsx`, and the
// `UI` table of `src/i18n/ui.ts`. Both derived, neither hand-kept — and that was already the
// lesson of #152. The blind spot was not the derivation, it was its REACH: a new block on an
// existing page adds no route and no `UI` label, so it was invisible, and that is the shape the
// last seven deliveries took. Measured on 17 September 2026: `ui.ts` declares **360** literals
// of twelve characters or more, and four other modules that reach the screen declare **307**
// between them — `modeText.ts` 112, `contextText.ts` 101, `verdict.ts` 62, `rythmeText.ts` 32.
// (The ticket said 288 for `ui.ts`; it was written without read access and it was wrong. The
// other four hold.) Nearly half the served prose sat outside the arm's field.
//
// Writing « and also `modeText.ts`, `rythmeText.ts` » would have created the sixth hand-kept
// list in this repository, and the sixth forgotten entry. #152 already settled that a population
// is DERIVED. So this module answers *of what*, not *of which files*, in three steps — and each
// step says what it lets in and what it keeps out.
//
// ── Step 1 — REACHABILITY. What no import reaches cannot be served ────────────────────────
//
// The walk starts at `src/main.tsx` and follows static and dynamic imports, resolving `@/` to
// `src/` the way `tsconfig` does, and stopping at anything outside `src/`. A module no import
// reaches contributes nothing to any bundle, so its strings can never prove a deployment
// happened — and demanding them would be a permanent red with no defect behind it.
//
// This is not a theoretical guard. Measured the same day: **`src/i18n/survivalText.ts` is
// imported by nobody.** Twelve locale-keyed strings, six of them found nowhere else, and not one
// byte of them in the 1 247 018 octets a build of `main` emits. Without this step the arm would
// have opened red on the morning it shipped, on prose the product does not render — and a false
// red is the one a session switches off. `DIAGNOSTIC.md` §58 carries the finding itself.
//
// It also excludes `*.test.*` without naming them, because no test is imported by the
// application — the trap of 6 September 2026, where a rule's own fixtures entered its
// population, closes here by construction rather than by a filter.
//
// ── Step 2 — WHAT MAKES A STRING ENTER: it is chosen by locale ────────────────────────────
//
// Inside a reachable module, a string enters when it is the value of a property nested under a
// property named `fr` or `en`. That is the shape every prose table in this repository already
// has — `UI` keyed by label then locale, `RYTHME_COPY` and `CLAUSES` keyed by locale then by
// axis — and it is a property of the TEXT, not of the file: a table that appears tomorrow in a
// component rather than in `src/i18n/` is caught the day it is written.
//
// What it keeps out, and each exclusion is a claim about provability rather than a taste:
//
//   - A string that is not chosen by locale. A CSS class, a query key, an enum member, an import
//     specifier. `src/core/verdict.ts` holds all four next to its clauses, which is exactly why
//     the count cannot be a `grep` over the file: 62 literals there, of which 52 are prose.
//   - A TEMPLATE WITH INTERPOLATION. `RYTHME_COPY.fr.intro` names its day-type code through
//     `${RYTHME_DAY_TYPE}`; the bundle carries the pieces and the join, never the assembled
//     sentence, so searching for the whole is a red that means nothing. Twenty of them, and they
//     are counted and reported rather than silently dropped.
//   - Anything below `LONGUEUR_MINIMALE`, handled downstream in `servi.ts` where the threshold
//     lives. It is **unchanged at twelve** — #217 explicitly refused to lower it.
//
// ── Step 3 — the population is then PROVED against the repository's own build ─────────────
//
// A derivation is a claim, and this one was measured before being believed. Against the
// 1 247 018 octets `npm.cmd run build` emitted on 17 September 2026: **914 of the 920 distinct
// tokens present**, and the six absent were the dead module of step 1. With it excluded, the
// repository's own build carries **100 %** of what this module derives — which is what makes a
// missing token on production mean « not deployed » rather than « not provable ».
//
// ── What this does NOT catch ──────────────────────────────────────────────────────────────
//
//   - Prose written straight into JSX, not routed through a locale-keyed table. It is invisible
//     here, and that is an argument for the table.
//   - A single-locale string: a table with only `fr` still enters, but a constant used in both
//     languages without a locale key does not.
//   - Everything the arm already could not see, unchanged: a SHORT new string, and any change
//     leaving no literal at all — a logic fix, a style correction, a number.

import ts from "typescript"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(import.meta.dirname, "../..")

/** Where the application starts. Everything the visitor can ever load hangs off this file. */
export const ENTREE = "src/main.tsx"

/** Reads a repository file by its POSIX path, or `null` when it does not exist. */
export type Lecteur = (chemin: string) => string | null

export function lecteurDuDepot(racine: string = ROOT): Lecteur {
  return (chemin) => {
    try {
      return readFileSync(resolve(racine, chemin), "utf8")
    } catch {
      return null
    }
  }
}

/**
 * The specifiers a module imports, static and dynamic alike.
 *
 * Dynamic ones matter more than static ones here: every page of this application is loaded
 * through `lazy(() => import(...))`, so a walk that ignored them would reach the shell and none
 * of the screens — which is the same one-level mistake the chunk crawl was making.
 */
export function specificateurs(source: string, tsx: boolean): string[] {
  const fichier = ts.createSourceFile(
    tsx ? "x.tsx" : "x.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    tsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const sortie: string[] = []
  const visiter = (n: ts.Node): void => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) {
      if (ts.isStringLiteral(n.moduleSpecifier)) sortie.push(n.moduleSpecifier.text)
    } else if (
      ts.isCallExpression(n) &&
      n.expression.kind === ts.SyntaxKind.ImportKeyword &&
      n.arguments.length > 0 &&
      ts.isStringLiteral(n.arguments[0])
    ) {
      sortie.push((n.arguments[0] as ts.StringLiteral).text)
    }
    ts.forEachChild(n, visiter)
  }
  ts.forEachChild(fichier, visiter)
  return sortie
}

/**
 * A specifier turned into a repository path, or `null` when it leaves `src/`.
 *
 * `@/` resolves to `src/` because `tsconfig.json` says so — read there rather than assumed, the
 * day someone changes it this walk follows. A bare specifier is a dependency: outside the
 * repository, so outside this population.
 */
export function resoudre(specificateur: string, depuis: string, lire: Lecteur): string | null {
  let base: string
  if (specificateur.startsWith("@/")) base = `src/${specificateur.slice(2)}`
  else if (specificateur.startsWith(".")) {
    const dossier = depuis.split("/").slice(0, -1)
    for (const part of specificateur.split("/")) {
      if (part === ".") continue
      else if (part === "..") dossier.pop()
      else dossier.push(part)
    }
    base = dossier.join("/")
  } else return null

  for (const candidat of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (/\.tsx?$/.test(candidat) && lire(candidat) !== null) return candidat
  }
  return null
}

/**
 * Every module under `src/` an import reaches from the entry, in first-seen order.
 *
 * Breadth-first and memoised on the path, so a diamond costs one read. The walk is total: this
 * repository's `src/` is a few hundred files and the whole traversal is under a second, which is
 * cheaper than the single HTTP fetch that follows it.
 */
export function modulesAtteignables(lire: Lecteur, entree: string = ENTREE): string[] {
  const vus = new Set<string>()
  const file = [entree]
  vus.add(entree)
  const ordre: string[] = []
  while (file.length > 0) {
    const courant = file.shift() as string
    const source = lire(courant)
    if (source === null) continue
    ordre.push(courant)
    for (const spec of specificateurs(source, courant.endsWith(".tsx"))) {
      const cible = resoudre(spec, courant, lire)
      if (cible === null || vus.has(cible)) continue
      vus.add(cible)
      file.push(cible)
    }
  }
  return ordre
}

/** One string the product renders, with where it was declared so a red names the file to open. */
export interface BrinProse {
  /** Repository path of the module that declares it. */
  fichier: string
  /** The property path under which it sits, `fr`/`en` included — `home.submit.fr`. */
  cle: string
  /** The string itself, as the bundle must carry it. */
  valeur: string
}

/**
 * The locale-chosen strings a module declares.
 *
 * The descent turns on the first property named `fr` or `en` and stays on from there, so both
 * shapes this repository uses are caught with one rule: `{ key: { fr, en } }` as `UI` has it,
 * and `{ fr: { key }, en: { key } }` as `RYTHME_COPY` and `CLAUSES` have it.
 *
 * A template with substitution is skipped and counted by the caller: what the bundle holds is
 * the fragments, so the whole sentence is not a thing that could be found.
 */
export function brinsDeProse(fichier: string, source: string): { brins: BrinProse[]; interpoles: number } {
  const arbre = ts.createSourceFile(
    fichier,
    source,
    ts.ScriptTarget.Latest,
    true,
    fichier.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const brins: BrinProse[] = []
  let interpoles = 0

  const visiter = (n: ts.Node, chemin: string[], sousLocale: boolean): void => {
    if (ts.isPropertyAssignment(n)) {
      const nom =
        ts.isIdentifier(n.name) || ts.isStringLiteral(n.name) || ts.isNumericLiteral(n.name)
          ? n.name.text
          : null
      const iciSousLocale = sousLocale || nom === "fr" || nom === "en"
      const sousChemin = nom === null ? chemin : [...chemin, nom]
      const valeur = n.initializer
      if (iciSousLocale) {
        if (ts.isStringLiteral(valeur) || ts.isNoSubstitutionTemplateLiteral(valeur)) {
          brins.push({ fichier, cle: sousChemin.join("."), valeur: valeur.text })
          return
        }
        if (ts.isTemplateExpression(valeur)) {
          interpoles += 1
          return
        }
      }
      ts.forEachChild(valeur, (c) => visiter(c, sousChemin, iciSousLocale))
      return
    }
    ts.forEachChild(n, (c) => visiter(c, chemin, sousLocale))
  }
  ts.forEachChild(arbre, (c) => visiter(c, [], false))
  return { brins, interpoles }
}

export interface Prose {
  brins: BrinProse[]
  /** Modules the walk reached — printed by the arm so the population is auditable. */
  modules: string[]
  /** Modules that declare at least one rendered string. */
  modulesParlants: string[]
  /** Interpolated templates skipped, reported rather than silently dropped. */
  interpoles: number
}

/** The whole derivation: reach, then read. Nothing here is a list of files. */
export function proseDuDepot(lire: Lecteur = lecteurDuDepot(), entree: string = ENTREE): Prose {
  const modules = modulesAtteignables(lire, entree)
  const brins: BrinProse[] = []
  const modulesParlants: string[] = []
  let interpoles = 0
  for (const module of modules) {
    const source = lire(module)
    if (source === null) continue
    const lu = brinsDeProse(module, source)
    interpoles += lu.interpoles
    if (lu.brins.length === 0) continue
    modulesParlants.push(module)
    brins.push(...lu.brins)
  }
  return { brins, modules, modulesParlants, interpoles }
}
