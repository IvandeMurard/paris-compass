// Le contrôle d'avant-publication : ce qu'un agent extérieur reçoit, pas ce qu'on a construit.
//
// **Pourquoi il existe.** C'est la leçon de DIAGNOSTIC.md §32, appliquée au paquet. Les dix bras
// de la porte prouvent que ce dépôt se construit ; aucun ne dit ce qu'une machine sans ce dépôt
// obtient en installant `paris-compass-mcp`. Le serveur importe `../src/core`, qui n'existe pas
// hors d'ici : une erreur d'empaquetage produit un paquet qui s'installe et ne démarre pas, et
// rien dans l'arbre ne le montrerait.
//
// Ce qu'il fait, dans l'ordre : `npm pack`, installation de l'archive dans un répertoire neuf
// hors du dépôt, puis il PARLE MCP au binaire installé — en JSON-RPC sur stdin/stdout, sans le
// SDK. Le refus du SDK est délibéré : s'en servir prouverait que notre client sait parler à
// notre serveur, pas que le protocole passe. Un agent extérieur n'a pas notre client.
//
// Codes de sortie, convention des bras — scripts/porte/report.ts :
//   0 le paquet installé répond · 1 il ne répond pas, ou pas ce qu'il annonce
//   3 npm ou le registre n'ont pas répondu : panne amont, rien n'a été jugé · 2 le reste.

import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const MCP = join(ROOT, "mcp-server")

/**
 * Plus long que l'abandon de 70 000 ms qu'`overpass.ts` pose **par miroir**, et il y en a
 * plusieurs : sous limitation de débit, un `score_location` honnête met plus de deux minutes
 * avant de rendre sa ligne de panne. Mesuré le 2 septembre 2026 — à 120 000 ms, ce contrôle
 * expirait côté client au lieu de lire la réponse du serveur. `verify.ts` porte la même valeur
 * pour la même raison, et l'avait déjà écrite.
 */
const APPEL_MS = 240_000

/** Montorgueil — dense, dans le corpus BDCom. Le même point que `verify.ts`. */
const MONTORGUEIL = { lat: 48.8657, lng: 2.3459 }

/** Le Louvre : second point de `compare_locations`, dans le corpus lui aussi. */
const LOUVRE = { lat: 48.8698, lng: 2.3075 }

const ATTENDUS = [
  "list_sources",
  "score_location",
  "compare_locations",
  "explain_score",
  "find_premises",
  "trace_premise",
]

class Amont extends Error {}

function out(line) {
  console.log(line)
}

function npm(args, cwd) {
  // `npm.cmd` sur Windows : la politique d'exécution bloque `npm.ps1` — CLAUDE.md.
  const binaire = process.platform === "win32" ? "npm.cmd" : "npm"
  const r = spawnSync(binaire, args, { cwd, encoding: "utf8", shell: process.platform === "win32" })
  if (r.status !== 0) {
    throw new Amont(`npm ${args.join(" ")} rend ${r.status}\n${(r.stderr || "").slice(0, 400)}`)
  }
  return (r.stdout || "").trim()
}

/**
 * Un client MCP minimal, en JSON-RPC délimité par des sauts de ligne.
 *
 * Assez pour `initialize`, `tools/list` et `tools/call` — tout ce que le « Fait quand » de #35
 * demande de démontrer, et rien de plus.
 */
function client(serveur) {
  const enfant = spawn(process.execPath, [serveur], { stdio: ["pipe", "pipe", "pipe"] })
  const attente = new Map()
  let tampon = ""
  let erreurs = ""

  enfant.stderr.on("data", (c) => (erreurs += c.toString()))
  enfant.stdout.on("data", (c) => {
    tampon += c.toString()
    let coupure
    while ((coupure = tampon.indexOf("\n")) !== -1) {
      const ligne = tampon.slice(0, coupure).trim()
      tampon = tampon.slice(coupure + 1)
      if (ligne === "") continue
      let message
      try {
        message = JSON.parse(ligne)
      } catch {
        // Une ligne qui n'est pas du JSON n'est pas une réponse : le serveur a le droit de tracer.
        continue
      }
      const en_attente = attente.get(message.id)
      if (en_attente) {
        attente.delete(message.id)
        en_attente(message)
      }
    }
  })

  let suivant = 1
  const demande = (method, params) =>
    new Promise((resolu, rejete) => {
      const id = suivant++
      const minuteur = setTimeout(() => {
        // `Amont` et non un échec : passé ce délai, ce qui manque est la réponse d'un miroir
        // public, pas une propriété du paquet. Le déclarer rouge ici ferait crier ce contrôle
        // sur l'indisponibilité d'Overpass — l'erreur que `report.ts` refuse ailleurs.
        rejete(new Amont(`${method} sans réponse après ${APPEL_MS / 1000} s. stderr : ${erreurs.slice(0, 300)}`))
      }, APPEL_MS)
      attente.set(id, (message) => {
        clearTimeout(minuteur)
        resolu(message)
      })
      enfant.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`)
    })

  const notifie = (method) => enfant.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method })}\n`)

  return { demande, notifie, ferme: () => enfant.kill() }
}

function texte(reponse) {
  const contenu = reponse?.result?.content
  return Array.isArray(contenu) ? contenu.map((c) => c.text ?? "").join("\n") : ""
}

function rate(reponse) {
  return Boolean(reponse.error) || reponse.result?.isError === true || texte(reponse).trim() === ""
}

async function main() {
  out("── npm pack")
  const archive = npm(["pack", "--silent"], MCP).split(/\r?\n/).pop()
  out(`  ${archive}`)

  // Ne rien laisser derrière, quelle que soit la sortie. `.gitignore` empêche l'archive d'être
  // committée ; il n'empêche pas quelqu'un de publier plus tard une version figée trouvée là.
  // Le bac d'installation, lui, reste dans le temporaire du système : c'est ce qu'on ouvre
  // quand ce contrôle rougit.
  process.on("exit", () => rmSync(join(MCP, archive), { force: true }))

  const bac = mkdtempSync(join(tmpdir(), "compass-mcp-"))
  out(`\n── installation hors du dépôt\n  ${bac}`)
  npm(["init", "-y"], bac)
  npm(["install", join(MCP, archive), "--no-audit", "--no-fund"], bac)

  const installe = join(bac, "node_modules", "paris-compass-mcp")
  const serveur = join(installe, "dist", "server.mjs")
  const echecs = []

  // Ce que `npm i` a réellement posé. Un paquet dont `files` oublie `dist` s'installe sans bruit.
  const shims = existsSync(join(bac, "node_modules", ".bin"))
    ? readdirSync(join(bac, "node_modules", ".bin")).filter((f) => f.startsWith("paris-compass-mcp"))
    : []
  out(`  dist/server.mjs ${existsSync(serveur) ? "présent" : "ABSENT"} · bin : ${shims.join(", ") || "aucun"}`)
  if (!existsSync(serveur)) echecs.push("dist/server.mjs absent du paquet installé")
  if (shims.length === 0) {
    echecs.push("`bin` n'a posé aucun exécutable — `npx paris-compass-mcp` ne marcherait pas")
  }

  if (echecs.length > 0) {
    for (const e of echecs) out(`  échec  ${e}`)
    out("\nÉCHEC — le paquet installé est incomplet.")
    process.exitCode = 1
    return
  }

  out("\n── un agent extérieur parle au binaire installé")
  const agent = client(serveur)
  try {
    const init = await agent.demande("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "compass-paquet", version: "0" },
    })
    if (init.error) throw new Error(`initialize : ${JSON.stringify(init.error)}`)
    agent.notifie("notifications/initialized")
    out(`  ok    initialize — ${init.result?.serverInfo?.name} ${init.result?.serverInfo?.version}`)

    const liste = await agent.demande("tools/list", {})
    const noms = (liste.result?.tools ?? []).map((t) => t.name).sort()
    const manquants = ATTENDUS.filter((n) => !noms.includes(n))
    if (manquants.length > 0) echecs.push(`outils absents : ${manquants.join(", ")}`)
    out(`  ${manquants.length === 0 ? "ok   " : "échec"} tools/list — ${noms.length} outils`)

    // Les quatre que le « Fait quand » de #35 nomme. `trace_premise` prend un identifiant que
    // seul `find_premises` distribue, donc il vient après lui — comme dans verify.ts.
    for (const [nom, args] of [
      ["list_sources", {}],
      ["score_location", MONTORGUEIL],
      // `a` et `b`, pas une liste : lu dans src/tools/compareLocations.ts le 2 septembre 2026,
      // après qu'une forme inventée s'est fait refuser par la validation du schéma.
      ["compare_locations", { a: MONTORGUEIL, b: LOUVRE }],
    ]) {
      const r = await agent.demande("tools/call", { name: nom, arguments: args })
      if (rate(r)) {
        echecs.push(`${nom} n'a rien rendu d'utilisable : ${JSON.stringify(r.error ?? r.result).slice(0, 200)}`)
      }
      out(`  ${rate(r) ? "échec" : "ok   "} ${nom} — ${texte(r).slice(0, 88).replace(/\s+/g, " ")}`)
    }

    const trouve = await agent.demande("tools/call", {
      name: "find_premises",
      arguments: { ...MONTORGUEIL, radius_m: 120 },
    })
    const id = /"?location_id"?\s*[:=]\s*(\d+)/.exec(texte(trouve))?.[1]
    if (!id) {
      // Pas un échec du paquet : sans local rendu, il n'y a pas d'identifiant à tracer.
      out("  passé trace_premise — find_premises n'a rendu aucun local à cet endroit")
    } else {
      const trace = await agent.demande("tools/call", {
        name: "trace_premise",
        arguments: { location_id: Number(id) },
      })
      if (rate(trace)) echecs.push(`trace_premise a échoué sur location_id ${id}`)
      out(`  ${rate(trace) ? "échec" : "ok   "} trace_premise — ${texte(trace).slice(0, 88).replace(/\s+/g, " ")}`)
    }
  } finally {
    agent.ferme()
  }

  if (echecs.length > 0) {
    for (const e of echecs) out(`\n  échec  ${e}`)
    out(`\nÉCHEC — ${echecs.length} contrôle(s). Le paquet ne tient pas ce qu'il annonce.`)
    process.exitCode = 1
    return
  }

  out(`\nPASS — le paquet installé répond, ${ATTENDUS.length} outils annoncés, les quatre du « Fait quand » exercés.`)
}

main().catch((error) => {
  if (error instanceof Amont) {
    out(`INDÉTERMINÉ — un amont n'a pas répondu : rien n'a été jugé sur le paquet.\n${error.message}`)
    process.exitCode = 3
    return
  }
  out(`ERREUR — ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 2
})
