import { describe, expect, it } from "vitest"

import { columnDrift, columnsFrom, comparable, differs, writable } from "./columns"

const catalog = [
  { name: "id", type: "int4" },
  { name: "label", type: "text" },
  { name: "geom", type: "geography" },
]

describe("columnDrift", () => {
  it("accepts the same columns in another order", () => {
    expect(columnDrift("t", ["geom", "id", "label"], catalog)).toBeNull()
  })

  it("names a column a migration added that the loader does not write", () => {
    const drift = columnDrift("t", ["id", "geom"], catalog)
    expect(drift).toContain("n'écrit pas : label")
  })

  it("names a declared column the table no longer has", () => {
    expect(columnDrift("t", ["id", "label", "geom", "gone"], catalog)).toContain("absentes de la table : gone")
  })

  it("names a column declared twice", () => {
    expect(columnDrift("t", ["id", "label", "label", "geom"], catalog)).toContain("deux fois : label")
  })
})

describe("columnsFrom", () => {
  it("refuses a drifted list before anything is built from it", () => {
    expect(() => columnsFrom("t", ["id"], catalog)).toThrow(/ne correspond plus à la table/)
  })

  it("keeps the loader's order and marks spatial columns as binary", () => {
    const columns = columnsFrom("t", ["label", "geom", "id"], catalog)
    expect(columns.names).toEqual(["label", "geom", "id"])
    expect([...columns.binary]).toEqual(["geom"])
  })
})

describe("writable", () => {
  // The shape of terrasse_autorisation as information_schema returned it on 11 October 2026:
  // `id` an identity, `street_key` generated, everything else plain.
  const terrasse = [
    { name: "id", type: "int8", generated: false, identity: true },
    { name: "adresse", type: "text", generated: false, identity: false },
    { name: "street_key", type: "text", generated: true, identity: false },
    { name: "geom", type: "geography", generated: false, identity: false },
  ]

  it("leaves out exactly what the database fills itself: generated and identity", () => {
    expect(writable(terrasse).map((c) => c.name)).toEqual(["adresse", "geom"])
  })

  it("keeps a column with a DEFAULT, so that the load is refused until it is declared", () => {
    // information_schema says nothing of a default in these two flags: a `created_at default
    // now()` arrives as a plain column, and the loader must declare it (review of #266).
    const withDefault = [...terrasse, { name: "created_at", type: "timestamptz", generated: false, identity: false }]
    expect(writable(withDefault).map((c) => c.name)).toContain("created_at")
    expect(() => columnsFrom("t", ["adresse", "geom"], writable(withDefault))).toThrow(/n'écrit pas : created_at/)
  })
})

describe("comparable and differs", () => {
  const columns = columnsFrom("t", ["id", "label", "geom"], catalog)

  it("compares a spatial column as binary, never by `=`", () => {
    expect(comparable(columns, "a")).toBe("a.id, a.label, ST_AsBinary(a.geom)")
    expect(comparable(columns)).toBe("id, label, ST_AsBinary(geom)")
  })

  it("covers every declared column on both sides", () => {
    expect(differs(columns, "p", "excluded")).toBe(
      "(p.id, p.label, ST_AsBinary(p.geom)) is distinct from (excluded.id, excluded.label, ST_AsBinary(excluded.geom))",
    )
  })
})
