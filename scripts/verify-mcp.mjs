// npm.cmd run verify:mcp — the gate the MCP server did not have.
//
// Three steps, in the order w0-mcp-verif sets: typecheck the server, then build it, then
// exercise it against the remote and assert. The first two are cheap and catch the class of
// break that made this ticket exist — w0-provenance changed `scoreLocation`'s signature under a
// package no root script ever compiled.
//
// Plain .mjs, run by `node` directly, and it bundles with the root esbuild rather than calling
// tsx. Two reasons, both measured: `npx tsx` does not start on the machine this repository is
// developed on (an application-control policy blocks esbuild 0.28.2 inside
// mcp-server/node_modules — docs/REPRISE.md), and a gate that only runs where tsx happens to
// work is a gate that will be skipped. The root esbuild 0.25.12 runs everywhere — but HOW it is
// launched is not the same everywhere, and assuming it was cost this arm two days: see #74 and
// scripts/esbuildInvocation.mjs.
//
// The typecheck is not the root `tsc --build`: mcp-server/tsconfig.json is its own project, and
// a stricter one — `strict: true` and `noUnusedLocals`, against the app project's `strict:
// false`. It also pulls in ../src/core, so this step typechecks the shared core under the
// harder settings the front does not apply to it.

import { spawnSync } from "child_process"
import { existsSync } from "fs"
import { dirname, join, resolve } from "path"
import { fileURLToPath } from "url"

import { esbuildInvocation } from "./esbuildInvocation.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const MCP = join(ROOT, "mcp-server")
const BUILD = join(MCP, ".build")

function step(label, command, args, options = {}) {
  process.stdout.write(`\n── ${label}\n`)
  const result = spawnSync(command, args, { stdio: "inherit", cwd: ROOT, ...options })
  if (result.error) {
    process.stderr.write(`${label} : ${result.error.message}\n`)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.stderr.write(`\n${label} — échec (code ${result.status})\n`)
    process.exit(result.status ?? 1)
  }
  return result
}

if (!existsSync(join(MCP, "node_modules"))) {
  process.stderr.write(
    "mcp-server/node_modules est absent. Lancer `npm.cmd install` depuis mcp-server/ avant ce script.\n",
  )
  process.exit(1)
}

// The server reads its own .env for SUPABASE_URL / SUPABASE_ANON_KEY — the publishable key the
// browser also ships, never a service key. That is the trust boundary I11 holds, and it is why
// this gate needs no privileged secret: it exercises exactly what an anonymous visitor reaches.
if (!existsSync(join(MCP, ".env"))) {
  process.stderr.write(
    "mcp-server/.env est absent. Copier mcp-server/.env.example et y mettre l'URL du projet et la\n" +
      "clé publiable (jamais une clé de service : le serveur MCP est un appelant anonyme).\n",
  )
  process.exit(1)
}

const tsc = join(ROOT, "node_modules", "typescript", "bin", "tsc")
step("typecheck du serveur MCP (strict, ../src/core compris)", process.execPath, [
  tsc,
  "--noEmit",
  "-p",
  join(MCP, "tsconfig.json"),
])

// --smoke swaps the asserting gate for the printing one. Same typecheck, same build: the smoke
// test is worth reading when a rule has broken and you want to see the raw answers, but it
// decides nothing. `npm.cmd run smoke:mcp`.
const smoke = process.argv.includes("--smoke")
const runner = smoke ? "smoke-test" : "verify"

// esbuild ships `bin/esbuild` as a Node shim on Windows and as the native binary everywhere
// else, so `node <that path>` is right on one system and fatal on the others — #74, which held
// this arm red from 1 to 2 September 2026. The invocation is READ from the file rather than
// deduced from `process.platform`; scripts/esbuildInvocation.mjs holds the rule and plays both
// branches on whichever machine runs the tests.
const { command: esbuildCommand, args: esbuildArgs } = esbuildInvocation(
  join(ROOT, "node_modules", "esbuild", "bin", "esbuild"),
)
for (const [entry, out] of [["index", "server"], [runner, runner]]) {
  step(`build ${entry}.ts`, esbuildCommand, [
    ...esbuildArgs,
    join(MCP, "src", `${entry}.ts`),
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--packages=external",
    `--outfile=${join(BUILD, `${out}.mjs`)}`,
    "--log-level=warning",
  ])
}

// Run from mcp-server/ so the bundled server resolves its own node_modules and its own .env.
step(
  smoke ? "smoke test — lecture, pas contrôle" : "contrôles de conformité, contre le distant",
  process.execPath,
  [join(BUILD, `${runner}.mjs`)],
  { cwd: MCP },
)
