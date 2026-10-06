// Reference geography: the 80 administrative quartiers and the street network,
// then attaching every BDCom premise to both.
//
//   npx.cmd tsx scripts/ingest/geography.ts
//
// Run after scripts/ingest/bdcom.ts — the attachment step needs the premises to
// exist. Re-running is safe, and on unchanged sources it writes nothing: see attach().

import type { Client } from "pg"

import { assertPrivileged, connect, inTransaction, insertRows, log, recordRun } from "./lib/db"
import { exportJson } from "./lib/parisOpendata"

interface Feature {
  properties: Record<string, unknown>
  geometry: { type: string; coordinates: unknown } | null
}

// ---------------------------------------------------------------------------
// Quartiers
// ---------------------------------------------------------------------------

// Why upserts and a single diffed UPDATE rather than delete, reinsert and re-attach — #239,
// DIAGNOSTIC-CORRIGES.md §62. The old path emptied both reference tables, so it first had to
// detach every premise, then attached them again in two passes: each run rewrote every row of
// premise_location three times. Measured 6 October 2026, that table stood at 69 MB for 19 MB
// of data, on a project that turns read-only at 500 MB. Now a reference row is written only
// when the source changed it, and a premise only when its attachment changed — which, for a
// re-run on unchanged sources, is none at all.

/** Removes the reference rows the source no longer publishes, once nothing points at them. */
async function dropStale(client: Client, table: string, ids: number[]): Promise<number> {
  const result = await client.query(`delete from ${table} where id <> all($1::bigint[])`, [ids])
  return result.rowCount ?? 0
}

async function loadQuartiers(client: Client): Promise<number[]> {
  const collection = await exportJson<{ features: Feature[] }>("quartier_paris", "geojson")
  const rows = collection.features
    .filter((f) => f.geometry)
    .map((f) => {
      const p = f.properties
      return [
        Number(p.c_qu), String(p.c_qu), String(p.l_qu), Number(p.c_ar),
        JSON.stringify(f.geometry),
      ]
    })

  // ST_Multi because the source mixes Polygon and MultiPolygon and the column
  // declares one type: coercing here is safe, guessing at read time is not.
  let changed = 0
  for (const [id, code, name, arr, geom] of rows) {
    const result = await client.query(
      `insert into public.quartier as q (id, code, name, arrondissement, geom)
       values ($1, $2, $3, $4, ST_Multi(ST_GeomFromGeoJSON($5))::geography)
       on conflict (id) do update
          set code = excluded.code, name = excluded.name,
              arrondissement = excluded.arrondissement, geom = excluded.geom
        where (q.code, q.name, q.arrondissement, ST_AsBinary(q.geom))
              is distinct from
              (excluded.code, excluded.name, excluded.arrondissement, ST_AsBinary(excluded.geom))`,
      [id, code, name, arr, geom],
    )
    changed += result.rowCount ?? 0
  }
  log("quartiers", `${rows.length} publiés, ${changed} écrits`)
  return rows.map((r) => Number(r[0]))
}

// ---------------------------------------------------------------------------
// Street segments
// ---------------------------------------------------------------------------

async function loadStreetSegments(client: Client): Promise<number[]> {
  // The segment layer carries no street name, only a reference to the street
  // register — so the register is read first and the name joined in.
  const streets = await exportJson<Record<string, unknown>[]>("voie", "json")
  const byId = new Map<string, { wayType: string | null; name: string | null }>()
  for (const s of streets) {
    byId.set(String(s.n_sq_vo), {
      wayType: (s.c_desi as string | null) ?? null,
      name: (s.l_voie as string | null) ?? null,
    })
  }
  log("  registre des voies", `${byId.size} voies`)

  const collection = await exportJson<{ features: Feature[] }>("troncon_voie", "geojson")
  let skipped = 0
  let rows: unknown[][] = []

  for (const f of collection.features) {
    if (f.geometry?.type !== "LineString") {
      skipped += 1
      continue
    }
    const p = f.properties
    const street = byId.get(String(p.n_sq_vo))
    rows.push([
      Number(p.n_sq_tv),
      street?.name ?? null,
      street?.wayType ?? null,
      p.n_sq_vo === null || p.n_sq_vo === undefined ? null : Number(p.n_sq_vo),
      JSON.stringify(f.geometry),
    ])
  }

  // First occurrence wins, as the old `on conflict do nothing` decided — and DO UPDATE refuses
  // to touch the same row twice in one statement, so a repeated id must not reach it.
  const seen = new Set<number>()
  const unique = rows.filter((r) => {
    const id = Number(r[0])
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  rows = unique

  const chunk = 500
  let changed = 0
  for (let start = 0; start < rows.length; start += chunk) {
    const slice = rows.slice(start, start + chunk)
    const values: unknown[] = []
    // The key comes from one place — the SQL function — rather than being recomputed in
    // TypeScript with subtly different rules. Called in the insert itself: it used to run as
    // an UPDATE of every segment just inserted, which wrote each one twice.
    const tuples = slice.map((row, i) => {
      values.push(...row)
      const b = i * 5
      return `($${b + 1}, $${b + 2}::text, $${b + 3}::text, $${b + 4}, ST_GeomFromGeoJSON($${b + 5})::geography,
               case when $${b + 2}::text is not null then public.compass_street_key($${b + 3}::text, $${b + 2}::text) end)`
    })
    const result = await client.query(
      `insert into public.street_segment as s (id, name, way_type, voie_id, geom, street_key)
       values ${tuples.join(", ")}
       on conflict (id) do update
          set name = excluded.name, way_type = excluded.way_type, voie_id = excluded.voie_id,
              geom = excluded.geom, street_key = excluded.street_key
        where (s.name, s.way_type, s.voie_id, s.street_key, ST_AsBinary(s.geom))
              is distinct from
              (excluded.name, excluded.way_type, excluded.voie_id, excluded.street_key, ST_AsBinary(excluded.geom))`,
      values,
    )
    changed += result.rowCount ?? 0
  }

  log(
    "tronçons",
    `${rows.length} publiés, ${changed} écrits${skipped ? `, ${skipped} ignorés (géométrie non linéaire)` : ""}`,
  )
  return rows.map((r) => Number(r[0]))
}

// ---------------------------------------------------------------------------
// Attachment
// ---------------------------------------------------------------------------

async function attach(client: Client): Promise<void> {
  // Every attachment is COMPUTED first, into a table dropped at commit, and premise_location is
  // then written once, for the premises whose attachment differs — #239. The three rules are
  // the ones the three UPDATEs applied, in the same order of precedence.
  await client.query(`
    create temporary table tmp_attach on commit drop as
    select l.id,
           -- Quartier by containment, replacing the nearest-centroid rule the front end
           -- used — those differ exactly at quartier boundaries, which is where the answer
           -- matters. A point on a shared boundary takes the lowest id, deterministically,
           -- where the old UPDATE kept whichever join row came last.
           (select q.id from public.quartier q
             where ST_Intersects(l.geom, q.geom)
             order by q.id limit 1)                                  as quartier_id,
           coalesce(byname.id, byspace.id)                           as street_segment_id,
           case when byname.id is not null then 'name'
                when byspace.id is not null then 'spatial' end       as street_match
      from public.premise_location l
      -- Street: the name decides which street, geometry only decides which segment of it.
      -- Nearest-segment alone would attach a corner premise to the street it faces rather
      -- than the one it is addressed on.
      -- \`l.geom is not null\` is not defensive noise, it is the correction of #68. The name
      -- half of this rule needs no geometry to FIRE — only to choose among the segments of
      -- the street — so a premise with an unusable point was still attached, by an \`order
      -- by\` whose distance was NaN. Ten of the fifteen POINT(NaN NaN) premises carried a
      -- segment on 2026-09-05, seven of them the same one of the six "RUE CHEMINOTS"
      -- segments. An arbitrary segment is worse than none: the segment is the grain
      -- \`compass_street_rotation\` counts on.
      left join lateral (
        select s.id from public.street_segment s
         where l.street_key is not null and l.geom is not null
           and s.street_key = l.street_key
         order by l.geom <-> s.geom
         limit 1
      ) byname on true
      -- Fallback for what the register no longer knows under that name — mostly streets
      -- Paris has renamed since the census. Capped tightly: beyond 40 m the nearest segment
      -- is somebody else's street, and no attachment beats a wrong one.
      left join lateral (
        select s.id from public.street_segment s
         where byname.id is null and l.geom is not null
           and ST_DWithin(l.geom, s.geom, 40)
         order by l.geom <-> s.geom
         limit 1
      ) byspace on true
  `)

  const changed = await client.query(`
    update public.premise_location l
       set quartier_id = t.quartier_id,
           street_segment_id = t.street_segment_id,
           street_match = t.street_match
      from tmp_attach t
     where t.id = l.id
       and (l.quartier_id, l.street_segment_id, l.street_match)
           is distinct from (t.quartier_id, t.street_segment_id, t.street_match)
  `)
  log("  rattachements changés", `${changed.rowCount} locaux`)
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  try {
    await inTransaction(client, async () => {
      // Upsert the reference tables, re-attach, and only THEN drop what the source no longer
      // publishes: by then no premise points at a stale row, so the foreign keys from
      // premise_location let it go. Nothing is detached first any more — that detachment was
      // a full rewrite of the census on every run. And never \`truncate ... cascade\`: it would
      // empty the premises too, which is the census, not a reference table
      // (docs/REPRISE-PIEGES.md). A stale quartier still referenced elsewhere — by
      // sirene_etablissement_stock or question_tally — fails the delete and rolls the whole
      // run back, which is the right answer to a quartier Paris has removed.
      const quartiers = await loadQuartiers(client)
      const segments = await loadStreetSegments(client)
      await attach(client)
      const staleSegments = await dropStale(client, "public.street_segment", segments)
      const staleQuartiers = await dropStale(client, "public.quartier", quartiers)
      if (staleSegments + staleQuartiers > 0) {
        log("retirés par la source", `${staleQuartiers} quartiers, ${staleSegments} tronçons`)
      }
    })

    const summary = await client.query<{ label: string; n: string }>(`
      select 'sans quartier'        as label, count(*)::text as n from public.premise_location where quartier_id is null
      union all select 'par nom',          count(*)::text from public.premise_location where street_match = 'name'
      union all select 'par proximité',    count(*)::text from public.premise_location where street_match = 'spatial'
      union all select 'sans tronçon',     count(*)::text from public.premise_location where street_segment_id is null
    `)
    log("terminé")
    for (const row of summary.rows) log(`  ${row.label}`, row.n)

    // Paris Open Data publishes no vintage for these layers, so the honest `source_as_of` is
    // the day the export was read. That is a real property of this dataset and not a
    // stand-in for one: the quartier boundaries and the street network are a current-state
    // export, exactly like an Overpass query, and dating them today is correct where dating a
    // BDCom census today would be a fabrication.
    const counted = await client.query<{ n: string }>(
      "select (select count(*) from public.quartier) + (select count(*) from public.street_segment) as n",
    )
    await recordRun(client, "geography", {
      rowCount: Number(counted.rows[0]?.n ?? 0),
      sourceAsOf: new Date().toISOString().slice(0, 10),
      durationMs: Date.now() - startedAt,
    })
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  log("ÉCHEC", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
