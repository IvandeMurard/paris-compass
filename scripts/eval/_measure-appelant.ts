// Temporary measurement for w0-appelant (#58). Not committed.
//
//   npx.cmd tsx scripts/eval/_measure-appelant.ts
//
// Plays the three callers against the six withholding functions, on the points
// docs/tickets/w0-appelant.md names: premise 54652 in 2017, and the two _within
// functions at Halles, 800 m.

import { connect, connectionTarget, log } from "../ingest/lib/db"

const HALLES = { lat: 48.86229, lng: 2.3449 }
const PREMISE = 54652
const out = (s: string): void => void process.stdout.write(s + "\n")

type Caller = { name: string; claim: string | null; role: string | null }

const CALLERS: Caller[] = [
  { name: "privilegie (connexion directe)", claim: null, role: null },
  { name: "service_role (claim)", claim: "service_role", role: null },
  { name: "anon (claim + set role)", claim: "anon", role: "anon" },
  { name: "authenticated (claim + set role)", claim: "authenticated", role: "authenticated" },
]

async function main(): Promise<void> {
  const client = await connect()
  log("CIBLE", connectionTarget())

  for (const caller of CALLERS) {
    out(`\n================ ${caller.name} ================`)
    await client.query("begin")
    if (caller.claim)
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ role: caller.claim }),
      ])
    if (caller.role) await client.query(`set local role ${caller.role}`)

    try {
      const hist = await client.query(
        `select vintage_year, observed, withheld, is_vacant, activity_label
           from public.compass_premise_history($1) where vintage_year = 2017`,
        [PREMISE],
      )
      out(`compass_premise_history(54652, 2017) : ${JSON.stringify(hist.rows)}`)

      const loc = await client.query(
        `select occurred_on, observed, withheld, label
           from public.compass_address_timeline(
             (select id from public.premise_location where id = $1))
          where occurred_on = date '2017-01-01' and kind = 'survey'`,
        [PREMISE],
      )
      out(`compass_address_timeline(54652, 2017) : ${JSON.stringify(loc.rows)}`)

      const surv = await client.query(
        `select source, cohort_n, survived_n, survival_rate, withheld, insufficient_n
           from public.compass_survival_by_trade($1::double precision, $2::double precision, 111::smallint)`,
        [HALLES.lat, HALLES.lng],
      )
      out(`compass_survival_by_trade(Halles, niv18 111) : ${JSON.stringify(surv.rows)}`)

      const within = await client.query(
        `select count(*) as lignes,
                count(*) filter (where withheld) as marquees,
                max(total_matched) as total_matched
           from public.compass_premises_within(
             $1::double precision, $2::double precision, 800::double precision,
             2017::smallint, 100000::integer)`,
        [HALLES.lat, HALLES.lng],
      )
      out(`compass_premises_within(Halles, 800 m, 2017) : ${JSON.stringify(within.rows)}`)

      const ctx = await client.query(
        `select count(*) as lignes, count(*) filter (where withheld) as marquees,
                max(total_matched) as total_matched, count(*) filter (where out_of_corpus) as hors_corpus
           from public.compass_scoring_context_within(
             $1::double precision, $2::double precision, 800::double precision, 2017::smallint)`,
        [HALLES.lat, HALLES.lng],
      )
      out(`compass_scoring_context_within(Halles, 800 m, 2017) : ${JSON.stringify(ctx.rows)}`)

      const rot = await client.query(
        `select vintage_year, count(*) as lignes, count(*) filter (where withheld) as marquees,
                sum(premises) as premises, sum(changed_since_previous) as changed
           from public.compass_street_rotation(
             $1::double precision, $2::double precision, 300::double precision, true)
          group by vintage_year order by vintage_year`,
        [HALLES.lat, HALLES.lng],
      )
      out(`compass_street_rotation(Halles, 300 m) : ${JSON.stringify(rot.rows)}`)
    } catch (error) {
      out(`  ERREUR : ${error instanceof Error ? error.message : String(error)}`)
    }
    await client.query("rollback")
  }

  await client.end()
}

main().catch((error: unknown) => {
  out(`ERREUR — ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
})
