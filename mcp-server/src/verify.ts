// Conformance check for the MCP surface — the control this server did not have.
//
// The distinction from smoke-test.ts is the whole point of this file. The smoke test *prints*
// every tool's answer and exits 0 as long as nothing throws: it would stay green while every
// figure said something false. This file *asserts*, and a red result names which rule broke.
//
//   node ../scripts/verify-mcp.mjs      # from the repository root: npm.cmd run verify:mcp
//
// Five families, in the order w0-mcp-verif sets out:
//
//   INVENTAIRE  the six tools registered, against the six README.md documents
//   PROVENANCE  every figure attributed to the layer it was actually read from (w0-provenance)
//   FRAICHEUR   the two freshness dates kept apart, and upkeep declared honestly (w0-cron)
//   LICENCE     the anonymous path — 2017 and 2020 withheld, 2023 served, and no label
//               borrowed from a neighbouring row to fill a withheld one
//   PANNE       base injoignable, miroir Overpass injoignable, point hors boîte, rayon absurde
//
// Three outcomes rather than two, because a shared public mirror is not a defect:
//
//   fail      a rule this repository owns is broken. Exit code 1.
//   outage    an upstream we do not control is down (Overpass rate-limits under repeated
//             testing, README.md says so). The dependent assertions are skipped, but the
//             *reporting* of that outage is itself checked — a silent outage would still fail.
//   defaut    a known, recorded defect. Reported, not fatal — and the check complains just as
//             loudly if it *disappears*, so a fix cannot pass unnoticed and leave the record
//             behind. That is the trap w0-mcp-verif names: wiring a control onto a server whose
//             expected behaviour was never established freezes the present state as reference.

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js"

// Longer than the 70 000 ms abort overpass.ts sets on each mirror. The SDK's own default is
// 60 000, which is *shorter*: a mirror answering at 65 s produced a client-side timeout instead
// of either the result or the server's honest failure row. smoke-test.ts still has that gap.
const CALL_TIMEOUT_MS = 240_000

/** Montorgueil — dense commercial centre, inside the BDCom corpus. */
const MONTORGUEIL = { lat: 48.8657, lng: 2.3459 }

/**
 * Boulogne-Billancourt — inside the accepted coordinate box, outside every Paris quartier.
 *
 * The point used to be Massy (48.7 · 2.2), which the tightened bounds of 20260825000003 now
 * reject outright. Boulogne is the harder and more useful case: it passes schema validation,
 * so it exercises the corpus test itself rather than the box around it. Measured 25 August —
 * in the tightest possible rectangle around Paris, in none of the 80 quartiers.
 */
const OUTSIDE_CORPUS = { lat: 48.835, lng: 2.24 }

/**
 * Bois de Vincennes — inside the Picpus quartier, and holding no BDCom premise within 400 m.
 *
 * The counter-test, and the half that gets skipped. A fix that treated every empty result as
 * "outside the corpus" would pass every check above and destroy the one answer the data gives
 * with certainty: there really are no shops here.
 */
const TRUE_EMPTY = { lat: 48.828, lng: 2.44 }

const EXPECTED_TOOLS: Record<string, string[]> = {
  list_sources: [],
  score_location: ["lat", "lng", "radius_m", "vintage_year"],
  compare_locations: ["a", "b", "radius_m", "vintage_year"],
  explain_score: ["lat", "lng", "metric", "radius_m", "vintage_year"],
  find_premises: ["lat", "lng", "radius_m", "limit"],
  trace_premise: ["location_id"],
}

/** Fields scored from OpenStreetMap alone. Footfall is deliberately absent: it reads two layers. */
const OSM_ONLY = [
  "schools",
  "healthcare",
  "groceries",
  "parks",
  "transit",
  "walkability",
  "noise",
] as const

type Status = "ok" | "fail" | "outage" | "defaut"

interface Check {
  family: string
  id: string
  title: string
  status: Status
  detail: string
}

const checks: Check[] = []

function record(family: string, id: string, title: string, status: Status, detail: string): void {
  checks.push({ family, id, title, status, detail })
}

/** Asserts a condition, recording either side. Returns the condition, so callers can branch. */
function expect(family: string, id: string, title: string, ok: boolean, detail: string): boolean {
  record(family, id, title, ok ? "ok" : "fail", detail)
  return ok
}

// ---------------------------------------------------------------------------
// Client plumbing
// ---------------------------------------------------------------------------

interface ToolOutcome {
  isError: boolean
  text: string
}

const SERVER_ENTRY = new URL("./server.mjs", import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, "")

async function openClient(env?: Record<string, string>): Promise<Client> {
  const client = new Client({ name: "verify-mcp", version: "0.1.0" })
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [SERVER_ENTRY],
      // StdioClientTransport does not inherit the parent environment, so the server's own
      // .env is what supplies SUPABASE_URL unless a case deliberately overrides it.
      //
      // COMPASS_OBSERVABILITE est posé dans les deux branches — w1-observabilite (#72). Ce
      // bras appelle les vrais outils contre la vraie base : sans lui, la porte se compterait
      // elle-même dans le journal d'usage tous les matins. Il est ajouté à la branche qui
      // n'héritait de rien SANS lui faire hériter du reste, pour que ce qui est éprouvé ici ne
      // change pas : le serveur lit toujours son propre .env.
      env: env
        ? { ...(process.env as Record<string, string>), ...env, COMPASS_OBSERVABILITE: "off" }
        : { ...getDefaultEnvironment(), COMPASS_OBSERVABILITE: "off" },
    }),
  )
  return client
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}): Promise<ToolOutcome> {
  try {
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: CALL_TIMEOUT_MS })
    const content = (result as { content?: unknown }).content
    const first = Array.isArray(content) ? (content[0] as { text?: unknown } | undefined) : undefined
    const text = typeof first?.text === "string" ? first.text : JSON.stringify(result)
    return { isError: Boolean((result as { isError?: unknown }).isError), text }
  } catch (error) {
    // A thrown call is a protocol-level refusal (schema validation, timeout). Same shape as an
    // in-band error for our purposes: the tool did not answer.
    return { isError: true, text: error instanceof Error ? error.message : String(error) }
  }
}

function parse(outcome: ToolOutcome): Record<string, unknown> {
  return JSON.parse(outcome.text) as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Shapes returned by the tools. Deliberately narrow: only the fields asserted on.
// ---------------------------------------------------------------------------

interface MeasuredField {
  value: number | null
  source: string
  licence: string
  asOf: string
  method: string
  note?: string
  missingReason?: string
}

interface ScoreResponse {
  scores: Record<string, MeasuredField>
  context_failures?: { layer: string; reason: string }[]
}

interface TimelineRow {
  occurred_on: string
  source: string
  kind: string
  observed: boolean | null
  withheld: boolean
  activity_code: string | null
  label: string | null
  detail: string | null
  amount_eur: number | null
  confidence: string
}

interface TraceResponse {
  rows: number
  timeline: TimelineRow[]
  withheld_vintages?: string[]
}

interface FindResponse {
  vintage_year: number
  returned: number
  total_matched: number
  premises: { location_id: number; address: string | null; activity_label: string | null }[]
}

/** True when a score response failed because Overpass, not this repository, was unavailable. */
function amenitiesOutage(response: ScoreResponse): string | null {
  const failure = response.context_failures?.find((f) => f.layer === "amenities")
  return failure ? failure.reason : null
}

// ---------------------------------------------------------------------------
// INVENTAIRE — what index.ts registers, against what README.md documents
// ---------------------------------------------------------------------------

async function checkInventory(client: Client): Promise<void> {
  const listed = await client.listTools()
  const found = listed.tools.map((t) => t.name).sort()
  const expected = Object.keys(EXPECTED_TOOLS).sort()

  expect(
    "INVENTAIRE",
    "T1",
    "les six outils annoncés sont enregistrés, et pas un de plus",
    found.length === expected.length && found.every((n, i) => n === expected[i]),
    `enregistrés : ${found.join(", ")}`,
  )

  for (const [name, params] of Object.entries(EXPECTED_TOOLS)) {
    const tool = listed.tools.find((t) => t.name === name)
    if (!tool) {
      record("INVENTAIRE", `T2.${name}`, `${name} — signature`, "fail", "outil absent")
      continue
    }
    const properties = (tool.inputSchema as { properties?: Record<string, unknown> } | undefined)?.properties ?? {}
    const actual = Object.keys(properties).sort()
    const wanted = [...params].sort()
    expect(
      "INVENTAIRE",
      `T2.${name}`,
      `${name} — les paramètres documentés sont ceux exposés`,
      actual.length === wanted.length && actual.every((p, i) => p === wanted[i]),
      `exposés : ${actual.join(", ") || "(aucun)"}`,
    )
  }

  // A tool an agent cannot read is a tool an agent will misuse. Descriptions are the contract.
  const undescribed = listed.tools.filter((t) => !t.description || t.description.trim().length < 40)
  expect(
    "INVENTAIRE",
    "T3",
    "chaque outil porte une description utilisable par un agent",
    undescribed.length === 0,
    undescribed.length === 0 ? "les six sont décrits" : `sans description : ${undescribed.map((t) => t.name).join(", ")}`,
  )
}

// ---------------------------------------------------------------------------
// PROVENANCE — w0-provenance's criterion, applied to the six and not to explain_score alone
// ---------------------------------------------------------------------------

async function checkProvenance(client: Client): Promise<ScoreResponse | null> {
  const outcome = await call(client, "score_location", { ...MONTORGUEIL, vintage_year: 2023 })
  if (outcome.isError) {
    record("PROVENANCE", "P0", "score_location répond sur un point du corpus", "fail", outcome.text.slice(0, 200))
    return null
  }
  const response = parse(outcome) as unknown as ScoreResponse

  const outage = amenitiesOutage(response)
  if (outage) {
    // The honest-reporting half is still checked, and it is the half that matters: an outage
    // must arrive as a named failure with null values, never as a measured zero.
    const zeroed = OSM_ONLY.filter((f) => response.scores[f]?.value === 0)
    expect(
      "PROVENANCE",
      "P1",
      "un miroir Overpass injoignable est rapporté, jamais rendu comme un zéro mesuré",
      zeroed.length === 0 && OSM_ONLY.every((f) => response.scores[f]?.missingReason),
      `panne déclarée : ${outage.slice(0, 120)}`,
    )
    record("PROVENANCE", "P2", "attribution par couche (Overpass indisponible)", "outage", outage.slice(0, 120))
    return response
  }

  // Every field carries the four pieces Measured<T> exists to keep together.
  const naked = Object.entries(response.scores).filter(
    ([, m]) => !m.source || !m.licence || !m.asOf || !m.method,
  )
  expect(
    "PROVENANCE",
    "P1",
    "aucun chiffre n'est rendu sans source, licence, date et méthode",
    naked.length === 0,
    naked.length === 0 ? `${Object.keys(response.scores).length} champs complets` : `nus : ${naked.map(([k]) => k).join(", ")}`,
  )

  const today = new Date().toISOString().slice(0, 10)
  const misattributed = OSM_ONLY.filter((f) => {
    const m = response.scores[f]
    return !m || !m.source.includes("OpenStreetMap") || m.source.includes("BDCom")
  })
  expect(
    "PROVENANCE",
    "P2",
    "les champs lus sur OpenStreetMap seuls citent OpenStreetMap seul",
    misattributed.length === 0,
    misattributed.length === 0 ? `${OSM_ONLY.length} champs, asOf ${response.scores.schools?.asOf}` : `mal attribués : ${misattributed.join(", ")}`,
  )

  expect(
    "PROVENANCE",
    "P3",
    "les champs OpenStreetMap datent du jour de la requête",
    OSM_ONLY.every((f) => response.scores[f]?.asOf === today),
    `attendu ${today}`,
  )

  // The regression w0-provenance fixed, pinned: one Origin for the whole result made footfall
  // claim OpenStreetMap for a figure two thirds read from APUR's door-to-door survey.
  const footfall = response.scores.footfall
  expect(
    "PROVENANCE",
    "P4",
    "footfall cite ses deux couches — APUR BDCom et OpenStreetMap",
    Boolean(footfall && footfall.source.includes("BDCom") && footfall.source.includes("OpenStreetMap")),
    `source : ${footfall?.source}`,
  )

  // BDCom's date is the survey's, never today's. Giving a triennial census the date it was
  // queried is the same fabrication as a freshness date with no refresh behind it.
  expect(
    "PROVENANCE",
    "P5",
    "footfall porte la date du recensement, pas celle de la requête",
    Boolean(footfall && footfall.asOf !== today && /^\d{4}/.test(footfall.asOf)),
    `asOf : ${footfall?.asOf}`,
  )

  return response
}

/**
 * Freshness, as list_sources reports it — w0-cron (#6), PLAN.md §2.2ter.
 *
 * The failure this guards against is a collapse, not an absence: rendering one date where there
 * are two. "Loaded this morning" and "surveyed in 2023" are different facts, and a caller given
 * only the first will say the corpus is current. That is the fabricated rent in its temporal
 * form, so it is asserted rather than trusted to a comment.
 */
async function checkFreshness(client: Client): Promise<void> {
  const outcome = await call(client, "list_sources")
  if (outcome.isError) {
    record("FRAICHEUR", "F1", "list_sources répond", "fail", outcome.text.slice(0, 200))
    return
  }
  const sources = (parse(outcome).sources ?? []) as {
    name: string
    freshness?: { dataAsOf: string | null; lastLoadedAt: string | null; cadence?: string; upkeep?: string }
  }[]

  const withoutFreshness = sources.filter((s) => !s.freshness)
  expect(
    "FRAICHEUR",
    "F1",
    "les quatre jeux chargés portent une fraîcheur, plus OpenStreetMap",
    withoutFreshness.length === 0,
    withoutFreshness.length === 0
      ? `${sources.length} sources décrites`
      : `sans fraîcheur : ${withoutFreshness.map((s) => s.name).join(", ")}`,
  )

  const bdcom = sources.find((s) => s.name.startsWith("APUR BDCom"))
  const fresh = bdcom?.freshness
  const today = new Date().toISOString().slice(0, 10)

  // The whole point, in one assertion: BDCom's data date must be the survey's, and it must not
  // be the day we happened to load it — even when we loaded it today.
  expect(
    "FRAICHEUR",
    "F2",
    "BDCom : la date de la donnée est celle du recensement, pas celle du chargement",
    Boolean(fresh && fresh.dataAsOf && !fresh.dataAsOf.startsWith(today) && /^\d{4}/.test(fresh.dataAsOf)),
    `dataAsOf=${fresh?.dataAsOf} · lastLoadedAt=${fresh?.lastLoadedAt?.slice(0, 10) ?? "—"}`,
  )

  // The two dates travel together or not at all — the absence-is-not-zero rule applied to
  // freshness. A dataset carrying a data date with no load date would be claiming a currency
  // nothing backs; one carrying a load date with no data date would have loaded something whose
  // recency it cannot state, which `Measured<T>` exists to keep off the screen.
  //
  // This used to test SIRENE alone, on the grounds that it was the one dataset never loaded.
  // It was loaded on 25 August (#56), which made that check pass vacuously — so it now asserts
  // the pairing across every dataset, which holds whatever is or is not loaded.
  const halfDated = sources.filter((s) => {
    const f = s.freshness
    if (!f || f.dataAsOf === "live") return false
    return (f.dataAsOf === null) !== (f.lastLoadedAt === null)
  })
  expect(
    "FRAICHEUR",
    "F3",
    "les deux dates voyagent ensemble : jamais l'une sans l'autre",
    halfDated.length === 0,
    halfDated.length === 0
      ? sources
          .filter((s) => s.freshness && s.freshness.dataAsOf !== "live")
          .map((s) => `${s.name.replace(/ .*/, "")}:${s.freshness?.dataAsOf ?? "—"}`)
          .join(" ")
      : `dépareillés : ${halfDated.map((s) => s.name).join(", ")}`,
  )

  // Declared or real, never ambiguous. A cadence with no automated run behind it has to be
  // legible as such, or "monthly" reads as a guarantee.
  const upkeep = sources.filter((s) => s.freshness?.upkeep).map((s) => s.freshness?.upkeep ?? "")
  expect(
    "FRAICHEUR",
    "F4",
    "l'entretien est déclaré : un rafraîchissement manuel ne se lit pas comme automatique",
    upkeep.every((u) => /scheduled job|by hand|No refresh recorded|Queried at call time/.test(u)) &&
      // And the meaning counts, not just the presence: a manual refresh must never read as a
      // demonstrated one.
      upkeep.every((u) => !/by hand/.test(u) || /declared, not demonstrated/.test(u)),
    upkeep.length > 0 ? `${upkeep.length} jeux qualifient leur entretien` : "aucun jeu ne qualifie son entretien",
  )
}

// ---------------------------------------------------------------------------
// LICENCE — the anonymous path, tool by tool. DIAGNOSTIC.md §9 to §12, and #51's rule.
// ---------------------------------------------------------------------------

async function checkWithheldVintages(client: Client): Promise<void> {
  for (const year of [2017, 2020] as const) {
    const outcome = await call(client, "score_location", { ...MONTORGUEIL, vintage_year: year })
    if (outcome.isError) {
      record("LICENCE", `L1.${year}`, `score_location ${year}`, "fail", outcome.text.slice(0, 200))
      continue
    }
    const response = parse(outcome) as unknown as ScoreResponse
    const footfall = response.scores.footfall
    const failure = response.context_failures?.find((f) => f.layer === "premises")

    // The defect of §9 in its scoring form: a withheld vintage scored as an empty
    // neighbourhood would put a real number on a licence restriction.
    expect(
      "LICENCE",
      `L1.${year}`,
      `millésime ${year} retenu : footfall est inconnu, jamais zéro`,
      footfall?.value === null && Boolean(footfall?.missingReason) && Boolean(failure),
      `value=${footfall?.value ?? "null"} · panne déclarée : ${failure ? "oui" : "non"}`,
    )

    expect(
      "LICENCE",
      `L2.${year}`,
      `millésime ${year} : la retenue est nommée comme telle, licence à l'appui`,
      Boolean(failure && /licence/i.test(failure.reason) && /redistribu/i.test(failure.reason)),
      failure ? failure.reason.slice(0, 110) : "aucune panne déclarée",
    )
  }
}

async function checkTimelineWithholding(client: Client, locationId: number, address: string): Promise<void> {
  const outcome = await call(client, "trace_premise", { location_id: locationId })
  if (outcome.isError) {
    record("LICENCE", "L3", "trace_premise répond", "fail", outcome.text.slice(0, 200))
    return
  }
  const trace = parse(outcome) as unknown as TraceResponse
  const surveys = trace.timeline.filter((r) => r.kind === "survey")
  const withheld = surveys.filter((r) => r.withheld)
  const served = surveys.filter((r) => !r.withheld && r.observed === true)

  expect(
    "LICENCE",
    "L3",
    "2017 et 2020 reviennent retenus, 2023 servi — les trois existent",
    withheld.length === 2 && served.length >= 1,
    `local ${locationId} (${address}) · retenus ${withheld.length} · servis ${served.length} · ${trace.rows} lignes`,
  )

  // #51's rule, held on the agent side: `observed = false` reads "non observé", and a withheld
  // row carries no reading at all. Neither may be answered with `false`, which is a positive
  // claim an agent cannot distinguish from a real survey.
  expect(
    "LICENCE",
    "L4",
    "une ligne retenue rend observed = null, jamais false",
    withheld.every((r) => r.observed === null),
    `observed sur les lignes retenues : ${withheld.map((r) => String(r.observed)).join(", ") || "(aucune)"}`,
  )

  // The trap of this ticket, stated mechanically. A withheld row must carry no label — not the
  // neighbouring vintage's, not the sign name, not a default. Any non-null field here is a
  // coalesce, and a coalesce is how a licence restriction becomes an assertion.
  const leaked = withheld.filter(
    (r) => r.label !== null || r.activity_code !== null || r.detail !== null || r.amount_eur !== null,
  )
  expect(
    "LICENCE",
    "L5",
    "aucun coalesce sur le libellé : une ligne retenue ne dit rien du tout",
    leaked.length === 0,
    leaked.length === 0
      ? `${withheld.length} lignes retenues, toutes muettes`
      : `fuite sur ${leaked.map((r) => r.source).join(", ")}`,
  )

  // The counter-test. A fix too zealous about silence would empty the served row too, and the
  // 2023 vintage is exactly what an anonymous caller is entitled to.
  expect(
    "LICENCE",
    "L6",
    "le millésime ODbL garde son contenu — la retenue n'a pas tout vidé",
    served.every((r) => r.label !== null && r.label.trim().length > 0),
    served.map((r) => `${r.occurred_on.slice(0, 4)} « ${r.label} »`).join(" · ") || "(aucune ligne servie)",
  )
}

async function checkFindPremises(client: Client): Promise<FindResponse | null> {
  const outcome = await call(client, "find_premises", { ...MONTORGUEIL, radius_m: 60, limit: 5 })
  if (outcome.isError) {
    record("LICENCE", "L7", "find_premises répond sur un point du corpus", "fail", outcome.text.slice(0, 200))
    return null
  }
  const found = parse(outcome) as unknown as FindResponse

  expect(
    "LICENCE",
    "L7",
    "find_premises est épinglé sur le seul millésime ODbL",
    found.vintage_year === 2023,
    `millésime servi : ${found.vintage_year}`,
  )

  // The denominator, not just the page. PLAN.md's "50 sur 340" rather than a silent truncation.
  expect(
    "LICENCE",
    "L8",
    "la troncature est déclarée : total_matched accompagne la page",
    found.total_matched >= found.returned && found.returned > 0,
    `${found.returned} rendus sur ${found.total_matched} appariés`,
  )

  return found
}

// ---------------------------------------------------------------------------
// PANNE — the family 9fbfda3 belonged to, and the reason this file exists
// ---------------------------------------------------------------------------

async function checkInputGuards(client: Client): Promise<void> {
  const cases: { id: string; title: string; tool: string; args: Record<string, unknown> }[] = [
    { id: "E1", title: "un point hors de la boîte acceptée est refusé (Lyon)", tool: "score_location", args: { lat: 45.75, lng: 4.85 } },
    { id: "E2", title: "un rayon absurde est refusé (999 999 m)", tool: "score_location", args: { ...MONTORGUEIL, radius_m: 999_999 } },
    { id: "E3", title: "un rayon négatif est refusé", tool: "score_location", args: { ...MONTORGUEIL, radius_m: -10 } },
    { id: "E4", title: "un millésime inexistant est refusé (2011)", tool: "score_location", args: { ...MONTORGUEIL, vintage_year: 2011 } },
    { id: "E5", title: "find_premises refuse un rayon de quartier (501 m)", tool: "find_premises", args: { ...MONTORGUEIL, radius_m: 501 } },
    { id: "E6", title: "explain_score refuse une métrique inconnue", tool: "explain_score", args: { ...MONTORGUEIL, metric: "loyer" } },
  ]
  for (const c of cases) {
    const outcome = await call(client, c.tool, c.args)
    expect("PANNE", c.id, c.title, outcome.isError, outcome.isError ? outcome.text.slice(0, 110) : "accepté sans erreur")
  }
}

/**
 * Base injoignable. Deterministic — `.invalid` is reserved by RFC 2606 and never resolves — so
 * this case runs on every invocation rather than waiting for a real outage.
 *
 * What it holds in place is the shape of the degradation: the three tools that read the database
 * must say *which* function failed, and score_location must keep its OpenStreetMap figures while
 * withdrawing footfall entirely. A footfall computed with the premises layer missing would be
 * the §9 defect arriving through the front door.
 */
async function checkDatabaseOutage(): Promise<void> {
  const client = await openClient({
    SUPABASE_URL: "https://unreachable.invalid",
    SUPABASE_ANON_KEY: "sb_publishable_verify_mcp_bogus",
  })
  try {
    const named: Record<string, string> = {
      list_sources: "compass_vintages",
      find_premises: "compass_premises_within",
      trace_premise: "compass_address_timeline",
    }
    for (const [tool, fn] of Object.entries(named)) {
      const args = tool === "find_premises" ? { ...MONTORGUEIL, radius_m: 60 } : tool === "trace_premise" ? { location_id: 1 } : {}
      const outcome = await call(client, tool, args)
      expect(
        "PANNE",
        `E7.${tool}`,
        `${tool} nomme la fonction qui n'a pas répondu`,
        outcome.isError && outcome.text.includes(fn),
        outcome.text.slice(0, 110),
      )
    }

    const outcome = await call(client, "score_location", { ...MONTORGUEIL })
    if (outcome.isError) {
      record("PANNE", "E8", "score_location survit à une base injoignable", "fail", outcome.text.slice(0, 160))
      return
    }
    const response = parse(outcome) as unknown as ScoreResponse
    const footfall = response.scores.footfall
    const failure = response.context_failures?.find((f) => f.layer === "premises")

    expect(
      "PANNE",
      "E8",
      "base injoignable : footfall est retiré, jamais calculé sur une couche absente",
      footfall?.value === null && Boolean(footfall?.missingReason) && Boolean(failure),
      `value=${footfall?.value ?? "null"} · ${failure?.reason.slice(0, 80) ?? "aucune panne déclarée"}`,
    )

    // And the other half: a database outage must not blank out figures that never needed it.
    // The two calls fail independently by design (context.ts) — this is what proves it.
    const overpassDown = amenitiesOutage(response)
    if (overpassDown) {
      record("PANNE", "E9", "les couches OpenStreetMap survivent à la panne de base", "outage", overpassDown.slice(0, 110))
    } else {
      expect(
        "PANNE",
        "E9",
        "les couches OpenStreetMap survivent à la panne de base",
        OSM_ONLY.every((f) => typeof response.scores[f]?.value === "number"),
        `walkability=${response.scores.walkability?.value} · noise=${response.scores.noise?.value}`,
      )
    }
  } finally {
    await client.close()
  }
}

/**
 * Point outside the corpus — DIAGNOSTIC.md §16, fixed 25 August by 20260825000003 (issue #55).
 *
 * This check changed nature. It used to hold the defect in place as `defaut`; it now verifies
 * the fix, and verifies **both halves** — because the easy half alone would have produced a
 * mirror defect.
 *
 *   E10  outside the corpus, find_premises returns an honest emptiness
 *   E11  outside the corpus, score_location withdraws the layer: footfall unknown, never a figure
 *   E12  inside the corpus but genuinely empty, the zero stays a zero
 *
 * E12 is the counter-test. Treating "zero rows" as "outside the corpus" would have been simpler
 * and wrong: the Bois de Vincennes is inside Paris and genuinely has no shop within 400 m.
 */
async function checkOutsideCorpus(client: Client): Promise<void> {
  const found = await call(client, "find_premises", { ...OUTSIDE_CORPUS, radius_m: 500 })
  if (!found.isError) {
    const response = parse(found) as unknown as FindResponse
    expect(
      "PANNE",
      "E10",
      "hors corpus, find_premises rend un vide honnête",
      response.total_matched === 0 && response.returned === 0,
      `Boulogne : ${response.returned} rendus sur ${response.total_matched} appariés`,
    )
  }

  const scored = await call(client, "score_location", { ...OUTSIDE_CORPUS })
  if (scored.isError) {
    record("PANNE", "E11", "score_location hors corpus", "fail", scored.text.slice(0, 160))
  } else {
    const response = parse(scored) as unknown as ScoreResponse
    const outage = amenitiesOutage(response)
    if (outage) {
      record("PANNE", "E11", "hors corpus : footfall retiré, jamais fabriqué", "outage", outage.slice(0, 110))
    } else {
      const footfall = response.scores.footfall
      const failure = response.context_failures?.find((f) => f.layer === "premises")
      expect(
        "PANNE",
        "E11",
        "hors corpus : footfall est retiré, jamais fabriqué sur zéro local",
        footfall?.value === null && Boolean(footfall?.missingReason) && Boolean(failure),
        `value=${footfall?.value ?? "null"} · ${failure?.reason.slice(0, 90) ?? "aucune panne déclarée"}`,
      )
    }
  }

  // The counter-test. Without it, "every emptiness is outside the corpus" would pass green.
  const empty = await call(client, "score_location", { ...TRUE_EMPTY, radius_m: 400 })
  if (empty.isError) {
    record("PANNE", "E12", "un vrai vide dans Paris", "fail", empty.text.slice(0, 160))
    return
  }
  const response = parse(empty) as unknown as ScoreResponse
  const outage = amenitiesOutage(response)
  if (outage) {
    record("PANNE", "E12", "un vrai vide dans Paris reste un vrai vide", "outage", outage.slice(0, 110))
    return
  }
  const footfall = response.scores.footfall
  const premisesFailure = response.context_failures?.find((f) => f.layer === "premises")
  expect(
    "PANNE",
    "E12",
    "dans le corpus, un rayon réellement vide reste un zéro mesuré",
    typeof footfall?.value === "number" && !premisesFailure,
    `Bois de Vincennes : footfall=${footfall?.value ?? "null"} · panne premises : ${premisesFailure ? "oui" : "non"}`,
  )
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const client = await openClient()
  try {
    await checkInventory(client)
    await checkProvenance(client)
    await checkFreshness(client)
    await checkWithheldVintages(client)
    const found = await checkFindPremises(client)
    if (found && found.premises.length > 0) {
      const first = found.premises[0]
      await checkTimelineWithholding(client, first.location_id, first.address ?? "adresse inconnue")
    } else {
      record("LICENCE", "L3", "trace_premise sur un local du corpus", "fail", "find_premises n'a rendu aucun candidat")
    }
    await checkInputGuards(client)
    await checkOutsideCorpus(client)
  } finally {
    await client.close()
  }

  await checkDatabaseOutage()

  // -------------------------------------------------------------------------
  const mark: Record<Status, string> = {
    ok: "  ok  ",
    fail: " ÉCHEC",
    outage: " panne",
    defaut: "défaut",
  }
  let family = ""
  for (const c of checks) {
    if (c.family !== family) {
      family = c.family
      process.stdout.write(`\n${family}\n`)
    }
    process.stdout.write(`  [${mark[c.status]}] ${c.id.padEnd(16)} ${c.title}\n`)
    process.stdout.write(`${" ".repeat(27)}${c.detail}\n`)
  }

  const failed = checks.filter((c) => c.status === "fail")
  const outages = checks.filter((c) => c.status === "outage")
  const defects = checks.filter((c) => c.status === "defaut")
  process.stdout.write(
    `\n${checks.length} contrôles — ${checks.length - failed.length - outages.length - defects.length} au vert` +
      `, ${failed.length} en échec, ${outages.length} suspendus (panne amont), ${defects.length} défaut(s) connu(s)\n`,
  )
  if (defects.length > 0) {
    process.stdout.write("\nDéfauts connus, consignés et non fatals :\n")
    for (const d of defects) process.stdout.write(`  ${d.id} — ${d.detail}\n`)
  }
  if (failed.length > 0) {
    process.stdout.write("\nÉchecs :\n")
    for (const f of failed) process.stdout.write(`  ${f.id} — ${f.title}\n      ${f.detail}\n`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  process.stderr.write(`verify-mcp a échoué avant la fin : ${error instanceof Error ? error.stack : String(error)}\n`)
  process.exitCode = 1
})
