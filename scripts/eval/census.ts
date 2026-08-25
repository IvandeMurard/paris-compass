// Reading eval/invariants.sql, and the census cross-check built on it.
//
// Extracted from run.ts for one reason: scripts/eval/census-sabotage.ts has to
// prove that adding a sixth function turns the gate red, and a proof that runs a
// COPY of the check proves nothing about the check that ships. Both import this.
//
// w0-retenue (#57). The licence rule — a function traversing a table whose RLS
// can silently remove rows must announce its withholding rather than let the
// rows vanish — had been written by hand four times, once per function, and the
// fifth function was born wrong and found by accident (DIAGNOSTIC.md §19/§20).
// I23 derives the population from pg_proc; I24 derives the coverage from this
// file. Neither side is a list anyone has to remember to update.

import { readFileSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(import.meta.dirname, "../..")

export interface Invariant {
  id: string
  description: string
  sql: string
  /** Role to impersonate, from an optional `-- @as <role>` line. */
  as?: string
  /**
   * Column naming the population, from an optional `-- @census <column>` line.
   * A census block inverts the contract: its rows are the functions the rule
   * applies to, not violations.
   */
  census?: string
}

/** Splits invariants.sql on its `-- @invariant <id> :: <description>` markers. */
export function readInvariants(path = resolve(ROOT, "eval/invariants.sql")): Invariant[] {
  const source = readFileSync(path, "utf8")
  const blocks = source.split(/^--\s*@invariant\s+/m).slice(1)
  return blocks.map((block) => {
    const [header, ...rest] = block.split("\n")
    const [id, description] = header.split("::").map((s) => s.trim())
    const body = rest.join("\n")
    return {
      id,
      description,
      as: /^--\s*@as\s+(\S+)/m.exec(body)?.[1],
      census: /^--\s*@census\s+(\S+)/m.exec(body)?.[1],
      sql: body.trim(),
    }
  })
}

/**
 * The `compass_*` functions a query actually CALLS, comments removed.
 *
 * Comments are stripped on purpose: I16 names its three sister functions in its
 * header without checking anything about them, and counting that as coverage
 * would make the census vouch for functions nobody tests. Only an executed call
 * counts.
 */
export function calledFunctions(sql: string): string[] {
  const executable = sql.replace(/--[^\n]*/g, "")
  return Array.from(executable.matchAll(/\b(compass_[a-z0-9_]+)\s*\(/g), (m) => m[1])
}

/** Which functions the `@as anon` invariants exercise — the coverage side of I24. */
export function anonymousCoverage(invariants: Invariant[]): Set<string> {
  const covered = new Set<string>()
  for (const invariant of invariants) {
    if (invariant.as !== "anon" || invariant.census) continue
    for (const name of calledFunctions(invariant.sql)) covered.add(name)
  }
  return covered
}

export interface CensusVerdict {
  ok: boolean
  population: string[]
  uncovered: string[]
  detail: string
}

/**
 * The verdict on one census block.
 *
 * An EMPTY population fails too. A census that finds nothing has stopped
 * working — the catalogue query drifted, the schema moved — and reporting that
 * as success is the silent-absence defect this whole family of invariants
 * exists to refuse (DIAGNOSTIC.md §9).
 */
export function censusVerdict(
  rows: Record<string, unknown>[],
  column: string,
  covered: Set<string>,
): CensusVerdict {
  const population = rows.map((row) => String(row[column]))
  const uncovered = population.filter((name) => !covered.has(name))
  if (population.length === 0)
    return { ok: false, population, uncovered, detail: "recensement vide : l'énumération ne trouve plus rien" }
  if (uncovered.length > 0)
    return {
      ok: false,
      population,
      uncovered,
      detail: `${uncovered.length} sans test de retenue anonyme : ${uncovered.join(", ")}`,
    }
  return {
    ok: true,
    population,
    uncovered,
    detail: `${population.length} fonction(s) recensée(s), toutes couvertes par un invariant @as anon`,
  }
}
