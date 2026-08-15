// Manual end-to-end check: spawns the server as a real MCP client would, calls every tool
// against a real point in Paris, and prints the responses. Not part of the server itself.
//
//   npx tsx src/smoke-test.ts

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

async function main() {
  const client = new Client({ name: "smoke-test", version: "0.1.0" })
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/index.ts"],
  })
  await client.connect(transport)

  const tools = await client.listTools()
  console.log("=== tools ===")
  console.log(tools.tools.map((t) => t.name).join(", "))

  console.log("\n=== list_sources ===")
  const sources = await client.callTool({ name: "list_sources", arguments: {} })
  console.log(textOf(sources))

  console.log("\n=== score_location (Montorgueil) ===")
  const score = await client.callTool({
    name: "score_location",
    arguments: { lat: MONTORGUEIL.lat, lng: MONTORGUEIL.lng },
  })
  console.log(textOf(score))

  console.log("\n=== explain_score (groceries, Montorgueil) ===")
  const explain = await client.callTool({
    name: "explain_score",
    arguments: { lat: MONTORGUEIL.lat, lng: MONTORGUEIL.lng, metric: "groceries" },
  })
  console.log(textOf(explain))

  console.log("\n=== compare_locations (Montorgueil vs quiet residential) ===")
  const compare = await client.callTool({
    name: "compare_locations",
    arguments: { a: MONTORGUEIL, b: QUIET_RESIDENTIAL },
  })
  console.log(textOf(compare))

  await client.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
