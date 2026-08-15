// list_sources — every dataset the other three tools actually draw from, and only those.
//
// Deliberately not a copy of src/services/opendata/sources.ts: that list describes what the
// browser shows, this one describes what this server calls. They overlap on OSM but not on
// BDCom (this server reads it; the front does not consume compass_* yet, PLAN.md §2.7), and
// neither lists BODACC or SIRENE — no tool here calls compass_address_timeline. Listing a
// source no tool actually uses would claim a provenance this server does not have, the same
// discipline `sources.ts` already applies to SIRENE on the front side.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { supabase } from "../supabase"

interface VintageRow {
  vintage_year: number
  vintage_scope: string
  licence: string
  licence_note: string | null
  as_of: string
  source_url: string
  record_count: number | null
  ingested_at: string | null
}

export function registerListSources(server: McpServer): void {
  server.registerTool(
    "list_sources",
    {
      title: "List data sources",
      description:
        "Every dataset the Compass tools (score_location, compare_locations, explain_score) actually " +
        "draw from, with licence and freshness. Not a marketing list — only sources a tool call here " +
        "will really touch.",
      inputSchema: {},
    },
    async () => {
      const { data, error } = await supabase.rpc("compass_vintages")
      if (error) throw new Error(`compass_vintages: ${error.message}`)
      const vintages = (data ?? []) as VintageRow[]

      const sources = [
        {
          name: "OpenStreetMap via Overpass",
          licence: "ODbL",
          usage: "Amenities (schools, healthcare, groceries, parks, transit) and major roads, within a radius of any scored point.",
          note: "Volunteer-contributed. Coverage and freshness vary by street.",
        },
        ...vintages.map((v) => ({
          name: `APUR BDCom ${v.vintage_year}`,
          licence: v.licence === "custom" ? `Custom APUR licence (unread) — ${v.licence_note ?? ""}`.trim() : v.licence,
          usage: "Premise occupancy (vacant / occupied) within a radius, feeding the footfall proxy and the premises layer.",
          asOf: v.as_of,
          scope: v.vintage_scope,
          recordCount: v.record_count,
          ingestedAt: v.ingested_at,
          note:
            v.vintage_scope === "retail_only"
              ? "Retail and commercial services only — vacant premises are not published in this vintage."
              : undefined,
        })),
      ]

      return { content: [{ type: "text", text: JSON.stringify({ sources }, null, 2) }] }
    },
  )
}
