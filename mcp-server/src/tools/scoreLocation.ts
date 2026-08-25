// score_location — point + radius in, AreaScores out, provenance intact.
//
// Never unwraps Measured<T> into plain numbers — that was the leak the front's own adapter
// comment warns against (src/services/opendata/scoring.ts): a figure with no source, no
// vintage and no caveat is exactly what an agent cannot explain to whoever asked it a
// question. Every field ships as `{ value, source, licence, asOf, method, note?,
// missingReason? }`.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { LAT_DESCRIPTION, LNG_DESCRIPTION, PARIS_BOUNDS } from "../parisBounds"

import { AMENITY_RADIUS_M } from "../../../src/core"
import { scorePoint } from "../scorePoint"

const inputShape = {
  lat: z.number().min(PARIS_BOUNDS.latMin).max(PARIS_BOUNDS.latMax).describe(LAT_DESCRIPTION),
  lng: z.number().min(PARIS_BOUNDS.lngMin).max(PARIS_BOUNDS.lngMax).describe(LNG_DESCRIPTION),
  radius_m: z
    .number()
    .positive()
    .max(2000)
    .default(AMENITY_RADIUS_M)
    .describe("Search radius in metres. Capped at 2000 — beyond that the question stops being 'this neighbourhood' (compass_max_radius_m)."),
  vintage_year: z
    .union([z.literal(2017), z.literal(2020), z.literal(2023)])
    .default(2023)
    .describe(
      "BDCom survey year for the premises layer (occupancy, vacancy). Only 2023 is ODbL: " +
        "2017 and 2020 carry an APUR licence that has not been read, so a public caller " +
        "receives neither their contents nor their counts, and the scores drawing on premises " +
        "come back unavailable rather than zero. Prefer 2023 unless comparing vintages.",
    ),
}

export function registerScoreLocation(server: McpServer): void {
  server.registerTool(
    "score_location",
    {
      title: "Score a location",
      description:
        "Scores one point on five amenity categories (schools, healthcare, groceries, parks, transit), " +
        "walkability, a footfall proxy, and a road-noise proxy — each figure carrying its source, " +
        "licence, date and method. No single score out of 100: PERIMETRE.md refuses one on the grounds " +
        "that weights depend on the trade, so axes are returned separately.",
      inputSchema: inputShape,
    },
    async ({ lat, lng, radius_m, vintage_year }) => {
      const { scores, failures } = await scorePoint(lat, lng, radius_m, vintage_year)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                point: { lat, lng },
                radius_m,
                scores,
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
