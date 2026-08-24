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

/** The counter-test: a genuinely empty radius must stay silent, never marked. */
async function expectSilence(fn: string, body: Record<string, unknown>, label: string) {
  const rows = await rpc(fn, body)
  if (rows.length !== 0) return fail(label, `${rows.length} ligne(s) — un vrai vide s'est mis à parler`)
  pass(label, "zéro ligne — un vrai vide reste un vrai vide")
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
