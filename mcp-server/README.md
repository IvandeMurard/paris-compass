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

Speaks MCP over stdio. Point an MCP client at `npx tsx src/index.ts` from this directory.

If `tsx` refuses to start — `spawn UNKNOWN`, errno `-4094` — it is not this package: an
application-control policy on the development machine blocks the esbuild binary inside
`mcp-server/node_modules` (`docs/REPRISE.md`). Build with the repository's own esbuild and point
the client at the bundle instead, which is what `verify:mcp` and `smoke:mcp` already do:

```powershell
npm.cmd run verify:mcp        # builds mcp-server/.build/server.mjs on the way
# then: command `node`, args [ "<repo>/mcp-server/.build/server.mjs" ]
```

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

Both run from the **repository root**, not from here — they typecheck this package and build it
before touching the network, so there is nothing to install or remember first:

```powershell
npm.cmd run verify:mcp
```

The gate. Four families — the six tools registered against the six documented above
(`INVENTAIRE`), every figure attributed to the layer it was read from (`PROVENANCE`), the
anonymous licence path with 2017 and 2020 withheld and no label borrowed to fill them
(`LICENCE`), and four failure modes including an unreachable database (`PANNE`). Exits non-zero
on a broken rule. Source: [`src/verify.ts`](src/verify.ts).

**The number of checks is not fixed, by design** — 36 when both upstreams answer, 33 in a run
where Overpass returned 429 (both measured 24 August). `PROVENANCE` collapses from five
assertions to two when the amenity layer never arrived: there is no point asserting the
provenance of figures that were never computed, and pretending otherwise would be a green tick
standing for nothing. Read the `0 en échec`, not the total.

```powershell
npm.cmd run smoke:mcp
```

The reading. Spawns the server as a real client would and prints every tool's raw answer. It
asserts nothing and exits 0 as long as nothing throws — useful when a rule has broken and you
want to see what an agent actually receives, useless as a control.

Overpass is a shared public mirror and does rate-limit under repeated testing
(`context_failures: [{ layer: "amenities", reason: "Overpass responded 429" }]`) — that is the
server reporting a real outage honestly, not a bug. `verify:mcp` records those calls as
`panne` and suspends the assertions that depend on them, rather than failing; it still checks
that the outage was *reported* and that no figure came back as a measured zero. Run either
sparingly rather than in a loop.

## What this does not cover yet

~~Every field's `source` currently reads "OpenStreetMap via Overpass" even where the premises
layer comes from BDCom via Supabase.~~ **Fixed on 24 August** by `w0-provenance` (#10):
`scoreLocation` takes a `LayerOrigins` — one `Origin` per layer — and each metric is attributed
to the layer it actually reads. Measured through this server the same day at Montorgueil: the
seven OpenStreetMap figures cite OSM with the query date, and `footfall` cites
`APUR BDCom 2023 + OpenStreetMap via Overpass` with `asOf: 2023-06`, the survey's date and not
the query's. Pinned by `P4`/`P5` in `verify.ts` so it cannot silently regress.

A point **outside the BDCom corpus but inside the accepted coordinate box** is still scored as
though the corpus covered it: `find_premises` honestly returns zero premises out there, but
`score_location` reads that same zero as "no businesses here" and returns a footfall figure
stamped with APUR's licence. `DIAGNOSTIC.md` §16, tracked in
[#55](https://github.com/IvandeMurard/paris-compass/issues/55) — opened rather than fixed,
because the choice between refusing the point and withdrawing the layer is a product decision.
Held in place by `E11` in `verify.ts`, which reports it as a known defect and turns red if it is
fixed without the record being updated.

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
