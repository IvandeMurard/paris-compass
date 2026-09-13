// The arm that plays the served-versus-tracked rule against the published site — #142.
//
//   npm.cmd run servi
//
// The rule lives in ./servi.ts and is played offline by ./servi.test.ts. This file only gathers:
// it reads the route table from the repository, fetches every served bundle, and hands both to
// the rule. Same split as catalogue / catalogue-verify, avis / avis-verify.
//
// **It follows every chunk, not just the first match.** `porte:publie` stops as soon as it finds
// its one value, and that is right for a single needle. Here the population is the whole route
// table: a lazy chunk left unread is a route wrongly called absent, which is exactly how the
// founding measurement produced two false zeroes before it produced a true one.
//
// **Exit codes**, the convention of `scripts/porte/report.ts`:
//   0 le servi porte le suivi · 1 le site publié est en retard sur `main`
//   3 le site n'a pas répondu — panne amont, rien n'a été jugé
//   2 la mesure s'est cassée, ou le reste.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { chunkNames, entryFrom } from "./bundles"
import { readAppSource } from "./sitemap"
import { jetonsAttendus, verdictServi, type Dispense } from "./servi"
import { EXIT } from "./report"

const ROOT = resolve(import.meta.dirname, "../..")
const DISPENSES = resolve(import.meta.dirname, "servi.json")

/** Overridable for the test, which plays against a local stub rather than production. */
const SITE = process.env.PORTE_SERVI_URL ?? "https://paris-compass.lovable.app"

/**
 * Bounds the crawl. Twelve is what `porte:publie` allows; this arm needs every applicative chunk
 * rather than the first hit, so it is raised — but it stays a bound. A gate that harvests a site
 * is a gate somebody switches off.
 */
const MAX_CHUNKS = 24

class Unreachable extends Error {}

function out(line: string): void {
  console.log(line)
}

async function get(url: string): Promise<string> {
  let response: Response
  try {
    // No `cache` option: the Node types this repository builds against do not carry it, and a
    // runner has no HTTP cache to defeat anyway. `porte:publie` fetches the same way.
    response = await fetch(url)
  } catch (error) {
    throw new Unreachable(error instanceof Error ? error.message : String(error))
  }
  if (!response.ok) throw new Unreachable(`HTTP ${response.status}`)
  return await response.text()
}

function lireDispenses(): Dispense[] {
  const brut = JSON.parse(readFileSync(DISPENSES, "utf8")) as Record<string, unknown>
  const liste = brut.dispenses
  if (!Array.isArray(liste)) {
    throw new Error(`${DISPENSES} : la clé « dispenses » manque ou n'est pas un tableau.`)
  }
  for (const d of liste as Dispense[]) {
    if (!d.nom?.trim() || !d.raison?.trim() || !d.mesureLe?.trim()) {
      // An empty reason is a silence, and cadence.json refuses silences for the same reason.
      throw new Error(`${DISPENSES} : une dispense sans route, sans raison ou sans date.`)
    }
  }
  return liste as Dispense[]
}

async function main(): Promise<void> {
  const jetons = jetonsAttendus(readAppSource())
  const dispenses = lireDispenses()

  const html = await get(`${SITE}/`)
  const entry = entryFrom(html)
  if (entry === null) {
    // Deliberately not called upstream: a published page carrying no bundle of ours is either
    // their maintenance page or our build emitting nothing, and both need somebody.
    out("ÉCHEC — la page publiée ne référence aucun bundle sous `/assets/` : rien à mesurer.")
    process.exitCode = EXIT.fail
    return
  }

  const entryUrl = new URL(entry, SITE)
  const entryJs = await get(entryUrl.href)
  const lus = [`${entry} (${entryJs.length} octets)`]
  let js = entryJs

  for (const name of chunkNames(entryJs).slice(0, MAX_CHUNKS)) {
    try {
      const chunk = await get(new URL(name, entryUrl).href)
      js += chunk
      lus.push(`${name} (${chunk.length} octets)`)
    } catch (error) {
      // A chunk that does not answer is named and skipped rather than fatal: the witness rule
      // downstream decides whether what WAS read is enough to judge anything.
      lus.push(`${name} — non lu (${error instanceof Error ? error.message : String(error)})`)
    }
  }

  for (const line of lus) out(`  lu   ${line}`)
  const routes = jetons.filter((j) => j.origine === "route").length
  out(
    `  total ${js.length} octets de JavaScript servi · ${jetons.length} jetons attendus — ` +
      `${routes} routes de src/App.tsx, ${jetons.length - routes} libellés de src/i18n/ui.ts`,
  )

  const verdict = verdictServi(jetons, js, dispenses)

  const muettes = verdict.constats.filter((c) => c.occurrences === 0)
  if (muettes.length > 0) {
    out("\n  Jetons sans occurrence :")
    for (const c of muettes) {
      const quoi = c.discriminant ? "ABSENT" : "non discriminant, ne décide rien"
      // Le nom d'abord : il dit quel fichier ouvrir. Une clé i18n ne se devine pas depuis sa
      // phrase, et une phrase tronquée à vingt-quatre caractères encore moins.
      out(`    ${c.nom.padEnd(30)} ${quoi.padEnd(34)} ${JSON.stringify(c.jeton).slice(0, 60)}`)
    }
  }

  out("")
  if (verdict.issue === "servi") {
    out(`PASS — ${verdict.dire}`)
    return
  }
  if (verdict.issue === "mesure cassée") {
    out(`ERREUR — ${verdict.dire}`)
    process.exitCode = EXIT.error
    return
  }
  out(`ÉCHEC — ${verdict.dire}`)
  process.exitCode = EXIT.fail
}

main().catch((error: unknown) => {
  if (error instanceof Unreachable) {
    out(
      `INDÉTERMINÉ — le site publié n'a pas répondu (${error.message}) : panne amont, ` +
        "rien n'a été jugé. Rejouer.",
    )
    process.exitCode = EXIT.unsettled
    return
  }
  out(`ERREUR — ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = EXIT.error
})
