// Cutting one invariant into several statements — #69.
//
// Why this exists. Arm A runs each invariant as ONE statement, so the window it
// has to fit in is a per-statement window. Three invariants — I1, I2, I7 — call
// `compass_address_timeline` once per premise, and their cost is therefore
// linear in `premise_location`: measured 2026-08-31 on dbefhvmyfmmhjeetdddu,
// 0.965 ms and 94 buffer pages per call over 85 418 premises, which put I1 at
// 118 137 ms cold against a 120 000 ms window. Nothing about that is a defect
// the gate found; it is what those invariants nominally cost, and it grows with
// the corpus rather than with the number of invariants.
//
// Splitting the population into several statements leaves the work identical —
// 86 832 ms over six statements against 83 785 ms whole, 3.6 % — and bounds what
// any ONE of them costs. The corpus can then grow without the window moving: a
// bigger table buys more chunks, not a longer statement.
//
// THE PROPERTY THAT MAKES THIS NOT A SAMPLE, and it is the whole point:
// the ranges cover the ENTIRE ordered domain, not the interval the boundaries
// were drawn from. The first range is open below, the last open above, and each
// interior edge is shared — so a row is in exactly one range whatever its key,
// including a key inserted after the boundaries were read. Coverage therefore
// does not depend on the boundaries being good: a bad cut costs time, never a
// row. `eval/FAILURE_MODES.md` claims arm A checks 100 % of rows, and that claim
// has to survive this change by construction rather than by care.

/**
 * One statement's slice, as the half-open interval `[lo, hi)`.
 *
 * `null` means unbounded on that side — the SQL predicate drops, it does not
 * compare against null.
 */
export interface ChunkRange {
  lo: string | null
  hi: string | null
}

/**
 * The row offsets to cut a population of `total` rows at, so that no slice holds
 * more than `maxRows`.
 *
 * Cuts at even fractions rather than at multiples of `maxRows`: the second form
 * leaves a remainder slice that can be a single row, and a slice count that
 * jumps by one for one extra row. Even fractions keep every slice the same size
 * and make the count a plain ceiling.
 */
export function boundaryOffsets(total: number, maxRows: number): number[] {
  if (!(maxRows > 0)) throw new Error(`maxRows doit être positif, reçu ${maxRows}`)
  if (total <= maxRows) return []
  const parts = Math.ceil(total / maxRows)
  return Array.from({ length: parts - 1 }, (_, i) => Math.round((total * (i + 1)) / parts))
}

/**
 * The ranges delimited by `boundaries`, which are the interior edges only.
 *
 * n edges give n+1 ranges. Duplicate edges are dropped — they would produce an
 * empty range, which is harmless for coverage but is a statement that runs for
 * nothing. Edges must arrive sorted, which is how a `order by` gives them.
 */
export function chunkRanges(boundaries: readonly string[]): ChunkRange[] {
  const edges = boundaries.filter((b, i) => i === 0 || b !== boundaries[i - 1])
  const ranges: ChunkRange[] = []
  for (let i = 0; i <= edges.length; i++) {
    ranges.push({ lo: i === 0 ? null : edges[i - 1], hi: i === edges.length ? null : edges[i] })
  }
  return ranges
}
