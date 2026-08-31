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
  /**
   * Table and column to cut the population on, from an optional
   * `-- @chunk <schema>.<table>.<column>` line — #69.
   *
   * The invariant then runs as several statements instead of one, and its SQL
   * must carry the two bind parameters that bound each slice. See chunks.ts for
   * why the slices cover the whole domain rather than the measured interval.
   */
  chunk?: { table: string; column: string }
}

/**
 * Identifiers reaching this module come from a repository file, not from a
 * caller — but they are interpolated into SQL to read the slice boundaries, so
 * they are checked rather than trusted. A directive that does not parse is a
 * typo, and a typo that silently disabled chunking would leave one statement
 * quietly back on the wrong side of the window.
 */
const IDENTIFIER = /^[a-z_][a-z0-9_]*$/

/** Splits invariants.sql on its `-- @invariant <id> :: <description>` markers. */
export function readInvariants(path = resolve(ROOT, "eval/invariants.sql")): Invariant[] {
  const source = readFileSync(path, "utf8")
  const blocks = source.split(/^--\s*@invariant\s+/m).slice(1)
  return blocks.map((block) => {
    const [header, ...rest] = block.split("\n")
    const [id, description] = header.split("::").map((s) => s.trim())
    const body = rest.join("\n")
    const chunk = /^--\s*@chunk\s+(\S+)/m.exec(body)?.[1]
    return {
      id,
      description,
      as: /^--\s*@as\s+(\S+)/m.exec(body)?.[1],
      census: /^--\s*@census\s+(\S+)/m.exec(body)?.[1],
      chunk: chunk === undefined ? undefined : parseChunk(id, chunk),
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

/** Splits `<schema>.<table>.<column>`, checking every part is a plain identifier. */
export function parseChunk(id: string, directive: string): { table: string; column: string } {
  const parts = directive.split(".")
  if (parts.length !== 3 || !parts.every((p) => IDENTIFIER.test(p)))
    throw new Error(
      `${id} : @chunk attend <schema>.<table>.<colonne> en identifiants simples, reçu « ${directive} »`,
    )
  return { table: `${parts[0]}.${parts[1]}`, column: parts[2] }
}
