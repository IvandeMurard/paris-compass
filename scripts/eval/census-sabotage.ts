// The proof that the licence rules actually close the door — w0-retenue (#57),
// then w0-appelant (#58).
//
//   npm.cmd run eval:sabotage
//
// The rule this repository keeps rediscovering is that a rule nobody plays is a
// comment. I16/I17 were proved by two sabotages in rolled-back transactions
// (DIAGNOSTIC.md §10); I18 was proved by the count it returned before and after
// 20260824000002. The rules below deserve the same treatment, and they need a
// sharper one: their whole claim is about a function that does not exist yet.
//
// Three acts, each inside a transaction that is always rolled back:
//
//   1. THE SIXTH FUNCTION — a compass_* reading premise_observation, SECURITY
//      INVOKER, no `withheld` column, no anonymous test. I23 and I24 must turn
//      red. (w0-retenue)
//   2. THE SEVENTH FUNCTION — SECURITY DEFINER, `withheld` column, an anonymous
//      test it could plausibly have, and the caller test COPIED into its body.
//      I23 stays GREEN — it has nothing to object to — and I32 turns red. That
//      contrast is the whole point of I32: it sees what I23 cannot. (w0-appelant)
//   3. THE DECISION REVERTED — compass_caller_is_privileged() put back to
//      `<> 'anon'`, which makes `authenticated` privileged again. I33 must turn
//      red and I34 must stay green, because a decision nobody plays is prose.
//
// Then it rolls back and re-runs everything clean, to show the red came from the
// sabotage and not from a broken query.
//
// It imports the real verdict from ./census.ts. A proof that runs a copy of the
// check proves something about the copy.
//
// The file is still called census-sabotage because `eval:sabotage` points at it
// and the census was its first act; it is the sabotage gate for the whole
// licence family now.
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

/**
 * The seventh function, and the one I23 was never going to catch: SECURITY
 * DEFINER, a `withheld` column, a body that withholds correctly — and the caller
 * test copied in rather than called. Verbatim what the six carried before
 * 20260826000002, which is exactly how a seventh function acquires it.
 *
 * It is written to PASS I23 on purpose. If it failed I23 the demonstration would
 * prove nothing about I32.
 */
const SABOTAGE_CLAIM = `
create function public.compass_sabotage_claim(p_vintage_year smallint)
returns table (vintage_year smallint, premises bigint, withheld boolean)
language plpgsql stable security definer
set search_path = public, extensions
as $sabotage$
declare
  v_privileged boolean;
begin
  select coalesce(
           nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
           nullif(current_setting('request.jwt.claim.role', true), ''),
           'service_role'
         ) <> 'anon' into v_privileged;

  return query
  select v.year, count(*), false
  from public.premise_observation o
  join public.bdcom_vintage v on v.id = o.vintage_id
  where v.year = p_vintage_year and (v_privileged or v.publicly_redistributable)
  group by v.year;
end;
$sabotage$;
`

/**
 * The decision of 26 August 2026 put back the way it was: anything that is not
 * `anon` is privileged, so a website account sees the vintages whose licence was
 * never read. The one edit that would undo w0-appelant without touching any of
 * the six functions.
 */
const SABOTAGE_DECISION = `
create or replace function public.compass_caller_is_privileged()
returns boolean
language sql stable parallel safe
set search_path = public, extensions
as $sabotage$
  select coalesce(
           nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
           nullif(current_setting('request.jwt.claim.role', true), ''),
           'service_role'
         ) <> 'anon';
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

/**
 * Runs one invariant by id, impersonating its `@as` role exactly as run.ts does
 * — claim only, never `set local role`. Returns the violating rows.
 *
 * The impersonation is undone whatever the invariant does — by a savepoint when
 * this runs inside a sabotage transaction, by the transaction itself when it
 * runs clean. Without that, a `@as authenticated` invariant would leave its
 * claim set for everything measured after it.
 */
async function playOne(client: Client, id: string, inTransaction = false): Promise<Record<string, unknown>[]> {
  const invariant = readInvariants().find((i) => i.id === id)
  if (!invariant) throw new Error(`${id} absent de eval/invariants.sql`)
  await client.query(inTransaction ? "savepoint invariant" : "begin")
  try {
    if (invariant.as)
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ role: invariant.as }),
      ])
    const result = await client.query(invariant.sql)
    return result.rows as Record<string, unknown>[]
  } finally {
    await client.query(inTransaction ? "rollback to savepoint invariant" : "rollback")
  }
}

/** Runs `work` inside a transaction that is never committed. */
async function sabotaged<T>(client: Client, ddl: string, work: () => Promise<T>): Promise<T> {
  await client.query("begin")
  try {
    await client.query(ddl)
    return await work()
  } finally {
    await client.query("rollback")
  }
}

async function main(): Promise<void> {
  const target = connectionTarget()
  log("CIBLE", target)
  out("Sabotage des règles de retenue — trois actes, tous dans des transactions annulées\n")

  const client = await connect()
  try {
    // -----------------------------------------------------------------------
    // 0. Clean: the gate must be green, or no sabotage proves anything.
    // -----------------------------------------------------------------------
    const before = await play(client)
    const callerBefore = await playOne(client, "I32")
    out(`  population recensée : ${before.censusPopulation.join(", ")}`)
    if (before.structural === 0) pass("I23 avant sabotage", "aucune fonction sans annonce de retenue")
    else fail("I23 avant sabotage", `${before.structural} ligne(s) — la porte est déjà rouge, le sabotage ne prouve rien`)
    if (before.censusUncovered.length === 0)
      pass("I24 avant sabotage", `${before.censusPopulation.length} fonction(s), toutes couvertes`)
    else
      fail("I24 avant sabotage", `déjà ${before.censusUncovered.length} non couverte(s) : ${before.censusUncovered.join(", ")}`)
    if (callerBefore.length === 0) pass("I32 avant sabotage", "le test d'appelant n'a qu'une expression")
    else fail("I32 avant sabotage", `${callerBefore.length} ligne(s) — déjà rouge : ${JSON.stringify(callerBefore)}`)

    // -----------------------------------------------------------------------
    // 1. La sixième fonction — w0-retenue (#57)
    // -----------------------------------------------------------------------
    out("\nActe 1 — une sixième fonction, SECURITY INVOKER et sans marqueur")
    const during = await sabotaged(client, SABOTAGE, () => play(client))

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

    // -----------------------------------------------------------------------
    // 2. La septième fonction, qui recopie le test — w0-appelant (#58)
    // -----------------------------------------------------------------------
    out("\nActe 2 — une septième fonction, irréprochable pour I23, qui recopie le test d'appelant")
    const copied = await sabotaged(client, SABOTAGE_CLAIM, async () => ({
      caller: await playOne(client, "I32", true),
      structural: (await play(client)).structural,
    }))

    const named = copied.caller.filter((r) => r.proname === "compass_sabotage_claim")
    if (named.some((r) => String(r.raison).startsWith("recopie le test")))
      pass("I32 sous sabotage", `compass_sabotage_claim vue — ${named.map((r) => r.raison).join(" ; ")}`)
    else
      fail(
        "I32 sous sabotage",
        `compass_sabotage_claim absente ou mal motivée (${JSON.stringify(copied.caller) || "aucune ligne"})`,
      )

    if (copied.structural === 0)
      pass(
        "I23 sous le même sabotage",
        "reste au vert — DEFINER et colonne withheld : c'est exactement ce que I23 ne pouvait pas voir",
      )
    else
      fail(
        "I23 sous le même sabotage",
        `${copied.structural} ligne(s) — la fonction sabotée devait passer I23, sinon la démonstration ne porte pas sur I32`,
      )

    // -----------------------------------------------------------------------
    // 3. La décision rendue à son état d'avant — w0-appelant (#58)
    // -----------------------------------------------------------------------
    out("\nActe 3 — la décision du 26 août annulée : « tout ce qui n'est pas anon est privilégié »")
    const reverted = await sabotaged(client, SABOTAGE_DECISION, async () => ({
      authenticated: await playOne(client, "I33", true),
      service: await playOne(client, "I34", true),
    }))

    if (reverted.authenticated.length > 0)
      pass(
        "I33 sous sabotage",
        `${reverted.authenticated.length} ligne(s) — ${reverted.authenticated.map((r) => r.defaut).join(" ; ")}`,
      )
    else fail("I33 sous sabotage", "zéro ligne — la décision n'est gardée par rien")

    if (reverted.service.length === 0)
      pass("I34 sous le même sabotage", "reste au vert — le rôle de service n'est pas ce qui a bougé")
    else
      fail(
        "I34 sous le même sabotage",
        `${reverted.service.length} ligne(s) — le sabotage a aussi déplacé le rôle de service, la démonstration ne sépare plus les deux`,
      )

    // -----------------------------------------------------------------------
    // 4. Clean again: the red has to come from the sabotage, not from drift.
    // -----------------------------------------------------------------------
    out("")
    const after = await play(client)
    const callerAfter = await playOne(client, "I32")
    const authAfter = await playOne(client, "I33")
    const serviceAfter = await playOne(client, "I34")
    if (
      after.structural === 0 &&
      after.censusUncovered.length === 0 &&
      callerAfter.length === 0 &&
      authAfter.length === 0 &&
      serviceAfter.length === 0
    )
      pass(
        "après rollback",
        `I23, I24, I32, I33 et I34 au vert, ${after.censusPopulation.length} fonction(s) recensée(s)`,
      )
    else
      fail(
        "après rollback",
        `I23 ${after.structural} · I24 ${after.censusUncovered.length} · I32 ${callerAfter.length} · ` +
          `I33 ${authAfter.length} · I34 ${serviceAfter.length} — une transaction a laissé quelque chose`,
      )

    const stillThere = await client.query(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname in ('compass_sabotage_probe', 'compass_sabotage_claim')`,
    )
    if (stillThere.rowCount === 0) pass("nettoyage", "aucune fonction de sabotage en base")
    else
      fail(
        "nettoyage",
        `${(stillThere.rows as { proname: string }[]).map((r) => r.proname).join(", ")} a survécu au rollback`,
      )

    // The decision is a body, not a name: a surviving act 3 would leave the
    // function in place with the wrong test inside, which nothing above would
    // have noticed.
    const decision = await client.query<{ reverted: boolean }>(
      `select p.prosrc ~ '<> ''anon''' as reverted
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'compass_caller_is_privileged'`,
    )
    if (decision.rows.length === 1 && !decision.rows[0].reverted)
      pass("nettoyage", "compass_caller_is_privileged porte toujours la décision du 26 août")
    else fail("nettoyage", "compass_caller_is_privileged est absente ou a gardé le test saboté")
  } finally {
    await client.end()
  }

  out(
    failures === 0
      ? `\nPASS — une fonction sans test de retenue, une qui le recopie, et la décision annulée : ` +
          `les trois font passer la porte au rouge — ${target}`
      : `\nFAIL — ${failures} contrôle(s) en échec — ${target}`,
  )
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error: unknown) => {
  out(`ERREUR — ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
})
