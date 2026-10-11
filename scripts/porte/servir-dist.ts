// A static server for `dist/`, so the fourteenth arm can be played against a build of `main` —
// w1-servi-contenu (#217).
//
//     npm.cmd run build
//     npx tsx scripts/porte/servir-dist.ts dist 8788
//     $env:PORTE_SERVI_URL = "http://127.0.0.1:8788" ; npm.cmd run servi
//
// **Why this exists rather than a committed fixture.** #217 asks the arm to be proved in BOTH
// senses: red against a stale production, green against what the repository itself builds. The
// red half is kept as a witness (`servi-temoin-2026-09-17.json`) because production republishes
// and the case would vanish. The green half cannot be a fixture — a `dist/` is a megabyte of
// generated output that no repository should track, and a fixture of it would be stale within
// the day. So the green half is a GESTURE, and this file is what makes the gesture one command
// rather than a paragraph of prose nobody replays.
//
// It is deliberately not an npm script: a script in `package.json` must be planned on a workflow
// or carry a written reason in `scripts/porte/cadence.json` (#70, #71), and a developer tool run
// by hand during a demonstration is neither. It is invoked by path, like a probe.
//
// No dependency, no directory traversal beyond the root it is given, and it serves nothing it
// cannot read. It is a demonstration aid, not a production server.

import { createServer } from "node:http"
import { existsSync, readFileSync, statSync } from "node:fs"
import { extname, join, resolve, sep } from "node:path"

const TYPES: Record<string, string> = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
}

const racine = resolve(process.argv[2] ?? "dist")
const port = Number(process.argv[3] ?? 8788)

if (!existsSync(racine)) {
  console.error(`${racine} n'existe pas — lancer \`npm.cmd run build\` d'abord.`)
  process.exit(2)
}

createServer((requete, reponse) => {
  const chemin = decodeURIComponent((requete.url ?? "/").split("?")[0])
  const cible = chemin === "/" ? join(racine, "index.html") : resolve(racine, `.${chemin}`)

  // Le serveur ne sort pas de sa racine, même si on le lui demande poliment.
  if (!cible.startsWith(racine + sep) && cible !== join(racine, "index.html")) {
    reponse.writeHead(403).end("hors racine")
    return
  }
  if (!existsSync(cible) || !statSync(cible).isFile()) {
    reponse.writeHead(404).end("non trouvé")
    return
  }
  reponse.writeHead(200, { "content-type": TYPES[extname(cible)] ?? "application/octet-stream" })
  reponse.end(readFileSync(cible))
}).listen(port, () => {
  console.log(`sert ${racine} sur http://127.0.0.1:${port} — Ctrl+C pour arrêter`)
})
