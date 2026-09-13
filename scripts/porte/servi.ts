// The rule that compares what is SERVED to what is TRACKED — #142.
//
//   npm.cmd run servi
//
// ── The blind spot ────────────────────────────────────────────────────────────────────────
//
// `porte:publie` — the tenth arm — looks at the published site and asks one question: is the
// Supabase project reference frozen into the served bundle. Its header says so, and says what it
// leaves out. What it leaves out is a whole class: **a three-week-old bundle carries the same
// configuration as today's bundle**, so it passes. It looks for a CONFIGURATION, never a VERSION.
//
// On 13 September 2026 that class had an instance. `w6-contexte` (#119) had been on `main` since
// the 11th — two proposals, a review, six steps — and none of it was served. `/contexte/`,
// `/carte`, `/en/context/` and `/en/map` returned **zero** occurrences in 770 756 bytes of served
// JavaScript, while `/methodologie` and `/presentation` answered normally. `porte:publie` was
// green on the 11th at 12:19, after both merges. Nothing was wrong with it; nothing else covered
// what it left.
//
// ── Why a witness is required, and it is not a nicety ─────────────────────────────────────
//
// The first two measurements of that episode returned zero on ALL eight strings, witnesses
// included, because they never followed the lazy chunk. Published as-is, that reads « the site
// is empty » when the truth was « the measurement was empty ». **A count alone cannot tell an
// absence from a broken instrument.** So this rule refuses to render a verdict when it finds no
// known route at all: that is `mesure-cassee`, never a red.
//
// ── Why some routes cannot be proven, and saying so is the point ──────────────────────────
//
// A route proves its own presence only if its token is not contained in another route's token.
// `/presentation` sits inside `/en/presentation`: finding it says one of the two arrived, never
// which. Those routes stay in the population as WITNESSES — they can show the instrument works —
// but they never turn the arm red on their own, because their absence is the only thing they can
// honestly report. This is the same discipline as `Measured<T>`: claim what was measured, not
// what would be convenient.
//
// The four routes of the founding incident are all discriminating — `/contexte/`, `/carte`,
// `/en/context/`, `/en/map` — so the rule would have caught it. That is a property of today's
// route table, not a guarantee: a French route that gains an English twin sharing its spelling
// becomes unprovable, and the arm will say so rather than pretend.
//
// ── What this does NOT catch ──────────────────────────────────────────────────────────────
//
//   - It proves a ROUTE arrived, never that the BEHAVIOUR behind it is right. A route served by
//     wrong code passes.
//   - It says nothing about WHY a deployment did not happen. Deployment belongs to Lovable; this
//     repository sees only the result.
//   - It is blind to anything leaving no literal text in a minified bundle: an internal logic
//     fix, a style correction, any change creating no new string.

import { prefixOf, readRoutes, type RouteDeclaration } from "./sitemap"

/** One route, reduced to the literal a production bundle must carry. */
export interface Jeton {
  path: string
  /** The string searched for: the path itself, or the fixed prefix of a parameterised route. */
  jeton: string
  /**
   * False when another route's token contains this one. Such a route stays a witness and never
   * makes the arm red: its presence cannot be told apart from its twin's.
   */
  discriminant: boolean
}

/**
 * The literal a route contributes to the bundle.
 *
 * `/` is excluded: it is inside every other path, so it can neither fail nor prove. `/en` is
 * excluded for the same reason — it sits inside all sixteen `/en/...` paths.
 */
export function jetonDeRoute(path: string): string | null {
  if (path === "/" || path === "/en") return null
  const prefix = prefixOf(path)
  return prefix === null ? path : `${prefix}/`
}

/** The tokens the route table declares, each marked for whether it can prove itself. */
export function jetonsAttendus(appSource: string): Jeton[] {
  const routes: RouteDeclaration[] = readRoutes(appSource)
  const bruts: { path: string; jeton: string }[] = []
  for (const r of routes) {
    const jeton = jetonDeRoute(r.path)
    if (jeton === null) continue
    if (bruts.some((b) => b.jeton === jeton)) continue
    bruts.push({ path: r.path, jeton })
  }
  return bruts.map((b) => ({
    ...b,
    discriminant: !bruts.some((autre) => autre.jeton !== b.jeton && autre.jeton.includes(b.jeton)),
  }))
}

export interface Dispense {
  route: string
  raison: string
  mesureLe: string
}

export type EtatServi = "servi" | "absent" | "témoin absent"

export interface ConstatRoute {
  path: string
  jeton: string
  discriminant: boolean
  occurrences: number
  etat: EtatServi
}

export type Issue = "servi" | "en retard" | "mesure cassée"

export interface VerdictServi {
  issue: Issue
  constats: ConstatRoute[]
  /** Discriminating routes the served bundles do not carry. Empty unless `issue` is `en retard`. */
  manquantes: ConstatRoute[]
  /** How many tokens were found at all — the instrument's own proof of life. */
  temoins: number
  dire: string
}

function occurrences(botte: string, aiguille: string): number {
  return botte.split(aiguille).length - 1
}

/**
 * The rule, kept pure so it plays on fixtures rather than on the network.
 *
 * `js` is every served bundle concatenated: the entry alone is not enough, and that is the first
 * thing the founding measurement learned.
 */
export function verdictServi(
  jetons: readonly Jeton[],
  js: string,
  dispenses: readonly Dispense[] = [],
): VerdictServi {
  const dispensees = new Set(dispenses.map((d) => d.route))

  const constats: ConstatRoute[] = jetons.map((j) => {
    const n = occurrences(js, j.jeton)
    const etat: EtatServi = n > 0 ? "servi" : j.discriminant ? "absent" : "témoin absent"
    return { path: j.path, jeton: j.jeton, discriminant: j.discriminant, occurrences: n, etat }
  })

  const temoins = constats.filter((c) => c.occurrences > 0).length

  // The instrument speaks before the verdict does. Zero tokens out of a non-empty population is
  // not a site without routes — no build produces that — it is a measurement that read the wrong
  // thing, and publishing it as a red would be publishing a guess.
  if (jetons.length > 0 && temoins === 0) {
    return {
      issue: "mesure cassée",
      constats,
      manquantes: [],
      temoins,
      dire:
        `Aucune des ${constats.length} routes connues n'est dans le JavaScript lu — y compris ` +
        "celles qui précèdent de plusieurs semaines toute publication récente. Un build ne rend " +
        "pas ça. L'instrument a lu autre chose que le bundle applicatif : suivre les morceaux à " +
        "la demande, pas seulement l'entrée. Rien n'est jugé.",
    }
  }

  const manquantes = constats.filter((c) => c.etat === "absent" && !dispensees.has(c.path))

  if (manquantes.length === 0) {
    const muets = constats.filter((c) => c.etat === "témoin absent").length
    return {
      issue: "servi",
      constats,
      manquantes: [],
      temoins,
      dire:
        `Les ${constats.filter((c) => c.discriminant).length} routes prouvables sont dans le ` +
        `JavaScript servi (${temoins} jetons trouvés au total` +
        (muets > 0 ? `, ${muets} route(s) non discriminante(s) muette(s), ce qui ne décide rien` : "") +
        ").",
    }
  }

  return {
    issue: "en retard",
    constats,
    manquantes,
    temoins,
    dire:
      `Le site publié ne porte pas ce que \`main\` porte : ${manquantes.length} route(s) ` +
      `déclarée(s) dans src/App.tsx sont absentes du JavaScript servi, alors que ${temoins} ` +
      "autres jetons y sont — donc la mesure fonctionne. Le bundle servi est antérieur à une " +
      "fusion. Le déploiement appartient à Lovable ; ce bras dit qu'il n'a pas eu lieu, jamais " +
      "pourquoi.",
  }
}
