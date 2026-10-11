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
//   - **A SHORT new string still slips through.** Strings shorter than `LONGUEUR_MINIMALE` — 12
//     characters, a measured number — are witnesses only, because at that length a string occurs
//     incidentally in minified code: `Map` appears 91 times in the served bundle, `Data` 92.
//     Re-counted on 17 September 2026 on the widened population: **225 of the 1 168 tokens** are
//     witnesses for being short, so a stale bundle whose only novelty is « Aucune » or « Retry »
//     passes. Lowering the threshold would trade a missed staleness for a false red, and a false
//     red is the one a session switches off.
//   - **A string QUOTED inside a longer one stops deciding**, and widening made that worse
//     rather than better: **59 tokens of the 1 168** are witnesses for containment, against a
//     handful before. The clearest casualty is `source injoignable` — the very string of #145
//     that caused this arm to be widened once already — now quoted inside a sentence of
//     `src/pages/Methodology.tsx`. The net is still strongly positive, and it is measured: 223
//     deciding tokens before #217, **869** after.
//   - **An interpolated template is invisible.** The bundle carries the fragments and the join,
//     never the assembled sentence, so searching for the whole would be a red that means
//     nothing. Twenty are skipped on 17 September 2026, and the arm prints the count rather than
//     dropping them in silence.
//   - It is blind to what leaves no literal at all: an internal logic fix, a style correction, a
//     change creating no new string. No bundle inspection will ever see those, whatever the
//     population. **This is not a delivery check and must not be read as one** — it sees the
//     class of change that leaves text, which is most of them, and nothing of the rest.
//   - **It knows what the product renders in one of its two languages, and nothing else.** Until
//     #217 that meant `src/App.tsx` and `src/i18n/ui.ts` alone, which left out every prose table
//     a later block brought with it — 307 strings against 360, measured on 17 September 2026.
//     The population is now derived by `./prose.ts`: reachable from `src/main.tsx`, chosen by
//     locale. A string written straight into JSX, outside any locale-keyed table, is still
//     invisible here — and that is still an argument for the table.
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
//
// ── And the limit #152 left behind, closed by #217 ────────────────────────────────────────
//
// `ui.ts` is not the only table. Seven deliveries in a row added a block to an existing page —
// no route, no `UI` label, and therefore nothing this arm could miss. The second population is
// now every string the product CHOOSES BY LOCALE in a module reachable from `src/main.tsx`,
// derived in `./prose.ts`, which subsumes `ui.ts` without ever naming it. Same discipline, one
// reach further: the question is what makes a string enter, never which file holds it.

import { prefixOf, readRoutes, type RouteDeclaration } from "./sitemap"
import { proseDuDepot, type BrinProse } from "./prose"

/** Which derived population a token came from. Both are derived; neither is a hand-kept list. */
export type Origine = "route" | "prose"

/** One thing the repository declares, reduced to the literal a production bundle must carry. */
export interface Jeton {
  /** What this token identifies: a route path, or a module and the key path under it. */
  nom: string
  origine: Origine
  /**
   * The module that declares it, so a red names the file to open rather than a category.
   * `null` for a route, which is declared by the route table and nowhere else.
   */
  fichier: string | null
  /** The string searched for: a path, a parameterised route's fixed prefix, or a rendered string. */
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
 *
 * **#217 left it at twelve on purpose.** Widening the population was the answer to the seven
 * deliveries in the hold; lowering the threshold would have traded a missed staleness for a
 * false red, and a false red is the one a session switches off. The number moves when somebody
 * re-counts the noise, and only then.
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
 *
 * Re-measured on 17 September 2026 against the widened population of #217, on the 1 247 018
 * octets a build of `main` emits: **920 distinct tokens, 920 present**. The expectation holds at
 * the new size, which is the only reason a missing one can be read as « not deployed ».
 */
export function jetonsAttendus(appSource: string, prose: readonly BrinProse[] = proseDuDepot().brins): Jeton[] {
  const bruts: Omit<Jeton, "discriminant">[] = []

  const routes: RouteDeclaration[] = readRoutes(appSource)
  for (const r of routes) {
    const jeton = jetonDeRoute(r.path)
    if (jeton === null) continue
    if (bruts.some((b) => b.jeton === jeton)) continue
    bruts.push({ nom: r.path, origine: "route", fichier: null, jeton })
  }

  // Deduplicated on the STRING, not on the key: two modules wording a label identically leave one
  // literal in the bundle, and counting it twice would inflate the population without adding a
  // thing the measurement can tell apart. First declaration seen keeps the naming.
  const vus = new Set(bruts.map((b) => b.jeton))
  for (const brin of prose) {
    if (brin.valeur === "" || vus.has(brin.valeur)) continue
    vus.add(brin.valeur)
    bruts.push({
      nom: `${brin.fichier} · ${brin.cle}`,
      origine: "prose",
      fichier: brin.fichier,
      jeton: brin.valeur,
    })
  }

  return bruts.map((b) => ({
    ...b,
    discriminant:
      b.jeton.length >= (b.origine === "prose" ? LONGUEUR_MINIMALE : 1) &&
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
  /** The declaring module, `null` for a route. What a red prints so the repair starts there. */
  fichier: string | null
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
 * Names what is missing by the FILE that declares it, not by a category covering everything.
 *
 * A red saying « 2 routes absentes » when the two are labels sends the reader to `src/App.tsx`
 * and wastes the first minute of the repair. Since #217 the prose side spans a dozen modules, so
 * naming « libellé » would waste the same minute one level up: the count is broken down by
 * module, heaviest first, and that breakdown IS the diagnosis — a red concentrated on
 * `rythmeText.ts` says which merge is in the hold.
 */
export function decompte(constats: readonly Constat[]): string {
  const parFichier = new Map<string, number>()
  for (const c of constats) {
    const ou = c.fichier ?? "src/App.tsx"
    parFichier.set(ou, (parFichier.get(ou) ?? 0) + 1)
  }
  return [...parFichier]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([fichier, n]) => `${n} dans ${fichier}`)
    .join(", ")
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
      fichier: j.fichier,
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
        `Aucun des ${constats.length} jetons connus n'est dans le JavaScript lu — y compris ` +
        "ceux qui précèdent de plusieurs semaines toute publication récente. Un build ne rend " +
        "pas ça. L'instrument a lu autre chose que le bundle applicatif : suivre les morceaux à " +
        "la demande, transitivement, pas seulement ceux que l'entrée nomme. Rien n'est jugé.",
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
        `Les ${constats.filter((c) => c.discriminant).length} jetons prouvables sont dans le ` +
        `JavaScript servi (${temoins} jetons trouvés au total` +
        (muets > 0 ? `, ${muets} jeton(s) non discriminant(s) muet(s), ce qui ne décide rien` : "") +
        ").",
    }
  }

  return {
    issue: "en retard",
    constats,
    manquantes,
    temoins,
    dire:
      `Le site publié ne porte pas ce que \`main\` porte : ${manquantes.length} jeton(s) ` +
      `absent(s) du JavaScript servi — ${decompte(manquantes)} — alors que ${temoins} autres ` +
      "jetons y sont, donc la mesure fonctionne. Le bundle servi est antérieur à une fusion. Le " +
      "déploiement appartient à Lovable ; ce bras dit qu'il n'a pas eu lieu, jamais pourquoi.",
  }
}
