// Le dixième bras : la porte regarde le site publié, pas seulement le dépôt.
//
// **Pourquoi il existe.** `DIAGNOSTIC.md` §32 a vécu exactement dans l'angle mort que les neuf
// autres bras laissent : ils prouvent que ce dépôt se construit, jamais que ce que Lovable sert
// fonctionne. Les neuf étaient verts pendant que la page publiée ne rendait rien. Le défaut est
// corrigé ; l'angle mort ne l'était pas, jusqu'ici.
//
// **Ce qu'il juge, et rien d'autre :** la référence du projet Supabase est bien figée dans le
// bundle servi. C'est précisément la valeur qui manquait — `const zL=void 0,ob=void 0` — et
// celle dont l'absence est toujours un défaut de ce dépôt, jamais une humeur d'amont.
//
// **Ce qu'il ne juge pas**, écrit ici pour que personne ne lise dans un vert plus qu'il ne porte :
//   - que la page s'affiche. Il y faudrait un navigateur sans tête, écarté par décision — voir
//     `docs/REPRISE.md`, point 2 des recommandations du 2 septembre 2026 ;
//   - les couples `void 0`. Comptés et imprimés, jamais un verdict : une sortie minifiée peut en
//     produire un innocemment, et un rouge qui part sur une coïncidence est un rouge qu'on coupe ;
//   - par quel chemin Lovable a bâti. Un vert dit que les valeurs sont arrivées, pas que la garde
//     `prebuild` a tourné.
//
// **Codes de sortie**, convention des autres bras — `scripts/porte/report.ts` :
//   0 la référence est dans le bundle servi · 1 elle n'y est pas, c'est le §32 qui recommence
//   3 le site n'a pas répondu, ou a répondu sans bundle à lire : panne amont, rien n'a été jugé
//   2 le reste.
//
// **La référence n'est jamais imprimée**, et elle est lue dans `.env` plutôt qu'écrite ici : un
// changement de projet Supabase ne peut donc pas laisser ce bras cautionner l'ancien.
// `scripts/porte/redaction.ts` la masquerait dans le rapport publié, mais c'est une seconde
// ligne, pas la première.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { parseEnv } from "../build/envPublic"

const ROOT = resolve(import.meta.dirname, "../..")

/** Surchargeable pour le test, qui joue contre un bouchon local plutôt que contre la production. */
const SITE = process.env.PORTE_PUBLIE_URL ?? "https://paris-compass.lovable.app"

/** Borne le suivi des chunks : on cherche une valeur, on ne moissonne pas un site. */
const MAX_CHUNKS = 12

function out(line: string): void {
  console.log(line)
}

/** La panne amont a son type, pour que rien en aval ne la confonde avec un échec. */
class Unreachable extends Error {}

function expectedReference(): string {
  const url = parseEnv(readFileSync(resolve(ROOT, ".env"), "utf8")).get("VITE_SUPABASE_URL") ?? ""
  const parsed = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/.exec(url)
  if (!parsed) {
    // Not an upstream failure: the repository cannot say what it is looking for.
    throw new Error("`.env` ne porte pas de `VITE_SUPABASE_URL` exploitable — rien à chercher.")
  }
  return parsed[1]
}

async function get(url: string): Promise<string> {
  let response: Response
  try {
    response = await fetch(url)
  } catch (error) {
    throw new Unreachable(error instanceof Error ? error.message : String(error))
  }
  if (!response.ok) throw new Unreachable(`HTTP ${response.status}`)
  return await response.text()
}

/**
 * Le bundle d'entrée, celui que la page charge elle-même.
 *
 * Restreint à `/assets/` : la page publiée porte aussi des scripts de Lovable (`/~flock.js`)
 * qui ne sont pas notre build et ne prouveraient rien.
 */
export function entryFrom(html: string): string | null {
  return /<script[^>]+src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1] ?? null
}

/**
 * Les chunks qu'un bundle référence, par leur nom haché.
 *
 * Suivis seulement si la référence n'est pas déjà dans l'entrée. C'est ce qui empêche un rouge
 * fragile : le jour où un découpage déplace le client Supabase dans un chunk paresseux —
 * `App-<hash>.js` en est déjà un depuis le §32 — l'entrée seule ne porterait plus rien, et un
 * bras qui ne regarderait qu'elle crierait sur un changement de découpage.
 */
export function chunkNames(js: string): string[] {
  const found = [...js.matchAll(/["'./]([A-Za-z0-9_$-]+-[A-Za-z0-9_-]{8}\.js)\b/g)].map((m) => m[1])
  return [...new Set(found)]
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

async function main(): Promise<void> {
  const reference = expectedReference()

  const html = await get(`${SITE}/`)
  const entry = entryFrom(html)
  if (entry === null) {
    // Ambiguous by nature — it could be a maintenance page of theirs as much as a build of ours
    // that emitted nothing. Called red rather than upstream on purpose: report.ts says guessing
    // in the generous direction is how a gate stops gating, and either cause needs somebody.
    out("ÉCHEC — la page publiée ne référence aucun bundle sous `/assets/` : rien à vérifier.")
    process.exitCode = 1
    return
  }

  const entryUrl = new URL(entry, SITE)
  const entryJs = await get(entryUrl.href)
  let found = occurrences(entryJs, reference)
  const read = [`${entry} (${entryJs.length} octets, ${found} occurrence(s))`]

  if (found === 0) {
    for (const name of chunkNames(entryJs).slice(0, MAX_CHUNKS)) {
      const js = await get(new URL(name, entryUrl).href)
      const here = occurrences(js, reference)
      read.push(`${name} (${js.length} octets, ${here} occurrence(s))`)
      found += here
      if (found > 0) break
    }
  }

  const voids = (entryJs.match(/const [A-Za-z$_][\w$]*=void 0,[A-Za-z$_][\w$]*=void 0/g) ?? []).length

  for (const line of read) out(`  lu   ${line}`)
  out(`  note couples \`void 0\` dans l'entrée : ${voids} — compté, pas jugé`)

  if (found === 0) {
    out(
      `ÉCHEC — la référence du projet Supabase n'est dans aucun des ${read.length} bundle(s) servis : ` +
        "le build publié n'a pas eu sa configuration, la page est muette. C'est `DIAGNOSTIC.md` §32.",
    )
    process.exitCode = 1
    return
  }

  out(`PASS — la configuration est figée dans le bundle servi, ${read.length} bundle(s) lus.`)
}

main().catch((error: unknown) => {
  if (error instanceof Unreachable) {
    out(
      `INDÉTERMINÉ — le site publié n'a pas répondu (${error.message}) : panne amont, ` +
        "rien n'a été jugé. Rejouer.",
    )
    process.exitCode = 3
    return
  }
  out(`ERREUR — ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 2
})
