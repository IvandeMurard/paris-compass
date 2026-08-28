import { describe, expect, it } from "vitest"

import { budgetVerdict, parseWindowMs } from "./budget"

// #62 — the arm exists because a right-but-too-slow function reaches a visitor as a map that
// never appears. Its verdict is tested here rather than in passing, for the same reason
// upstream.ts is: it decides what stops being a failure, and a gate that blocks on a clock
// learns to be ignored (DIAGNOSTIC.md §18).

describe("parseWindowMs", () => {
  it("lit la fenêtre telle que pg_roles la porte", () => {
    expect(parseWindowMs("3s")).toBe(3000)
    expect(parseWindowMs("8s")).toBe(8000)
    expect(parseWindowMs("250ms")).toBe(250)
  })

  // Postgres reads a bare number as milliseconds. Reading it as seconds would multiply the
  // ceiling by a thousand and produce a gate that can never go red.
  it("lit un nombre nu en millisecondes, comme Postgres", () => {
    expect(parseWindowMs("3000")).toBe(3000)
  })

  it("refuse plutôt que de deviner quand le réglage a disparu", () => {
    expect(() => parseWindowMs(null)).toThrow(/statement_timeout/)
    expect(() => parseWindowMs("")).toThrow(/statement_timeout/)
    expect(() => parseWindowMs("beaucoup")).toThrow(/statement_timeout/)
  })
})

describe("budgetVerdict", () => {
  const ceiling = 1020
  const declared = { pages: 94_065, ms: 138 }

  it("laisse passer une mesure conforme", () => {
    const verdict = budgetVerdict(declared, { pages: 94_065, ms: 140 }, ceiling)
    expect(verdict.level).toBe("ok")
  })

  it("bloque quand le travail a grossi, même si l'horloge n'a rien vu", () => {
    // 195 456 pages: exactly the shape #62 was opened about, on a machine fast enough to
    // return it in 300 ms — under the ceiling of temps, and still the defect.
    const verdict = budgetVerdict(declared, { pages: 195_456, ms: 300 }, ceiling)
    expect(verdict.level).toBe("fail")
    expect(verdict.detail).toContain("plafond de pages")
  })

  // The budget is a ceiling, not an equality. A plan that comes out cheaper is good news, and
  // the symmetric version of this check called it a regression on the arm's first day.
  it("ne bloque pas sur un plan devenu moins cher", () => {
    const verdict = budgetVerdict({ pages: 137_548, ms: 149 }, { pages: 103_241, ms: 293 }, ceiling)
    expect(verdict.level).toBe("ok")
  })

  it("signale une référence devenue fiction sans bloquer dessus", () => {
    const verdict = budgetVerdict({ pages: 137_548, ms: 149 }, { pages: 20_000, ms: 40 }, ceiling)
    expect(verdict.level).toBe("warn")
    expect(verdict.detail).toContain("périmée")
  })

  // The counter-test, and the one that matters most: a cold instance must not be able to
  // turn this arm red. It is the failure mode that made eval:anon unreadable for two days.
  it("ne bloque pas sur une instance froide quand les pages tiennent", () => {
    const verdict = budgetVerdict(declared, { pages: 94_070, ms: 2_800 }, ceiling)
    expect(verdict.level).toBe("warn")
    expect(verdict.detail).toContain("froide")
  })

  it("bloque une ligne inscrite au-dessus du plafond, sans rien mesurer", () => {
    const verdict = budgetVerdict({ pages: 380_695, ms: 1_108 }, null, ceiling)
    expect(verdict.level).toBe("fail")
    expect(verdict.detail).toContain("au-dessus du plafond")
  })
})
