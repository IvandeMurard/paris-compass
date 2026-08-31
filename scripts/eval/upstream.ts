// What counts as an upstream failure rather than a defect — #61.
//
// Its own module for two reasons. It is the one decision in the anonymous gate that makes
// things STOP being failures, so it is the one that most needs a test pointed at it
// directly (scripts/eval/upstream.test.ts) rather than exercised in passing. And a gate
// whose classification lives inside its own runner is a gate nobody can check without
// running it against a live database.

/**
 * `anon` carries `statement_timeout = 3s` — measured 2026-08-27 in pg_roles.rolconfig on
 * dbefhvmyfmmhjeetdddu. Printed with every run so the margin is a number somebody can
 * read rather than a fact buried in a comment that ages badly.
 */
export const ANON_STATEMENT_TIMEOUT_MS = 3_000

/** Postgres `query_canceled`. PostgREST surfaces it as HTTP 500 with the code in the body. */
export const QUERY_CANCELED = "57014"

/**
 * The database refused to finish, which is not the same thing as an answer this gate
 * dislikes. A distinct type, so nothing downstream can mistake one for the other.
 */
export class UpstreamTimeout extends Error {}

/**
 * Reads a PostgREST error body and decides which of the two it is.
 *
 * The test is on the parsed `code`, not on the text containing "57014": a substring match
 * would also fire on a payload that merely mentioned the number, and this is the one
 * classification that must never be generous — everything it accepts stops being a
 * failure.
 */
export function classify(status: number, text: string, what: string): Error {
  if (status === 500) {
    try {
      const body = JSON.parse(text) as { code?: unknown }
      if (body.code === QUERY_CANCELED)
        return new UpstreamTimeout(
          `${QUERY_CANCELED} query_canceled — la requête a dépassé les ` +
            `${ANON_STATEMENT_TIMEOUT_MS} ms accordées à anon`,
        )
    } catch {
      // Not JSON: fall through and report it as the failure it is.
    }
  }
  return new Error(`${what} : HTTP ${status} — ${text.slice(0, 200)}`)
}

/**
 * The same decision on the DRIVER side, for the gates holding a database connection — #69.
 *
 * Arm A of `npm.cmd run eval` reached 2026-08-28 unable to survive its own cancellations: a
 * `57014` escaped `runInvariants`, and arms B, C and E were never played. Two passes out of
 * three that day produced no verdict at all — which is worse than a wrong one, because a
 * gate that regularly says nothing is a gate that gets read as decoration.
 *
 * Here rather than in a module of its own so that both gates say the same word for the same
 * thing: `eval:anon` has classified a cancellation as an upstream failure since #61, and a
 * second copy of that judgement is how the two would drift apart. DIAGNOSTIC.md §26 is the
 * precedent — the caller test existed in six copies and the copies disagreed.
 *
 * Same narrowness as `classify`, for the same reason: this is the decision that makes things
 * STOP being failures. It tests `error.code`, which the driver parses out of the server's
 * error fields, never the message text — a query whose own output merely contained "57014"
 * must stay the failure it is.
 */
export function classifyDriverError(error: unknown, what: string, windowMs: number): Error {
  const code = (error as { code?: unknown } | null)?.code
  if (code === QUERY_CANCELED)
    return new UpstreamTimeout(
      `${QUERY_CANCELED} query_canceled — ${what} a dépassé les ${windowMs} ms accordées à ce bras`,
    )
  return error instanceof Error ? error : new Error(`${what} : ${String(error)}`)
}
