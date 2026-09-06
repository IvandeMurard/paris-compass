// Arm D of the gate: the licence rule as a real anonymous visitor sees it.
//
//   npm.cmd run eval:anon
//
// Arm A impersonates `anon` by setting `request.jwt.claims` on a privileged
// connection and never issues `set local role anon`. That exercises the test the
// functions make on the claim — it does not exercise the RLS policy underneath,
// nor PostgREST's serialisation of the `withheld` column. Both were assumed for
// a week and neither had been played until 2026-08-24.
//
// This arm holds no database credentials at all: the publishable key and the
// project URL, exactly what ships in the browser bundle. If it passes, the claim
// "a visitor without a key gets withheld, not zero" is demonstrated rather than
// argued.
//
// It covers the six functions that traverse premise_observation:
// compass_premises_within, compass_scoring_context_within (both since
// 2026-08-24) and compass_premise_history (since 20260824000001, which this arm
// is what found), plus compass_street_rotation and compass_survival_by_trade
// since 20260825000014, and compass_address_timeline since 20260826000001 —
// which is also where this arm started reading a SENTENCE and not only a column.
//
// The list is no longer the thing that decides what is covered: I24 in
// eval/invariants.sql enumerates the population from pg_proc and fails if a
// function is missing an `@as anon` test — w0-retenue (#57). This arm is the
// stronger half of that coverage where it exists, because it is the only one
// running behind a real RLS policy.
//
// Exit codes follow the runner's convention: 0 PASS, 1 FAIL, 2 ERROR, 3 not green and not
// a failure — scripts/eval/run.ts already uses 3 for a deviation below the blocking
// threshold, and #61 is what gave this arm one.
//
// #61 — why a red run is no longer proof of anything by itself. `anon` runs under
// `statement_timeout = 3s` (measured 2026-08-27 in pg_roles.rolconfig on
// dbefhvmyfmmhjeetdddu; DIAGNOSTIC.md §18 inferred that window without naming it). On a
// cold instance a control can exceed it, Postgres cancels with `57014`, PostgREST answers
// 500, and until this ticket that arrived as `ERREUR` or as `NaN relevés visibles` — the
// exact shape a licence leak would take. It happened on 25 August, cleared itself on the
// 26th, and came back the same evening. A cancellation is now recorded as *suspendu*, and
// the run exits 3: a leak has never announced itself by taking too long.
//
// Two things were done, and only one of them is the fix:
//
//   1. The RLS control was keyed by vintage. One unkeyed count over 228 275 rows
//      (9 033 buffers, 1 605 ms on a session's first call) became three Index Only Scans
//      of 143 + 141 + 187 buffers. The exact equality is kept — see licence-counts.ts.
//   2. Cancellations are classified rather than reported as failures. This is the part
//      that matters, because measurement says the count was never the worst statement
//      here: `premises_within 2023, 800 m` costs 34 729 buffers, 3.8× the old count, and
//      it is the control that died FIRST on 26 August. No rewriting of the licence
//      controls can make the gate cold-proof while it must read a real radius over real
//      data — so the gate stops pretending it can decide when the database would not
//      answer.

import { existsSync } from "fs"
import { resolve } from "path"

import { expectationHolds, licenceVerdict, type VintageFact } from "./licence-counts"
import {
  ANON_STATEMENT_TIMEOUT_MS,
  classify,
  isUnreachable,
  QUERY_CANCELED,
  unreachableCode,
  UpstreamTimeout,
} from "./upstream"

const ENV_FILE = resolve(import.meta.dirname, "../../.env.local")
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)

const BASE = process.env.VITE_SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Chatelet — intra-muros, dense, and the point invariants I12–I15 already use. */
const LAT = 48.8566
const LNG = 2.3522

let failures = 0
let greens = 0
const suspended: string[] = []

/**
 * The most expensive SINGLE request of the run, which is the number that matters: the
 * budget of #61 is a per-statement timeout, so summing a control that makes four calls
 * would overstate how close the gate is standing to the edge.
 */
let slowest = { what: "—", ms: 0 }

const out = (s: string): void => void process.stdout.write(s + "\n")
const pass = (what: string, detail: string): void => {
  greens += 1
  out(`  ok    ${what} — ${detail}`)
}
const fail = (what: string, detail: string): void => {
  failures += 1
  out(`  FAIL  ${what} — ${detail}`)
}
const suspend = (what: string, detail: string): void => {
  suspended.push(what)
  out(`  ....  ${what} — suspendu : ${detail}`)
}

/**
 * Runs one control, catching the cancellation and nothing else.
 *
 * A suspended control is neither green nor red and never counts as either. Anything else
 * thrown still ends the run at exit 2 — a gate that swallowed unknown errors would be the
 * mistake #61 is about, one layer further in.
 */
async function control(label: string, body: (label: string) => Promise<void>): Promise<void> {
  try {
    await body(label)
  } catch (error) {
    if (!(error instanceof UpstreamTimeout)) throw error
    suspend(label, error.message)
  }
}

/**
 * One HTTP call, timed. Every request of this arm goes through here.
 *
 * ET AUCUNE N'EST COMPTÉE DANS LE JOURNAL D'USAGE — w1-observabilite (#72). Ce bras appelle
 * avec la vraie clé publiable, donc ses appels COMMITENT : sans cet en-tête, `question_tally`
 * enregistrerait quinze questions par matin, toujours au même point, et le quartier le plus
 * demandé du produit serait celui que la porte interroge. Mesuré le 5 septembre 2026 : dix
 * seaux écrits sur un produit sans aucun trafic. L'en-tête est déclaratif et se pose ici, à
 * l'endroit unique par lequel ce bras passe.
 *
 * CE FICHIER EST DANS UNE POPULATION DEPUIS w1-observabilite-echappement (#81), et la phrase
 * qui tenait ici — « un second chemin qui l'oublierait se compterait de nouveau, et rien ne
 * pourrait le voir » — n'est plus vraie qu'à moitié. Elle reste vraie À L'EXÉCUTION : un appel
 * non journalisé ne laisse aucune trace. Elle est fausse À LA DÉCLARATION :
 * `scripts/porte/observabilite.ts` énumère les fichiers qui atteignent PostgREST et fait
 * échouer `test` sur celui qui ne pose ni l'en-tête ni une raison écrite. Ce que ça ne
 * rattrape toujours pas, et c'est précisément le cas d'un SECOND chemin dans CE fichier : la
 * règle vérifie que le fichier déclare l'échappement, jamais qu'il l'applique à chaque appel.
 * D'où l'insistance sur l'endroit unique — elle porte tout ce que la règle ne porte pas.
 */
async function request(path: string, what: string, init?: RequestInit): Promise<Response> {
  const started = performance.now()
  const horsMesure: RequestInit = {
    ...init,
    headers: { ...(init?.headers as Record<string, string> | undefined), "x-compass-observabilite": "off" },
  }
  try {
    return await fetch(`${BASE}/rest/v1/${path}`, horsMesure)
  } finally {
    const ms = performance.now() - started
    if (ms > slowest.ms) slowest = { what, ms }
  }
}

interface Row {
  withheld?: boolean | null
  total_matched?: number | null
  lat?: number | null
  location_id?: number | null
}

interface HistoryRow {
  vintage_year: number
  withheld: boolean | null
  observed: boolean | null
  is_vacant: boolean | null
  activity_label: string | null
  [column: string]: unknown
}

async function rpc(fn: string, body: Record<string, unknown>): Promise<Row[]> {
  const response = await request(`rpc/${fn}`, fn, {
    method: "POST",
    headers: {
      apikey: KEY as string,
      Authorization: `Bearer ${KEY as string}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) throw classify(response.status, text, fn)
  return JSON.parse(text) as Row[]
}

/** A plain table read over the publishable key. Same classification as every other call. */
async function rpcGet(path: string, what: string): Promise<unknown[]> {
  const response = await request(path, what, {
    headers: { apikey: KEY as string, Authorization: `Bearer ${KEY as string}` },
  })
  const text = await response.text()
  if (!response.ok) throw classify(response.status, text, what)
  return JSON.parse(text) as unknown[]
}

/**
 * A direct table read, the only way to reach the RLS policy itself: every RPC above runs
 * SECURITY DEFINER and so answers on the function's own test, not on the policy. Returns
 * the exact count PostgREST puts in `content-range`.
 *
 * A missing `content-range` used to become `NaN` and be printed as a number of rows — the
 * 26 August run said "NaN relevés visibles, attendu 60845", which reads exactly like a
 * leak. An absent header is now an error, never a count.
 */
async function countExact(path: string, what: string): Promise<number> {
  const response = await request(path, what, {
    headers: {
      apikey: KEY as string,
      Authorization: `Bearer ${KEY as string}`,
      Prefer: "count=exact",
    },
  })
  const text = await response.text()
  if (!response.ok) throw classify(response.status, text, what)
  const range = response.headers.get("content-range")
  const total = Number(range?.split("/")[1])
  if (!range || !Number.isFinite(total))
    throw new Error(`${what} : réponse ${response.status} sans content-range exploitable (${range ?? "en-tête absent"})`)
  return total
}

/**
 * A withheld vintage: exactly one row, the marker set, and no content on it.
 *
 * `out_of_corpus` is not content and must not be read as a leak — DIAGNOSTIC.md §18,
 * left open on 25 August and settled here. 20260825000003 gave
 * compass_scoring_context_within a third answer, orthogonal to the licence: a point
 * outside the BDCom corpus is outside it whether the vintage is withheld or not, and
 * corpus membership comes from `quartier`, a table anon reads in full. This probe still
 * expected EVERY column to be null and so failed on `out_of_corpus: false` while the
 * function answered correctly.
 *
 * It is asserted rather than tolerated, and the direction matters: on a withheld row the
 * value must be exactly `false`. The licence test runs first by design in that migration
 * — answering "outside the zone" on a withheld vintage would disclose that the zone would
 * otherwise have answered — so `true` here would be a real defect, not a detail.
 */
const ORTHOGONAL_MARKERS: Record<string, unknown> = { withheld: true, out_of_corpus: false }

async function expectWithheld(fn: string, body: Record<string, unknown>, label: string) {
  const rows = await rpc(fn, body)
  if (rows.length === 0) return fail(label, "zéro ligne — la retenue est muette, le défaut est revenu")
  if (rows.length !== 1) return fail(label, `${rows.length} lignes, attendu 1`)
  if (rows[0].withheld !== true) return fail(label, `withheld = ${JSON.stringify(rows[0].withheld)}`)

  const row = rows[0] as Record<string, unknown>
  for (const [column, expected] of Object.entries(ORTHOGONAL_MARKERS)) {
    if (column in row && row[column] !== expected)
      return fail(label, `${column} = ${JSON.stringify(row[column])} sur une ligne retenue, attendu ${expected}`)
  }
  const leaked = Object.entries(row).filter(([k, v]) => !(k in ORTHOGONAL_MARKERS) && v !== null)
  if (leaked.length > 0) return fail(label, `contenu non nul sur une ligne retenue : ${JSON.stringify(leaked)}`)
  pass(label, "1 ligne, withheld = true, aucun contenu")
}

/** The redistributable vintage: real content, and the marker explicitly false. */
async function expectContent(fn: string, body: Record<string, unknown>, label: string) {
  const rows = await rpc(fn, body)
  if (rows.length === 0) return fail(label, "zéro ligne — le millésime ODbL ne sort pas")
  if (rows[0].withheld !== false) return fail(label, `withheld = ${JSON.stringify(rows[0].withheld)}, attendu false`)
  pass(label, `${rows.length} ligne(s), withheld = false, total_matched = ${rows[0].total_matched ?? "—"}`)
}

/**
 * Vintage-level metadata a withheld row keeps, as compass_address_timeline keeps
 * its source and licence: the year exists and its licence is public knowledge.
 * Everything else on that row must be null.
 */
const VINTAGE_COLUMNS = new Set(["vintage_year", "vintage_scope", "as_of", "withheld"])

/**
 * The fourth function carrying the licence rule, and the only one whose defect
 * was not a silence. It returns one row per vintage whether an observation was
 * found or not, so RLS removing the row does not remove the row from the ANSWER:
 * it left the defaults behind — `observed = false`, `is_vacant = false` — on a
 * premise that was surveyed and vacant. Measured on 54652 before 20260824000001.
 *
 * Arm A could never have caught this one. The old function did not read the claim
 * at all, so impersonating `anon` on a privileged connection returned the full
 * content and nothing looked wrong. Only a real key, with RLS behind it, showed
 * the fabricated row — which is the whole argument for this arm existing.
 */
async function expectHistory(locationId: number, label: string, observedIn2023: boolean) {
  const rows = (await rpc("compass_premise_history", { p_location_id: locationId })) as unknown as HistoryRow[]
  if (rows.length !== 3) return fail(label, `${rows.length} ligne(s), attendu 3 — une par millésime`)

  for (const year of [2017, 2020]) {
    const row = rows.find((r) => r.vintage_year === year)
    if (!row) return fail(label, `millésime ${year} absent de la réponse`)
    if (row.withheld !== true) return fail(label, `${year} : withheld = ${JSON.stringify(row.withheld)}`)
    if (row.observed !== null)
      return fail(label, `${year} : observed = ${JSON.stringify(row.observed)} — une retenue rendue comme un relevé`)
    if (row.is_vacant !== null)
      return fail(label, `${year} : is_vacant = ${JSON.stringify(row.is_vacant)} — une vacance fabriquée depuis une licence`)
    const leaked = Object.entries(row).filter(([k, v]) => !VINTAGE_COLUMNS.has(k) && v !== null)
    if (leaked.length > 0) return fail(label, `${year} : contenu sur une ligne retenue : ${JSON.stringify(leaked)}`)
  }

  // The counter-test lives inside the same call: the ODbL vintage must come
  // through, and an absence from it must stay readable as an absence.
  const odbl = rows.find((r) => r.vintage_year === 2023)
  if (!odbl) return fail(label, "millésime 2023 absent de la réponse")
  if (odbl.withheld !== false) return fail(label, `2023 : withheld = ${JSON.stringify(odbl.withheld)}, attendu false`)
  if (odbl.observed !== observedIn2023)
    return fail(label, `2023 : observed = ${JSON.stringify(odbl.observed)}, attendu ${observedIn2023}`)
  if (observedIn2023 && odbl.activity_label === null)
    return fail(label, "2023 : relevé mais sans libellé — retenue excessive")
  if (!observedIn2023 && odbl.is_vacant !== null)
    return fail(label, `2023 : non relevé mais is_vacant = ${JSON.stringify(odbl.is_vacant)} — une absence lue comme une occupation`)

  pass(
    label,
    observedIn2023
      ? `2017/2020 retenus sans rien affirmer, 2023 rendu (${odbl.activity_label})`
      : "2017/2020 retenus sans rien affirmer, 2023 non relevé et is_vacant nul",
  )
}

/** The counter-test: a genuinely empty radius must stay silent, never marked. */
async function expectSilence(fn: string, body: Record<string, unknown>, label: string) {
  const rows = await rpc(fn, body)
  if (rows.length !== 0) return fail(label, `${rows.length} ligne(s) — un vrai vide s'est mis à parler`)
  pass(label, "zéro ligne — un vrai vide reste un vrai vide")
}

interface RotationRow {
  vintage_year: number
  withheld: boolean
  street_segment_id: number | null
  premises: number | null
  changed_since_previous: number | null
  [column: string]: unknown
}

/**
 * The fifth function, and the one this arm could not have been spared.
 *
 * Before 20260825000014 it never read the claim, so arm A — which impersonates
 * `anon` on a privileged connection without `set local role` — saw the
 * privileged answer and nothing looked wrong. Only a real key, with RLS
 * underneath, showed 2017 and 2020 vanishing and `lag()` reporting
 * `changed_since_previous = 0` on 2023, where the privileged truth measured
 * 81 (DIAGNOSTIC.md §19, Halles centroid, 300 m, 2026-08-25).
 *
 * What the marker rows keep is vintage-level metadata compass_vintages() already
 * publishes to anon. What they must never carry is a segment: one marker row per
 * withheld vintage, never one per segment, or the answer discloses where the
 * withheld vintage has premises.
 */
async function expectRotation(label: string) {
  const rows = (await rpc("compass_street_rotation", {
    p_lat: 48.86229,
    p_lng: 2.3449,
    p_radius_m: 300,
  })) as unknown as RotationRow[]

  const withheld = rows.filter((r) => r.withheld === true)
  const disclosed = rows.filter((r) => r.withheld === false)

  if (withheld.length !== 2)
    return fail(label, `${withheld.length} ligne(s) marquée(s), attendu 2 — une par millésime retenu`)
  for (const row of withheld) {
    if (row.street_segment_id !== null)
      return fail(label, `${row.vintage_year} : un tronçon est nommé sur une ligne retenue`)
    const leaked = Object.entries(row).filter(
      ([k, v]) => !["vintage_year", "vintage_scope", "withheld"].includes(k) && v !== null,
    )
    if (leaked.length > 0)
      return fail(label, `${row.vintage_year} : contenu sur une ligne retenue : ${JSON.stringify(leaked)}`)
  }

  if (disclosed.length === 0) return fail(label, "le millésime ODbL ne sort pas — retenue excessive")
  const fabricated = disclosed.filter((r) => r.changed_since_previous !== null)
  if (fabricated.length > 0)
    return fail(
      label,
      `${fabricated.length} tronçon(s) affirment un taux de rotation calculé sur un millésime retenu`,
    )
  if (disclosed.some((r) => r.premises === null))
    return fail(label, "un tronçon rendu sans dénombrement — retenue excessive sur le millésime ODbL")

  pass(
    label,
    `2017/2020 marqués sans tronçon, ${disclosed.length} tronçons rendus sur 2023 et changed_since_previous nul, jamais 0`,
  )
}

interface SurvivalRow {
  source: string
  withheld: boolean
  cohort_n: number | null
  survived_n: number | null
  survival_rate: number | null
  evidence: string | null
  [column: string]: unknown
}

/**
 * The sixth, and the only one the census surfaced without a defect behind it: it
 * was written right and never played anonymously. I21 calls it on the privileged
 * path, for the observational doctrine, not for the licence.
 *
 * It is also the one case in this corpus where an anonymous caller receives a
 * real rate: SIRENE is Licence Ouverte v2, so the INSEE row must come through
 * complete while the BDCom row — whose cohort starts in a vintage we may not
 * redistribute — is withheld down to its cohort size. Measured 2026-08-25,
 * Halles, niv18 111: privileged 310 / 268 / 86.5 %, anonymous withheld;
 * SIRENE 185 / 102 / 55.1 % for both.
 */
async function expectSurvival(label: string) {
  const rows = (await rpc("compass_survival_by_trade", {
    p_lat: 48.86229,
    p_lng: 2.3449,
    p_activity_niv18: 111,
  })) as unknown as SurvivalRow[]

  const bdcom = rows.find((r) => r.source === "APUR BDCom")
  const sirene = rows.find((r) => r.source === "INSEE SIRENE")
  if (!bdcom) return fail(label, "le volet BDCom ne sort pas du tout — la retenue est muette")
  if (!sirene) return fail(label, "le volet SIRENE ne sort pas — retenue excessive sur de la Licence Ouverte")

  if (bdcom.withheld !== true) return fail(label, `BDCom : withheld = ${JSON.stringify(bdcom.withheld)}`)
  for (const column of ["cohort_n", "survived_n", "survival_rate"] as const)
    if (bdcom[column] !== null)
      return fail(label, `BDCom : ${column} = ${JSON.stringify(bdcom[column])} sur une ligne retenue`)

  if (sirene.withheld !== false) return fail(label, `SIRENE : withheld = ${JSON.stringify(sirene.withheld)}`)
  for (const column of ["cohort_n", "survived_n", "survival_rate"] as const)
    if (sirene[column] === null) return fail(label, `SIRENE : ${column} nul — retenue excessive`)
  if (!sirene.evidence || sirene.evidence.trim() === "")
    return fail(label, "SIRENE : un taux sans sa phrase de provenance")

  pass(
    label,
    `BDCom retenu sans effectif, SIRENE rendu ${sirene.survival_rate} % sur ${sirene.cohort_n} — le seul vrai taux public de ce corpus`,
  )
}

interface TimelineRow {
  occurred_on: string
  kind: string
  observed: boolean | null
  withheld: boolean
  evidence: string | null
  [column: string]: unknown
}

/**
 * Anteriority, as prose. The same list I29/I30 hold in SQL, kept short on purpose:
 * marks of transition, never the past tense — the withholding sentence says
 * "sa licence n'a pas été lue", and a list that caught that would be a list
 * someone disarms the first time it bites.
 */
const ANTERIORITY = [
  "plus un",
  "plus une",
  "n'est plus",
  "ne sont plus",
  "devenu",
  "redevenu",
  "auparavant",
  "autrefois",
  "anciennement",
  "jusqu'alors",
  "désormais",
]

/**
 * The seventh probe, and the ticket that made this arm read a SENTENCE rather
 * than a column — w0-conclusion (#54), DIAGNOSTIC.md §15.
 *
 * On the retail-only vintage this function used to justify an absence by « une
 * absence signifie « plus un commerce », pas « vacant » ». That claims a
 * transition, so a prior state — which this same answer withholds from this very
 * caller: 2017 and 2020 come back withheld, « ni son contenu ni son existence ».
 * The disclosure mechanism was right; the prose went further than what it let
 * anyone see.
 *
 * Arm A now holds the rule over the corpus (I29 to I31). This probe is the
 * demonstration the issue asked for in its own words — an anonymous call, on a
 * premise absent from 2023, over the publishable key and nothing else.
 *
 * The counter-test is inside the same call, and it is the half that would catch a
 * lazy fix: the sentence must still NAME what the layer does not publish. Deleting
 * it would satisfy every check above and lose the only fact that makes the absence
 * uninformative.
 */
async function expectTimeline(locationId: number, label: string) {
  const rows = (await rpc("compass_address_timeline", { p_location_id: locationId })) as unknown as TimelineRow[]
  const survey = rows.filter((r) => r.kind === "survey")
  if (survey.length !== 3) return fail(label, `${survey.length} ligne(s) de relevé, attendu 3 — une par millésime`)

  for (const row of survey) {
    const year = Number(row.occurred_on.slice(0, 4))
    if (!row.evidence || row.evidence.trim() === "")
      return fail(label, `${year} : aucune justification — la ligne ne dit pas d'où elle vient`)
    if (row.withheld) continue
    const found = ANTERIORITY.filter((form) => row.evidence!.toLowerCase().includes(form))
    if (found.length > 0)
      return fail(label, `${year} : une ligne divulguée affirme un état antérieur (${found.join(", ")})`)
  }

  const odbl = survey.find((r) => r.occurred_on.startsWith("2023"))
  if (!odbl) return fail(label, "millésime 2023 absent de la réponse")
  if (odbl.withheld !== false) return fail(label, `2023 : withheld = ${JSON.stringify(odbl.withheld)}, attendu false`)
  if (odbl.observed !== false)
    return fail(label, `2023 : observed = ${JSON.stringify(odbl.observed)} — ce local est absent du millésime`)
  if (!odbl.evidence!.toLowerCase().includes("vacant"))
    return fail(label, "2023 : la phrase ne nomme plus ce que la couche ne publie pas — sur-correction")

  pass(label, "2017/2020 retenus, 2023 non relevé : le périmètre est nommé et aucune conclusion n'en est tirée")
}
/**
 * The RLS policy itself, keyed by vintage — #61.
 *
 * Arm A cannot reach this: every RPC above is SECURITY DEFINER and answers on its own test
 * of the claim, so the policy underneath was assumed until this arm existed. It is read as
 * an exact count and never as a sample, because a sample passes while a single 2017 row
 * leaks.
 *
 * What changed is the key, not the exactness. `premise_observation_vintage_idx` leads on
 * `vintage_id`, so one count per vintage is an Index Only Scan with `Heap Fetches: 0` —
 * 143 + 141 + 187 buffers, against 9 033 for the unkeyed count it replaces (measured
 * 2026-08-27, role anon, claim anon, warm). It also reads better: three per-vintage
 * equalities say which vintage moved, where one grand total only said that something did.
 *
 * The expectation comes from bdcom_vintage, which is the table the policy keys on, and the
 * verdict lives in licence-counts.ts so that eval:sabotage can prove it bites without
 * running a copy of it.
 */
async function expectLicenceCounts(label: string): Promise<void> {
  const vintages = (await rpcGet(
    "bdcom_vintage?select=id,year,publicly_redistributable,record_count&order=year",
    label,
  )) as { id: number; year: number; publicly_redistributable: boolean; record_count: number }[]

  const facts: VintageFact[] = []
  for (const v of vintages) {
    facts.push({
      year: v.year,
      publiclyRedistributable: v.publicly_redistributable,
      recordCount: v.record_count,
      visible: await countExact(
        `premise_observation?select=vintage_id&vintage_id=eq.${v.id}&limit=1`,
        `${label} ${v.year}`,
      ),
    })
  }

  const population = expectationHolds(facts)
  if (population.ok) pass(population.what, population.detail)
  else fail(population.what, population.detail)

  for (const verdict of licenceVerdict(facts)) {
    if (verdict.ok) pass(verdict.what, verdict.detail)
    else fail(verdict.what, verdict.detail)
  }
}

/**
 * Sets `process.exitCode` and returns rather than calling `process.exit()`, which is also
 * what run.ts and mcp-server/src/verify.ts do. Not a style preference: `process.exit()`
 * with fetch keep-alive sockets still open aborts Node on Windows
 * (`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`), and the abort REPLACES the
 * exit code with 0xC0000409. A gate that means to say 3 and says 3 221 226 505 has lost
 * the only thing #61 gave it.
 */
async function main(): Promise<void> {
  if (!BASE || !KEY) {
    out("ERREUR — VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY absents de .env.local")
    process.exitCode = 2
    return
  }
  // Says which project answered, never the key — same rule as connectionTarget().
  out(`CIBLE — ${new URL(BASE).host}, clé publiable, aucune chaîne DATABASE_URL`)
  out(
    `D — porte anonyme — appels PostgREST réels, sans identifiants de base ` +
      `(budget anon : ${ANON_STATEMENT_TIMEOUT_MS} ms par requête)` + "\n",
  )

  for (const year of [2017, 2020] as const) {
    await control(`premises_within ${year}`, (label) =>
      expectWithheld(
        "compass_premises_within",
        { p_lat: LAT, p_lng: LNG, p_radius_m: 800, p_vintage_year: year, p_limit: 5 },
        label,
      ),
    )
    await control(`scoring_context_within ${year}`, (label) =>
      expectWithheld(
        "compass_scoring_context_within",
        { p_lat: LAT, p_lng: LNG, p_radius_m: 800, p_vintage_year: year },
        label,
      ),
    )
  }
  // The most expensive statement of the whole arm: 34 729 buffers, 3.8× the count #61 was
  // opened about, and the control that died first on 26 August. It stays at 800 m — an
  // 800 m radius over Chatelet is what makes `total_matched` mean anything, and a control
  // made cheap by asking less is not a control. Its cost is the product's own map query;
  // reducing it is a separate ticket.
  await control("premises_within 2023", (label) =>
    expectContent(
      "compass_premises_within",
      { p_lat: LAT, p_lng: LNG, p_radius_m: 800, p_vintage_year: 2023, p_limit: 5 },
      label,
    ),
  )
  await control("premises_within 2023, rayon 1 m", (label) =>
    expectSilence(
      "compass_premises_within",
      { p_lat: LAT, p_lng: LNG, p_radius_m: 1, p_vintage_year: 2023, p_limit: 5 },
      label,
    ),
  )

  // 54652 — `60 QU ORFEVRES`, surveyed vacant in 2017, the premise this arm was
  // pointed at when it found the defect. 5 — present in 2017 and 2020, absent
  // from the 2023 retail-only vintage: the counter-test, since a fix that stamps
  // the marker too eagerly would destroy the absence this function exists to
  // report. Both measured on the remote 2026-08-24.
  await control("premise_history 54652", (label) => expectHistory(54652, label, true))
  await control("premise_history 5, absent de 2023", (label) => expectHistory(5, label, false))

  // The two functions the census of w0-retenue (#57) surfaced. Halles rather
  // than Chatelet: it is the point DIAGNOSTIC.md §19 measured the defect at, and
  // the quartier w1-survie published its survival figures for.
  await control("street_rotation Halles 300 m", (label) => expectRotation(label))
  await control("survival_by_trade Halles, Café et Restaurant", (label) => expectSurvival(label))

  // 54653 — the premise DIAGNOSTIC.md §15 measured the defect on, absent from the
  // 2023 retail-only vintage. The privileged path is not probed here: the sentence
  // is a constant of its CASE branch, and I30 is what holds it for that caller.
  await control("address_timeline 54653, absent de 2023", (label) => expectTimeline(54653, label))

  await control("RLS premise_observation", (label) => expectLicenceCounts(label))

  // Printed on every run, green or not. #61 is a cliff nobody saw approaching because
  // nothing ever said how close the gate was standing to it.
  out(
    `\n  requête la plus coûteuse : ${slowest.what} — ${Math.round(slowest.ms)} ms aller-retour, ` +
      `budget serveur ${ANON_STATEMENT_TIMEOUT_MS} ms par requête`,
  )

  const host = new URL(BASE).host
  if (failures > 0) {
    out(
      `\nFAIL — ${failures} contrôle(s) en échec` +
        (suspended.length > 0 ? `, ${suspended.length} suspendu(s)` : "") +
        ` — ${host}`,
    )
    process.exitCode = 1
    return
  }
  if (suspended.length > 0) {
    // Not green and not red, and it must not be readable as either. A cancellation says
    // the database would not finish in the time anon is given; it says nothing at all
    // about the licence rule, which is the only thing this arm is here to decide.
    out(
      `\nINDÉTERMINÉ — ${suspended.length} contrôle(s) suspendu(s) sur panne amont ` +
        `(${QUERY_CANCELED} query_canceled) : ${suspended.join(", ")}\n` +
        `Aucun défaut constaté sur les ${greens} assertions qui ont abouti. Rejouer ne ` +
        `vaut verdict que si tout répond — ${host}`,
    )
    process.exitCode = 3
    return
  }
  out(`\nPASS — la règle de licence tient pour un visiteur sans clé, ${greens} contrôles — ${host}`)
}

main().catch((error: unknown) => {
  // PostgREST that never answered is not a licence defect — #71. `fetch` reports it as
  // `TypeError: fetch failed` with the real cause underneath, so the decision is taken on the
  // wrapped `code` and never on the text. Exit 3: the gate did not look.
  if (isUnreachable(error)) {
    out(
      `INDÉTERMINÉ — l'API n'a pas répondu (${unreachableCode(error)}) : panne amont, ` +
        "aucun contrôle de licence joué. Rejouer.",
    )
    process.exitCode = 3
    return
  }
  out(`ERREUR — ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 2
})
