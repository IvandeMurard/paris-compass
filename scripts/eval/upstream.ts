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
/**
 * The codes that mean « we never reached the other end », as opposed to « the other end
 * answered something this gate dislikes » — w1-porte-planifiee (#71).
 *
 * Two families, and both come from a `code` field rather than from a message: the socket
 * errors Node raises before any protocol starts, and the Postgres class 08 / 57P codes that
 * say the connection went away. Written out one by one rather than matched on a prefix,
 * because this is the second decision in this repository that makes things STOP being
 * failures, and #61 established what that costs when it is generous.
 */
export const UNREACHABLE_CODES = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "57P01",
  "57P03",
])

/**
 * True when nothing this repository owns has been shown to be wrong: the endpoint was not
 * reachable, so the gate did not look.
 *
 * Why it exists at all: from 31 August 2026 the three arms are played every morning by a
 * scheduled job that wakes a human on a red (#71). Without this, the first Supabase blip
 * would open an issue, the second would too, and within a fortnight the alert would be
 * muted — which removes the vigilance without supplying the guarantee. The fix belongs here,
 * in the arm that holds the error object, and never in the report, which holds a string.
 *
 * `fetch` wraps its cause, so the chain is walked — bounded, because a cycle in `cause` is
 * cheaper to refuse than to survive.
 */
export function isUnreachable(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; current != null && depth < 4; depth += 1) {
    const code = (current as { code?: unknown }).code
    if (typeof code === "string" && UNREACHABLE_CODES.has(code)) return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

/** The code that decided it, for a message a human can act on. Never the message text. */
export function unreachableCode(error: unknown): string {
  let current: unknown = error
  for (let depth = 0; current != null && depth < 4; depth += 1) {
    const code = (current as { code?: unknown }).code
    if (typeof code === "string" && UNREACHABLE_CODES.has(code)) return code
    current = (current as { cause?: unknown }).cause
  }
  return "code inconnu"
}

export function classifyDriverError(error: unknown, what: string, windowMs: number): Error {
  const code = (error as { code?: unknown } | null)?.code
  if (code === QUERY_CANCELED)
    return new UpstreamTimeout(
      `${QUERY_CANCELED} query_canceled — ${what} a dépassé les ${windowMs} ms accordées à ce bras`,
    )
  return error instanceof Error ? error : new Error(`${what} : ${String(error)}`)
}
