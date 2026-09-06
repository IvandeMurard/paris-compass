// BDCom ingestion: the three censuses, their nomenclature, and promotion into
// the modelled tables.
//
//   npx.cmd tsx scripts/ingest/bdcom.ts            # all three vintages
//   npx.cmd tsx scripts/ingest/bdcom.ts 2023       # one vintage
//
// Idempotent by construction: staging is emptied per vintage before loading, and
// promotion upserts on keys the source guarantees (`ordre` is unique within a
// vintage — verified: 84 031 / 84 031 for 2017, 83 399 / 83 399 for 2020,
// 60 845 / 60 845 for 2023).
//
// "Re-running yields the same database" was asserted here and was false twice, both found on
// 25 August by actually replaying it against a loaded database (DIAGNOSTIC.md §17). The
// nomenclature load made a second run impossible, and the conflict flag made it produce a
// different database without failing. Both are fixed below; the claim is now measured.
//
// Writes with a role that bypasses row level security, so it must never be given
// the anon key. See scripts/ingest/lib/db.ts.

import type { Client } from "pg"

import { codedDomains, featurePoint, queryPages } from "./lib/arcgis"
import { assertPrivileged, connect, inTransaction, insertRows, log, recordRun } from "./lib/db"

const SERVICE = "https://carto2.apur.org/apur/rest/services"

/**
 * 2017 and 2020 are two layers of the same published service and share a column
 * vocabulary. 2023 is published separately under an entirely different one —
 * `c_ord` for `ORDRE`, `lib_voie` for `LIBELLE_VOIE`, coded integers where the
 * older layers use free text. That is why staging is split in two rather than
 * normalised on the way in.
 */
const LAYERS = {
  2017: { url: `${SERVICE}/OPENDATA/BDCOM_OD/MapServer/0`, shape: "od", pageSize: 2000 },
  2020: { url: `${SERVICE}/OPENDATA/BDCOM_OD/MapServer/1`, shape: "od", pageSize: 2000 },
  2023: { url: `${SERVICE}/BDCOM/bdcom2023/MapServer/0`, shape: "v2023", pageSize: 1000 },
} as const

type Vintage = keyof typeof LAYERS

/**
 * Coordinates are requested in Lambert 93 explicitly rather than left to the
 * layer's default, so the projection is a property of this pipeline and not of
 * whatever the service happens to serve. PostGIS converts on promotion.
 */
const SOURCE_SRID = 2154

// ---------------------------------------------------------------------------
// Staging
// ---------------------------------------------------------------------------

const OD_COLUMNS = [
  "vintage_id", "objectid", "ordre", "arrondissement", "quartier", "iris",
  "x", "y", "num", "let", "type_voie", "libelle_voie", "situation",
  "code_activite", "libelle_activite", "regroupement_8_postes",
  "libelle_regroupement_8_postes", "bio", "surface", "cc_id", "cc_nom", "cc_niv",
]

const V2023_COLUMNS = [
  "objectid", "c_ord", "arro", "qua", "x", "y", "num", "let", "typ_voie",
  "lib_voie", "seq", "sit", "type", "codact", "ens", "bio", "surf", "cc_id",
  "cc_niv", "niv47", "niv18", "niv8", "niv2",
]

const text = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed === "" ? null : trimmed
}

const num = (value: unknown): number | null =>
  value === null || value === undefined || value === "" ? null : Number(value)

async function loadStaging(client: Client, vintage: Vintage): Promise<number> {
  const layer = LAYERS[vintage]
  const table = layer.shape === "od" ? "public.stg_bdcom_od" : "public.stg_bdcom_2023"

  if (layer.shape === "od") {
    await client.query("delete from public.stg_bdcom_od where vintage_id = $1", [vintage])
  } else {
    await client.query("truncate public.stg_bdcom_2023")
  }

  let written = 0
  for await (const page of queryPages<Record<string, unknown>>(layer.url, {
    outFields: "*",
    returnGeometry: true,
    outSR: SOURCE_SRID,
    pageSize: layer.pageSize,
    onPage: (fetched, total) => {
      if (fetched % 10000 < layer.pageSize || fetched === total) {
        log(`  ${vintage} lecture`, `${fetched} / ${total}`)
      }
    },
  })) {
    const rows = page.map((feature) => {
      const a = feature.attributes
      // 2023 publishes no X/Y attributes, so the point comes from the geometry
      // for every layer rather than from attributes on some and geometry on others.
      //
      // `?? null` used to be the whole of this check, and it caught nothing: the
      // 2020 layer answers `{"x":"NaN","y":"NaN"}` for a premise it has no point
      // for, `??` only fires on null and undefined, and the string went on to
      // become a Postgres NaN. `featurePoint` reads the absence as an absence
      // (#68). x and y are therefore null together or finite together.
      const point = featurePoint(feature)
      const x = point?.x ?? null
      const y = point?.y ?? null

      return layer.shape === "od"
        ? [
            vintage, num(a.OBJECTID), num(a.ORDRE), num(a.ARRONDISSEMENT),
            num(a.QUARTIER), text(a.IRIS), x, y, num(a.NUM), text(a.LET),
            text(a.TYPE_VOIE), text(a.LIBELLE_VOIE), text(a.SITUATION),
            text(a.CODE_ACTIVITE), text(a.LIBELLE_ACTIVITE),
            num(a.REGROUPEMENT_8_POSTES), text(a.LIBELLE_REGROUPEMENT_8_POSTES),
            text(a.BIO), text(a.SURFACE), text(a.CC_ID), text(a.CC_NOM), text(a.CC_NIV),
          ]
        : [
            num(a.OBJECTID), num(a.c_ord), num(a.arro), num(a.qua), x, y,
            num(a.num), text(a.let), text(a.typ_voie), text(a.lib_voie),
            num(a.seq), text(a.sit), text(a.type), text(a.codact), text(a.ens),
            text(a.bio), num(a.surf), num(a.cc_id), text(a.cc_niv),
            num(a.niv47), num(a.niv18), num(a.niv8), num(a.niv2),
          ]
    })

    written += await insertRows(
      client,
      table,
      layer.shape === "od" ? OD_COLUMNS : V2023_COLUMNS,
      rows,
    )
  }

  log(`  ${vintage} staging`, `${written} lignes`)
  return written
}

// ---------------------------------------------------------------------------
// Nomenclature
// ---------------------------------------------------------------------------
// Built from the services only. The published workbook is not used: seven of its
// eight level-8 codes carry more than one label, so that column is unusable, and
// everything else it holds is available from the layers themselves.
//
// Codes are upper-cased. The source mixes `AF102` with `af102` and `AA101` with
// `aa101`, which turns 221 real codes into 228 apparent ones.

async function loadNomenclature(client: Client): Promise<void> {
  const domains = await codedDomains(LAYERS[2023].url)
  const label = (field: string, code: unknown): string | null =>
    code === null || code === undefined ? null : (domains[field]?.get(String(code)) ?? null)

  // Deliberately no `delete` here, and this is the difference between a script that loads once
  // and one that can be replayed. DIAGNOSTIC.md §17.
  //
  // Emptying this table worked exactly once: on a first load `premise_observation` is still
  // empty when the nomenclature is written, so nothing references the codes. On every run
  // afterwards the delete hits `premise_observation_activity_code_fkey` and the whole
  // transaction rolls back — measured 25 August against the loaded remote, which is how this
  // was found. w0-cron assumes the four loaders are replayable; this one was not.
  //
  // Nor should it be. A nomenclature code that observations still point at must not be removed:
  // deleting it would either orphan real relevés or, with a cascade, delete them. So codes are
  // upserted and stale ones are left in place — an unused code costs a row and misleads nobody,
  // while a missing one would take observations with it.
  //
  // Codes present in 2023: full hierarchy from the rows, labels from the domains.
  const fromService = await client.query<{
    codact: string; niv47: number; niv18: number; niv8: number; niv2: number; type: string
  }>(`
    select distinct upper(trim(codact)) as codact, niv47, niv18, niv8, niv2, type
    from public.stg_bdcom_2023
    where codact is not null
  `)

  await insertRows(
    client,
    "public.bdcom_activity",
    ["code", "label", "niv47", "label_47", "niv18", "label_18", "niv8", "label_8",
      "niv2", "label_2", "type_code", "type_label", "source"],
    fromService.rows.map((r) => [
      r.codact, label("codact", r.codact) ?? r.codact,
      r.niv47, label("niv47", r.niv47), r.niv18, label("niv18", r.niv18),
      r.niv8, label("niv8", r.niv8), r.niv2, label("niv2", r.niv2),
      r.type, label("type", r.type), "service_2023",
    ]),
    // `do update`, not `do nothing`: without the delete above, a re-run has to be able to
    // refresh a label the service has reworded, and to promote a code first seen in 2017/2020
    // — which carries only a level-8 grouping — to the full hierarchy the day 2023 publishes it.
    `on conflict (code) do update set
       label = excluded.label, niv47 = excluded.niv47, label_47 = excluded.label_47,
       niv18 = excluded.niv18, label_18 = excluded.label_18,
       niv8  = excluded.niv8,  label_8  = excluded.label_8,
       niv2  = excluded.niv2,  label_2  = excluded.label_2,
       type_code = excluded.type_code, type_label = excluded.type_label,
       source = excluded.source`,
  )

  // Codes seen only in the older censuses. Their label and level-8 grouping ride
  // on the rows themselves; their intermediate levels exist in no published
  // source, so they stay null rather than being guessed.
  const fromOlder = await client.query<{
    code: string; label: string | null; niv8: number | null; label_8: string | null
  }>(`
    select upper(trim(s.code_activite))                       as code,
           max(s.libelle_activite)                            as label,
           max(s.regroupement_8_postes)                       as niv8,
           max(s.libelle_regroupement_8_postes)               as label_8
    from public.stg_bdcom_od s
    where s.code_activite is not null
      and upper(trim(s.code_activite)) not in (select code from public.bdcom_activity)
    group by upper(trim(s.code_activite))
  `)

  await insertRows(
    client,
    "public.bdcom_activity",
    ["code", "label", "niv8", "label_8", "source"],
    fromOlder.rows.map((r) => [r.code, r.label ?? r.code, r.niv8, r.label_8, "observed_2017_2020"]),
    "on conflict (code) do nothing",
  )

  const total = await client.query<{ n: string; gaps: string }>(
    "select count(*) n, count(*) filter (where niv47 is null) gaps from public.bdcom_activity",
  )
  log("nomenclature", `${total.rows[0].n} codes, dont ${total.rows[0].gaps} sans niveau 47/18`)
}

// ---------------------------------------------------------------------------
// Promotion
// ---------------------------------------------------------------------------
// Address key expression, duplicated from the generated column in migration
// 20260808000004. The duplication is guarded: promotion asserts that every
// staging row resolves to exactly one location, so a divergence between the two
// expressions fails the load loudly instead of silently dropping observations.
const ADDRESS_KEY = (a: string, n: string, l: string, t: string, v: string) => `
  coalesce(${a}::text, '') || '|' || coalesce(${n}::text, '') || '|' ||
  coalesce(nullif(trim(${l}), ''), '') || '|' ||
  coalesce(nullif(trim(${t}), ''), '') || '|' ||
  coalesce(nullif(trim(${v}), ''), '')`

/** 2020 supplies the canonical point: full scope, and the middle census. */
const CANONICAL_GEOM_VINTAGE = 2020

/**
 * Which point wins when a premise is seen in several vintages — #68.
 *
 * Two rules, and the second one is new. The canonical vintage wins over another
 * vintage's point, because a premise whose position flips between reloads is
 * worse than a premise positioned by the middle census. But ABSENCE NEVER WINS
 * OVER A POINT: until #68 the first rule was the only one, so a premise the 2020
 * survey had no point for kept POINT(NaN NaN) while its 2023 point sat unused in
 * staging — seven of the fifteen were in exactly that state on 2026-09-05.
 *
 * That is not a new decision about which vintage to trust. `geom_vintage_id`
 * exists to record which vintage supplied the point, and the reason the schema
 * gives for preferring 2020 is COVERAGE — 2023 is retail-only, so it cannot be
 * the default — not precision. It says nothing about preferring nothing to a
 * measured point.
 *
 * Expressed twice, once per column, because `geom` and `geom_vintage_id` must
 * move together or the row claims a vintage supplied a point it did not.
 */
const GEOM_WINS = `excluded.geom is not null
        and (excluded.geom_vintage_id = ${CANONICAL_GEOM_VINTAGE}
             or public.premise_location.geom is null)`

async function promoteOd(client: Client, vintage: 2017 | 2020): Promise<void> {
  const key = ADDRESS_KEY("s.arrondissement", "s.num", "s.let", "s.type_voie", "s.libelle_voie")

  await client.query(
    `
    insert into public.premise_location
      (ordre, geom, geom_vintage_id, arrondissement, num, let, typ_voie, lib_voie,
       cc_id, first_seen_vintage_id, last_seen_vintage_id)
    select s.ordre,
           case when s.x is null or s.y is null then null
                else ST_Transform(ST_SetSRID(ST_MakePoint(s.x, s.y), $2), 4326)::geography end,
           case when s.x is null or s.y is null then null else $1::smallint end,
           s.arrondissement, s.num,
           nullif(trim(s.let), ''), nullif(trim(s.type_voie), ''), nullif(trim(s.libelle_voie), ''),
           nullif(s.cc_id, '0')::integer, $1, $1
    from public.stg_bdcom_od s
    where s.vintage_id = $1
    on conflict (ordre, address_key) do update set
      first_seen_vintage_id = least(public.premise_location.first_seen_vintage_id, excluded.first_seen_vintage_id),
      last_seen_vintage_id  = greatest(public.premise_location.last_seen_vintage_id, excluded.last_seen_vintage_id),
      geom = case when ${GEOM_WINS}
                  then excluded.geom else public.premise_location.geom end,
      geom_vintage_id = case when ${GEOM_WINS}
                  then excluded.geom_vintage_id else public.premise_location.geom_vintage_id end
    `,
    [vintage, SOURCE_SRID],
  )

  await client.query(
    `
    insert into public.premise_observation
      (location_id, vintage_id, source_ordre, activity_code, size_band,
       situation_code, is_bio, cc_id, cc_level, match_method)
    select l.id, $1, s.ordre,
           a.code, sb.code, st.code,
           case when s.bio is null then null else s.bio in ('1', 'true', 'oui') end,
           nullif(s.cc_id, '0')::integer, nullif(trim(s.cc_niv), ''),
           -- Conflict is tested first, and deliberately. A premise created by a
           -- reused identifier also satisfies "first seen in this vintage", so
           -- testing that branch first would label every conflict as an ordinary
           -- first appearance and the ambiguity would vanish from the record.
           case
             when l.ordre in (select ordre from public.premise_location group by ordre having count(*) > 1)
               then 'ordre_address_conflict'
             when l.first_seen_vintage_id = $1 then 'new'
             else 'ordre'
           end::public.bdcom_match_method
    from public.stg_bdcom_od s
    join public.premise_location l
      on l.ordre = s.ordre and l.address_key = (${key})
    left join public.bdcom_activity  a  on a.code = upper(trim(s.code_activite))
    left join public.bdcom_size_band sb on sb.label_source = s.surface
    left join public.bdcom_situation st on st.label_source = s.situation
    where s.vintage_id = $1
    on conflict (vintage_id, source_ordre) do update set
      location_id    = excluded.location_id,
      activity_code  = excluded.activity_code,
      size_band      = excluded.size_band,
      situation_code = excluded.situation_code,
      is_bio         = excluded.is_bio,
      cc_id          = excluded.cc_id,
      cc_level       = excluded.cc_level,
      -- Recomputed, not preserved: on a partial reload the earlier value was
      -- derived from whichever vintages happened to be loaded at the time.
      match_method   = excluded.match_method
    `,
    [vintage],
  )
}

async function promote2023(client: Client): Promise<void> {
  const key = ADDRESS_KEY("s.arro", "s.num", "s.let", "s.typ_voie", "s.lib_voie")

  await client.query(
    `
    insert into public.premise_location
      (ordre, geom, geom_vintage_id, arrondissement, num, let, typ_voie, lib_voie,
       cc_id, first_seen_vintage_id, last_seen_vintage_id)
    select s.c_ord,
           case when s.x is null or s.y is null then null
                else ST_Transform(ST_SetSRID(ST_MakePoint(s.x, s.y), $1), 4326)::geography end,
           case when s.x is null or s.y is null then null else 2023::smallint end,
           s.arro, s.num,
           nullif(trim(s.let), ''), nullif(trim(s.typ_voie), ''), nullif(trim(s.lib_voie), ''),
           nullif(s.cc_id, 0), 2023, 2023
    from public.stg_bdcom_2023 s
    on conflict (ordre, address_key) do update set
      first_seen_vintage_id = least(public.premise_location.first_seen_vintage_id, excluded.first_seen_vintage_id),
      last_seen_vintage_id  = greatest(public.premise_location.last_seen_vintage_id, excluded.last_seen_vintage_id),
      -- Same rule as promoteOd, and it is the half 2023 never had: this branch
      -- used to leave geom alone unconditionally, which is right against a
      -- canonical point and wrong against no point at all (#68).
      geom = case when ${GEOM_WINS}
                  then excluded.geom else public.premise_location.geom end,
      geom_vintage_id = case when ${GEOM_WINS}
                  then excluded.geom_vintage_id else public.premise_location.geom_vintage_id end
    `,
    [SOURCE_SRID],
  )

  await client.query(`
    insert into public.premise_observation
      (location_id, vintage_id, source_ordre, activity_code, size_band,
       situation_code, sign_name, is_bio, cc_id, cc_level, match_method)
    select l.id, 2023, s.c_ord,
           a.code, s.surf, s.sit, nullif(trim(s.ens), ''),
           case when s.bio is null then null else s.bio in ('1', 'true') end,
           nullif(s.cc_id, 0), nullif(trim(s.cc_niv), ''),
           case
             when l.ordre in (select ordre from public.premise_location group by ordre having count(*) > 1)
               then 'ordre_address_conflict'
             when l.first_seen_vintage_id = 2023 then 'new'
             else 'ordre'
           end::public.bdcom_match_method
    from public.stg_bdcom_2023 s
    join public.premise_location l
      on l.ordre = s.c_ord and l.address_key = (${key})
    left join public.bdcom_activity a on a.code = upper(trim(s.codact))
    on conflict (vintage_id, source_ordre) do update set
      location_id    = excluded.location_id,
      activity_code  = excluded.activity_code,
      size_band      = excluded.size_band,
      situation_code = excluded.situation_code,
      sign_name      = excluded.sign_name,
      is_bio         = excluded.is_bio,
      cc_id          = excluded.cc_id,
      cc_level       = excluded.cc_level,
      match_method   = excluded.match_method
  `)
}

/**
 * Every staged row must produce exactly one observation. A shortfall means the
 * address-key expressions have diverged, or a foreign key silently dropped rows
 * — both of which would otherwise show up as a quietly incomplete census.
 *
 * `where x is not null` was dropped from both counts on 2026-09-05 (#68). The
 * comment above always claimed EVERY staged row, and the filter quietly excused
 * the rows that had no point — the same fifteen. Now that a premise without a
 * coordinate is loaded rather than skipped, the assertion says what it says.
 */
async function assertComplete(client: Client, vintage: Vintage): Promise<void> {
  const staged = await client.query<{ n: string }>(
    vintage === 2023
      ? "select count(*) n from public.stg_bdcom_2023"
      : "select count(*) n from public.stg_bdcom_od where vintage_id = $1",
    vintage === 2023 ? [] : [vintage],
  )
  const promoted = await client.query<{ n: string }>(
    "select count(*) n from public.premise_observation where vintage_id = $1",
    [vintage],
  )

  const from = Number(staged.rows[0].n)
  const to = Number(promoted.rows[0].n)
  if (from !== to) {
    throw new Error(
      `${vintage}: ${from} lignes en staging mais ${to} relevés promus. ` +
        `Écart de ${from - to} — chargement incomplet, rien n'est validé.`,
    )
  }
  log(`  ${vintage} promotion`, `${to} relevés`)
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const requested = process.argv.slice(2).map(Number).filter(Boolean) as Vintage[]
  const vintages = (requested.length ? requested : [2017, 2020, 2023]) as Vintage[]
  for (const v of vintages) {
    if (!(v in LAYERS)) throw new Error(`millésime inconnu : ${v} (connus : 2017, 2020, 2023)`)
  }

  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  try {
    // One transaction for the whole run: a half-loaded census is worse than none,
    // because nothing downstream can tell the difference between "not there" and
    // "not loaded yet".
    await inTransaction(client, async () => {
      for (const vintage of vintages) {
        log(`millésime ${vintage}`)
        const rows = await loadStaging(client, vintage)
        await client.query(
          `update public.bdcom_vintage
             set record_count = $2, ingested_at = now()
           where id = $1`,
          [vintage, rows],
        )
      }

      log("nomenclature")
      await loadNomenclature(client)

      // Chronological, so `match_method = 'new'` means "first census this premise
      // appears in" rather than "first one we happened to load".
      for (const vintage of [...vintages].sort()) {
        log(`promotion ${vintage}`)
        if (vintage === 2023) await promote2023(client)
        else await promoteOd(client, vintage)
        await assertComplete(client, vintage)
      }

      // The conflict flag is set here, after all three promotions, and not during them.
      //
      // Each promotion used to compute it against the *current* state of premise_location, so
      // against a corpus still being built: on a first load the 2017 pass could not yet see
      // the duplicate `ordre` that 2020 and 2023 were about to create, and only the last
      // vintage ended up flagged. On a reload the table is already full, so all three were —
      // 74 observations flagged on 15 August, 220 on the 25th.
      //
      // The count of reattributed *identifiers* never moved: it is 74 either way. What
      // differed was how many observations carried the flag, and that depended on load order.
      // Reloading the same source must yield the same database, so the pass is global,
      // idempotent and order-independent. DIAGNOSTIC.md §17.
      const flagged = await client.query(`
        update public.premise_observation o
           set match_method = 'ordre_address_conflict'
          from public.premise_location l
         where l.id = o.location_id
           and l.ordre in (
             select ordre from public.premise_location group by ordre having count(*) > 1
           )
           and o.match_method is distinct from 'ordre_address_conflict'
      `)
      if ((flagged.rowCount ?? 0) > 0) {
        log("conflits d'identifiant", `${flagged.rowCount} relevés marqués`)
      }
    })

    const summary = await client.query<{ year: number; locations: string; observations: string }>(`
      select v.year,
             (select count(*) from public.premise_observation o where o.vintage_id = v.id) as observations,
             (select count(*) from public.premise_location) as locations
      from public.bdcom_vintage v order by v.year
    `)
    log("terminé")
    for (const row of summary.rows) log(`  ${row.year}`, `${row.observations} relevés`)
    log("  locaux distincts", summary.rows[0]?.locations ?? "0")

    // The freshness of BDCom is the newest survey it holds, never the date of this run. A
    // census reloaded today is still a census of the year it was walked — `as_of` is read
    // from bdcom_vintage, which is the only place that knows it.
    const loaded = await client.query<{ as_of: string; total: string }>(
      `select max(v.as_of) as as_of,
              (select count(*) from public.premise_observation)::text as total
         from public.bdcom_vintage v
        where v.ingested_at is not null`,
    )
    await recordRun(client, "bdcom", {
      rowCount: Number(loaded.rows[0]?.total ?? 0),
      sourceAsOf: loaded.rows[0]?.as_of ?? "inconnu",
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
