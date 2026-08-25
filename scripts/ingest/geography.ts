// Reference geography: the 80 administrative quartiers and the street network,
// then attaching every BDCom premise to both.
//
//   npx.cmd tsx scripts/ingest/geography.ts
//
// Run after scripts/ingest/bdcom.ts — the attachment step needs the premises to
// exist. Re-running is safe: the tables are rebuilt and the attachment recomputed.

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

async function loadQuartiers(client: Client): Promise<number> {
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

  await client.query("delete from public.quartier")
  // ST_Multi because the source mixes Polygon and MultiPolygon and the column
  // declares one type: coercing here is safe, guessing at read time is not.
  for (const [id, code, name, arr, geom] of rows) {
    await client.query(
      `insert into public.quartier (id, code, name, arrondissement, geom)
       values ($1, $2, $3, $4, ST_Multi(ST_GeomFromGeoJSON($5))::geography)`,
      [id, code, name, arr, geom],
    )
  }
  log("quartiers", `${rows.length} chargés`)
  return rows.length
}

// ---------------------------------------------------------------------------
// Street segments
// ---------------------------------------------------------------------------

async function loadStreetSegments(client: Client): Promise<number> {
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
  const rows: unknown[][] = []

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

  await client.query("delete from public.street_segment")
  const chunk = 500
  for (let start = 0; start < rows.length; start += chunk) {
    const slice = rows.slice(start, start + chunk)
    const values: unknown[] = []
    const tuples = slice.map((row, i) => {
      values.push(...row)
      const b = i * 5
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, ST_GeomFromGeoJSON($${b + 5})::geography)`
    })
    await client.query(
      `insert into public.street_segment (id, name, way_type, voie_id, geom)
       values ${tuples.join(", ")}
       on conflict (id) do nothing`,
      values,
    )
  }

  // Computed after insert so the key comes from one place — the SQL function —
  // rather than being recomputed in TypeScript with subtly different rules.
  await client.query(`
    update public.street_segment
       set street_key = public.compass_street_key(way_type, name)
     where name is not null
  `)

  log("tronçons", `${rows.length} chargés${skipped ? `, ${skipped} ignorés (géométrie non linéaire)` : ""}`)
  return rows.length
}

// ---------------------------------------------------------------------------
// Attachment
// ---------------------------------------------------------------------------

async function attach(client: Client): Promise<void> {
  // Quartier by containment, replacing the nearest-centroid rule the front end
  // used — those differ exactly at quartier boundaries, which is where the
  // answer matters.
  const quartier = await client.query(`
    update public.premise_location l
       set quartier_id = q.id
      from public.quartier q
     where ST_Intersects(l.geom, q.geom)
  `)
  log("  rattachement quartier", `${quartier.rowCount} locaux`)

  // Street: the name decides which street, geometry only decides which segment
  // of it. Nearest-segment alone would attach a corner premise to the street it
  // faces rather than the one it is addressed on.
  // Correlated subquery rather than `from lateral (...)`: an UPDATE's lateral
  // source cannot see the row being updated, so the target alias is out of scope
  // there. In the SET list it is in scope.
  const byName = await client.query(`
    update public.premise_location l
       set street_segment_id = (
             select s.id from public.street_segment s
              where s.street_key = l.street_key
              order by l.geom <-> s.geom
              limit 1
           ),
           street_match = 'name'
     where l.street_key is not null
       and exists (select 1 from public.street_segment s where s.street_key = l.street_key)
  `)
  log("  rattachement par nom", `${byName.rowCount} locaux`)

  // Fallback for what the register no longer knows under that name — mostly
  // streets Paris has renamed since the census. Capped tightly: beyond 40 m the
  // nearest segment is somebody else's street, and no attachment beats a wrong one.
  const bySpace = await client.query(`
    update public.premise_location l
       set street_segment_id = (
             select s.id from public.street_segment s
              where ST_DWithin(l.geom, s.geom, 40)
              order by l.geom <-> s.geom
              limit 1
           ),
           street_match = 'spatial'
     where l.street_segment_id is null
       and exists (
         select 1 from public.street_segment s where ST_DWithin(l.geom, s.geom, 40)
       )
  `)
  log("  repli spatial", `${bySpace.rowCount} locaux`)
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  try {
    await inTransaction(client, async () => {
      // Detach before rebuilding. The reference tables are the target of foreign
      // keys from premise_location, so they cannot be emptied while premises
      // still point at them — and `truncate ... cascade` would empty the
      // premises too, which is the census, not a reference table.
      await client.query(`
        update public.premise_location
           set quartier_id = null, street_segment_id = null, street_match = null
         where quartier_id is not null or street_segment_id is not null
      `)
      await loadQuartiers(client)
      await loadStreetSegments(client)
      await attach(client)
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
