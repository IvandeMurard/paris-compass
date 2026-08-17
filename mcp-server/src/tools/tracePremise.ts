// trace_premise — compass_address_timeline, exposed. The gap PLAN.md §4.1 and §2.7 both name:
// ten compass_* functions, a four-level confidence machinery and 85 418 premises with no
// consumer outside the evaluation gate.
//
// The rows are relayed as they come. That is the whole design of the underlying function and
// not laziness here: "le récit se génère, il ne se rédige pas" (PLAN.md §2.5) exists because
// two errors were once made in the prose and not in the database — a year with no survey
// rendered as "no longer a shop", and a price borrowed from a different premise. Anything this
// file rewrote could commit them again. So it adds a count of what it received and a note about
// what the data cannot settle, and touches no field.
//
// Three shapes a caller must not flatten into each other, all three already distinguished by
// the SQL:
//   observed = true   — surveyed, and here is what was found
//   observed = false  — not surveyed that year, which is neither "vacant" nor "gone"
//   observed = null   — withheld: the vintage's licence has not been read (withheld = true)
//
// Note the contrast with context.ts, which *throws* when it meets a withheld vintage. There a
// withheld premises layer would have been scored as a measured zero, so refusing to answer is
// the honest move. Here the withheld row is the answer — "this year exists and cannot be
// shown" — and dropping it would restore exactly the silent absence 20260809000011 removed.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { supabase } from "../supabase"

type Confidence = "etabli" | "corrobore" | "probable" | "indetermine"

interface TimelineRow {
  occurred_on: string
  granularity: string
  source: string
  source_ref: string | null
  source_url: string | null
  source_licence: string | null
  kind: string
  observed: boolean | null
  withheld: boolean
  activity_code: string | null
  label: string | null
  detail: string | null
  amount_eur: number | null
  evidence: string | null
  confidence: Confidence
  confidence_rule: string | null
  confidence_reason: string | null
}

const CONFIDENCE_MEANING: Record<Confidence, string> = {
  etabli: "The source names this premise directly, and the record is attached.",
  corrobore: "Two independent public sources place the business here; neither names the premise.",
  probable: "The fact is documented, but tying it to this premise is inferred.",
  indetermine: "The source is silent, and says so.",
}

const inputShape = {
  location_id: z
    .number()
    .int()
    .positive()
    .describe("A location_id returned by find_premises. Not a BDCom `ordre` and not a SIRET."),
}

export function registerTracePremise(server: McpServer): void {
  server.registerTool(
    "trace_premise",
    {
      title: "Trace one premise's history",
      description:
        "Everything known about one premise in chronological order: APUR BDCom survey rows (2017, " +
        "2020, 2023) and BODACC legal notices — business sales with their published price, " +
        "safeguard, receivership and liquidation proceedings. Every row carries the record it came " +
        "from, its evidence, and a derived confidence level with the rule that produced it. " +
        "Answers 'has a restaurant ever been here', 'has this unit already changed use', 'was there " +
        "a vacant spell', and 'what did the business last sell for'. Takes a location_id from " +
        "find_premises.",
      inputSchema: inputShape,
    },
    async ({ location_id }) => {
      const { data, error } = await supabase.rpc("compass_address_timeline", {
        p_location_id: location_id,
      })
      if (error) throw new Error(`compass_address_timeline: ${error.message}`)
      const rows = (data ?? []) as TimelineRow[]

      const composition: Partial<Record<Confidence, number>> = {}
      for (const r of rows) composition[r.confidence] = (composition[r.confidence] ?? 0) + 1

      const withheldVintages = rows
        .filter((r) => r.withheld)
        .map((r) => r.source)
        .sort()

      // Every survey row the caller may actually receive says "not surveyed". Two situations
      // produce that, and the data cannot separate them — so neither does this note.
      //
      // Resolving it by checking whether the id exists in premise_location is available and
      // wrong: premises exist in that table only because some BDCom vintage recorded them, so
      // confirming one absent from 2023 would disclose that 2017 or 2020 contains it. That
      // existence is precisely what 20260809000011 withholds.
      const surveyRows = rows.filter((r) => r.kind === "survey")
      const visibleSurveys = surveyRows.filter((r) => !r.withheld)
      const unresolved = visibleSurveys.length > 0 && visibleSurveys.every((r) => r.observed === false)

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                location_id,
                rows: rows.length,
                timeline: rows,
                reading: {
                  observed_true: "surveyed that year, and the finding is in `label` / `activity_code`",
                  observed_false: "not surveyed that year — neither 'vacant' nor 'no longer a shop'",
                  observed_null: "withheld: `withheld` is true and the vintage's licence has not been read",
                  survey_interval:
                    "BDCom is triennial. A premise that turned over between two surveys reads as " +
                    "stable, and a 2017→2023 pair hides whatever stood there in between.",
                  price:
                    "`amount_eur` on a sale row is extracted by regex from the published sentence, " +
                    "which is kept verbatim in `evidence`. Always quote the two together.",
                  no_reason_for_departure:
                    "A sequence of activities never says why anyone left. A successful sale, a " +
                    "bankruptcy, a retirement and a repossessed building all render identically.",
                },
                confidence_composition: composition,
                confidence_meaning: CONFIDENCE_MEANING,
                withheld_vintages: withheldVintages.length > 0 ? withheldVintages : undefined,
                withheld_note:
                  withheldVintages.length > 0
                    ? "These vintages are reported and not shown: their APUR licence has not been " +
                      "read, so neither their contents nor the existence of a record in them is " +
                      "disclosed. A withheld row is not an absence, and must not be relayed as one."
                    : undefined,
                unresolved_note: unresolved
                  ? "No survey row you may receive records this premise. That answer covers two " +
                    "cases the data cannot tell apart: a location_id that does not exist, and a " +
                    "premise surveyed only in 2017 or 2020, whose existence is itself withheld. " +
                    "Ids from find_premises are always present in 2023, so an id obtained that way " +
                    "should not land here."
                  : undefined,
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
