// The arm that plays the advisories rule against what npm actually reports today.
//
//   npm.cmd run avis
//
// The rule itself lives in ./avis.ts and is played offline by ./avis.test.ts. This file only
// gathers: it asks npm what it knows, joins each advisory to what the lockfile says about
// scope, reads the few files a verdict claims to depend on, and hands all of it to the rule.
//
// Why the gathering is here and the deciding is there: the decision must be testable without a
// network, and `test` carries no secret and no registry. Same split as catalogue / catalogue-verify.

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { borneCorrigee, estRouge, lireRegistre, verdicts, type Avis } from "./avis"
import { EXIT } from "./report"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "..", "..")
const REGISTRE = join(HERE, "avis.json")

/** The two manifests this repository ships. The MCP server has its own, and it is published. */
const MANIFESTES = [
  { nom: "package-lock.json", dossier: ROOT },
  { nom: "mcp-server/package-lock.json", dossier: join(ROOT, "mcp-server") },
]

interface AuditVia {
  source?: number
  name?: string
  title?: string
  url?: string
  severity?: string
  range?: string
}

interface AuditEntree {
  name: string
  severity: string
  via: (AuditVia | string)[]
  nodes?: string[]
  fixAvailable?: boolean | { name: string; version: string; isSemVerMajor: boolean }
}

/**
 * Asks npm. Returns null when npm could not answer at all — a registry outage is not a defect
 * of this repository, and an arm that reds on one is an arm that gets muted within a fortnight.
 */
function auditer(dossier: string): Record<string, AuditEntree> | null {
  let brut: string
  try {
    // `npm audit` exits 1 when it FINDS something: a non-zero status here is expected, and the
    // output is what decides. Only unparseable output means npm could not answer.
    brut = execFileSync("npm", ["audit", "--json"], {
      cwd: dossier,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      shell: process.platform === "win32",
    })
  } catch (erreur) {
    const sortie = (erreur as { stdout?: string }).stdout
    if (!sortie) return null
    brut = sortie
  }
  try {
    const rapport = JSON.parse(brut) as { vulnerabilities?: Record<string, AuditEntree> }
    return rapport.vulnerabilities ?? {}
  } catch {
    return null
  }
}

/** True when the lockfile marks every path to this package as development-only. */
function estDeDeveloppement(dossier: string, nodes: string[]): boolean {
  const chemin = join(dossier, "package-lock.json")
  if (!existsSync(chemin) || nodes.length === 0) return false
  const paquets = (JSON.parse(readFileSync(chemin, "utf8")) as {
    packages?: Record<string, { dev?: boolean }>
  }).packages
  if (!paquets) return false
  return nodes.every((n) => paquets[n]?.dev === true)
}

function rassembler(): Avis[] | null {
  const tous: Avis[] = []
  for (const { nom, dossier } of MANIFESTES) {
    const vulnerabilites = auditer(dossier)
    if (vulnerabilites === null) return null
    for (const entree of Object.values(vulnerabilites)) {
      for (const via of entree.via) {
        // A string in `via` names another package in the same chain, not an advisory. The
        // advisory objects carry the GHSA url, and they are the only ones worth judging.
        if (typeof via === "string" || !via.url) continue
        const ghsa = via.url.split("/").pop() ?? via.url
        if (tous.some((a) => a.ghsa === ghsa && a.manifeste === nom)) continue
        const correctif = entree.fixAvailable
        tous.push({
          ghsa,
          paquet: via.name ?? entree.name,
          severite: via.severity ?? entree.severity,
          titre: via.title ?? "",
          plage: via.range ?? "",
          borneCorrigee: borneCorrigee(via.range ?? ""),
          proposeParNpm: typeof correctif === "object" ? correctif.version : null,
          proposeUneMajeure: typeof correctif === "object" && correctif.isSemVerMajor,
          developpement: estDeDeveloppement(dossier, entree.nodes ?? []),
          manifeste: nom,
        })
      }
    }
  }
  return tous
}

/** Reads only the files some verdict claims to rest on. Absent file: absent text, never a throw. */
function contenusInvoques(registre: ReturnType<typeof lireRegistre>): Record<string, string> {
  const contenus: Record<string, string> = {}
  for (const juge of Object.values(registre.juges)) {
    for (const chemin of juge.invalideSi?.dans ?? []) {
      if (chemin in contenus) continue
      const absolu = join(ROOT, chemin)
      if (existsSync(absolu)) contenus[chemin] = readFileSync(absolu, "utf8")
    }
  }
  return contenus
}

const registre = lireRegistre(REGISTRE)
const avis = rassembler()

if (avis === null) {
  process.stdout.write(
    "INDÉTERMINÉ — npm n'a pas répondu. Le registre des avis n'est pas interrogeable sans lui,\n" +
      "et une panne du registre npm n'est pas un défaut de ce dépôt.\n",
  )
  process.exit(EXIT.unsettled)
}

const rendus = verdicts(avis, registre, contenusInvoques(registre))
const rouges = rendus.filter(estRouge)

for (const a of avis) {
  const portee = a.developpement ? "développement" : "exécution"
  process.stdout.write(`\n${a.ghsa} · ${a.paquet} · ${a.severite} · ${portee} · ${a.manifeste}\n`)
  if (a.titre) process.stdout.write(`  ${a.titre}\n`)
  process.stdout.write(`  plage vulnérable : ${a.plage}\n`)
  // Both numbers, side by side, always — this is the four days that CLAUDE.md refuses to lose
  // again. The range bound comes first because it is the one that is usually right.
  process.stdout.write(`  la plus petite version qui corrige : ${a.borneCorrigee ?? "illisible"}\n`)
  if (a.proposeParNpm) {
    const ecart =
      a.proposeUneMajeure && a.proposeParNpm !== a.borneCorrigee
        ? "  ← une MAJEURE, et plus haute que la borne. Regarder la borne d'abord."
        : ""
    process.stdout.write(`  ce que « npm audit fix --force » installerait : ${a.proposeParNpm}${ecart}\n`)
  }
}

process.stdout.write("\n── Verdicts ────────────────────────────────────────────────\n")
for (const v of rendus) {
  process.stdout.write(`${estRouge(v) ? "ROUGE" : "  ok "}  ${v.ghsa} · ${v.paquet}\n`)
  process.stdout.write(`        ${v.dire}\n`)
}

if (rouges.length === 0) {
  process.stdout.write(
    `\nPASS — ${avis.length} avis, tous jugés et écrits, aucun atteignable.\n` +
      "Rappel de ce que ça ne rattrape pas : le registre dit qu'un verdict EXISTE, jamais qu'il\n" +
      "est vrai, et il ne voit que ce que npm publie.\n",
  )
  process.exit(EXIT.pass)
}

process.stdout.write(
  `\nÉCHEC — ${rouges.length} avis sur ${rendus.length} sans verdict tenable.\n` +
    "Un avis se juge sur son ATTEIGNABILITÉ dans ce produit, jamais sur son score : un CVSS est\n" +
    "calculé sans rien savoir d'ici. Lire l'avis, écrire le verdict dans scripts/porte/avis.json\n" +
    "avec sa date et la condition qui l'annulerait — ou monter la dépendance.\n",
)
process.exit(EXIT.fail)
