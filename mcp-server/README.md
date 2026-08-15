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
| `list_sources` | — | Every dataset the other three tools draw from — licence, freshness, what it feeds |
| `score_location` | `lat`, `lng`, `radius_m?`, `vintage_year?` | Five amenity scores, walkability, footfall, noise — each a `Measured<T>`: value, source, licence, date, method, caveat |
| `compare_locations` | `a`, `b`, `radius_m?`, `vintage_year?` | Both full score sets, plus a per-axis numeric delta. No combined verdict — refused by design (PERIMETRE.md §4) |
| `explain_score` | `lat`, `lng`, `metric`, `radius_m?`, `vintage_year?` | Full detail on one axis, as a sentence and as structured data |

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

No tool here exposes `compass_address_timeline` (BODACC-backed history, reliability levels) —
PLAN.md §4.1 names four tools and none of them is that one. The front has the same gap on its
side (PLAN.md §2.7, "la fiche locale"). Worth a fifth tool once that shape is worked out, not
assumed here.
