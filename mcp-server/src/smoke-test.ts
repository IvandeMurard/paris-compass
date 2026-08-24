// Manual end-to-end check: spawns the server as a real MCP client would, calls every tool
// against a real point in Paris, and prints the responses. Not part of the server itself.
//
//   npm.cmd run smoke:mcp        # from the repository root
//
// This file *prints*; it does not assert. It is the one to read when you want to see what an
// agent actually receives. The gate that decides whether the server still honours its rules is
// verify.ts — `npm.cmd run verify:mcp`. Do not mistake this one for a control: it exits 0 as
// long as nothing throws, which it would do just as happily if every figure were wrong.

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const MONTORGUEIL = { lat: 48.8657, lng: 2.3459 } // dense commercial centre
const QUIET_RESIDENTIAL = { lat: 48.8636, lng: 2.3891 } // eastern 20e, quieter

/** `callTool`'s result type is a broad union (content vs. legacy toolResult) — narrowed here once. */
function textOf(result: unknown): string {
  const content = (result as { content?: unknown } | undefined)?.content
  if (!Array.isArray(content) || typeof (content[0] as { text?: unknown })?.text !== "string") {
    throw new Error(`Unexpected tool result shape: ${JSON.stringify(result)}`)
  }
  return (content[0] as { text: string }).text
}

// Longer than the 70 000 ms abort overpass.ts sets on each mirror. The SDK default is 60 000 —
// shorter than the server's own patience, so a mirror answering at 65 s used to surface as a
// client-side timeout rather than as the result or as the server's honest failure row.
const CALL_TIMEOUT_MS = 240_000

// The bundle, not `npx tsx`: tsx does not start on the machine this repository is developed on
// (docs/REPRISE.md — an application-control policy blocks the esbuild inside mcp-server). Built
// by scripts/verify-mcp.mjs, which is what the npm script runs first.
const SERVER_ENTRY = new URL("../.build/server.mjs", import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, "")

async function main() {
  const client = new Client({ name: "smoke-test", version: "0.1.0" })
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER_ENTRY],
  })
  await client.connect(transport)

  const tools = await client.listTools()
  console.log("=== tools ===")
  console.log(tools.tools.map((t) => t.name).join(", "))

  console.log("\n=== list_sources ===")
  const sources = await client.callTool({ name: "list_sources", arguments: {} }, undefined, { timeout: CALL_TIMEOUT_MS })
  console.log(textOf(sources))

  console.log("\n=== score_location (Montorgueil) ===")
  const score = await client.callTool({
    name: "score_location",
    arguments: { lat: MONTORGUEIL.lat, lng: MONTORGUEIL.lng },
  }, undefined, { timeout: CALL_TIMEOUT_MS })
  console.log(textOf(score))

  console.log("\n=== explain_score (groceries, Montorgueil) ===")
  const explain = await client.callTool({
    name: "explain_score",
    arguments: { lat: MONTORGUEIL.lat, lng: MONTORGUEIL.lng, metric: "groceries" },
  }, undefined, { timeout: CALL_TIMEOUT_MS })
  console.log(textOf(explain))

  console.log("\n=== compare_locations (Montorgueil vs quiet residential) ===")
  const compare = await client.callTool({
    name: "compare_locations",
    arguments: { a: MONTORGUEIL, b: QUIET_RESIDENTIAL },
  }, undefined, { timeout: CALL_TIMEOUT_MS })
  console.log(textOf(compare))

  console.log("\n=== find_premises (Montorgueil, 80 m) ===")
  const found = await client.callTool({
    name: "find_premises",
    arguments: { lat: MONTORGUEIL.lat, lng: MONTORGUEIL.lng, radius_m: 80, limit: 10 },
  }, undefined, { timeout: CALL_TIMEOUT_MS })
  console.log(textOf(found))

  // Chained rather than run against a hard-coded id: a location_id pinned in this file would
  // rot the day BDCom is reloaded, and chaining also exercises the contract between the two
  // tools, which is the part worth checking.
  const firstId = (JSON.parse(textOf(found)) as { premises: { location_id: number }[] }).premises[0]
    ?.location_id
  if (firstId === undefined) {
    console.log("\n=== trace_premise === skipped: find_premises returned no candidate")
  } else {
    console.log(`\n=== trace_premise (location_id ${firstId}) ===`)
    const trace = await client.callTool({ name: "trace_premise", arguments: { location_id: firstId } }, undefined, { timeout: CALL_TIMEOUT_MS })
    console.log(textOf(trace))
  }

  await client.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
