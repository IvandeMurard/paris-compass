// The catalogue arm — w1-catalogue (#73), points 1 and 4.
//
//   npm.cmd run catalogue
//
// Two questions per source, and only two: does the endpoint still ANSWER, and does it still
// DECLARE the licence this repository wrote down. That is the whole of « vérifier ». Whether
// what comes back still MEANS what we mapped it to is the other protocol — « tester » — and it
// lives in eval/invariants.sql, where I22 has stood since 25 August 2026 and I35 joins it.
//
// The failure mode is documented rather than supposed. #56, 25 August 2026: INSEE replaced its
// resource instead of archiving it, the pinned URL answered 404, and nobody knew until
// somebody ran the loader. Nothing between two loads ever asked.
//
// ── Why this cannot decide anything ───────────────────────────────────────────────────────
//
// The protocol DETECTS and REPORTS. It does not decide that a changed licence is acceptable,
// does not update the catalogue, and does not remap anything. A licence that changes is a
// decision about what this product may still publish — 2017 and 2020 are withheld to this day
// for exactly that reason — and a script is not the place that decision gets taken.
//
// ── Why an outage may not be a red ────────────────────────────────────────────────────────
//
// This arm talks to eleven public services every morning. A 429 from an Overpass mirror or a
// gateway timeout at data.gouv asks nobody for anything, and an alert that fires on them is
// muted within a fortnight — which removes the vigilance without supplying the guarantee. So
// the classification of what stops being a failure lives where the error object is, using
// scripts/eval/upstream.ts as #61, #69 and #71 already do, and never in the report, which
// holds a string.
//
// The report itself is NOT redefined here: scripts/porte/report.ts wrote the three blocks for
// #71 and this reuses them. Three protocols producing three report formats is three things to
// read, therefore zero things read.

import {
  catalogueDesSources,
  estClasse,
  type CatalogueVerdict,
  type Probe,
} from "./catalogue"
import { buildReport, EXIT, type ArmOutcome } from "./report"
import { isUnreachable, unreachableCode } from "../eval/upstream"

/**
 * Sent on every request, and it is not decoration.
 *
 * Overpass answers 406 without one — which is how the MCP server's main mirror became
 * unreachable with nothing saying so (docs/REPRISE-PIEGES.md). A check that gets itself
 * refused by a service it is meant to be watching reports an outage that it caused.
 */
const USER_AGENT = "paris-compass catalogue (github.com/IvandeMurard/paris-compass)"

/**
 * Per request. Generous on purpose: this arm is judging availability, and a slow public
 * service is not an absent one. Past it, `AbortSignal.timeout` raises `TimeoutError`, which
 * `suspendu()` reads as an outage rather than as a defect of this repository.
 */
const TIMEOUT_MS = 25_000

/** What a probe found. `exitCode` follows the convention of scripts/porte/report.ts. */
interface Mesure {
  exitCode: number
  /** One line, the way a human would read it at the bottom of a terminal. */
  ligne: string
  /** Only for a red: which decision the reader is being asked for. */
  decision?: string
}

const suspendu = (name: string, error: unknown): Mesure => ({
  exitCode: EXIT.unsettled,
  ligne:
    `susp  ${name} — ${unreachableCode(error)} : l'endpoint n'a pas répondu, ` +
    "la vérification n'a pas eu lieu",
})

/**
 * True when the service answered something that says « not now » rather than « not any more ».
 *
 * 429 and the 5xx family are the two shapes a public portal uses to shed load, and neither is
 * a statement about the resource. 404 and 410 are: they say the resource is gone, which is
 * exactly #56 and exactly what this arm exists to catch.
 */
function estPanne(status: number): boolean {
  return status === 429 || status === 408 || status >= 500
}

interface Reponse {
  status: number
  text: string
}

async function lire(url: string): Promise<Reponse> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  return { status: response.status, text: await response.text() }
}

/**
 * The licence comparison, and it is deliberately EXACT.
 *
 * A portal that rewrites « Open Database License (ODbL) » into « ODbL v1.0 » has changed what
 * it declares, and a comparison loose enough to accept both would also accept the day it
 * changes into something else entirely. What is wanted here is a human reading the two
 * strings, so the check's job is to make that reading happen — not to spare it.
 */
function licenceConforme(mesuree: string | null, attendue: string): boolean {
  return (mesuree ?? "").trim() === attendue.trim()
}

const DECISION_LICENCE =
  "dire si la licence désormais annoncée par la source remplace celle du catalogue, puis " +
  "corriger le catalogue ET tout ce qui en dépend — `bdcom_vintage.publicly_redistributable`, " +
  "`src/services/opendata/sources.ts`, `scripts/porte/catalogue.json`. Jamais l'inverse : " +
  "le catalogue n'a pas autorité sur ce que la source déclare."

const DECISION_DISPARUE =
  "la ressource épinglée n'existe plus à cette adresse — c'est #56, le 25 août 2026, où " +
  "l'INSEE avait remplacé la sienne au lieu de l'archiver. Retrouver la ressource courante " +
  "chez le producteur et réépingler, ou constater que la source a disparu et changer son " +
  "statut au catalogue. Jamais supprimer la vérification pour éteindre le rouge."

async function sondeHttp(probe: Probe): Promise<Mesure> {
  const { status } = await lire(probe.endpoint)
  if (estPanne(status)) {
    return {
      exitCode: EXIT.unsettled,
      ligne: `susp  HTTP ${status} — le service décline pour l'instant, la vérification n'a pas eu lieu`,
    }
  }
  if (status !== 200) {
    return { exitCode: EXIT.fail, ligne: `FAIL  HTTP ${status} sur ${probe.endpoint}`, decision: DECISION_DISPARUE }
  }
  return { exitCode: EXIT.pass, ligne: `ok    HTTP 200 — répond, licence non lisible à l'endpoint` }
}

async function sondeOpendatasoft(probe: Probe): Promise<Mesure> {
  const { status, text } = await lire(probe.endpoint)
  if (estPanne(status)) {
    return { exitCode: EXIT.unsettled, ligne: `susp  HTTP ${status} — portail indisponible, la vérification n'a pas eu lieu` }
  }
  if (status !== 200) {
    return { exitCode: EXIT.fail, ligne: `FAIL  HTTP ${status} sur ${probe.endpoint}`, decision: DECISION_DISPARUE }
  }
  const metas = (JSON.parse(text) as { metas?: { default?: Record<string, unknown> } }).metas?.default ?? {}
  const licence = typeof metas.license === "string" ? metas.license : null
  const modifie = typeof metas.modified === "string" ? metas.modified.slice(0, 10) : "date non publiée"
  const attendue = probe["licence-attendue"]
  if (attendue === null) {
    return { exitCode: EXIT.pass, ligne: `ok    HTTP 200 — licence déclarée ${JSON.stringify(licence)}, état du ${modifie}` }
  }
  if (!licenceConforme(licence, attendue)) {
    return {
      exitCode: EXIT.fail,
      ligne: `FAIL  licence annoncée « ${licence ?? "aucune"} », consignée « ${attendue} » (état du ${modifie})`,
      decision: DECISION_LICENCE,
    }
  }
  return { exitCode: EXIT.pass, ligne: `ok    licence « ${attendue} » confirmée, état du ${modifie}` }
}

async function sondeDatagouv(probe: Probe): Promise<Mesure> {
  const { status, text } = await lire(probe.endpoint)
  if (estPanne(status)) {
    return { exitCode: EXIT.unsettled, ligne: `susp  HTTP ${status} — data.gouv indisponible, la vérification n'a pas eu lieu` }
  }
  if (status !== 200) {
    return { exitCode: EXIT.fail, ligne: `FAIL  HTTP ${status} sur ${probe.endpoint}`, decision: DECISION_DISPARUE }
  }
  const body = JSON.parse(text) as { license?: unknown; last_update?: unknown; resources?: unknown[] }
  const licence = typeof body.license === "string" ? body.license : null
  const maj = typeof body.last_update === "string" ? body.last_update.slice(0, 10) : "date non publiée"
  const ressources = Array.isArray(body.resources) ? body.resources.length : 0
  const attendue = probe["licence-attendue"]
  if (ressources === 0) {
    return {
      exitCode: EXIT.fail,
      ligne: "FAIL  la fiche répond mais ne porte plus aucune ressource",
      decision: DECISION_DISPARUE,
    }
  }
  if (attendue !== null && !licenceConforme(licence, attendue)) {
    return {
      exitCode: EXIT.fail,
      ligne: `FAIL  licence annoncée « ${licence ?? "aucune"} », consignée « ${attendue} » (maj du ${maj})`,
      decision: DECISION_LICENCE,
    }
  }
  return { exitCode: EXIT.pass, ligne: `ok    licence « ${licence ?? "aucune"} », ${ressources} ressource(s), maj du ${maj}` }
}

/**
 * The ArcGIS reading, and the only one that also asks « is there a newer vintage ».
 *
 * It is asked HERE and nowhere else on purpose. A « modified » date moving on a live register
 * is not news — chantiers-perturbants and terrasses-autorisations move most days — and an arm
 * that named them every morning would be the noise that gets a check muted. BDCom is the one
 * source this product PINS to a vintage, so a `bdcom2026` service appearing beside `bdcom2023`
 * is a real event that asks a human something, roughly once every three years.
 */
async function sondeArcgis(probe: Probe): Promise<Mesure> {
  const { status, text } = await lire(probe.endpoint + "?f=json")
  if (estPanne(status)) {
    return { exitCode: EXIT.unsettled, ligne: `susp  HTTP ${status} — service ArcGIS indisponible, la vérification n'a pas eu lieu` }
  }
  if (status !== 200) {
    return { exitCode: EXIT.fail, ligne: `FAIL  HTTP ${status} sur ${probe.endpoint}`, decision: DECISION_DISPARUE }
  }
  const layer = JSON.parse(text) as { name?: unknown; error?: unknown; copyrightText?: unknown }
  if (layer.error || typeof layer.name !== "string") {
    // ArcGIS answers 200 with an `error` object for a layer that no longer exists — the same
    // shape as Overpass answering 200 with an empty result when its query expired
    // (DIAGNOSTIC.md §3.e). A status code is not an answer.
    return {
      exitCode: EXIT.fail,
      ligne: "FAIL  HTTP 200 mais la réponse ne décrit aucune couche",
      decision: DECISION_DISPARUE,
    }
  }
  const attendue = probe["licence-attendue"]
  const copyright = typeof layer.copyrightText === "string" ? layer.copyrightText : ""
  if (attendue !== null && !licenceConforme(copyright, attendue)) {
    return {
      exitCode: EXIT.fail,
      ligne: `FAIL  copyrightText « ${copyright} », consigné « ${attendue} »`,
      decision: DECISION_LICENCE,
    }
  }

  const plusRecent = await millesimePlusRecent(probe.endpoint)
  if (plusRecent) {
    return {
      exitCode: EXIT.unsettled,
      ligne: `ok    couche « ${layer.name} » présente — et un millésime plus récent est publié : ${plusRecent}`,
    }
  }
  return { exitCode: EXIT.pass, ligne: `ok    couche « ${layer.name} » présente, copyrightText vide comme consigné` }
}

/**
 * The newest `bdcomYYYY` service published beside the pinned one, or null.
 *
 * Returns null rather than throwing when the folder cannot be listed: the layer itself has
 * already answered, and failing the whole probe on the secondary question would turn a piece
 * of news into an outage.
 */
async function millesimePlusRecent(endpoint: string): Promise<string | null> {
  const pinned = /\/services\/([^/]+)\/[^/]*?(\d{4})\//.exec(endpoint)
  if (!pinned) return null
  const [, folder, year] = pinned
  const base = endpoint.slice(0, endpoint.indexOf("/services/") + "/services/".length)
  try {
    const { status, text } = await lire(`${base}${folder}?f=json`)
    if (status !== 200) return null
    const services = (JSON.parse(text) as { services?: { name?: unknown }[] }).services ?? []
    const newer = services
      .map((s) => (typeof s.name === "string" ? /(\d{4})$/.exec(s.name)?.[1] : undefined))
      .filter((y): y is string => Boolean(y) && Number(y) > Number(year))
      .sort()
    return newer.length > 0 ? newer[newer.length - 1] : null
  } catch {
    return null
  }
}

const LECTURES: Record<string, (probe: Probe) => Promise<Mesure>> = {
  http: sondeHttp,
  opendatasoft: sondeOpendatasoft,
  datagouv: sondeDatagouv,
  arcgis: sondeArcgis,
}

async function verifier(verdict: CatalogueVerdict): Promise<ArmOutcome> {
  const probe = verdict.probe as Probe
  const lecture = LECTURES[probe.lecture]
  if (!lecture) {
    return {
      name: verdict.name,
      exitCode: EXIT.error,
      output: `ERREUR  lecture « ${probe.lecture} » inconnue de scripts/porte/catalogue-verify.ts`,
    }
  }
  try {
    const mesure = await lecture(probe)
    return {
      name: verdict.name,
      exitCode: mesure.exitCode,
      output: `${mesure.ligne}\n        ${probe.endpoint}`,
      ...(mesure.decision ? { expected: mesure.decision } : {}),
    }
  } catch (error) {
    if (isUnreachable(error) || (error as Error)?.name === "TimeoutError") {
      const suspension = suspendu(verdict.name, error)
      return { name: verdict.name, exitCode: suspension.exitCode, output: suspension.ligne }
    }
    return {
      name: verdict.name,
      exitCode: EXIT.error,
      output: `ERREUR  ${String(error).slice(0, 300)}`,
      expected:
        "dire si c'est un défaut d'ici ou une panne amont que ce bras ne sait pas encore " +
        "nommer. Si c'est une panne amont, l'apprendre à `scripts/eval/upstream.ts` — au " +
        "bras, qui tient l'erreur et son code — jamais au rapport, qui ne tient qu'un texte.",
    }
  }
}

/**
 * The coverage of the catalogue itself, reported as an arm of its own.
 *
 * First in the list because it is the only one that does not depend on a network: a run with
 * every endpoint down still says whether the catalogue is fully classified, and that is the
 * half of this ticket that is durable.
 */
function couverture(verdicts: CatalogueVerdict[]): ArmOutcome {
  const nonClassees = verdicts.filter((v) => !estClasse(v.state))
  if (nonClassees.length === 0) {
    const probes = verdicts.filter((v) => v.state === "verifiee").length
    const excuses = verdicts.filter((v) => v.state === "excusee").length
    const hors = verdicts.filter((v) => v.state === "hors-population").length
    return {
      name: "couverture du catalogue",
      exitCode: EXIT.pass,
      output:
        `${verdicts.length} sources au catalogue — ${probes} vérifiées, ${excuses} avec une ` +
        `raison écrite, ${hors} refusées ou écartées. Aucun silence.`,
    }
  }
  return {
    name: "couverture du catalogue",
    exitCode: EXIT.fail,
    output:
      `ÉCHEC — ${nonClassees.length} source(s) du catalogue sans vérification ni raison écrite :\n` +
      nonClassees.map((v) => `  ${v.state}  ${v.name} — ${v.detail}`).join("\n"),
    expected:
      "vérifier la source, ou écrire dans `sans-verification` de scripts/porte/catalogue.json " +
      "pourquoi elle ne l'est pas. Une raison qui se résume à « pas besoin » est le début de " +
      "la complaisance que #71 refuse.",
  }
}

async function main(): Promise<void> {
  const verdicts = catalogueDesSources()
  const outcomes: ArmOutcome[] = [couverture(verdicts)]

  // Sequential rather than parallel, and it is not slowness for its own sake: eleven
  // simultaneous requests, four of them to the same portal, is the shape of a client a public
  // service throttles — and a 429 we caused would be reported as an outage we suffered.
  for (const verdict of verdicts.filter((v) => v.state === "verifiee")) {
    outcomes.push(await verifier(verdict))
  }

  const report = buildReport(outcomes, new Date(), "Catalogue des sources")
  process.stdout.write(report.markdown + "\n")

  const rouges = outcomes.filter((o) => o.exitCode === EXIT.fail || o.exitCode === EXIT.error)
  const bouges = outcomes.filter((o) => o.exitCode === EXIT.unsettled)
  if (rouges.length > 0) {
    process.stdout.write(
      `\nÉCHEC — ${outcomes.length} contrôles, ${rouges.length} en échec, ${bouges.length} suspendu(s) ou changé(s)\n`,
    )
    process.exitCode = EXIT.fail
    return
  }
  if (bouges.length > 0) {
    process.stdout.write(
      `\nINDÉTERMINÉ — ${outcomes.length} contrôles, 0 en échec, ${bouges.length} suspendu(s) ou changé(s)\n`,
    )
    process.exitCode = EXIT.unsettled
    return
  }
  process.stdout.write(`\nPASS — ${outcomes.length} contrôles, tous au vert\n`)
}

await main()
