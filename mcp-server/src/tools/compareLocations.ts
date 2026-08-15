// compare_locations — two full score sets side by side, never a single verdict.
//
// PERIMETRE.md §4 refuses a global 0-100 score because weights depend on the trade; the same
// refusal applies here in duplicate. This tool does not decide which point is "better" — it
// hands back two complete AreaScores and a per-axis numeric delta (B minus A, mechanically
// derived, not weighted), and leaves the reading to whoever asked.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { AMENITY_RADIUS_M, type AreaScores } from "../../../src/core"
import { scorePoint } from "../scorePoint"

const point = z.object({
  lat: z.number().min(48.6).max(49.1),
  lng: z.number().min(2.1).max(2.5),
})

const inputShape = {
  a: point.describe("First location"),
  b: point.describe("Second location"),
  radius_m: z.number().positive().max(2000).default(AMENITY_RADIUS_M),
  vintage_year: z.union([z.literal(2017), z.literal(2020), z.literal(2023)]).default(2023),
}

function deltas(a: AreaScores, b: AreaScores): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const key of Object.keys(a) as (keyof AreaScores)[]) {
    const av = a[key].value
    const bv = b[key].value
    out[key] = av === null || bv === null ? null : bv - av
  }
  return out
}

export function registerCompareLocations(server: McpServer): void {
  server.registerTool(
    "compare_locations",
    {
      title: "Compare two locations",
      description:
        "Scores two points with score_location's method and returns both sets side by side, plus a " +
        "per-axis numeric delta (b minus a). No combined verdict: a single score would average axes " +
        "that pull in opposite directions for different trades, which is exactly what this product " +
        "refuses to do (PERIMETRE.md §4).",
      inputSchema: inputShape,
    },
    async ({ a, b, radius_m, vintage_year }) => {
      const [scoredA, scoredB] = await Promise.all([
        scorePoint(a.lat, a.lng, radius_m, vintage_year),
        scorePoint(b.lat, b.lng, radius_m, vintage_year),
      ])
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                radius_m,
                a: { point: a, scores: scoredA.scores, context_failures: scoredA.failures.length > 0 ? scoredA.failures : undefined },
                b: { point: b, scores: scoredB.scores, context_failures: scoredB.failures.length > 0 ? scoredB.failures : undefined },
                delta_b_minus_a: deltas(scoredA.scores, scoredB.scores),
              },
              null,
              2,
            ),
          },
        ],
      }
    },
  )
}
