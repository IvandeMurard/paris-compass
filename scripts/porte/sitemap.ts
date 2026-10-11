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
// Et dans les deux LANGUES : `verdictSitemap` tient la moitié canonique, `verdictEnglish` tient
// l'arbre `/en`. La seconde a été écrite le 13 septembre 2026 parce que la première ne bouclait
// que sur des chemins français par construction — l'en-tête de `routeFacts` affirmait depuis
// deux jours qu'un autre contrôle couvrait l'anglais, et cet autre contrôle n'existait pas
// (#133).
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
 * même par construction, et le recouper deux fois compterait une décision pour deux. Ce
 * raisonnement reste juste pour ce qu'il couvre, et il ne couvre pas l'existence des routes :
 * **qu'une route existe n'est pas une propriété de son composant**. C'est `verdictEnglish` qui
 * confronte l'arbre anglais aux entrées `/en` du sitemap — et le 11 septembre 2026 cette phrase
 * décrivait une intention, pas du code : supprimer les seize routes `/en` de `src/App.tsx`
 * laissait le bras VERT (#133).
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

/** Le préfixe de locale, tel que `src/i18n/routes.ts` le monte. Une route anglaise est une
 *  route sous ce segment, et rien d'autre. */
const EN = "/en"

/** Vrai quand ce chemin appartient à l'arbre anglais — la racine `/en` comprise. */
export const isEnglish = (path: string): boolean => path === EN || path.startsWith(`${EN}/`)

/** Les routes que l'arbre anglais déclare, dans l'ordre du fichier. */
export function englishRoutes(appSource: string): RouteDeclaration[] {
  return readRoutes(appSource).filter((r) => isEnglish(r.path))
}

/** Vrai quand cette URL est servie par l'une de ces routes — l'expansion d'une route
 *  paramétrée est reconnue sur son préfixe, comme partout ailleurs dans ce module. */
function servedBy(url: string, routes: readonly RouteDeclaration[]): boolean {
  return routes.some((r) => {
    const prefix = prefixOf(r.path)
    return prefix === null ? r.path === url : url.startsWith(`${prefix}/`)
  })
}

/**
 * L'arbre anglais contre les entrées `/en` du sitemap, dans les deux sens — #133.
 *
 * ── Le défaut que ça ferme ────────────────────────────────────────────────────────────────
 *
 * `verdictSitemap` ne boucle que sur `canonicalPaths`, français par construction. La moitié
 * anglaise du sitemap n'était donc confrontée à rien : le 11 septembre 2026, supprimer les
 * seize lignes `path="/en…"` de `src/App.tsx` laissait le bras vert, avec un sitemap qui
 * continuait d'annoncer aux moteurs trente-trois URL que plus aucune route ne servait. C'est
 * exactement le « sitemap de 404 douces » que l'en-tête de ce fichier dit prévenir.
 *
 * ── Trois énoncés, et la correspondance est dérivée ───────────────────────────────────────
 *
 * La population est l'arbre anglais lui-même, lu sur `src/App.tsx`. Vide est un ÉCHEC : une
 * énumération qui ne trouve plus rien a cessé de fonctionner.
 *
 *   1. `anglais-sans-route` — une URL `/en…` au sitemap que plus aucune route ne sert. Le sens
 *      qui a motivé le ticket.
 *   2. `route-anglaise-sans-canonique` — une route `/en…` dont `stripLocale` ne rend aucune
 *      route canonique. La table des exceptions de `src/i18n/routes.ts` et la table des routes
 *      se sont contredites ; c'est d'elle que la correspondance dérive, jamais d'une seconde
 *      liste écrite ici.
 *   3. `route-anglaise-hors-sitemap` — une route anglaise indexable dont le canonique EST au
 *      sitemap et dont l'URL anglaise ne l'est pas. Le sens inverse du premier.
 *
 * Le `noindex` est lu sur le fait CANONIQUE : l'arbre anglais monte les mêmes composants, donc
 * la même balise. C'est la moitié du raisonnement de `routeFacts` qui reste vraie.
 *
 * ── Ce que ça NE rattrape PAS ─────────────────────────────────────────────────────────────
 *
 *   - Ça n'exige pas la PARITÉ : une route canonique sans route anglaise passe au vert tant
 *     que le sitemap n'annonce pas son URL anglaise. Le jour où un chemin serait volontairement
 *     français seulement, la règle n'a rien à dire ; le jour où il ne le serait pas
 *     volontairement, c'est le sitemap qui le trahit, par la règle 1.
 *   - Même limite que le reste du module : ça lit le DÉPÔT, jamais le site publié. Une route
 *     servie par Lovable et absente d'ici lui échappe.
 *   - Une route paramétrée n'est vérifiée que sur son préfixe.
 */
export function verdictEnglish(
  facts: readonly RouteFact[],
  routes: readonly RouteDeclaration[],
  canonicalPaths: readonly string[],
  allPaths: readonly string[],
  waivers: readonly SitemapWaiver[],
  strip: (path: string) => string,
): SitemapVerdict {
  const problems: SitemapProblem[] = []
  const population = routes.map((r) => r.path)
  const waived = new Set(waivers.map((w) => w.route))
  const canonical = new Set(canonicalPaths)
  const listed = new Set(allPaths)
  const byPath = new Map(facts.map((f) => [f.path, f]))

  if (population.length === 0)
    return {
      ok: false,
      population,
      problems,
      detail: `recensement vide : aucune route ${EN} dans src/App.tsx, alors que le sitemap en annonce ${allPaths.filter(isEnglish).length}`,
    }

  for (const url of allPaths.filter(isEnglish)) {
    if (servedBy(url, routes)) continue
    problems.push({
      route: url,
      regle: "anglais-sans-route",
      detail: `le sitemap annonce ${url}, qu'aucune route ${EN} de src/App.tsx ne sert`,
    })
  }

  for (const route of routes) {
    const canonicalPath = strip(route.path)
    const fact = byPath.get(canonicalPath)
    if (!fact) {
      problems.push({
        route: route.path,
        regle: "route-anglaise-sans-canonique",
        detail: `${route.path} se canonicalise en ${canonicalPath}, que src/App.tsx ne déclare pas — src/i18n/routes.ts et la table des routes divergent`,
      })
      continue
    }
    if (fact.noindex || waived.has(fact.path)) continue

    const prefix = prefixOf(route.path)
    const canonicalListed =
      fact.prefix === null
        ? canonical.has(fact.path)
        : canonicalPaths.some((p) => p.startsWith(`${fact.prefix}/`))
    if (!canonicalListed) continue

    const englishListed =
      prefix === null ? listed.has(route.path) : allPaths.some((p) => p.startsWith(`${prefix}/`))
    if (!englishListed)
      problems.push({
        route: route.path,
        regle: "route-anglaise-hors-sitemap",
        detail: `${fact.file} est indexable et ${fact.path} est au sitemap, mais l'URL anglaise ${route.path} n'y est pas`,
      })
  }

  if (problems.length > 0)
    return {
      ok: false,
      population,
      problems,
      detail: `${problems.length} contradiction(s) entre l'arbre ${EN} et la moitié anglaise du sitemap`,
    }

  return {
    ok: true,
    population,
    problems,
    detail: `${population.length} route(s) ${EN} recensée(s), toutes canonicalisées et accordées au sitemap`,
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
