import { describe, expect, it } from "vitest"

import { boundaryOffsets, chunkRanges } from "./chunks"

// #69 — the arithmetic that lets one invariant run as several statements without checking
// less than it did before. `eval/FAILURE_MODES.md` claims arm A covers 100 % of rows, so the
// property under test is not "the slices look reasonable" but "no key can fall between two
// of them, and none can fall in both". Off-database on purpose, like `classify` in
// upstream.test.ts: a demonstration that needs the hosted instance to run is one nobody
// replays.

/** The SQL each range becomes: `($1 is null or k >= $1) and ($2 is null or k < $2)`. */
const holds = (range: { lo: string | null; hi: string | null }, key: number): boolean =>
  (range.lo === null || key >= Number(range.lo)) && (range.hi === null || key < Number(range.hi))

describe("chunkRanges", () => {
  it("rend une tranche de plus qu'il n'y a de bornes", () => {
    expect(chunkRanges([])).toHaveLength(1)
    expect(chunkRanges(["10"])).toHaveLength(2)
    expect(chunkRanges(["10", "20", "30"])).toHaveLength(4)
  })

  it("ouvre la première tranche par le bas et la dernière par le haut", () => {
    const ranges = chunkRanges(["10", "20"])
    expect(ranges[0].lo).toBeNull()
    expect(ranges[ranges.length - 1].hi).toBeNull()
  })

  it("colle les tranches bord à bord, sans trou ni recouvrement", () => {
    const ranges = chunkRanges(["10", "20", "30"])
    for (let i = 0; i < ranges.length - 1; i++) expect(ranges[i].hi).toBe(ranges[i + 1].lo)
  })

  // The property that matters, checked the way the runner will execute it: every key
  // belongs to EXACTLY one slice — including keys far outside the interval the boundaries
  // were drawn from, which is what makes a badly chosen cut cost time and never a row.
  it("place chaque clé dans exactement une tranche, y compris hors de l'intervalle mesuré", () => {
    const ranges = chunkRanges(["10", "20", "30"])
    for (const key of [-1_000_000, -1, 0, 9, 10, 11, 19, 20, 21, 29, 30, 31, 1_000_000]) {
      expect(ranges.filter((r) => holds(r, key))).toHaveLength(1)
    }
  })

  it("sans borne, la tranche unique prend tout — le cas d'un invariant non tranché", () => {
    const [only] = chunkRanges([])
    expect(only).toEqual({ lo: null, hi: null })
    for (const key of [-1, 0, 42, 1_000_000]) expect(holds(only, key)).toBe(true)
  })

  // A duplicate boundary would make an empty slice: a statement that runs for nothing.
  // Coverage would survive it, the wasted round trip would not be noticed — so it is
  // dropped rather than tolerated.
  it("laisse tomber une borne répétée plutôt que de jouer une tranche vide", () => {
    expect(chunkRanges(["10", "10", "20"])).toEqual([
      { lo: null, hi: "10" },
      { lo: "10", hi: "20" },
      { lo: "20", hi: null },
    ])
  })
})

describe("boundaryOffsets", () => {
  it("ne coupe pas une population qui tient déjà dans une instruction", () => {
    expect(boundaryOffsets(0, 12_000)).toEqual([])
    expect(boundaryOffsets(12_000, 12_000)).toEqual([])
  })

  it("coupe en parts égales, jamais en multiples laissant un reste d'une ligne", () => {
    // 85 418 premises on 2026-08-31, 12 000 rows per statement: 8 slices of 10 677,
    // not 7 of 12 000 and one of 1 418.
    const offsets = boundaryOffsets(85_418, 12_000)
    expect(offsets).toHaveLength(7)
    const sizes = [...offsets, 85_418].map((o, i, all) => o - (i === 0 ? 0 : all[i - 1]))
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
  })

  it("rend des décalages strictement croissants, tous dans la population", () => {
    const offsets = boundaryOffsets(85_418, 12_000)
    for (const [i, offset] of offsets.entries()) {
      expect(offset).toBeGreaterThan(i === 0 ? 0 : offsets[i - 1])
      expect(offset).toBeLessThan(85_418)
    }
  })

  // Growth is the point of the whole mechanism: twice the corpus must buy twice the
  // statements, not twice the time in one of them.
  it("double le nombre de tranches quand le corpus double", () => {
    expect(boundaryOffsets(85_418, 12_000).length + 1).toBe(8)
    expect(boundaryOffsets(170_836, 12_000).length + 1).toBe(15)
  })

  it("refuse une taille de tranche absurde plutôt que de boucler", () => {
    expect(() => boundaryOffsets(100, 0)).toThrow(/positif/)
  })
})
