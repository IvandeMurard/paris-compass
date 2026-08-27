// The licence rule expressed as counts, and the only copy of it — #61.
//
// Two callers need this verdict and neither may carry its own version:
//
//   scripts/eval/anon-http.ts     reads the counts over PostgREST with the publishable
//                                 key, behind the real RLS policy.
//   scripts/eval/census-sabotage.ts reads them in SQL as `anon` inside a rolled-back
//                                 transaction where the policy has been loosened on
//                                 purpose, to show the verdict still bites.
//
// census-sabotage.ts already states the reason at its head: a demonstration that runs a
// COPY of the check proves something about the copy. This module is what lets that hold
// for the licence counts too.
//
// Why counts at all, and why keyed. Until #61 the arm compared ONE unkeyed
// `count=exact` over the whole of premise_observation — 228 275 rows under the RLS
// predicate — against `compass_vintages().record_count` for 2023. Measured 2026-08-27 on
// dbefhvmyfmmhjeetdddu, role `anon`, claim `anon`: 9 033 shared buffers, 47 ms warm and
// 1 605 ms on the first call of a session. Keyed by vintage the same exact equality costs
// 143 + 141 + 187 = 471 buffers, because `vintage_id` is the leading column of
// premise_observation_vintage_idx and each count becomes an Index Only Scan with
// `Heap Fetches: 0`.
//
// So the exact count did not have to be given up — it had to be keyed. That is worth
// stating plainly because #61's recommended path was to replace it with a negative
// `limit 1` probe, and the measurement says that probe is WORSE: asking for `id` on a
// withheld vintage loses the index-only scan (the column is not in the index), so
// `?vintage_id=eq.2017&limit=1` costs 1 725 buffers — 12× the keyed count — while proving
// strictly less.

/**
 * Which vintages a caller without a key may receive.
 *
 * Measured in bdcom_vintage on 2026-08-27: 2017 (84 031 rows) and 2020 (83 399) carry a
 * custom APUR licence whose terms were never read; 2023 (60 845, retail only) is
 * ODbL-1.0. docs/BDCOM.md carries the reasoning.
 *
 * It is written here rather than read from the table, and that is the point.
 * `publicly_redistributable` IS the licence decision — a gate that only ever believed the
 * flag would applaud its own flip. `expectationHolds` reads the flag too and turns red
 * when the two disagree. A fourth vintage will also turn it red, deliberately: nobody
 * should ingest one without stating whether it may be redistributed.
 */
export const WITHHELD_YEARS: readonly number[] = [2017, 2020]
export const REDISTRIBUTABLE_YEARS: readonly number[] = [2023]

/** One vintage as the two sides see it: what the table says, and what anon actually got. */
export interface VintageFact {
  year: number
  /** bdcom_vintage.publicly_redistributable — the column the RLS policy keys on. */
  publiclyRedistributable: boolean
  /** bdcom_vintage.record_count — how many rows the ingestion put there. */
  recordCount: number
  /** How many rows an anonymous caller can actually count. Exact, never estimated. */
  visible: number
}

export interface Verdict {
  ok: boolean
  what: string
  detail: string
}

/** A per-vintage verdict, which carries the year so a caller can assert on WHICH one moved. */
export interface VintageVerdict extends Verdict {
  year: number
}

/**
 * The population itself, before any count is read: the table must still say what this
 * module assumes. A silent flip of `publicly_redistributable`, or a vintage arriving
 * without a licence decision, is caught here rather than laundered into a green count.
 */
export function expectationHolds(facts: VintageFact[]): Verdict {
  const withheld = facts.filter((f) => !f.publiclyRedistributable).map((f) => f.year).sort()
  const open = facts.filter((f) => f.publiclyRedistributable).map((f) => f.year).sort()
  const same = (a: readonly number[], b: readonly number[]) =>
    a.length === b.length && a.every((y, i) => y === b[i])

  if (same(withheld, [...WITHHELD_YEARS].sort()) && same(open, [...REDISTRIBUTABLE_YEARS].sort()))
    return {
      ok: true,
      what: "millésimes recensés",
      detail: `retenus ${withheld.join(" et ")}, redistribuable ${open.join(" et ")} — la table dit ce que la porte tient pour acquis`,
    }

  return {
    ok: false,
    what: "millésimes recensés",
    detail:
      `bdcom_vintage annonce retenus [${withheld.join(", ") || "aucun"}] et redistribuables ` +
      `[${open.join(", ") || "aucun"}], la porte attend [${WITHHELD_YEARS.join(", ")}] et ` +
      `[${REDISTRIBUTABLE_YEARS.join(", ")}] — décision de licence déplacée, ou millésime sans décision`,
  }
}

/**
 * One verdict per vintage, and both directions matter.
 *
 * A withheld vintage must count exactly zero: one leaked row is the whole thing this gate
 * exists to catch. A redistributable one must count exactly `record_count`: a policy that
 * blocked everything would satisfy the first half and serve nobody, and a partial
 * disclosure — a total that moved — is caught here where the unkeyed count used to catch
 * it. Keying the count did not cost that coverage; it gained per-vintage attribution.
 */
export function licenceVerdict(facts: VintageFact[]): VintageVerdict[] {
  return facts
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((f) => {
      const what = `RLS premise_observation ${f.year}`
      const year = f.year
      if (!f.publiclyRedistributable)
        return f.visible === 0
          ? { ok: true, year, what, detail: "zéro relevé visible — le millésime retenu ne sort pas de la base" }
          : {
              ok: false,
              year,
              what,
              detail: `${f.visible} relevé(s) visibles sur un millésime retenu, attendu 0 — la licence fuit`,
            }
      return f.visible === f.recordCount
        ? { ok: true, year, what, detail: `${f.visible} relevés visibles = les ${f.recordCount} du millésime ODbL` }
        : {
            ok: false,
            year,
            what,
            detail:
              `${f.visible} relevé(s) visibles, attendu ${f.recordCount} — ` +
              (f.visible < f.recordCount ? "retenue excessive sur de l'ODbL" : "plus de lignes que le millésime n'en compte"),
          }
    })
}
