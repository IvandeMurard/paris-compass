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
// **And TRANSITIVELY, since #217.** Until then the crawl read the entry and the chunks the ENTRY
// names — one level. A chunk that names a chunk was never followed, and in this application that
// is every screen: each page is `lazy(() => import(...))` behind the `App` chunk, so the names
// live one level down. Measured on 17 September 2026: one level reached **1 chunk of the 29** a
// build of `main` emits — 611 440 octets of 1 247 018 — and on production 2 files of 21, 772 856
// octets of 1 196 859. Four hundred thousand octets of served JavaScript the arm was calling
// absent without ever having asked for them. It stayed green because the route table happens to
// live in the entry; the widened population of #217 would have gone red on forty percent of the
// site for no reason at all.
//
// ── Playing it against a build of `main`, which is how the green half is demonstrated ─────
//
// `PORTE_SERVI_URL` points the arm anywhere, and a `dist/` cannot be committed, so the green
// side of #217's criterion 2 is a gesture rather than a fixture — four commands, reproducible:
//
//     npm.cmd run build
//     npx tsx scripts/porte/servir-dist.ts dist 8788
//     $env:PORTE_SERVI_URL = "http://127.0.0.1:8788" ; npm.cmd run servi
//
// Measured on 17 September 2026: **1 247 018 octets in 30 chunks, 1 168 tokens of 1 168 found,
// PASS, exit 0** — against **1 196 859 octets in 21 files, 758 of 1 168, ÉCHEC, exit 1** on
// production the same hour. Both senses, an hour apart, same population.
//
// **Exit codes**, the convention of `scripts/porte/report.ts`:
//   0 le servi porte le suivi · 1 le site publié est en retard sur `main`
//   3 le site n'a pas répondu — panne amont, rien n'a été jugé
//   2 la mesure s'est cassée, ou le reste.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { chunkNames, entryFrom } from "./bundles"
import { readAppSource } from "./sitemap"
import { proseDuDepot } from "./prose"
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
 *
 * Sixty since #217, because the crawl became transitive and the bound now covers the whole graph
 * rather than one level: a build of `main` emits **29** chunks on 17 September 2026 and
 * production serves **21**, so sixty is a little over twice the measured need. It is a fuse, not
 * a target — if a build ever reaches it the arm should say so rather than quietly read half.
 */
const MAX_CHUNKS = 60

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
  const prose = proseDuDepot()
  const jetons = jetonsAttendus(readAppSource(), prose.brins)
  const dispenses = lireDispenses()

  // La population avant la mesure : ce qui suit ne vaut que si l'on peut la recompter.
  out(
    `  population  ${prose.modules.length} modules atteignables depuis src/main.tsx, dont ` +
      `${prose.modulesParlants.length} portent de la prose · ${prose.brins.length} chaînes ` +
      `choisies par langue, ${prose.interpoles} modèle(s) interpolé(s) écarté(s)`,
  )

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

  // Breadth-first over the chunk graph, each name fetched once. The queue is what makes it
  // transitive: a chunk that names another puts it in line rather than dropping it.
  // L'entrée s'auto-nomme — un `import.meta.url` ou un préchargement suffit — et sans elle dans
  // le jeu déjà demandé, le bras la relisait une seconde fois : le plus gros fichier du site
  // téléchargé pour rien, et ses octets comptés deux fois dans le total imprimé.
  const demandes = new Set<string>([entry.split("/").pop() as string])
  const file: string[] = []
  for (const name of chunkNames(entryJs)) {
    if (demandes.has(name)) continue
    demandes.add(name)
    file.push(name)
  }
  while (file.length > 0 && demandes.size <= MAX_CHUNKS) {
    const name = file.shift() as string
    try {
      const chunk = await get(new URL(name, entryUrl).href)
      js += chunk
      lus.push(`${name} (${chunk.length} octets)`)
      for (const suivant of chunkNames(chunk)) {
        if (demandes.has(suivant) || demandes.size > MAX_CHUNKS) continue
        demandes.add(suivant)
        file.push(suivant)
      }
    } catch (error) {
      // A chunk that does not answer is named and skipped rather than fatal: the witness rule
      // downstream decides whether what WAS read is enough to judge anything.
      lus.push(`${name} — non lu (${error instanceof Error ? error.message : String(error)})`)
    }
  }
  if (file.length > 0) {
    // Saying it out loud rather than reading half in silence: an unread chunk is a token wrongly
    // called absent, and the reader must know the measurement was cut short.
    out(`  ATTENTION — borne de ${MAX_CHUNKS} morceaux atteinte, ${file.length} non demandé(s).`)
  }

  for (const line of lus) out(`  lu   ${line}`)
  const routes = jetons.filter((j) => j.origine === "route").length
  const modules = new Set(jetons.map((j) => j.fichier).filter((f): f is string => f !== null))
  out(
    `  total ${js.length} octets de JavaScript servi · ${jetons.length} jetons attendus — ` +
      `${routes} routes de src/App.tsx, ${jetons.length - routes} chaînes rendues par langue ` +
      `dans ${modules.size} modules atteignables depuis src/main.tsx`,
  )

  const verdict = verdictServi(jetons, js, dispenses)

  const muettes = verdict.constats.filter((c) => c.occurrences === 0)
  if (muettes.length > 0) {
    // Depuis #217 la population dépasse le millier, donc un retard se compte en centaines de
    // lignes. Le récapitulatif par module passe en premier parce que c'est lui le diagnostic :
    // « 108 dans modeText.ts » nomme la fusion restée en soute, là où cent huit phrases
    // tronquées ne nomment rien. Le détail suit, borné, et le bras dit qu'il l'a borné.
    out("\n  Jetons sans occurrence, par module :")
    const parFichier = new Map<string, { absents: number; temoins: number }>()
    for (const c of muettes) {
      const ou = c.fichier ?? "src/App.tsx"
      const ligne = parFichier.get(ou) ?? { absents: 0, temoins: 0 }
      if (c.discriminant) ligne.absents += 1
      else ligne.temoins += 1
      parFichier.set(ou, ligne)
    }
    for (const [fichier, { absents, temoins }] of [...parFichier].sort(
      (a, b) => b[1].absents - a[1].absents || a[0].localeCompare(b[0]),
    )) {
      out(`    ${String(absents).padStart(4)} ABSENT · ${String(temoins).padStart(4)} non discriminant(s)   ${fichier}`)
    }

    const DETAIL = 40
    out(`\n  Détail (${Math.min(muettes.length, DETAIL)} sur ${muettes.length}) :`)
    for (const c of muettes.slice(0, DETAIL)) {
      const quoi = c.discriminant ? "ABSENT" : "non discriminant, ne décide rien"
      // Le nom d'abord : il dit quel fichier ouvrir. Une clé i18n ne se devine pas depuis sa
      // phrase, et une phrase tronquée à vingt-quatre caractères encore moins.
      out(`    ${c.nom.padEnd(52)} ${quoi.padEnd(34)} ${JSON.stringify(c.jeton).slice(0, 60)}`)
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
