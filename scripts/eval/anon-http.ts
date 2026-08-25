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
// since 20260825000014. compass_address_timeline is covered by I9/I10.
//
// The list is no longer the thing that decides what is covered: I24 in
// eval/invariants.sql enumerates the population from pg_proc and fails if a
// function is missing an `@as anon` test — w0-retenue (#57). This arm is the
// stronger half of that coverage where it exists, because it is the only one
// running behind a real RLS policy.
//
// Exit codes follow the runner's convention: 0 PASS, 1 FAIL, 2 ERROR.

import { existsSync } from "fs"
import { resolve } from "path"

const ENV_FILE = resolve(import.meta.dirname, "../../.env.local")
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)

const BASE = process.env.VITE_SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Chatelet — intra-muros, dense, and the point invariants I12–I15 already use. */
const LAT = 48.8566
const LNG = 2.3522

let failures = 0
const out = (s: string): void => void process.stdout.write(s + "\n")
const pass = (what: string, detail: string): void => out(`  ok    ${what} — ${detail}`)
const fail = (what: string, detail: string): void => {
  failures += 1
  out(`  FAIL  ${what} — ${detail}`)
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
  const response = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: KEY as string,
      Authorization: `Bearer ${KEY as string}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`HTTP ${response.status} — ${text.slice(0, 200)}`)
  return JSON.parse(text) as Row[]
}

/** A withheld vintage: exactly one row, the marker set, and no content on it. */
async function expectWithheld(fn: string, body: Record<string, unknown>, label: string) {
  const rows = await rpc(fn, body)
  if (rows.length === 0) return fail(label, "zéro ligne — la retenue est muette, le défaut est revenu")
  if (rows.length !== 1) return fail(label, `${rows.length} lignes, attendu 1`)
  if (rows[0].withheld !== true) return fail(label, `withheld = ${JSON.stringify(rows[0].withheld)}`)
  const leaked = Object.entries(rows[0]).filter(([k, v]) => k !== "withheld" && v !== null)
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

async function main(): Promise<void> {
  if (!BASE || !KEY) {
    out("ERREUR — VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY absents de .env.local")
    process.exit(2)
  }
  // Says which project answered, never the key — same rule as connectionTarget().
  out(`CIBLE — ${new URL(BASE).host}, clé publiable, aucune chaîne DATABASE_URL`)
  out("D — porte anonyme — appels PostgREST réels, sans identifiants de base\n")

  for (const year of [2017, 2020] as const) {
    await expectWithheld(
      "compass_premises_within",
      { p_lat: LAT, p_lng: LNG, p_radius_m: 800, p_vintage_year: year, p_limit: 5 },
      `premises_within ${year}`,
    )
    await expectWithheld(
      "compass_scoring_context_within",
      { p_lat: LAT, p_lng: LNG, p_radius_m: 800, p_vintage_year: year },
      `scoring_context_within ${year}`,
    )
  }
  await expectContent(
    "compass_premises_within",
    { p_lat: LAT, p_lng: LNG, p_radius_m: 800, p_vintage_year: 2023, p_limit: 5 },
    "premises_within 2023",
  )
  await expectSilence(
    "compass_premises_within",
    { p_lat: LAT, p_lng: LNG, p_radius_m: 1, p_vintage_year: 2023, p_limit: 5 },
    "premises_within 2023, rayon 1 m",
  )

  // 54652 — `60 QU ORFEVRES`, surveyed vacant in 2017, the premise this arm was
  // pointed at when it found the defect. 5 — present in 2017 and 2020, absent
  // from the 2023 retail-only vintage: the counter-test, since a fix that stamps
  // the marker too eagerly would destroy the absence this function exists to
  // report. Both measured on the remote 2026-08-24.
  await expectHistory(54652, "premise_history 54652", true)
  await expectHistory(5, "premise_history 5, absent de 2023", false)

  // The two functions the census of w0-retenue (#57) surfaced. Halles rather
  // than Chatelet: it is the point DIAGNOSTIC.md §19 measured the defect at, and
  // the quartier w1-survie published its survival figures for.
  await expectRotation("street_rotation Halles 300 m")
  await expectSurvival("survival_by_trade Halles, Café et Restaurant")

  // RLS itself, which arm A cannot reach: the anon role reading the table
  // directly must see the ODbL vintage and nothing else. A count, not a sample —
  // a sample would pass while a single 2017 row leaked.
  const response = await fetch(
    `${BASE}/rest/v1/premise_observation?select=vintage_id&limit=1`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "count=exact" } },
  )
  const total = Number(response.headers.get("content-range")?.split("/")[1] ?? NaN)
  const odbl = await rpc("compass_vintages", {}) as unknown as { vintage_year: number; record_count: number }[]
  const expected = odbl.find((v) => v.vintage_year === 2023)?.record_count ?? NaN
  if (total === expected) pass("RLS premise_observation", `${total} relevés visibles = le seul millésime ODbL`)
  else fail("RLS premise_observation", `${total} relevés visibles, attendu ${expected} (le millésime ODbL seul)`)

  out(
    failures === 0
      ? `\nPASS — la règle de licence tient pour un visiteur sans clé — ${new URL(BASE).host}`
      : `\nFAIL — ${failures} contrôle(s) en échec — ${new URL(BASE).host}`,
  )
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error: unknown) => {
  out(`ERREUR — ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
})
