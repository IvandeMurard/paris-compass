// Le bundle publié — `dist/server.mjs`, le fichier que `bin` désigne.
//
// **Pourquoi un bundle et pas les sources.** `src/index.ts` atteint `../src/core`, qui vit dans
// le dépôt et non dans ce paquet : publier les sources livrerait un serveur qui ne démarre pas.
// esbuild replie le noyau partagé dans le fichier, et laisse dehors les trois dépendances
// réelles (`--packages=external`), que npm installera depuis `dependencies`.
//
// Même invocation d'esbuild que `scripts/verify-mcp.mjs`, par le même module : `bin/esbuild`
// est un script Node sur Windows et le binaire natif ailleurs, et s'être trompé là-dessus a
// tenu un bras de la porte rouge deux jours — DIAGNOSTIC.md §33.

import { spawnSync } from "node:child_process"
import { copyFileSync, rmSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { esbuildInvocation } from "../scripts/esbuildInvocation.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "..")
const OUT = join(HERE, "dist", "server.mjs")
const PACKAGED_FROM_ROOT = ["LICENSE", "NOTICE"]

rmSync(join(HERE, "dist"), { recursive: true, force: true })

const { command, args } = esbuildInvocation(join(ROOT, "node_modules", "esbuild", "bin", "esbuild"))

const result = spawnSync(
  command,
  [
    ...args,
    join(HERE, "src", "index.ts"),
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--packages=external",
    `--outfile=${OUT}`,
    // `bin` pointe ici : sans shebang, un shell POSIX exécuterait du JavaScript comme un script
    // shell. npm pose le bit d'exécution, pas l'en-tête.
    "--banner:js=#!/usr/bin/env node",
    "--log-level=warning",
  ],
  { stdio: "inherit" },
)

if (result.status !== 0) {
  process.stderr.write("\nLe bundle du serveur MCP n'a pas été produit.\n")
  process.exit(result.status ?? 1)
}

// The licence and its notice live at the repository root, and npm only ships what sits in the
// package folder: 0.1.3 went out with neither (`dist.fileCount` 3, measured 9 October 2026,
// #255). Copied at each build rather than tracked twice, so the published copy cannot drift.
for (const name of PACKAGED_FROM_ROOT) copyFileSync(join(ROOT, name), join(HERE, name))

process.stdout.write(`dist/server.mjs écrit, ${PACKAGED_FROM_ROOT.join(" et ")} copiés.\n`)
