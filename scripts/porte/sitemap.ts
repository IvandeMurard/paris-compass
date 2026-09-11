// Le sitemap contre les routes, et contre le `noindex` que chaque page déclare —
// w6-contexte (#119), critère 6. Cinquième application de « énumérer, pas lister », après les
// scripts npm (arms.ts, #71), les sources d'ingestion (cadences.ts, #70), le catalogue
// (catalogue.ts, #73) et les appelants de PostgREST (observabilite.ts, #81).
//
// ── Le défaut que personne ne verrait ─────────────────────────────────────────────────────
//
// `/contexte/*` part en `noindex` — tranché par Ivan le 10 septembre 2026 : ces pages sont
// générées, une par adresse consultée, et un moteur pénalise la production de masse de pages
// quasi identiques sur tout le domaine. La balise est posée dans `src/pages/Context.tsx`. Rien,
// avant ce module, n'empêchait `scripts/generate-sitemap.ts` de lister ces mêmes URL : les deux
// fichiers ne se connaissent pas.
//
// Et c'est une contradiction MUETTE. Un sitemap qui annonce une page en `noindex` ne casse
// aucun build, ne rougit aucun test, ne déclenche aucune alerte : il envoie un robot lire une
// page qui lui dit de partir. On l'apprendrait par une chute de position, des semaines plus
// tard, sans savoir d'où elle vient. Le symétrique est pire encore et tout aussi muet : une
// route indexable absente du sitemap est une page que personne ne trouve.
//
// ── Ce qui est recoupé, et pourquoi c'est deux énoncés indépendants ───────────────────────
//
// Lire le XML produit ne prouverait rien : il est écrit par le générateur, donc il ne peut que
// lui ressembler. Ce module compare deux affirmations écrites par des mains différentes :
//
//   - la TABLE DES ROUTES de `src/App.tsx` — ce que l'application sert réellement ;
//   - le `noindex` que la PAGE de chaque route déclare dans son `<Seo>` ;
//   - la LISTE D'ENTRÉES exportée par `scripts/generate-sitemap.ts`.
//
// Dans les deux sens, comme le ledger (#82) : une entrée du sitemap qu'aucune route ne sert est
// un rouge au même titre qu'une route indexable absente du sitemap. Une route ne peut pas être
// oubliée en silence, et une entrée ne peut pas survivre à la route qu'elle annonçait.
//
// ── Ce que ça NE rattrape PAS, et la limite est nette ─────────────────────────────────────
//
//   - Ça lit ce que le DÉPÔT déclare, jamais ce que le site PUBLIÉ sert. Le déploiement
//     appartient à Lovable, et `porte:publie` a mesuré deux jours durant un bundle qui ne
//     venait d'aucun commit. Une page dont le `noindex` ne serait pas arrivé en production
//     passe ici au vert.
//   - Ça lit le `noindex` sur le composant `<Seo>` écrit en clair. Un `noindex` posé à travers
//     une variable, une condition, ou par un autre composant, est invisible d'ici — et la
//     direction de l'erreur est alors le rouge, pas le silence : la route serait lue comme
//     indexable et exigée au sitemap.
//   - Ça ne dit rien de `robots.txt`, que ce dépôt ne génère pas, ni des balises canoniques.
//   - Une route paramétrée n'est vérifiée que sur son PRÉFIXE : que `/paris/:slug` ait au moins
//     une expansion au sitemap ne dit pas que les 80 y sont.

import { readFileSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(import.meta.dirname, "../..")

/**
 * Le texte d'un fichier, commentaires retirés — même précaution qu'`observabilite.ts`.
 *
 * `src/pages/Context.tsx` explique en tête pourquoi il est en `noindex`, sur une quinzaine de
 * lignes. Sans le retrait, un fichier qui PARLE de `noindex` serait lu comme un fichier qui le
 * POSE, et la règle vaudrait pour la prose au lieu du code. Les retours chariot passent en
 * premier : un fichier enregistré une fois avec des fins de ligne Windows fait cesser de
 * correspondre les motifs ancrés sans que rien n'ait l'air anormal.
 */
export function code(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n")
}

export interface RouteDeclaration {
  /** Le chemin tel que `<Route path=…>` le déclare, préfixe `/en` compris. */
  path: string
  /** Le nom du composant rendu — `element={<Context />}`. */
  component: string
}

/** Les routes que la table déclare, dans l'ordre du fichier. `*` est exclu : la page 404 n'est
 *  pas une route, c'est l'absence de route. */
export function readRoutes(appSource: string): RouteDeclaration[] {
  const source = code(appSource)
  const routes: RouteDeclaration[] = []
  for (const m of source.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)\s*\/>\}/g)) {
    if (m[1] === "*") continue
    routes.push({ path: m[1], component: m[2] })
  }
  return routes
}

/**
 * Composant → fichier de page, lu sur les imports plutôt que deviné sur le nom.
 *
 * Les deux formes que la table utilise : l'import direct (`import Index from "./pages/Index"`)
 * et l'import différé (`const Carte = lazy(() => import("./pages/Carte"))`). Déduire le chemin
 * du nom du composant marcherait aujourd'hui et cesserait le jour où une page est renommée sans
 * que son composant le soit — exactement le genre de dérive que ce module existe pour voir.
 */
export function readPageModules(appSource: string): Map<string, string> {
  const source = code(appSource)
  const modules = new Map<string, string>()
  for (const m of source.matchAll(/import\s+(\w+)\s+from\s+"\.\/pages\/(\w+)"/g)) {
    modules.set(m[1], `src/pages/${m[2]}.tsx`)
  }
  for (const m of source.matchAll(/const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\("\.\/pages\/(\w+)"\)/g)) {
    modules.set(m[1], `src/pages/${m[2]}.tsx`)
  }
  return modules
}

/**
 * Vrai quand la page pose `noindex` sur son `<Seo>`.
 *
 * L'élément est isolé avant d'être interrogé : `<Seo` jusqu'à sa fermeture auto-fermante. Une
 * page qui nomme `noindex` ailleurs — dans une prop d'un autre composant, dans une chaîne — ne
 * compte pas, et c'est voulu : la balise est posée par `Seo` et par rien d'autre.
 */
export function declaresNoindex(pageSource: string): boolean {
  const source = code(pageSource)
  return Array.from(source.matchAll(/<Seo\b[\s\S]*?\/>/g)).some((m) => /\bnoindex\b/.test(m[0]))
}

export interface RouteFact {
  path: string
  component: string
  /** Le fichier lu pour décider, pour qu'un rouge nomme ce qu'il faut ouvrir. */
  file: string
  noindex: boolean
  /** Le préfixe fixe d'une route paramétrée, ou `null` quand la route est statique. */
  prefix: string | null
}

/** Le préfixe d'une route paramétrée : ce qui précède le premier segment `:param`. */
export function prefixOf(path: string): string | null {
  const i = path.indexOf("/:")
  return i === -1 ? null : path.slice(0, i)
}

/**
 * Les routes canoniques, avec leur verdict d'indexation.
 *
 * Canoniques seulement : l'arbre anglais monte les MÊMES composants, donc son `noindex` est le
 * même par construction, et le recouper deux fois compterait une décision pour deux. Ce que
 * l'arbre anglais mérite, c'est l'autre contrôle — que chaque URL anglaise du sitemap soit bien
 * servie par une route `/en`, ce que `verdictSitemap` fait à part.
 */
export function routeFacts(
  appSource: string,
  read: (file: string) => string = (file) => readFileSync(resolve(ROOT, file), "utf8"),
): RouteFact[] {
  const modules = readPageModules(appSource)
  return readRoutes(appSource)
    .filter((r) => r.path === "/" || !r.path.startsWith("/en"))
    .map((r) => {
      const file = modules.get(r.component)
      if (!file) throw new Error(`${r.path} : aucun import de page pour le composant « ${r.component} »`)
      return { path: r.path, component: r.component, file, noindex: declaresNoindex(read(file)), prefix: prefixOf(r.path) }
    })
}

export interface SitemapWaiver {
  route: string
  raison: string
  date: string
}

export interface SitemapProblem {
  route: string
  regle: string
  detail: string
}

export interface SitemapVerdict {
  ok: boolean
  /** Les routes canoniques recensées — la population. Vide est un échec. */
  population: string[]
  problems: SitemapProblem[]
  detail: string
}

/**
 * Le verdict, dans les deux sens.
 *
 * Un recensement VIDE échoue, et c'est la même règle que `censusVerdict` de
 * `scripts/eval/census.ts` : une énumération qui ne trouve plus rien a cessé de fonctionner —
 * la table des routes a changé de forme, le fichier a bougé — et le rapporter comme un succès
 * est précisément le défaut d'absence silencieuse que cette famille de contrôles refuse.
 */
export function verdictSitemap(
  facts: readonly RouteFact[],
  canonicalPaths: readonly string[],
  allPaths: readonly string[],
  waivers: readonly SitemapWaiver[],
  localize: (path: string) => string,
): SitemapVerdict {
  const problems: SitemapProblem[] = []
  const waived = new Set(waivers.map((w) => w.route))
  const canonical = new Set(canonicalPaths)
  const listed = new Set(allPaths)

  for (const fact of facts) {
    const under = canonicalPaths.filter((p) => fact.prefix !== null && p.startsWith(`${fact.prefix}/`))

    if (fact.noindex) {
      // Le sens qui a motivé ce module. Une URL en `noindex` au sitemap envoie un robot lire
      // une page qui lui dit de partir, et aucune mesure du dépôt ne le dirait.
      const present =
        fact.prefix === null
          ? canonical.has(fact.path) || listed.has(localize(fact.path))
          : under.length > 0
      if (present) {
        problems.push({
          route: fact.path,
          regle: "noindex-au-sitemap",
          detail: `${fact.file} pose noindex, et le sitemap annonce cette route (${fact.prefix === null ? fact.path : under.slice(0, 3).join(", ")})`,
        })
      }
      continue
    }

    if (waived.has(fact.path)) continue

    if (fact.prefix === null) {
      if (!canonical.has(fact.path))
        problems.push({
          route: fact.path,
          regle: "indexable-absente",
          detail: `${fact.file} ne pose pas noindex et le sitemap ne porte pas ${fact.path}`,
        })
    } else if (under.length === 0) {
      problems.push({
        route: fact.path,
        regle: "indexable-absente",
        detail: `${fact.file} ne pose pas noindex et aucune entrée du sitemap ne commence par ${fact.prefix}/`,
      })
    }

    // L'URL anglaise doit être servie, elle aussi. C'est le piège que `/carte` a apporté :
    // deux routes ont un segment anglais traduit, et un simple préfixe `/en` écrirait une URL
    // qu'aucune route n'atteint — un sitemap de 404 douces, que rien d'autre ne verrait.
    const en = localize(fact.path)
    if (fact.prefix === null && canonical.has(fact.path) && !listed.has(en))
      problems.push({
        route: fact.path,
        regle: "anglais-absent",
        detail: `le sitemap porte ${fact.path} mais pas son URL anglaise ${en}`,
      })
  }

  // Le sens inverse : une entrée que plus aucune route ne sert.
  const statics = new Set(facts.filter((f) => f.prefix === null).map((f) => f.path))
  const prefixes = facts.filter((f) => f.prefix !== null).map((f) => f.prefix as string)
  for (const path of canonicalPaths) {
    if (statics.has(path)) continue
    if (prefixes.some((p) => path.startsWith(`${p}/`))) continue
    problems.push({
      route: path,
      regle: "sitemap-sans-route",
      detail: `le sitemap annonce ${path}, qu'aucune route de src/App.tsx ne sert`,
    })
  }

  const population = facts.map((f) => f.path)
  if (population.length === 0)
    return { ok: false, population, problems, detail: "recensement vide : la table des routes de src/App.tsx ne se lit plus" }

  const waiversWithoutRoute = waivers.filter((w) => !population.includes(w.route))
  for (const w of waiversWithoutRoute)
    problems.push({
      route: w.route,
      regle: "raison-orpheline",
      detail: `scripts/porte/sitemap.json justifie l'absence de ${w.route}, que plus aucune route ne déclare`,
    })

  if (problems.length > 0)
    return { ok: false, population, problems, detail: `${problems.length} contradiction(s) entre les routes et le sitemap` }

  return {
    ok: true,
    population,
    problems,
    detail: `${population.length} route(s) canonique(s) recensée(s), ${facts.filter((f) => f.noindex).length} en noindex et absente(s) du sitemap`,
  }
}

/** Les dérogations écrites, avec leur raison et leur date. Absentes par défaut : une route
 *  indexable qu'on choisit de ne pas publier est une décision, et une décision s'écrit. */
export function readWaivers(
  path = resolve(ROOT, "scripts/porte/sitemap.json"),
): SitemapWaiver[] {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { "hors-sitemap"?: SitemapWaiver[] }
  return parsed["hors-sitemap"] ?? []
}

export function readAppSource(path = resolve(ROOT, "src/App.tsx")): string {
  return readFileSync(path, "utf8")
}
