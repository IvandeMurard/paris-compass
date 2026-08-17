# Compass MCP server

PLAN.md §4.1, PERIMETRE.md §8 — the same scoring core the browser uses (`../src/core`),
reached with the same trust boundary an anonymous visitor has: the Supabase anon key, never
a service key. `list_sources` describes only what these tools actually call — never a source
no tool here touches.

## Setup

```powershell
npm.cmd install
copy .env.example .env
# edit .env: same values as the app's VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
```

## Run

```powershell
npm.cmd run start
```

Speaks MCP over stdio. Point an MCP client at `npx tsx src/index.ts` from this directory
(or `node --experimental-strip-types src/index.ts` once built).

## Tools

| Tool | Input | What it returns |
| --- | --- | --- |
| `list_sources` | — | Every dataset the other tools draw from — licence, freshness, what it feeds |
| `score_location` | `lat`, `lng`, `radius_m?`, `vintage_year?` | Five amenity scores, walkability, footfall, noise — each a `Measured<T>`: value, source, licence, date, method, caveat |
| `compare_locations` | `a`, `b`, `radius_m?`, `vintage_year?` | Both full score sets, plus a per-axis numeric delta. No combined verdict — refused by design (PERIMETRE.md §4) |
| `explain_score` | `lat`, `lng`, `metric`, `radius_m?`, `vintage_year?` | Full detail on one axis, as a sentence and as structured data |
| `find_premises` | `lat`, `lng`, `radius_m?`, `limit?` | BDCom premises near a point with their `location_id`, plus `total_matched` as the denominator. Candidates, never one match |
| `trace_premise` | `location_id` | `compass_address_timeline`: BDCom surveys and BODACC notices in order, each with its record, its evidence and its confidence level |

`find_premises` and `trace_premise` are a pair — the timeline takes a `location_id`, and nothing
else here hands one out. Two tools rather than one because up to 120 premises share a coordinate
and 69 % share a street number: "the nearest premise" would pick one shopfront out of a stack and
present it as the answer, so the candidates are returned and the caller chooses.

`find_premises` is pinned to vintage 2023 and takes no `vintage_year`. 2023 is the only ODbL
vintage; for 2017 and 2020, `20260809000011` withholds not just the contents but the *existence*
of a record, and a lookup that listed their premises would disclose exactly that. Those years
still appear in `trace_premise`, as `withheld` rows — the licensed way to say something is there.

## Verify

```powershell
npm.cmd run typecheck
npx tsx src/smoke-test.ts
```

The smoke test spawns the server as a real client would and calls every tool against a
point in Paris. Overpass is a shared public mirror and does rate-limit under repeated
testing (`context_failures: [{ layer: "amenities", reason: "Overpass responded 429" }]`) —
that is the server reporting a real outage honestly, not a bug; run the smoke test sparingly
rather than in a loop.

## What this does not cover yet

Every field's `source` currently reads "OpenStreetMap via Overpass" even where the premises
layer comes from BDCom via Supabase — `scoreLocation` (`src/core/scoring.ts`) takes one
`Origin` for the whole result, a limitation inherited from the front's existing adapter, not
introduced here. Splitting provenance per field would mean changing that shared function's
signature, which affects the browser too — flagged for a separate change, not made silently
as part of this server.

~~No tool here exposes `compass_address_timeline`.~~ Exposed on 17 August as `trace_premise`,
with `find_premises` as the lookup it needs. The front still has the same gap on its side
(PLAN.md §2.7, "la fiche locale"): this server is now the only consumer of the timeline outside
the evaluation gate.

~~`compass_premises_within` still has the silent-absence defect.~~ **Fixed the same day**, in
`20260817000001`, and covered by `I14`/`I15`. Writing `find_premises` is what surfaced it: the
function is `SECURITY INVOKER`, the RLS policy of `20260809000008` restricts
`premise_observation` to redistributable vintages, and it answered a withheld vintage with zero
rows — byte for byte what a genuinely empty radius returns.

Measured as a real anonymous caller through PostgREST at Châtelet over 800 m, before and after:

| | 2017 | 2020 | 2023 | 2023 @ 1 m |
| --- | --- | --- | --- | --- |
| before | 0 rows | 0 rows | 3 059 | 0 rows |
| after | 1 row, `withheld` | 1 row, `withheld` | 3 059 | 0 rows |

The last column is the half that gets skipped: a genuinely empty radius still reads as empty, so
the fix did not swap one defect for its mirror. All three functions carrying the licence rule are
now covered — `I9`/`I10`, `I12`/`I13`, `I14`/`I15`.
