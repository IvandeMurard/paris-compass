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
//   - **A SHORT new label still slips through.** Labels shorter than `LONGUEUR_MINIMALE` — 12
//     characters, a measured number — are witnesses only, because at that length a string occurs
//     incidentally in minified code: `Map` appears 91 times in the served bundle, `Data` 92. That
//     costs 69 of the 258 labels: a stale bundle whose only novelty is « Aucune » or « Retry »
//     passes. Lowering the threshold would trade a missed staleness for a false red, and a false
//     red is the one a session switches off.
//   - It is blind to what leaves no literal at all: an internal logic fix, a style correction, a
//     change creating no new string. No bundle inspection will ever see those, whatever the
//     population.
//   - **It only knows what `src/App.tsx` and `src/i18n/ui.ts` declare.** A user-facing string
//     written straight into a component — not routed through `UI` — is invisible here. That is
//     also an argument for putting it in `UI`.
//
// ── The limit this arm used to carry, kept because it explains the shape ──────────────────
//
// Until #152 the population was the route table ALONE, and the header said the arm was "blind to
// anything leaving no literal text in a minified bundle" — which reads as though any new literal
// would be caught. It would not, and the day proved it: `#145` added `source injoignable` to the
// screen, merged, production kept serving the old bundle, and this arm stayed GREEN because the
// change added no route. A visitor still read an outage as « Aucun dans 1 km ».
//
// What that episode settled is HOW to widen, not just that one should. A hand-kept list of
// expected strings was refused — `#134` objects to exactly that elsewhere here, and such a list
// rots the first time a copy is reworded, producing a red with no defect behind it. The
// population had to be DERIVED, like the routes. `src/i18n/ui.ts` already holds every
// user-facing string in one typed table, so it became the second population and nothing is
// maintained by hand.

import { UI } from "../../src/i18n/ui"

import { prefixOf, readRoutes, type RouteDeclaration } from "./sitemap"

/** Which derived population a token came from. Both are derived; neither is a hand-kept list. */
export type Origine = "route" | "libellé"

/** One thing the repository declares, reduced to the literal a production bundle must carry. */
export interface Jeton {
  /** What this token identifies: a route path, or an i18n key with its locale. */
  nom: string
  origine: Origine
  /** The string searched for: a path, a parameterised route's fixed prefix, or a UI label. */
  jeton: string
  /**
   * False when the token cannot prove its own presence — another token contains it, or it is
   * short enough to occur incidentally in minified code. Such a token stays a WITNESS and never
   * makes the arm red: its presence cannot be told apart from an accident.
   */
  discriminant: boolean
}

/**
 * Below this length a UI label proves nothing, and the number comes from a measurement — #152.
 *
 * Counted in the 623 736 octets served on 13 September 2026. `Map` occurs **91** times (the
 * `Map` constructor), `Data` **92** (inside `Dataset` and friends), `Retry` 15, `Reset` 11.
 * Finding them says nothing about the UI table. By length band, strings occurring more than
 * twice:
 *
 *     longueur < 6   :  7 sur 13
 *     longueur < 12  : 24 sur 69
 *     longueur >= 12 :  1 sur 177   (« Arrondissement », qui est aussi un nom de composant)
 *
 * Twelve is where the noise stops, so twelve is the threshold. It is not a taste, and it is not
 * round for comfort — it is the point the measurement puts it at, and re-measuring is how it
 * moves.
 *
 * **What it costs**: 69 labels of the 258 never turn the arm red. A stale bundle missing only a
 * short new label — « Aucune », « Retry » — passes. That is written in the header's limits.
 */
export const LONGUEUR_MINIMALE = 12

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

/**
 * Everything the repository declares and a current bundle must therefore carry.
 *
 * **Two derived populations, and not one hand-kept list** — that is the whole point of #152.
 * Routes come from `src/App.tsx` the way `sitemap.ts` already reads them; labels come from the
 * `UI` table itself, which already holds every user-facing string in one typed place. Nothing
 * here is written by hand, so nothing here rots when a copy changes: rename a label and the
 * population renames itself.
 *
 * Measured on 13 September 2026 before being built: **256 of the 258 UI strings** were in the
 * served bundle, and the two absent were exactly the two `#145` had just added. A hundred-percent
 * expectation is therefore realistic, and no sampling is needed.
 */
export function jetonsAttendus(appSource: string, ui: typeof UI = UI): Jeton[] {
  const bruts: Omit<Jeton, "discriminant">[] = []

  const routes: RouteDeclaration[] = readRoutes(appSource)
  for (const r of routes) {
    const jeton = jetonDeRoute(r.path)
    if (jeton === null) continue
    if (bruts.some((b) => b.jeton === jeton)) continue
    bruts.push({ nom: r.path, origine: "route", jeton })
  }

  for (const [cle, valeurs] of Object.entries(ui)) {
    for (const langue of ["fr", "en"] as const) {
      const jeton = valeurs[langue]
      if (!jeton || bruts.some((b) => b.jeton === jeton)) continue
      bruts.push({ nom: `${cle} [${langue}]`, origine: "libellé", jeton })
    }
  }

  return bruts.map((b) => ({
    ...b,
    discriminant:
      b.jeton.length >= (b.origine === "libellé" ? LONGUEUR_MINIMALE : 1) &&
      !bruts.some((autre) => autre.jeton !== b.jeton && autre.jeton.includes(b.jeton)),
  }))
}

export interface Dispense {
  nom: string
  raison: string
  mesureLe: string
}

export type EtatServi = "servi" | "absent" | "témoin absent"

export interface Constat {
  nom: string
  /** Carried through so a red can name the file to open, rather than a word covering both. */
  origine: Origine
  jeton: string
  discriminant: boolean
  occurrences: number
  etat: EtatServi
}

export type Issue = "servi" | "en retard" | "mesure cassée"

export interface VerdictServi {
  issue: Issue
  constats: Constat[]
  /** Discriminating routes the served bundles do not carry. Empty unless `issue` is `en retard`. */
  manquantes: Constat[]
  /** How many tokens were found at all — the instrument's own proof of life. */
  temoins: number
  dire: string
}

function occurrences(botte: string, aiguille: string): number {
  return botte.split(aiguille).length - 1
}

/**
 * Names what is missing by where it was declared, not by a single word covering both.
 *
 * A red saying « 2 routes absentes » when the two are UI labels sends the reader to
 * `src/App.tsx` and wastes the first minute of the repair. The populations are derived from two
 * different files, so the message says which.
 */
function decompte(constats: readonly Constat[]): string {
  const routes = constats.filter((c) => c.origine === "route").length
  const libelles = constats.length - routes
  const parts: string[] = []
  if (routes > 0) parts.push(`route(s) de src/App.tsx`)
  if (libelles > 0) parts.push(`libellé(s) de src/i18n/ui.ts`)
  return parts.join(" et ")
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
  const dispensees = new Set(dispenses.map((d) => d.nom))

  const constats: Constat[] = jetons.map((j) => {
    const n = occurrences(js, j.jeton)
    const etat: EtatServi = n > 0 ? "servi" : j.discriminant ? "absent" : "témoin absent"
    return {
      nom: j.nom,
      origine: j.origine,
      jeton: j.jeton,
      discriminant: j.discriminant,
      occurrences: n,
      etat,
    }
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

  const manquantes = constats.filter((c) => c.etat === "absent" && !dispensees.has(c.nom))

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
      `Le site publié ne porte pas ce que \`main\` porte : ${manquantes.length} ` +
      `${decompte(manquantes)} absent(s) du JavaScript servi, alors que ${temoins} autres jetons ` +
      "y sont — donc la mesure fonctionne. Le bundle servi est antérieur à une fusion. Le " +
      "déploiement appartient à Lovable ; ce bras dit qu'il n'a pas eu lieu, jamais pourquoi.",
  }
}
