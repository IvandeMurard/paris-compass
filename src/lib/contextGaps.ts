/**
 * What Compass does not know at THIS address — derived, never recited.
 *
 * The block this feeds is an argument, not an apology: an answer that does not state its holes
 * cannot be checked, and no competitor publishes theirs. Which means the list has to be true
 * of the point being looked at. A fixed paragraph saying « some data may be incomplete » would
 * be worse than nothing, because it would be indistinguishable from a page that has no holes.
 *
 * So every entry below is read off the values that were actually computed:
 *
 *  - a figure with no value contributes the CAUSE its caller declared — « source injoignable »,
 *    « retenue pour licence », « hors du corpus » — followed by its own `missingReason`,
 *    written by `src/core`. Both halves are needed: the reason says which layer went silent,
 *    the cause says whether coming back tomorrow would change anything (`#156`);
 *  - a figure carrying a `note` contributes that caveat — a proxy, or coverage cut short by
 *    the edge of the fetched area;
 *  - the premises layer contributes the name of the source it really used, taken from
 *    `Measured.source`, because volunteer tagging and a door-to-door survey are not the same
 *    claim about a vacant unit.
 *
 * The one entry that is unconditional is the absence of any open commercial rent in France.
 * It is a property of the country's open data, not of the point, and it is the single question
 * every visitor arrives with — leaving it out because it is always true would be the reason
 * nobody ever reads it.
 *
 * **What this does not catch.** It sees the figures this page computed and nothing else: a
 * source that is stale rather than absent, or a field a producer quietly stopped publishing,
 * leaves no trace in `Measured<T>` and therefore none here. Cadence is measured by
 * `npm.cmd run freshness` against the database, which this page does not read.
 */

import {
  findingsFromScores,
  missingText,
  modeAxisOrder,
  noteText,
  withholdingText,
  type AreaScores,
  type Layer,
  type TradeMode,
  type VerdictAxis,
  type Withholding,
} from '@/core';
import { AXIS_NAMES, GAP_COPY } from '@/i18n/contextText';
import type { Locale } from '@/i18n/locale';

export interface Gap {
  /** Stable key for React and for tests. */
  key: string;
  text: string;
  /** The axis it came from, when it came from one. */
  axis?: VerdictAxis;
}

export function collectGaps(
  scores: AreaScores,
  loaded: readonly Layer[],
  /** `Origin.source` of the premises layer. Taken from the origins the context was scored
   *  with, not from a figure: the axes that read premises can be absent for another reason,
   *  and their `source` would then name the layer that failed instead of the one used. */
  premisesSource: string,
  locale: Locale,
  /**
   * Why a layer is absent, when the caller met a structured failure — w6-fiche-robuste (#156).
   *
   * Resolved per axis by `findingsFromScores`, never by a second copy of its rule here: an
   * axis reads its layers in the order it gives up on them, and the first declared withholding
   * is the one that actually stopped the figure. Left out, every absence reads `indetermine`,
   * which is the honest default and the same one the core takes — « we do not know why » is a
   * fact, and it is never guessed to be a licence refusal.
   */
  withheldBy: Partial<Record<Layer, Withholding>> = {},
  /**
   * What `compass_activity_transitions` answered — w6-fiche-corpus (#157).
   *
   * It is here rather than among the findings because on every ordinary Paris address today it
   * answers « withheld »: a transition derives from two vintages and only 2023 is
   * redistributable, so no pair is servable until the APUR replies. A thing Compass holds and
   * cannot serve is exactly what this block is for — and it is the one entry that puts
   * « retenue de licence » in front of a visitor on an address where everything else worked,
   * which is the difference between having a licence problem and saying so.
   *
   * `null` when the call itself failed. An outage contributes nothing here rather than
   * borrowing the words of a licence refusal.
   */
  transitions: { withheld: boolean; evidence: string | null } | null = null,
  /**
   * Axes whose every layer is still in flight — w6-fiche-delai (#180), from `pendingAxes`.
   *
   * They contribute nothing here, and the omission is the point: this block lists what Compass
   * does not know at this address, and « nobody has answered yet » is not a thing it does not
   * know — it is a thing it has not finished asking. Listing it would put a hole in front of a
   * reader and take it away two seconds later, which is how a list of holes stops being read.
   * The entry appears as soon as the layer settles unreachable, which is when it becomes true.
   */
  pending: ReadonlySet<VerdictAxis> = new Set(),
): Gap[] {
  const copy = GAP_COPY[locale];
  const names = AXIS_NAMES[locale];
  const gaps: Gap[] = [];

  for (const finding of findingsFromScores(scores, withheldBy)) {
    const { axis, measured } = finding;
    if (measured.value === null && pending.has(axis)) continue;
    if (measured.value === null) {
      gaps.push({
        key: `missing:${axis}`,
        axis,
        // The cause first, then the core's sentence about the layer. A reader who stops after
        // three words still knows whether to come back later or never.
        text: copy.missingBecause(
          names[axis],
          withholdingText(finding.withheldBecause ?? 'indetermine', locale),
          missingText(measured, locale) ?? '',
        ),
      });
      continue;
    }
    // A caveat written by the core wins over any wording invented here: it is the specific
    // thing that module had to say about this figure at this point — rendered in `locale` from
    // its motif since w6-langue-absences (#181), not read off the core's English field.
    const note = noteText(measured, locale);
    if (note) {
      gaps.push({ key: `note:${axis}`, axis, text: copy.missing(names[axis], note) });
    }
  }

  // Named only when the layer actually answered — otherwise its absence is already above, and
  // saying both would count one hole twice.
  if (loaded.includes('premises')) {
    gaps.push({ key: 'premises-source', text: copy.premisesSource(premisesSource) });
  }

  // The withheld half only. A matrix that came back servable is a finding and not a hole, and
  // the day the APUR answers this entry disappears on its own rather than being remembered.
  if (transitions?.withheld) {
    gaps.push({
      key: 'transitions-withheld',
      text: copy.transitionsWithheld(
        withholdingText('retenue_licence', locale),
        transitions.evidence ?? '',
      ).trim(),
    });
  }

  gaps.push({ key: 'commercial-rent', text: copy.noCommercialRent });

  return gaps;
}

/**
 * The same holes, in the order this trade reads them — w6-modes (#36).
 *
 * **It reorders and never filters**, which is the half that matters. A mode that hid a gap
 * would be a mode that makes the page look more complete than it is, and this block is the
 * credibility argument of the whole sheet: the shortest path to destroying it is letting a
 * setting decide which holes a visitor sees. So the output is a permutation of the input —
 * `contextGaps.test.ts` holds that to be true — and the only thing a mode buys is that the
 * absence bearing on its own reading arrives first.
 *
 * Gaps with no axis keep their relative order behind the ones that have one. They are the
 * entries that are true of the product rather than of a figure — no open commercial rent in
 * France, the withheld transition matrix, the name of the premises source — and no trade reads
 * them sooner than another.
 */
export function orderGapsForMode(gaps: readonly Gap[], mode: TradeMode | null): readonly Gap[] {
  if (mode === null) return gaps;
  const rank = new Map(modeAxisOrder(mode).map((axis, i) => [axis, i] as const));
  const position = (gap: Gap) => (gap.axis ? (rank.get(gap.axis) ?? rank.size) : rank.size + 1);
  // `map`/`sort` over the indices rather than `sort` on a copy alone: `Array.prototype.sort` is
  // required to be stable since ES2019, and relying on that for the non-axis tail is exactly
  // the kind of implicit guarantee this repository writes down instead of assuming.
  return gaps
    .map((gap, index) => ({ gap, index }))
    .sort((a, b) => position(a.gap) - position(b.gap) || a.index - b.index)
    .map((entry) => entry.gap);
}
