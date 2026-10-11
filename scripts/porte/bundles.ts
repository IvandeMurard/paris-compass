// Reading the bundles a published page serves — shared by the tenth arm and the fourteenth.
//
// **Why this file exists, and it is not tidiness.** Both `publie.ts` and `servi-verify.ts` need
// the same two readings: which bundle the page loads, and which chunks that bundle names. They
// lived in `publie.ts`, which runs its arm at import time — so importing them from there PLAYED
// the tenth arm: a second crawl of the site, a foreign verdict printed into another arm's log,
// and `process.exitCode` set by whichever finished last. An arm inheriting another's exit code
// is an arm that reports something nobody measured, which is the one thing `report.ts` refuses.
//
// Caught on 13 September 2026 by reading the output of `npm.cmd run servi` rather than its exit
// code: it was green, and it had printed `PASS — la configuration est figée dans le bundle
// servi` above its own verdict. A green that says something true about the wrong question.

/**
 * The entry bundle, the one the page loads itself.
 *
 * Restricted to `/assets/`: the published page also carries Lovable's own scripts (`/~flock.js`)
 * which are not our build and would prove nothing.
 */
export function entryFrom(html: string): string | null {
  return /<script[^>]+src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1] ?? null
}

/**
 * The chunks a bundle references, by their hashed name.
 *
 * Deduplicated, in first-seen order. What a caller does with them differs by arm: the tenth
 * stops at the first hit because it hunts one value; the fourteenth reads them all because its
 * population is the whole route table, and an unread lazy chunk is a route wrongly called
 * absent.
 */
export function chunkNames(js: string): string[] {
  const found = [...js.matchAll(/["'./]([A-Za-z0-9_$-]+-[A-Za-z0-9_-]{8}\.js)\b/g)].map((m) => m[1])
  return [...new Set(found)]
}
