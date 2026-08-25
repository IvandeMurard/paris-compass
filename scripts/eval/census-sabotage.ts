// The proof that the census (I23/I24) actually closes the door — w0-retenue (#57).
//
//   npm.cmd run eval:sabotage
//
// The rule this repository keeps rediscovering is that a rule nobody plays is a
// comment. I16/I17 were proved by two sabotages in rolled-back transactions
// (DIAGNOSTIC.md §10); I18 was proved by the count it returned before and after
// 20260824000002. The census deserves the same treatment, and it needs a sharper
// one: its whole claim is about a function that does not exist yet.
//
// So this script CREATES that function — a sixth `compass_*` reading
// premise_observation, SECURITY INVOKER, no `withheld` column, no anonymous test
// — inside a transaction that is always rolled back, and re-runs I23 and I24
// against it. Both must turn red. Then it rolls back and re-runs them clean, to
// show the red came from the sabotage and not from a broken query.
//
// It imports the real verdict from ./census.ts. A proof that runs a copy of the
// check proves something about the copy.
//
// Exit codes follow the runner's convention: 0 PASS, 1 FAIL, 2 ERROR.

import type { Client } from "pg"

import { connect, connectionTarget, log } from "../ingest/lib/db"
import { anonymousCoverage, censusVerdict, readInvariants } from "./census"

let failures = 0
const out = (s: string): void => void process.stdout.write(s + "\n")
const pass = (what: string, detail: string): void => out(`  ok    ${what} — ${detail}`)
const fail = (what: string, detail: string): void => {
  failures += 1
  out(`  FAIL  ${what} — ${detail}`)
}

/**
 * The sixth function, written the way the previous five were born: it reads the
 * restricted table, it is SECURITY INVOKER, it announces nothing. Deliberately
 * plausible — this is not a strawman, it is compass_street_rotation before
 * 20260825000014.
 */
const SABOTAGE = `
create function public.compass_sabotage_probe(p_vintage_year smallint)
returns table (vintage_year smallint, premises bigint)
language sql stable security invoker
set search_path = public, extensions
as $sabotage$
  select v.year, count(*)
  from public.premise_observation o
  join public.bdcom_vintage v on v.id = o.vintage_id
  where v.year = p_vintage_year
  group by v.year;
$sabotage$;
`

interface Outcome {
  structural: number
  censusUncovered: string[]
  censusPopulation: string[]
}

/** Runs I23 and I24 as the gate runs them, and reports what they saw. */
async function play(client: Client): Promise<Outcome> {
  const invariants = readInvariants()
  const covered = anonymousCoverage(invariants)

  const structural = invariants.find((i) => i.id === "I23")
  const census = invariants.find((i) => i.id === "I24")
  if (!structural || !census) throw new Error("I23 ou I24 absent de eval/invariants.sql")
  if (!census.census) throw new Error("I24 ne porte pas de marqueur @census")

  const structuralRows = await client.query(structural.sql)
  const censusRows = await client.query(census.sql)
  const verdict = censusVerdict(censusRows.rows as Record<string, unknown>[], census.census, covered)

  return {
    structural: structuralRows.rowCount ?? 0,
    censusUncovered: verdict.uncovered,
    censusPopulation: verdict.population,
  }
}

async function main(): Promise<void> {
  const target = connectionTarget()
  log("CIBLE", target)
  out("Sabotage du recensement — une sixième fonction, dans une transaction annulée\n")

  const client = await connect()
  try {
    // 1. Clean: the gate must be green, or the sabotage proves nothing.
    const before = await play(client)
    out(`  population recensée : ${before.censusPopulation.join(", ")}`)
    if (before.structural === 0) pass("I23 avant sabotage", "aucune fonction sans annonce de retenue")
    else fail("I23 avant sabotage", `${before.structural} ligne(s) — la porte est déjà rouge, le sabotage ne prouve rien`)
    if (before.censusUncovered.length === 0)
      pass("I24 avant sabotage", `${before.censusPopulation.length} fonction(s), toutes couvertes`)
    else
      fail("I24 avant sabotage", `déjà ${before.censusUncovered.length} non couverte(s) : ${before.censusUncovered.join(", ")}`)

    // 2. Sabotage, inside a transaction that is never committed.
    out("")
    await client.query("begin")
    let during: Outcome
    try {
      await client.query(SABOTAGE)
      during = await play(client)
    } finally {
      await client.query("rollback")
    }

    if (during.structural > 0)
      pass("I23 sous sabotage", `${during.structural} ligne(s) — la fonction INVOKER sans marqueur est vue`)
    else fail("I23 sous sabotage", "zéro ligne — la règle structurelle ne voit pas la sixième fonction")

    if (during.censusUncovered.includes("compass_sabotage_probe"))
      pass(
        "I24 sous sabotage",
        `non couverte : ${during.censusUncovered.join(", ")} — population passée à ${during.censusPopulation.length}`,
      )
    else
      fail(
        "I24 sous sabotage",
        `compass_sabotage_probe absente des non couvertes (${during.censusUncovered.join(", ") || "aucune"})`,
      )

    // 3. Clean again: the red has to come from the sabotage, not from drift.
    out("")
    const after = await play(client)
    if (after.structural === 0 && after.censusUncovered.length === 0)
      pass("après rollback", `I23 et I24 au vert, ${after.censusPopulation.length} fonction(s) recensée(s)`)
    else
      fail(
        "après rollback",
        `I23 ${after.structural} ligne(s), I24 ${after.censusUncovered.length} non couverte(s) — la transaction a laissé quelque chose`,
      )

    const stillThere = await client.query(
      `select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'compass_sabotage_probe'`,
    )
    if (stillThere.rowCount === 0) pass("nettoyage", "compass_sabotage_probe n'existe pas en base")
    else fail("nettoyage", "compass_sabotage_probe a survécu au rollback")
  } finally {
    await client.end()
  }

  out(
    failures === 0
      ? `\nPASS — une sixième fonction sans test de retenue fait passer la porte au rouge — ${target}`
      : `\nFAIL — ${failures} contrôle(s) en échec — ${target}`,
  )
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error: unknown) => {
  out(`ERREUR — ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
})
