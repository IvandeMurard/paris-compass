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
