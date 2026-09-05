// Arm E — the anon window budget, at the maximum radius the product promises.
//
// Why this arm exists. `compass_premises_within` spent 70 % of the anon statement window at
// 2 000 m (issue #62) and nothing in the gate said so: arms A to D check what a function
// answers, never what it costs to answer. A function that is right and too slow is, for a
// visitor, a map that does not appear — and the gate that was supposed to catch it instead
// caught its own timeouts and called them licence failures (DIAGNOSTIC.md §18).
//
// What it measures, and why two numbers rather than one:
//
//   ms    — the statement's execution time at `compass_max_radius_m()`, against a declared
//           fraction of the anon window. The window is READ from pg_roles rather than copied
//           here: a budget that quietly disagrees with the setting it protects is worse than
//           no budget. The FASTEST of three runs, because the first one on a sleeping
//           instance measures the cache and not the query.
//   pages — buffers touched. Cache-independent: it is the work to be done, and the cache only
//           decides the price of each page. The HEAVIEST of three, because the file records a
//           ceiling and a ceiling taken from a lucky plan is not a ceiling.
//
// WHAT BLOCKS AND WHAT ONLY SPEAKS, because this is the whole point. DIAGNOSTIC.md §18 says
// it plainly: "une porte dont le verdict dépend de la température du cache est une porte qui
// apprendra un jour à être ignorée." So nothing here fails on a clock:
//
//   FAIL  a radius function anon may call with no line in the baseline file. This is the part
//         that protects the function nobody has written yet.
//   FAIL  a line in the file whose declared ms is above the ceiling. The promise is enforced
//         where it is made — at the moment someone writes the budget down — not at the moment
//         a run happens to be slow.
//   FAIL  measured pages more than 10 % ABOVE the declared ceiling. The work grew. Below it,
//         nothing fails: a plan that came out cheaper is not a regression.
//   WARN  measured ms above the ceiling while the pages hold. The work did not change, so
//         this is a cold instance or a loaded machine, and the arm says which rather than
//         calling it a regression.
//   WARN  measured pages far under the ceiling, which says the ceiling has gone stale.
//
// PAGES ARE THE WORK, BUT THE EQUIVALENCE ONLY RUNS ONE WAY. Measured 2026-08-28 (#65):
// forced into a hash join, `compass_bodacc_within` touches 57 % FEWER pages and takes 3.6
// times LONGER — building a hash table is CPU no page count sees. So MORE pages is still a
// regression and still the only thing this arm blocks on; FEWER pages is NOT proof of an
// improvement, and a performance fix is not judged on this arm alone. The arm also SEES a plan
// flip without saying which way it should have flipped: at 2 000 m the nested loop and the hash
// join are within 0.3 % of each other in the planner's cost model. And the cell measured here —
// Chatelet at the MAXIMUM radius — is not the one the product serves most: the default is 800 m
// (AMENITY_RADIUS_M) and find_premises caps at 500 m. Full statement in eval/FAILURE_MODES.md,
// measurements in DIAGNOSTIC.md §29.
//
// The population is ENUMERATED from pg_proc — every `compass_*` function that takes
// `p_radius_m` and that `anon` may execute — the same mechanic as I24 for the licence rule:
// the list is not kept by hand, so it cannot be forgotten. Every other parameter is left to
// its default, which is how a new function joins the arm without a line of code changing here.

import { readFileSync } from "fs"
import { resolve } from "path"

import type { Client } from "pg"

const ROOT = resolve(import.meta.dirname, "../..")

/**
 * Beyond this much MORE work than declared, the query has changed, not the measurement.
 *
 * The budget is a ceiling, not an equality, and that asymmetry is deliberate. `pages` in the
 * baseline is the most a function may touch; a run that touches fewer has not regressed. The
 * symmetric version of this check failed `compass_scoring_context_within` at -24.9 % on the
 * first day, on a plan that had simply come out cheaper — which is the arm crying wolf about
 * good news.
 */
const PAGES_OVER_FAIL = 0.1

/**
 * Far enough below the ceiling for long enough and the ceiling is fiction. Loose on purpose.
 *
 * The looseness used to be justified by a swing this file called a plan flip: the two
 * functions returning a whole radius came back at 103 278 or 137 576 pages, 152 012 or
 * 286 744. That reasoning is retired — the swing was the plpgsql plan cache handing out a
 * custom plan or a generic one (see anon-budget.json, `plan_cache`), production always took
 * the expensive one, and since 20260828000003 the two agree to within 25 pages. What is left
 * to absorb is ordinary run-to-run drift: `compass_premises_within` moves between 92 129 and
 * 94 117 pages, 2 %, and `compass_bodacc_within` about as much. 0.4 is far wider than that
 * needs, deliberately — this threshold only says a ceiling has gone stale, and a warning
 * that fires on noise is a warning nobody reads.
 */
const PAGES_UNDER_WARN = 0.4

interface BudgetFile {
  measured_on: string
  target: string
  note: string
  /** Share of the anon statement window one call at the maximum radius may spend. */
  window_fraction: number
  point: { label: string; lat: number; lng: number }
  functions: Record<string, { pages: number; ms: number; note: string }>
}

export interface BudgetOutcome {
  passes: [what: string, detail: string][]
  warnings: [what: string, detail: string][]
  failures: [what: string, detail: string][]
  header: string
}

/**
 * Reads a `statement_timeout` setting as Postgres reads it: `3s`, `8s`, `250ms`, or a bare
 * number, which means milliseconds. Its own function because the arm's whole budget is
 * derived from it, and getting the unit wrong by a factor of a thousand would produce a
 * ceiling nobody could ever breach — a gate that is always green, which is the worst kind.
 */
export function parseWindowMs(raw: string | null | undefined): number {
  const parsed = raw ? /^\s*([0-9]+)\s*(us|ms|s|min|h)?\s*$/.exec(raw) : null
  if (!parsed) {
    throw new Error(
      `le rôle anon ne porte pas de statement_timeout lisible dans pg_roles (${raw ?? "absent"}) : ` +
        "la fenêtre que cette porte mesure n'existe plus, et un budget contre une fenêtre absente " +
        "ne veut rien dire.",
    )
  }
  const value = Number(parsed[1])
  switch (parsed[2]) {
    case "us": return value / 1000
    case "s": return value * 1000
    case "min": return value * 60_000
    case "h": return value * 3_600_000
    default: return value // no unit means milliseconds
  }
}

/**
 * The verdict for one function, kept away from the database so a test can point at it.
 *
 * Reading it is the fastest way to see what this arm does and does not block on: nothing
 * fails because a run was slow. `declared` is what the repository promises, `measured` what
 * this run saw.
 */
export function budgetVerdict(
  declared: { pages: number; ms: number },
  measured: Measurement | null,
  ceilingMs: number,
  overFail = PAGES_OVER_FAIL,
): { level: "ok" | "warn" | "fail"; detail: string } {
  if (declared.ms > ceilingMs) {
    return {
      level: "fail",
      detail:
        `budget déclaré à ${declared.ms} ms, au-dessus du plafond de ${ceilingMs} ms — ` +
        "une fonction ne peut pas être inscrite au-dessus de la fenêtre qu'elle doit tenir",
    }
  }
  if (!measured) return { level: "ok", detail: `budget déclaré ${declared.ms} ms, ${declared.pages} pages` }

  const ratio = measured.pages / Math.max(declared.pages, 1)
  const signed = (ratio - 1) * 100
  const detail =
    `${measured.ms} ms / ${ceilingMs}, ${measured.pages} pages ` +
    `(plafond ${declared.pages}, ${signed >= 0 ? "+" : ""}${signed.toFixed(1)} %)`

  // The only thing worth blocking on: the work grew. A sixth join, a lost index, a plan that
  // flipped the wrong way — none of which the clock would show on a fast machine, and all of
  // which a visitor pays for on a slow one.
  if (ratio > 1 + overFail) {
    return {
      level: "fail",
      detail: `${detail} — au-dessus du plafond de pages de plus de ${overFail * 100} %`,
    }
  }
  if (measured.ms > ceilingMs) {
    return {
      level: "warn",
      detail:
        `${detail} — au-dessus du plafond de temps, mais les pages tiennent : instance froide ` +
        "ou machine chargée, pas une régression. Rejouer avant de conclure.",
    }
  }
  if (ratio < PAGES_UNDER_WARN) {
    return {
      level: "warn",
      detail: `${detail} — durablement sous son plafond : la référence est probablement périmée, remesurer et redater`,
    }
  }
  return { level: "ok", detail }
}

/** The anon statement window, in ms, read from the role that carries it. */
async function anonWindowMs(client: Client): Promise<number> {
  const result = await client.query<{ setting: string | null }>(
    `select (regexp_match(array_to_string(rolconfig, ','), 'statement_timeout=([^,]+)'))[1] as setting
       from pg_roles where rolname = 'anon'`,
  )
  return parseWindowMs(result.rows[0]?.setting?.trim())
}

/** Functions anon may call with a radius — enumerated, never listed by hand. */
async function radiusFunctions(client: Client): Promise<string[]> {
  const result = await client.query<{ proname: string }>(
    `select distinct p.proname
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname like 'compass\\_%'
        and 'p_radius_m' = any(p.proargnames)
        -- Et qui rendent quelque chose a lire. Ce bras explique un select sur la fonction :
        -- une fonction qui rend void n'a rien a selectionner, et son cout n'est pas celui
        -- d'une carte qui n'apparait pas. Ajoute le 5 septembre 2026 avec
        -- compass_record_question (#72), qui prend un rayon pour le RANGER EN TRANCHE et ne
        -- s'en sert jamais pour choisir des lignes : l'inscrire ici aurait produit un budget
        -- mesure sur des arguments nuls, c'est-a-dire un vert qui ne dit rien — « la pire
        -- espece de porte », selon l'en-tete de ce fichier.
        and p.prorettype <> 'void'::regtype
        and has_function_privilege('anon', p.oid, 'execute')
      order by 1`,
  )
  return result.rows.map((r) => r.proname)
}

interface Measurement {
  ms: number
  pages: number
}

/**
 * One function at the maximum radius, under the anon claim.
 *
 * The claim matters: every one of these functions answers a withheld vintage with a single
 * marker row, so measuring them privileged would measure a path no visitor takes. `timing off`
 * keeps per-node instrumentation from inflating what is being judged; the total execution time
 * is still measured. Impersonation is transaction-local, like arm A's.
 *
 * PARALLELISM IS TURNED OFF so the number is reproducible. How many workers actually launch
 * depends on what else the server is doing that second, and each worker descends the same
 * btree, so the count moves with the machine's mood rather than with the query. Measured on
 * `compass_premises_within` at 2 000 m: 94 117 pages with two workers allowed, 94 065 with
 * none. Small — and the point is that it is not zero, and not under anyone's control.
 *
 * THE FUNCTION IS CALLED, NEVER ITS BODY, and that is not a convenience. These are plpgsql
 * functions: their statements go through the plan cache, and the plan production actually
 * gets is the GENERIC one. Lifting a body out into a bare SQL statement to explain it — the
 * obvious way to see inside a plpgsql black box — plans it CUSTOM, and measured 2026-08-28
 * that understated `compass_street_rotation` by a factor of two (151 778 pages against the
 * 286 710 a visitor paid). To read the plan inside one of these, prepare the body as a
 * statement, execute it five times so the cache switches to generic, then explain the sixth.
 *
 * It is NOT the explanation for the one large swing seen so far. Minutes after the covering
 * index of 20260828000001 was built, the same call counted 80 417 pages; every one of the six
 * passes since has counted 94 065 exactly. Stale statistics on a freshly built index is the
 * plausible cause and it has not been demonstrated — so the honest form is: this arm can go
 * red on the run that immediately follows an index rebuild, and the answer then is to
 * re-measure and redate the baseline, not to widen the threshold.
 */
async function measure(client: Client, proname: string, radius: number, point: BudgetFile["point"]): Promise<Measurement> {
  // Best clock, worst pages — the two are read for opposite reasons. The fastest run is the
  // one least polluted by a cold cache; the heaviest is the one that says what this function
  // can cost, and a ceiling taken from a lucky plan is not a ceiling.
  let ms = Number.POSITIVE_INFINITY
  let pages = 0
  for (let run = 0; run < 3; run += 1) {
    await client.query("begin")
    await client.query("set local max_parallel_workers_per_gather = 0")
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: "anon" })])
    const explained = await client.query<{ "QUERY PLAN": [{ Plan: Record<string, number>; "Execution Time": number }] }>(
      `explain (analyze, buffers, timing off, format json)
       select * from public.${proname}(p_lat => $1, p_lng => $2, p_radius_m => $3)`,
      [point.lat, point.lng, radius],
    )
    await client.query("rollback")
    const plan = explained.rows[0]["QUERY PLAN"][0]
    ms = Math.min(ms, Math.round(plan["Execution Time"]))
    pages = Math.max(pages, (plan.Plan["Shared Hit Blocks"] ?? 0) + (plan.Plan["Shared Read Blocks"] ?? 0))
  }
  return { ms, pages }
}

export async function runBudget(client: Client): Promise<BudgetOutcome> {
  const budget = JSON.parse(
    readFileSync(resolve(ROOT, "eval/baselines/anon-budget.json"), "utf8"),
  ) as BudgetFile

  const windowMs = await anonWindowMs(client)
  const ceilingMs = Math.round(windowMs * budget.window_fraction)
  const radius = Number(
    (await client.query<{ r: string }>("select public.compass_max_radius_m() as r")).rows[0].r,
  )

  const outcome: BudgetOutcome = {
    passes: [],
    warnings: [],
    failures: [],
    header:
      `fenêtre anon ${windowMs} ms lue dans pg_roles, plafond ${ceilingMs} ms ` +
      `(${Math.round(budget.window_fraction * 100)} %) à ${radius} m sur ${budget.point.label}`,
  }

  const present = await radiusFunctions(client)

  // A baseline entry whose function is gone, or which anon may no longer call, is a budget
  // guarding nothing — and a stale line is how a file stops being read.
  for (const declared of Object.keys(budget.functions)) {
    if (!present.includes(declared)) {
      outcome.failures.push([declared, "budget déclaré pour une fonction que anon n'appelle plus — ligne périmée"])
    }
  }

  for (const proname of present) {
    const expected = budget.functions[proname]
    if (!expected) {
      // The point of the arm. A new radius function reaches anon with no budget declared,
      // and the gate says so before a visitor discovers it as a map that never loads.
      outcome.failures.push([
        proname,
        `budget non déclaré — mesurer à ${radius} m et inscrire la ligne dans eval/baselines/anon-budget.json`,
      ])
      continue
    }

    // A line committed above the ceiling is judged before anything is run, so the query is
    // not even played: the promise is broken on paper.
    const measured = expected.ms > ceilingMs ? null : await measure(client, proname, radius, budget.point)
    const verdict = budgetVerdict(expected, measured, ceilingMs)
    const channel =
      verdict.level === "fail" ? outcome.failures : verdict.level === "warn" ? outcome.warnings : outcome.passes
    channel.push([proname, verdict.detail])
  }

  return outcome
}
