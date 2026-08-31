// Arm A — the invariants, and what it does when the database refuses to finish one.
//
// Its own module for the reason upstream.ts already gives about the anonymous gate: "a gate
// whose classification lives inside its own runner is a gate nobody can check without
// running it against a live database". Arm A grew the same two decisions arm E and the
// anonymous gate have — what suspends, and what only speaks — while still living inside
// run.ts, where `main()` executes on import and no test can reach it. Same shape as
// budget.ts: this returns an outcome, run.ts prints it.
//
// WHAT BLOCKS AND WHAT ONLY SPEAKS, which is the whole of #69:
//
//   FAIL  an invariant returned rows. The only thing that fails here. Unchanged.
//   susp  the database cancelled the statement (57014). The arm did not look, so it says so
//         and CARRIES ON — arms B, C and E get played. Never a PASS, never a FAIL.
//   WARN  an invariant crossed a declared share of its window while returning zero rows.
//         The content is green and the clock is not; DIAGNOSTIC.md §18 — a gate whose
//         verdict depends on the temperature of the cache is a gate that will one day be
//         ignored — so nothing here fails on a clock.

import type { Client } from "pg"

import type { Invariant } from "./census"
import { anonymousCoverage, censusVerdict, readInvariants } from "./census"
import type { ChunkRange } from "./chunks"
import { boundaryOffsets, chunkRanges } from "./chunks"
import { classifyDriverError, UpstreamTimeout } from "./upstream"

/**
 * Arm A's OWN statement window, in milliseconds — #69.
 *
 * Until 2026-08-31 the arm had no window of its own: it inherited whatever the `postgres`
 * role happened to carry, which is 120 000 ms and comes from a cluster default nobody in
 * this repository chose. That is how a gate ends up on a knife edge without anyone having
 * decided it should be — I1 measured 118 137 ms cold on 2026-08-31, 1.6 % of margin.
 *
 * This is set DOWN from the inherited value, not up. The three expensive invariants are
 * sliced (./chunks.ts), so the widest statement arm A now issues is one slice — measured
 * between 6,2 s and 13,1 s over four runs. 60 000 ms is far above that, and still half what
 * the arm used to inherit.
 */
export const ARM_A_WINDOW_MS = 60_000

/**
 * The share of that window at which the arm says so, rather than waiting for the wall.
 *
 * This is the answer to "the window will just be raised again next month": it cannot be
 * raised in silence, because a run prints a warning at 30 000 ms — some five times the widest
 * statement measured on 2026-08-31 — long before anything is cancelled.
 *
 * Corpus growth does not move this number: a bigger `premise_location` buys more slices,
 * not a longer statement. What DOES move it is the per-premise cost of
 * `compass_address_timeline` growing — which is the regression worth hearing about, and the
 * one nothing in the gate could see before.
 */
export const ARM_A_WARN_FRACTION = 0.5

/**
 * Rows one sliced invariant may walk in a single statement.
 *
 * SLICES ARE EQUAL IN ROWS, NOT IN COST. Premises differ in how many BODACC notices they
 * carry, so the widest slice costs well above the average per-premise price — 1,46 ms against
 * 0,965 at the first size tried. Sizing on the average alone is therefore wrong.
 *
 * AND THE SIZE IS DERIVED FROM THE MEASURED NOISE, not chosen for roundness — and the
 * measurement had to be taken twice, because the first estimate of the noise was too kind.
 * The widest statement of I1, over four consecutive runs on 2026-08-31:
 *
 *   12 000 rows/slice (8 slices) — 15,6 s then 24,4 s
 *    8 000 rows/slice (11 slices) — 12,2 s then 23,2 s
 *
 * A factor of ~1,9 between two consecutive runs at the SAME size, on an instance shared with
 * other tenants, before cold adds its own ~1,41. The widest statement can therefore reach
 * ~2,7x its typical value with nothing having regressed. 8 000 put the bad run at 23,2 s —
 * 77 % of the 30 000 ms warning, which is exactly the warning-that-fires-on-noise budget.ts
 * refuses. 4 000 gives 22 slices of ~3 883, and MEASURED rather than scaled from the line
 * above — scaling predicted ~6 s — the widest statement came out at 10,1 s then 13,1 s over
 * two further runs. That is 34 % then 44 % of the warning, which leaves it free to mean what
 * it is for; it does not make it immune, and the reservation is written in DIAGNOSTIC.md §30.
 *
 * MORE SLICES ARE NEARLY FREE, measured rather than assumed — the obvious worry was that each
 * slice re-scans the table. It does not: `explain` on one slice, plan forced GENERIC, shows an
 * Index Only Scan on `premise_location_pkey` with the bounds as an Index Cond, 5 buffers, and
 * ~11 ms of planning. The null-guard form of the predicate does not defeat the index. Arm A's
 * total is dominated by instance noise, not by slice count: it came out at 195 s with 11
 * slices and 218 s with 8. So this is the knob to reach for when a statement gets close —
 * never ARM_A_WINDOW_MS: the first bounds the work, the second only bounds the patience.
 */
export const ARM_A_CHUNK_ROWS = 4_000

/** The little of `pg.Client` this arm uses, so a test can stand in for a database. */
export interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>
}

export interface ArmOutcome {
  header: string
  passes: [string, string][]
  warnings: [string, string][]
  failures: [string, string][]
  /** Invariants the database refused to finish. Neither green nor red. */
  suspensions: [string, string][]
}

/**
 * The slices an invariant will be run in, read from the data on every run.
 *
 * Re-read rather than frozen: that is what makes corpus growth add slices by itself, instead
 * of waiting for somebody to notice the gate got slower. The boundaries are the values at
 * evenly spaced row offsets, and they are only ever a HINT — coverage comes from the ranges
 * being open at both ends of the domain (./chunks.ts), never from these being well chosen.
 */
export async function slicesFor(
  client: Queryable,
  chunk: NonNullable<Invariant["chunk"]>,
): Promise<ChunkRange[]> {
  const counted = await client.query(`select count(*)::text as n from ${chunk.table}`)
  const total = Number((counted.rows[0] as { n?: string } | undefined)?.n ?? 0)
  const boundaries: string[] = []
  for (const offset of boundaryOffsets(total, ARM_A_CHUNK_ROWS)) {
    const edge = await client.query(
      `select ${chunk.column}::text as b from ${chunk.table}
        order by ${chunk.column} offset $1 limit 1`,
      [offset],
    )
    const row = edge.rows[0] as { b?: string } | undefined
    if (row?.b !== undefined) boundaries.push(row.b)
  }
  return chunkRanges(boundaries)
}

interface SliceResult {
  rows: Record<string, unknown>[]
  /** Which slice the rows came from, for the failure message. Null when unsliced. */
  slice: number | null
  slices: number
  /**
   * The WIDEST single statement, and the sum of them.
   *
   * Two numbers because the window governs one statement and the wait governs the whole
   * invariant, and confusing them is easy: a first cut of this arm compared the window
   * against the total, which would have warned on every run about a statement that was
   * nowhere near it. `worstMs` is what the budget is about; `totalMs` is what a developer
   * waits through.
   */
  worstMs: number
  totalMs: number
}

/**
 * One invariant, in as many statements as it takes.
 *
 * Stops at the first slice that returns rows: a violation is a failure whatever the rest of
 * the corpus holds, and a gate that keeps walking after it has its answer is a gate people
 * stop waiting for. The block's own `limit 20` still caps what one slice reports.
 */
async function runOne(
  client: Queryable,
  invariant: Invariant,
  ranges: ChunkRange[],
): Promise<SliceResult> {
  let last: SliceResult = { rows: [], slice: null, slices: ranges.length, worstMs: 0, totalMs: 0 }
  for (let i = 0; i < ranges.length; i++) {
    const started = Date.now()
    const result = invariant.chunk
      ? await client.query(invariant.sql, [ranges[i].lo, ranges[i].hi])
      : await client.query(invariant.sql)
    const ms = Date.now() - started
    last = {
      rows: result.rows as Record<string, unknown>[],
      slice: invariant.chunk ? i + 1 : null,
      slices: ranges.length,
      worstMs: Math.max(last.worstMs, ms),
      totalMs: last.totalMs + ms,
    }
    if (last.rows.length > 0) return last
  }
  return last
}

export async function runInvariantsArm(
  client: Queryable,
  invariants: Invariant[] = readInvariants(),
): Promise<ArmOutcome> {
  const outcome: ArmOutcome = {
    header:
      `chaque requête doit renvoyer zéro ligne — fenêtre ${ARM_A_WINDOW_MS} ms par instruction, ` +
      `alerte à ${ARM_A_WINDOW_MS * ARM_A_WARN_FRACTION} ms`,
    passes: [],
    warnings: [],
    failures: [],
    suspensions: [],
  }
  const covered = anonymousCoverage(invariants)

  for (const invariant of invariants) {
    const ranges: ChunkRange[] = invariant.chunk
      ? await slicesFor(client, invariant.chunk)
      : [{ lo: null, hi: null }]
    let result: SliceResult
    // Impersonation is transaction-local, so the privileged connection is restored whatever
    // the invariant does. Without this the gate could only ever exercise the privileged
    // path — the one that always works.
    await client.query("begin")
    try {
      // Declared here rather than inherited, and transaction-local so it dies with the
      // rollback below: nothing outside arm A is affected by it.
      await client.query(`set local statement_timeout = ${ARM_A_WINDOW_MS}`)
      if (invariant.as) {
        await client.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ role: invariant.as }),
        ])
      }
      result = await runOne(client, invariant, ranges)
    } catch (error) {
      const classified = classifyDriverError(error, invariant.id, ARM_A_WINDOW_MS)
      if (!(classified instanceof UpstreamTimeout)) throw classified
      outcome.suspensions.push([invariant.id, `${invariant.description} — ${classified.message}`])
      continue
    } finally {
      // THE ROLLBACK BELONGS IN A finally, AND THAT IS HALF THE FIX OF #69. A cancelled
      // statement leaves the transaction aborted; without this every later invariant would
      // die on 25P02, so catching the cancellation without releasing the transaction would
      // have turned one suspension into thirty-six.
      await client.query("rollback")
    }

    const seconds = (result.totalMs / 1000).toFixed(1)
    const widest = (result.worstMs / 1000).toFixed(1)
    // The two numbers are printed apart on purpose: the second is the one the window governs,
    // and reading the first against a per-statement budget is how #69 got misread as "arm A
    // takes 115 s" when it was I1 alone that did.
    const shape = invariant.chunk
      ? `${seconds}s en ${result.slices} tranches, plus large ${widest}s`
      : `${seconds}s`

    // A census block returns the population, not violations: each row names a function the
    // licence rule applies to, and the failure is a name no `@as anon` invariant calls.
    // Verdict in ./census.ts, shared with the sabotage proof (npm.cmd run eval:sabotage) so
    // the demonstration exercises the check that ships rather than a copy of it.
    if (invariant.census) {
      const verdict = censusVerdict(result.rows, invariant.census, covered)
      if (verdict.ok) outcome.passes.push([invariant.id, `${verdict.detail} (${shape})`])
      else outcome.failures.push([invariant.id, `${invariant.description} — ${verdict.detail}`])
      continue
    }

    if (result.rows.length === 0) {
      outcome.passes.push([invariant.id, `${invariant.description} (${shape})`])
      if (result.worstMs > ARM_A_WINDOW_MS * ARM_A_WARN_FRACTION)
        outcome.warnings.push([
          invariant.id,
          `instruction la plus large ${widest}s sur une fenêtre de ${ARM_A_WINDOW_MS / 1000}s — ` +
            `le contenu est vert, ` +
            `c'est l'horloge qui approche`,
        ])
    } else {
      const where = result.slice === null ? "" : ` (tranche ${result.slice}/${result.slices})`
      outcome.failures.push([
        invariant.id,
        `${invariant.description} — ${result.rows.length} ligne(s)${where}, ` +
          `ex. ${JSON.stringify(result.rows[0])}`,
      ])
    }
  }
  return outcome
}

/** `pg.Client` satisfies `Queryable`; stated here so a change to either side breaks a build. */
export type ClientIsQueryable = Client extends Queryable ? true : never
