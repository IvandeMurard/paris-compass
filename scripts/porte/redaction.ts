// What may leave the machine — w1-porte-planifiee (#71).
//
// The repository is public, and so is every issue the scheduled gate opens. The three arms
// all print the database they judged, deliberately: « un PASS collé dans un rapport dit
// contre quelle base il a été rendu », docs/REPRISE.md. That sentence is right for a human
// reading a terminal and wrong for a body pushed to a public issue, so the masking happens
// at the reporting boundary rather than by making the arms quieter.
//
// Two functions rather than one, and the second is the point. `redact` removes the shapes we
// know. `carriesDatabaseIdentifier` asks whether any of them survived — and the reporter
// refuses to embed output that still answers yes. A redaction that is only a list of
// replacements fails open: it publishes whatever it did not think of. Asking the question
// again after the fact is what makes it fail closed.

/** `postgresql://user:secret@host/db` — the whole string, never a part of it. */
const CONNECTION_STRING = /\bpostgres(?:ql)?:\/\/\S+/gi

/**
 * A Supabase project reference: twenty lowercase letters and digits.
 *
 * Bounded on both sides so it cannot bite into a longer token, and required to hold at least
 * one letter so a twenty-digit number stays readable. French prose does not reach twenty
 * unaccented lowercase letters in one word; the build hashes this repository prints
 * (`index-DKJzmj15.js`) carry uppercase and are shorter.
 */
const PROJECT_REF = /\b(?=[a-z0-9]{20}\b)(?![0-9]{20}\b)[a-z0-9]{20}\b/g

/** `<ref>.supabase.co`, `db.<ref>.supabase.co`, `aws-1-eu-west-1.pooler.supabase.com`. */
const SUPABASE_HOST = /\b[a-z0-9][a-z0-9.-]*\.supabase\.(?:co|com|net)\b/gi

export const MASKED_REF = "«réf. masquée»"
export const MASKED_HOST = "«hôte masqué»"
export const MASKED_URL = "«chaîne de connexion masquée»"

/**
 * Strips every database identifier this repository is known to print.
 *
 * Order matters: the connection string goes first, because it contains both a reference and a
 * host and replacing its parts would leave a password behind.
 */
export function redact(text: string): string {
  return text
    .replace(CONNECTION_STRING, MASKED_URL)
    .replace(SUPABASE_HOST, MASKED_HOST)
    .replace(PROJECT_REF, MASKED_REF)
}

/**
 * True when the text still carries something that names a database.
 *
 * Asked of the *redacted* body, by the caller that is about to publish it. A true answer is
 * not a bug to route around: it means a shape appeared that this module does not know, and
 * the honest response is to publish the report without that output rather than to guess.
 */
export function carriesDatabaseIdentifier(text: string): boolean {
  for (const pattern of [CONNECTION_STRING, SUPABASE_HOST, PROJECT_REF]) {
    pattern.lastIndex = 0
    if (pattern.test(text)) return true
  }
  return false
}
