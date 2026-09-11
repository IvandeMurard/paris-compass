/**
 * Two addresses, side by side, and never three — w6-contexte (#119), step 6.
 *
 * **The bound is in the structure, and that is the whole point.** `docs/PERIMETRE.md` §1 names
 * the broker as the refusal Compass is built around: *« il veut de l'export, du dossier, du
 * portefeuille, de la comparaison en masse. »* A refusal written as an intention — a comment, a
 * validation, a cap of two on a list — is a refusal one commit undoes without noticing. So this
 * module takes two positional arguments and returns a shape with an `a` and a `b`. There is no
 * array anywhere in its types, and there is no signature to widen: a third address has nowhere
 * to go. If this file could ever accept three, it would be wrong.
 *
 * **It names no winner, and the reason is the same one that refuses a score out of 100.**
 * `docs/PERIMETRE.md` §4: the weights depend on the trade. « A is better than B » is a
 * weighting, silently applied — a baker and an accountancy practice do not read footfall and
 * quiet the same way. So every row carries both sides and says nothing about which is
 * preferable. Nothing here returns a rank, a delta, a percentage or a total.
 *
 * **An axis one side cannot supply is not a comparison.** If footfall resolved at A and is
 * withheld for licence at B, putting them in the same row would let a reader subtract them. The
 * row is marked incomparable and says why, which is the same rule `composeVerdict` applies to a
 * sentence, applied to a pair.
 *
 * Pure, like everything under `src/core/`: no fetch, no React, no DOM. The MCP server compiles
 * against this directory, so `compare_locations` can be held to the same bound.
 */

import type { Measured } from './provenance';
import {
  BEARING_AXES,
  VERDICT_AXES,
  VERDICT_AXIS_ORDER,
  bandOf,
  clauseText,
  composeVerdict,
  noFindingText,
  type Band,
  type Verdict,
  type VerdictAxis,
  type VerdictFinding,
  type VerdictLocale,
  type Withholding,
} from './verdict';

/** One side's value on one axis: a clause, or the named absence of one. */
export type ComparisonCell =
  | { kind: 'clause'; band: Band; text: string; measured: Measured<number> }
  | { kind: 'absent'; because: Withholding; reason: string };

export interface ComparisonRow {
  axis: VerdictAxis;
  /** Whether this axis bears a verdict — the reading order puts the three bearing ones first. */
  bearing: boolean;
  a: ComparisonCell;
  b: ComparisonCell;
  /**
   * True only when both sides produced a clause.
   *
   * Deliberately not « both are non-null »: it is the same test, but naming it is what stops a
   * consumer from writing its own and getting it subtly wrong on the day a third kind of cell
   * appears.
   */
  comparable: boolean;
}

export interface ComparisonSide {
  /** The side's own verdict, composed by the same function the single-address sheet uses. */
  verdict: Verdict;
}

export interface Comparison {
  a: ComparisonSide;
  b: ComparisonSide;
  rows: readonly ComparisonRow[];
  /** Axes on which the two addresses can honestly be set beside each other. */
  comparableAxes: readonly VerdictAxis[];
  /** Axes on which one side has nothing, so the pair says so rather than ranking. */
  incomparableAxes: readonly VerdictAxis[];
  /** True when no bearing axis at all can be compared — the pair itself is uninformative. */
  bearingComparable: boolean;
}

function cellOf(finding: VerdictFinding | undefined, locale: VerdictLocale, axis: VerdictAxis): ComparisonCell {
  if (!finding || finding.measured.value === null) {
    return {
      kind: 'absent',
      because: finding?.withheldBecause ?? 'indetermine',
      // The reason is the core's own, never rewritten here — the same discipline `VerdictGap`
      // follows. A reworded absence is an absence whose cause can no longer be acted on.
      reason: finding?.measured.missingReason ?? noFindingText(locale),
    };
  }
  const band = bandOf(axis, finding.measured.value);
  return { kind: 'clause', band, text: clauseText(axis, band, locale), measured: finding.measured };
}

/**
 * Compare exactly two addresses.
 *
 * Two parameters, and the result has an `a` and a `b`. Callers that hold a list have to unpack
 * it into two named things before they can call this, which is precisely the friction the
 * refusal is made of.
 */
export function compareAddresses(
  a: readonly VerdictFinding[],
  b: readonly VerdictFinding[],
  locale: VerdictLocale = 'fr',
): Comparison {
  const byAxisA = new Map(a.map((f) => [f.axis, f] as const));
  const byAxisB = new Map(b.map((f) => [f.axis, f] as const));

  const rows: ComparisonRow[] = VERDICT_AXIS_ORDER.map((axis) => {
    const cellA = cellOf(byAxisA.get(axis), locale, axis);
    const cellB = cellOf(byAxisB.get(axis), locale, axis);
    return {
      axis,
      bearing: VERDICT_AXES[axis].bearing,
      a: cellA,
      b: cellB,
      comparable: cellA.kind === 'clause' && cellB.kind === 'clause',
    };
  });

  const comparableAxes = rows.filter((r) => r.comparable).map((r) => r.axis);
  return {
    a: { verdict: composeVerdict(a, locale) },
    b: { verdict: composeVerdict(b, locale) },
    rows,
    comparableAxes,
    incomparableAxes: rows.filter((r) => !r.comparable).map((r) => r.axis),
    bearingComparable: BEARING_AXES.some((axis) => comparableAxes.includes(axis)),
  };
}
