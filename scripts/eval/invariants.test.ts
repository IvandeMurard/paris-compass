import { afterEach, describe, expect, it, vi } from "vitest"

import type { Invariant } from "./census"
import type { Queryable } from "./invariants"
import { ARM_A_CHUNK_ROWS, ARM_A_WINDOW_MS, runInvariantsArm, slicesFor } from "./invariants"
import { QUERY_CANCELED } from "./upstream"

// #69 — what arm A does when the database refuses to finish an invariant.
//
// Off-database, and that is the point of the ticket: on 28 August 2026 two runs out of three
// died in arm A on a `57014`, arms B, C and E were never played, and nothing could
// demonstrate the fix except running the whole gate against the hosted instance and hoping
// it was cold. Same move as `classify` in upstream.test.ts — the decision that makes things
// stop being failures gets a test pointed straight at it.

/** A statement the server cancelled: what `pg` throws, reduced to the field that decides. */
const canceled = (): Error =>
  Object.assign(new Error("canceling statement due to statement timeout"), {
    code: QUERY_CANCELED,
  })

const invariant = (id: string, over: Partial<Invariant> = {}): Invariant => ({
  id,
  description: `description de ${id}`,
  sql: `select 1 as x -- ${id}`,
  ...over,
})

/**
 * A database that answers a scripted verdict per invariant id, and records every statement.
 *
 * The id is read back out of the SQL rather than tracked in a counter, so a change to the
 * order in which the arm issues statements cannot silently make the fake answer the wrong
 * question.
 */
function fakeClient(verdicts: Record<string, "zero" | "rows" | "cancel">): Queryable & {
  statements: string[]
} {
  const statements: string[] = []
  return {
    statements,
    async query(text: string) {
      statements.push(text)
      const id = /-- (I\d+)/.exec(text)?.[1]
      if (id === undefined) return { rows: [], rowCount: 0 }
      const verdict = verdicts[id] ?? "zero"
      if (verdict === "cancel") throw canceled()
      if (verdict === "rows") return { rows: [{ location_id: 42 }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    },
  }
}

describe("runInvariantsArm — une annulation n'interrompt plus la course", () => {
  it("suspend l'invariant annulé, ni vert ni rouge, et joue les suivants", async () => {
    const client = fakeClient({ I2: "cancel" })
    const outcome = await runInvariantsArm(client, [invariant("I1"), invariant("I2"), invariant("I3")])

    expect(outcome.suspensions.map(([id]) => id)).toEqual(["I2"])
    expect(outcome.suspensions[0][1]).toContain(QUERY_CANCELED)
    expect(outcome.passes.map(([id]) => id)).toEqual(["I1", "I3"])
    expect(outcome.failures).toHaveLength(0)
  })

  // The half that matters for the gate's credibility: `I3` below only gets played because
  // the run survived `I2`. Before #69 the error escaped runInvariants and arms B, C and E
  // were never reached at all.
  it("rend la main normalement, pour que les bras B, C et E soient joués", async () => {
    const client = fakeClient({ I1: "cancel", I2: "cancel", I3: "cancel" })
    await expect(
      runInvariantsArm(client, [invariant("I1"), invariant("I2"), invariant("I3")]),
    ).resolves.toMatchObject({ failures: [], passes: [] })
  })

  // Half the fix, and the half that is invisible until it bites: a cancelled statement
  // leaves the transaction aborted, so without the rollback in a `finally` the next
  // invariant dies on 25P02 and one suspension becomes thirty-six.
  it("annule la transaction de l'invariant annulé, sinon la suivante meurt en 25P02", async () => {
    const client = fakeClient({ I1: "cancel" })
    await runInvariantsArm(client, [invariant("I1"), invariant("I2")])
    expect(client.statements.filter((s) => s === "rollback")).toHaveLength(2)
  })

  it("ne prend pas une erreur quelconque pour une annulation — elle reste une ERREUR", async () => {
    const client: Queryable = {
      async query(text: string) {
        if (text.includes("-- I1"))
          throw Object.assign(new Error("permission denied"), { code: "42501" })
        return { rows: [], rowCount: 0 }
      },
    }
    await expect(runInvariantsArm(client, [invariant("I1")])).rejects.toThrow("permission denied")
  })

  it("une violation reste une défaillance, annulations ou pas", async () => {
    const client = fakeClient({ I1: "rows", I2: "cancel" })
    const outcome = await runInvariantsArm(client, [invariant("I1"), invariant("I2")])
    expect(outcome.failures.map(([id]) => id)).toEqual(["I1"])
    expect(outcome.suspensions.map(([id]) => id)).toEqual(["I2"])
  })

  it("pose sa propre fenêtre au lieu d'hériter de celle du rôle", async () => {
    const client = fakeClient({})
    await runInvariantsArm(client, [invariant("I1")])
    expect(client.statements).toContain(`set local statement_timeout = ${ARM_A_WINDOW_MS}`)
  })
})

describe("runInvariantsArm — les tranches", () => {
  const sliced = invariant("I1", { chunk: { table: "public.premise_location", column: "id" } })

  /** Counts rows the way the arm will: one statement per slice, all of them played. */
  function slicingClient(total: number) {
    const played: (unknown[] | undefined)[] = []
    const client: Queryable = {
      async query(text: string, values?: unknown[]) {
        if (text.startsWith("select count(*)")) return { rows: [{ n: String(total) }], rowCount: 1 }
        if (text.startsWith("select id::text")) {
          const offset = Number((values ?? [])[0])
          return { rows: [{ b: String(offset * 10) }], rowCount: 1 }
        }
        if (text.includes("-- I1")) played.push(values)
        return { rows: [], rowCount: 0 }
      },
    }
    return { client, played }
  }

  // 85 418 is the corpus of 2026-08-31. The count is derived from the constant rather than
  // written down, so tuning the slice size stays a decision and does not become a red test.
  const SLICES = Math.ceil(85_418 / ARM_A_CHUNK_ROWS)

  it("joue toutes les tranches quand aucune ne rend de ligne", async () => {
    const { client, played } = slicingClient(85_418)
    const outcome = await runInvariantsArm(client, [sliced])
    expect(SLICES).toBeGreaterThan(1)
    expect(played).toHaveLength(SLICES)
    expect(outcome.passes[0][1]).toContain(`${SLICES} tranches`)
  })

  it("borne chaque tranche bout à bout, la première et la dernière ouvertes", async () => {
    const { client, played } = slicingClient(85_418)
    await runInvariantsArm(client, [sliced])
    expect(played[0]).toEqual([null, played[1]?.[0]])
    expect(played[played.length - 1]?.[1]).toBeNull()
    for (let i = 0; i < played.length - 1; i++) expect(played[i]?.[1]).toBe(played[i + 1]?.[0])
  })

  it("un corpus qui tient dans une instruction n'est pas tranché", async () => {
    const { client, played } = slicingClient(ARM_A_CHUNK_ROWS)
    await runInvariantsArm(client, [sliced])
    expect(played).toEqual([[null, null]])
  })

  it("s'arrête à la première tranche qui rend une ligne, et le dit", async () => {
    const client: Queryable = {
      async query(text: string, values?: unknown[]) {
        if (text.startsWith("select count(*)")) return { rows: [{ n: "85418" }], rowCount: 1 }
        if (text.startsWith("select id::text"))
          return { rows: [{ b: String(Number((values ?? [])[0]) * 10) }], rowCount: 1 }
        if (text.includes("-- I1") && (values ?? [])[0] !== null)
          return { rows: [{ location_id: 42 }], rowCount: 1 }
        return { rows: [], rowCount: 0 }
      },
    }
    const outcome = await runInvariantsArm(client, [sliced])
    expect(outcome.failures[0][1]).toContain(`tranche 2/${SLICES}`)
  })
})

describe("runInvariantsArm — l'horloge", () => {
  const sliced = invariant("I1", { chunk: { table: "public.premise_location", column: "id" } })

  /**
   * A database where every slice of the invariant takes `perSliceMs`, on a clock this test
   * drives. Eight slices of 10 s are 80 s of waiting and 10 s of statement — and only the
   * second of those is what a per-statement window is about.
   */
  function timedClient(perSliceMs: number) {
    let now = 0
    vi.spyOn(Date, "now").mockImplementation(() => now)
    return {
      async query(text: string, values?: unknown[]) {
        if (text.startsWith("select count(*)")) return { rows: [{ n: "85418" }], rowCount: 1 }
        if (text.startsWith("select id::text"))
          return { rows: [{ b: String(Number((values ?? [])[0]) * 10) }], rowCount: 1 }
        if (text.includes("-- I1")) now += perSliceMs
        return { rows: [], rowCount: 0 }
      },
    } satisfies Queryable
  }

  afterEach(() => vi.restoreAllMocks())

  // The defect this guards against was written and caught the same afternoon: comparing the
  // window against the SUM of the slices would warn on every single run about a statement
  // that is nowhere near the window.
  it("n'alerte pas sur la somme des tranches, seulement sur la plus large", async () => {
    const slices = Math.ceil(85_418 / ARM_A_CHUNK_ROWS)
    const outcome = await runInvariantsArm(timedClient(10_000), [sliced])
    // Ten seconds a slice: well over the window in total, well under it per statement.
    expect(slices * 10_000).toBeGreaterThan(ARM_A_WINDOW_MS)
    expect(outcome.passes[0][1]).toContain(`${(slices * 10).toFixed(1)}s en ${slices} tranches`)
    expect(outcome.passes[0][1]).toContain("plus large 10.0s")
    expect(outcome.warnings).toHaveLength(0)
  })

  it("alerte quand une instruction dépasse la moitié de la fenêtre, sans échouer pour autant", async () => {
    const outcome = await runInvariantsArm(timedClient(ARM_A_WINDOW_MS * 0.6), [sliced])
    expect(outcome.warnings.map(([id]) => id)).toEqual(["I1"])
    expect(outcome.passes.map(([id]) => id)).toEqual(["I1"])
    expect(outcome.failures).toHaveLength(0)
  })
})

describe("slicesFor", () => {
  it("relit la taille du corpus à chaque passage, pour que la croissance ajoute des tranches", async () => {
    const asked: string[] = []
    const client: Queryable = {
      async query(text: string, values?: unknown[]) {
        asked.push(text)
        if (text.startsWith("select count(*)")) return { rows: [{ n: "170836" }], rowCount: 1 }
        return { rows: [{ b: String(Number((values ?? [])[0])) }], rowCount: 1 }
      },
    }
    const ranges = await slicesFor(client, { table: "public.premise_location", column: "id" })
    // Twice the corpus of 2026-08-31 buys twice the statements, not a longer one.
    expect(ranges).toHaveLength(Math.ceil(170_836 / ARM_A_CHUNK_ROWS))
    expect(ranges.length).toBeGreaterThan(Math.ceil(85_418 / ARM_A_CHUNK_ROWS))
    expect(asked[0]).toContain("count(*)")
  })
})
