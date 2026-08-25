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

import { OSM_ORIGIN } from "../../../src/core"
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

/**
 * `compass_source_freshness` (20260825000001) — one row per dataset the pipeline loads.
 *
 * Two dates, never one. `source_as_of` is how current the data is, `ingested_at` is when our
 * copy was last refreshed, and an agent that relays only the second will tell someone a 2023
 * survey is from this morning. `run_by` says whether the refresh is actually automated, which
 * is what keeps "this is kept up to date" a checkable claim rather than a promise.
 */
interface FreshnessRow {
  source: string
  label: string
  cadence: string
  cadence_note: string
  source_as_of: string | null
  ingested_at: string | null
  row_count: number | null
  run_by: string | null
  age_days: number | null
}

function freshnessOf(rows: FreshnessRow[], source: string): Record<string, unknown> | undefined {
  const r = rows.find((f) => f.source === source)
  if (!r) return undefined
  return {
    dataAsOf: r.source_as_of,
    lastLoadedAt: r.ingested_at,
    // Spelled out rather than left as a bare pair of dates: the distinction is the one a
    // caller is most likely to collapse, and collapsing it is what manufactures a freshness.
    reading:
      r.ingested_at === null
        ? "Never loaded into this database — not 'empty', not 'zero'."
        : "dataAsOf is how current the facts are; lastLoadedAt is when this copy was refreshed. Reloading does not make the facts newer.",
    cadence: r.cadence,
    cadenceNote: r.cadence_note,
    rowCount: r.row_count,
    refreshedBy: r.run_by,
    // A cadence nobody keeps is a cadence, not a guarantee. Saying so here is cheaper than
    // letting an agent infer upkeep from the word "monthly".
    upkeep:
      r.run_by === "github-actions"
        ? "Refreshed by a scheduled job."
        : r.run_by === "manual"
          ? "Last refresh was run by hand. The cadence above is declared, not demonstrated."
          : "No refresh recorded.",
  }
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

      const { data: freshData, error: freshError } = await supabase.rpc("compass_source_freshness")
      if (freshError) throw new Error(`compass_source_freshness: ${freshError.message}`)
      const freshness = (freshData ?? []) as FreshnessRow[]

      const sources = [
        {
          // Taken from the constructor the scores themselves are stamped with, not restated:
          // an agent that calls explain_score and list_sources must not read two spellings of
          // one licence. Same discipline as the BODACC line below.
          name: OSM_ORIGIN("").source,
          licence: OSM_ORIGIN("").licence,
          usage: "Amenities (schools, healthcare, groceries, parks, transit) and major roads, within a radius of any scored point.",
          note: "Volunteer-contributed. Coverage and freshness vary by street.",
          // No freshness row: OSM is queried live per call, so its data is as current as the
          // request. It is the one source here with nothing to refresh on a schedule.
          freshness: { dataAsOf: "live", reading: "Queried at call time, not loaded in advance." },
        },
        ...vintages.map((v) => ({
          name: `APUR BDCom ${v.vintage_year}`,
          licence: v.licence === "custom" ? `Custom APUR licence (unread) — ${v.licence_note ?? ""}`.trim() : v.licence,
          usage: "Premise occupancy (vacant / occupied) within a radius, feeding the footfall proxy and the premises layer.",
          asOf: v.as_of,
          scope: v.vintage_scope,
          recordCount: v.record_count,
          ingestedAt: v.ingested_at,
          freshness: freshnessOf(freshness, "bdcom"),
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
            "by regex from the published sentence, kept verbatim alongside.",
          // ~~Freshness is not reported: only BDCom records an ingestion date.~~ Closed on
          // 25 August by w0-cron (#6): all four datasets now carry one.
          freshness: freshnessOf(freshness, "bodacc"),
        },
        {
          name: "SIRENE geolocated establishments (INSEE)",
          licence: "Licence Ouverte 2.0",
          usage:
            "Reached through trace_premise, never returned as rows: it answers 'does this company have " +
            "an establishment at this address', which is what produces the `corrobore` confidence level.",
          note:
            "SIRENE places a company, never a shopfront — the establishment may be an office upstairs.",
          freshness: freshnessOf(freshness, "sirene"),
        },
      ]

      return { content: [{ type: "text", text: JSON.stringify({ sources }, null, 2) }] }
    },
  )
}
