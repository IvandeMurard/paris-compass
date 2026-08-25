// explain_score — one axis, in full, put into a sentence an agent can relay without
// reconstructing it. Same computation as score_location; this tool exists because asking an
// agent to re-parse a full AreaScores object for one figure is worse ergonomics than a
// dedicated call, not because the underlying arithmetic differs.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { LAT_DESCRIPTION, LNG_DESCRIPTION, PARIS_BOUNDS } from "../parisBounds"

import { AMENITY_RADIUS_M, noiseLabel, scoreLabel, type AreaScores, type Measured } from "../../../src/core"
import { scorePoint } from "../scorePoint"

const METRICS = ["walkability", "schools", "healthcare", "groceries", "parks", "transit", "footfall", "noise"] as const
type Metric = (typeof METRICS)[number]

const inputShape = {
  lat: z.number().min(PARIS_BOUNDS.latMin).max(PARIS_BOUNDS.latMax).describe(LAT_DESCRIPTION),
  lng: z.number().min(PARIS_BOUNDS.lngMin).max(PARIS_BOUNDS.lngMax).describe(LNG_DESCRIPTION),
  metric: z.enum(METRICS).describe("Which axis of score_location to explain in detail."),
  radius_m: z.number().positive().max(2000).default(AMENITY_RADIUS_M),
  vintage_year: z
    .union([z.literal(2017), z.literal(2020), z.literal(2023)])
    .default(2023)
    .describe(
      "BDCom survey year for the premises layer. Only 2023 is ODbL: 2017 and 2020 carry an " +
        "APUR licence that has not been read, so a public caller receives neither their contents " +
        "nor their counts, and the scores drawing on premises come back unavailable rather than zero.",
    ),
}

function explain(metric: Metric, measured: Measured<number>): string {
  if (measured.value === null) {
    return `${metric}: unavailable — ${measured.missingReason ?? "no reason recorded"}`
  }
  const label = metric === "noise" ? noiseLabel(measured.value) : scoreLabel(measured.value);
  const parts = [
    `${metric}: ${measured.value}/100 (${label})`,
    `source: ${measured.source}, licence: ${measured.licence}, as of ${measured.asOf}`,
    `method: ${measured.method}`,
  ]
  if (measured.note) parts.push(`caveat: ${measured.note}`)
  return parts.join(". ")
}

export function registerExplainScore(server: McpServer): void {
  server.registerTool(
    "explain_score",
    {
      title: "Explain one score",
      description:
        "Full detail on a single axis of score_location — value, source, licence, date, method and " +
        "caveat — as a sentence and as structured data. Use after score_location to justify one figure " +
        "rather than re-deriving it from the full response.",
      inputSchema: inputShape,
    },
    async ({ lat, lng, metric, radius_m, vintage_year }) => {
      const { scores, failures } = await scorePoint(lat, lng, radius_m, vintage_year)
      const measured = scores[metric as keyof AreaScores]
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                point: { lat, lng },
                metric,
                explanation: explain(metric, measured),
                detail: measured,
                context_failures: failures.length > 0 ? failures : undefined,
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
