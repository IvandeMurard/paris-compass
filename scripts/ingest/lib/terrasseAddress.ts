// Parsing the one free-text address field of `terrasses-autorisations`.
//
// **Why this sits in `lib/` rather than in `scripts/ingest/terrasses.ts`, where it was
// written.** Every loader in this folder calls `main()` at module scope, so importing one
// runs an ingestion — a test that imported `terrasses.ts` to reach this function would open
// a database connection and reload a layer. `lib/` is the importable half of the folder;
// this is the only reason the function moved, and the loader still owns everything else.
//
// The source publishes one string ("125 AVENUE DE CHOISY") where BODACC already splits
// numeroVoie / typeVoie / nomVoie. The three parts feed the same
// `compass_bodacc_street_key()` the BODACC attachment uses (20260809000002), so a premise is
// matched on street key + house number and never on distance — the trap measured and rejected
// on 25 August, when a third of a named sample pointed at the wrong shopfront.

export interface ParsedAddress {
  houseNumber: number
  wayType: string
  wayName: string
}

/**
 * Number, an optional suffix the source glues to it, then the way type and the way name.
 *
 * Read left to right:
 *   `(\d+)`                          the house number, and the only part that is matched on
 *   `(?:[A-Z][A-Z0-9]{0,2})?`        a suffix **glued** to the number: B, BV, P2, Z1, P41.
 *                                    Glued on purpose — allowing whitespace here would let a
 *                                    greedy match swallow a three-letter way type, so
 *                                    "12 RUE DES PLANTES" would parse as way type "DES".
 *   `(?:\s+[A-Z]\b)?`                a single letter written apart: "10 B RUE …". The `\b`
 *                                    is what stops it eating the R of "RUE".
 *   `(?:\s*(?:BIS|TER|QUATER)\b)?`   the spelled-out forms
 *   `(?:\s*[/-]\s*\d+\s*[A-Z]?)*`    a range: "1/3/5 PLACE JEAN MARAIS". Repeated, not
 *                                    optional-once — three-number ranges exist.
 *   `\s+(\S+)\s+(.+)`                way type, then everything else as the way name
 *
 * **Measured against the full export on 26 August 2026: 24 154 of 24 199 addresses parse
 * (99,81 %), against 24 140 (99,76 %) for the previous pattern — 14 gained, 0 lost, and 0
 * whose parse changed.** The 14 are the glued suffixes and the one three-number range.
 *
 * What still does not parse, and deliberately so: 8 null addresses, and 37 strings with no
 * house number the pattern could trust — 30-odd ways written without any number at all
 * ("RUE FERDINAND DUVAL"), four carrying a stall letter *before* the number ("A - 26 RUE
 * CUSTINE" — is the number 26, or is "A" part of it? the source does not say), one email
 * address in the address field, one "SSSS", and one bare SIRET. They attach to nothing, which
 * reads on the fiche as "no authorisation at this address" — a bounded, known way for a `non`
 * to be wrong, stated in `src/i18n/terrasseText.ts` rather than hidden.
 */
const ADDRESS =
  /^(\d+)(?:[A-Z][A-Z0-9]{0,2})?(?:\s+[A-Z]\b)?(?:\s*(?:BIS|TER|QUATER)\b)?(?:\s*[/-]\s*\d+\s*[A-Z]?)*\s+(\S+)\s+(.+)$/

/** The three parts, or null when the string carries no house number worth trusting. */
export function parseAddress(raw: string | null): ParsedAddress | null {
  if (!raw) return null
  const match = ADDRESS.exec(raw.trim().toUpperCase())
  if (!match) return null
  return { houseNumber: Number(match[1]), wayType: match[2], wayName: match[3] }
}
