import { connect, connectionTarget } from "./ingest/lib/db"

const q = async (c: import("pg").Client, label: string, sql: string): Promise<void> => {
  try {
    const r = await c.query(sql)
    console.log("\n### " + label)
    console.log(JSON.stringify(r.rows, null, 1))
  } catch (e) { console.log("\n### " + label + " ERREUR: " + (e as Error).message) }
}

async function main(): Promise<void> {
  const c = await connect()
  console.log("cible:", connectionTarget())

  await q(c, "1. les 15 locaux NaN", `
    select id, ordre, geom_vintage_id, arrondissement, num, let, typ_voie, lib_voie,
           first_seen_vintage_id as fs, last_seen_vintage_id as ls, ST_AsText(geom::geometry) as wkt
    from public.premise_location
    where ST_AsText(geom::geometry) like '%NaN%'
    order by ordre`)

  await q(c, "2. leurs releves par millesime", `
    select o.vintage_id, count(*) n
    from public.premise_observation o
    join public.premise_location l on l.id = o.location_id
    where ST_AsText(l.geom::geometry) like '%NaN%'
    group by 1 order by 1`)

  await q(c, "3. staging od x/y", `
    select vintage_id, count(*) n,
           count(*) filter (where x = 'NaN'::float8 or y = 'NaN'::float8) nan,
           count(*) filter (where x is null or y is null) nuls
    from public.stg_bdcom_od group by 1 order by 1`)

  await q(c, "4. staging 2023 x/y", `
    select count(*) n,
           count(*) filter (where x = 'NaN'::float8 or y = 'NaN'::float8) nan,
           count(*) filter (where x is null or y is null) nuls
    from public.stg_bdcom_2023`)

  await q(c, "5. staging od 98108-98123", `
    select vintage_id, ordre, x, y, arrondissement, num, let, type_voie, libelle_voie, code_activite
    from public.stg_bdcom_od where ordre between 98108 and 98123 order by vintage_id, ordre`)

  await q(c, "6. staging 2023 98108-98123", `
    select c_ord, x, y, arro, num, let, typ_voie, lib_voie, codact
    from public.stg_bdcom_2023 where c_ord between 98108 and 98123 order by c_ord`)

  await c.end()
}
void main()
