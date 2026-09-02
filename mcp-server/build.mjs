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
import { rmSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { esbuildInvocation } from "../scripts/esbuildInvocation.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "..")
const OUT = join(HERE, "dist", "server.mjs")

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

process.stdout.write(`dist/server.mjs écrit.\n`)
