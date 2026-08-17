// list_sources — every dataset the other tools actually draw from, and only those.
//
// Deliberately not a copy of src/services/opendata/sources.ts: that list describes what the
// browser shows, this one describes what this server calls. They overlap on OSM but not on
// BDCom (this server reads it; the front does not consume compass_* yet, PLAN.md §2.7).
// Listing a source no tool actually uses would claim a provenance this server does not have,
// the same discipline `sources.ts` already applies to SIRENE on the front side.
//
// BODACC and SIRENE joined the list when trace_premise did. Neither is called directly: both
// reach a caller through compass_address_timeline, BODACC as sale and proceeding rows, SIRENE
// as the `corrobore` level and the sentence explaining it. A source that decides a confidence
// level is a source a caller is relying on, so it is named.

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
        "Every dataset the Compass tools actually draw from, with licence and freshness. Not a " +
        "marketing list — only sources a tool call here will really touch.",
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
        {
          name: "BODACC (DILA)",
          // The licence string compass_address_timeline itself stamps on every notice row
          // (20260815000001_confidence_rule.sql). Taken from there rather than restated, so
          // the two cannot drift.
          licence: "Licence Ouverte",
          usage:
            "Reached through trace_premise: business sales with the price published as legal notice, " +
            "and collective proceedings (safeguard, receivership, liquidation).",
          note:
            "A notice identifies an address, not a shopfront, and a proceeding carries the company's " +
            "registered office — which for a company is not necessarily the shop. Prices are extracted " +
            "by regex from the published sentence, kept verbatim alongside. Freshness is not reported: " +
            "only BDCom records an ingestion date today (PLAN.md §2.2ter).",
        },
        {
          name: "SIRENE geolocated establishments (INSEE)",
          licence: "Licence Ouverte 2.0",
          usage:
            "Reached through trace_premise, never returned as rows: it answers 'does this company have " +
            "an establishment at this address', which is what produces the `corrobore` confidence level.",
          note:
            "SIRENE places a company, never a shopfront — the establishment may be an office upstairs. " +
            "Same freshness gap as BODACC.",
        },
      ]

      return { content: [{ type: "text", text: JSON.stringify({ sources }, null, 2) }] }
    },
  )
}
