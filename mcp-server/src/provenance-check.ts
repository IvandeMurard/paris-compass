// Manual check for the `w0-provenance` acceptance criterion, run against the real remote:
// explain_score on a BDCom-backed metric must cite APUR, and the OSM-backed ones must not.
//
//   npx tsx src/provenance-check.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const MONTORGUEIL = { lat: 48.8657, lng: 2.3459 }

function textOf(result: unknown): string {
  const content = (result as { content?: unknown } | undefined)?.content
  if (!Array.isArray(content) || typeof (content[0] as { text?: unknown })?.text !== "string") {
    throw new Error(`Unexpected tool result shape: ${JSON.stringify(result)}`)
  }
  return (content[0] as { text: string }).text
}

async function main() {
  const client = new Client({ name: "provenance-check", version: "0.1.0" })
  const transport = new StdioClientTransport({ command: "npx", args: ["tsx", "src/index.ts"] })
  await client.connect(transport)

  const vintage = Number(process.argv[2] ?? 2023)
  const radius = Number(process.argv[3] ?? 800)
  for (const metric of ["footfall", "groceries", "noise"] as const) {
    const out = await client.callTool(
      { name: "explain_score", arguments: { ...MONTORGUEIL, metric, vintage_year: vintage, radius_m: radius } },
      undefined,
      { timeout: 180_000 },
    )
    const parsed = JSON.parse(textOf(out)) as {
      detail: { value: number | null; source: string; licence: string; asOf: string }
      context_failures?: { layer: string; reason: string }[]
    }
    const d = parsed.detail
    console.log(
      `${vintage} ${metric.padEnd(10)} value=${String(d.value).padEnd(5)} source=${d.source} | licence=${d.licence} | asOf=${d.asOf}`,
    )
    for (const f of parsed.context_failures ?? []) {
      console.log(`         FAILURE ${f.layer}: ${f.reason.slice(0, 140)}`)
    }
  }

  await client.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
