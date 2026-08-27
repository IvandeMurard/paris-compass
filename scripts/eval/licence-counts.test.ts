import { describe, expect, it } from "vitest"

import { expectationHolds, licenceVerdict, type VintageFact } from "./licence-counts"

// The state of the remote measured 2026-08-27: 2017 and 2020 withheld, 2023 ODbL.
const CLEAN: VintageFact[] = [
  { year: 2017, publiclyRedistributable: false, recordCount: 84031, visible: 0 },
  { year: 2020, publiclyRedistributable: false, recordCount: 83399, visible: 0 },
  { year: 2023, publiclyRedistributable: true, recordCount: 60845, visible: 60845 },
]

const withYear = (year: number, patch: Partial<VintageFact>): VintageFact[] =>
  CLEAN.map((f) => (f.year === year ? { ...f, ...patch } : f))

describe("licenceVerdict", () => {
  it("passe au vert sur l'état mesuré du distant", () => {
    expect(licenceVerdict(CLEAN).filter((v) => !v.ok)).toEqual([])
  })

  // One row. The whole reason this control stayed an exact equality when #61 made it cheap.
  it("voit une seule ligne retenue devenue visible", () => {
    const red = licenceVerdict(withYear(2017, { visible: 1 })).filter((v) => !v.ok)
    expect(red.map((v) => v.year)).toEqual([2017])
    expect(red[0].detail).toContain("la licence fuit")
  })

  // The counter-test: a policy that blocked everything would satisfy the withholding half
  // and serve nobody, so the ODbL vintage has to be checked in the other direction too.
  it("voit une retenue excessive sur le millésime ODbL", () => {
    const red = licenceVerdict(withYear(2023, { visible: 0 })).filter((v) => !v.ok)
    expect(red.map((v) => v.year)).toEqual([2023])
    expect(red[0].detail).toContain("retenue excessive")
  })

  // What the unkeyed count used to catch, and what keying it must not have cost.
  it("voit une divulgation partielle du millésime ODbL", () => {
    const red = licenceVerdict(withYear(2023, { visible: 60844 })).filter((v) => !v.ok)
    expect(red.map((v) => v.year)).toEqual([2023])
  })
})

describe("expectationHolds", () => {
  it("accepte la population mesurée", () => {
    expect(expectationHolds(CLEAN).ok).toBe(true)
  })

  // `publicly_redistributable` IS the licence decision, so a gate that only believed the
  // flag would applaud its own flip: 2017 marked open would then be EXPECTED to be visible.
  it("refuse un millésime retenu passé redistribuable en silence", () => {
    expect(expectationHolds(withYear(2017, { publiclyRedistributable: true })).ok).toBe(false)
  })

  it("refuse un quatrième millésime arrivé sans décision de licence", () => {
    const facts = [...CLEAN, { year: 2026, publiclyRedistributable: true, recordCount: 10, visible: 10 }]
    expect(expectationHolds(facts).ok).toBe(false)
  })
})
