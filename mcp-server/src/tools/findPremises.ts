// find_premises — the lookup trace_premise needs, and deliberately nothing more.
//
// compass_address_timeline takes a location_id, and an agent has no way to obtain one: every
// other tool here speaks in coordinates. This is that missing step. It is a separate tool
// rather than a lat/lng overload on trace_premise because of what the corpus actually looks
// like — up to 120 premises share a single coordinate (docs/BDCOM.md) and 69 % share a street
// number (PLAN.md §3.3). "The premise nearest this point" would pick one shopfront out of a
// stack and hand it back as *the* answer. The agent has to choose, so the choice is returned.
//
// Vintage 2023 only, and not a parameter. 2023 is the sole ODbL vintage; 2017 and 2020 carry
// an APUR licence nobody has read, and 20260809000011 settled the rule for those: an anonymous
// caller learns neither their contents nor the *existence* of what they contain. A lookup that
// enumerated premises from those vintages would disclose precisely that existence. The timeline
// still reports them — as withheld rows, which is the licensed way to say "something is here".
//
// Writing this tool is what surfaced the silent-absence defect in compass_premises_within —
// zero rows for a withheld vintage, byte for byte what an empty radius returns. Fixed since,
// in 20260817000001, on the model of 20260816000001, and covered by I14/I15. The 2023 pin was
// never the fix and does not become unnecessary: it stands on the licence rule above.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { LAT_DESCRIPTION, LNG_DESCRIPTION, PARIS_BOUNDS } from "../parisBounds"

import { supabase } from "../supabase"

/** The only vintage an anonymous caller may be served. See the header. */
const VINTAGE_YEAR = 2023

interface PremiseRow {
  location_id: number
  ordre: number
  lat: number
  lng: number
  distance_m: number
  address: string | null
  arrondissement: number | null
  quartier_name: string | null
  activity_code: string | null
  activity_label: string | null
  activity_group: string | null
  size_label: string | null
  situation_label: string | null
  sign_name: string | null
  total_matched: number
  /** True on a single column-less row when the caller may not receive this vintage. */
  withheld: boolean
}

const inputShape = {
  lat: z.number().min(PARIS_BOUNDS.latMin).max(PARIS_BOUNDS.latMax).describe(LAT_DESCRIPTION),
  lng: z.number().min(PARIS_BOUNDS.lngMin).max(PARIS_BOUNDS.lngMax).describe(LNG_DESCRIPTION),
  radius_m: z
    .number()
    .positive()
    .max(500)
    .default(100)
    .describe(
      "Search radius in metres. Capped at 500, well below the 2000 the database allows: this " +
        "call identifies a shopfront, it does not describe a neighbourhood. Widen it only when " +
        "the coordinates are approximate.",
    ),
  limit: z
    .number()
    .int()
    .positive()
    .max(200)
    .default(50)
    .describe(
      "Maximum premises returned, capped at 200. `total_matched` carries the count BEFORE this cut, " +
        "so a truncated answer still has its denominator.",
    ),
}

export function registerFindPremises(server: McpServer): void {
  server.registerTool(
    "find_premises",
    {
      title: "Find premises near a point",
      description:
        "Ground-floor premises surveyed by APUR's door-to-door BDCom census near a point, each with " +
        "the location_id that trace_premise takes. Returns candidates, not a single match: premises " +
        "routinely share an address and a coordinate, so picking one is the caller's decision. " +
        "Vintage 2023 only (the sole ODbL vintage) — a premise that stopped being retail before 2023 " +
        "is not listed here, and trace_premise is where its earlier life shows up.",
      inputSchema: inputShape,
    },
    async ({ lat, lng, radius_m, limit }) => {
      const { data, error } = await supabase.rpc("compass_premises_within", {
        p_lat: lat,
        p_lng: lng,
        p_radius_m: radius_m,
        p_vintage_year: VINTAGE_YEAR,
        p_limit: limit,
      })
      if (error) throw new Error(`compass_premises_within: ${error.message}`)
      const rows = (data ?? []) as PremiseRow[]

      // Unreachable while VINTAGE_YEAR is pinned to the ODbL vintage, and kept anyway: since
      // 20260817000001 the function answers a withheld vintage with a marker row instead of
      // silence, so the day anyone turns the pin into a parameter, that row must become an
      // error rather than a phantom premise made of nulls. Contract check, not a null path.
      if (rows.some((r) => r.withheld)) {
        throw new Error(
          `BDCom ${VINTAGE_YEAR} came back withheld: its licence has not been read, so this ` +
            `caller receives neither its contents nor its counts. Call list_sources for the ` +
            `licence of each vintage.`,
        )
      }

      // total_matched is the count before the limit — the denominator, so the caller can say
      // "50 of 340" instead of implying it has seen everything (PLAN.md, "à voler" from Aino).
      const totalMatched = rows.length > 0 ? Number(rows[0].total_matched) : 0

      // Addresses carrying more than one candidate *in this response*. Deliberately not a
      // count of premises at that address in the database: the timeline computes that one
      // itself, across all vintages, and publishing a second number derived differently would
      // put two answers to one question into circulation.
      const perAddress = new Map<string, number>()
      for (const r of rows) {
        const key = r.address ?? "(adresse inconnue)"
        perAddress.set(key, (perAddress.get(key) ?? 0) + 1)
      }
      const sharedAddresses = [...perAddress.entries()]
        .filter(([, n]) => n > 1)
        .map(([address, candidates]) => ({ address, candidates }))
        .sort((a, b) => b.candidates - a.candidates)

      const premises = rows.map((r) => ({
        location_id: r.location_id,
        address: r.address,
        distance_m: Math.round(r.distance_m * 10) / 10,
        activity_label: r.activity_label,
        activity_group: r.activity_group,
        activity_code: r.activity_code,
        // 2023 is published retail-only, so `is_vacant` is structurally false on every row of
        // this vintage — 7 853 vacant premises in 2017, 8 764 in 2020, zero in 2023 (PLAN.md
        // §2.3). Returning it would let a caller read a publication artefact as "this unit is
        // occupied". Vacancy is answerable on 2017 and 2020 only, and not to an anonymous
        // caller, so it is absent here rather than present and false.
        sign_name: r.sign_name,
        size_label: r.size_label,
        situation_label: r.situation_label,
        quartier_name: r.quartier_name,
        arrondissement: r.arrondissement,
        lat: r.lat,
        lng: r.lng,
      }))

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                point: { lat, lng },
                radius_m,
                vintage_year: VINTAGE_YEAR,
                returned: rows.length,
                total_matched: totalMatched,
                truncated: totalMatched > rows.length,
                premises,
                shared_addresses: sharedAddresses.length > 0 ? sharedAddresses : undefined,
                disambiguation:
                  sharedAddresses.length > 0
                    ? "Several candidates share one address. BDCom identifies a premise, BODACC " +
                      "identifies an address: for those, trace_premise downgrades every BODACC row " +
                      "to `probable` and says how many units the address holds. No public source " +
                      "names which shopfront was sold."
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
