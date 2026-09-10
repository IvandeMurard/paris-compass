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
 *  - a figure with no value contributes its own `missingReason`, written by `src/core`;
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

import { VERDICT_AXIS_ORDER, type AreaScores, type Layer, type VerdictAxis } from '@/core';
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
): Gap[] {
  const copy = GAP_COPY[locale];
  const names = AXIS_NAMES[locale];
  const gaps: Gap[] = [];

  for (const axis of VERDICT_AXIS_ORDER) {
    const measured = scores[axis];
    if (measured.value === null) {
      gaps.push({
        key: `missing:${axis}`,
        axis,
        text: copy.missing(names[axis], measured.missingReason ?? ''),
      });
      continue;
    }
    // A caveat written by the core wins over any wording invented here: it is the specific
    // thing that module had to say about this figure at this point.
    if (measured.note) {
      gaps.push({ key: `note:${axis}`, axis, text: copy.missing(names[axis], measured.note) });
    }
  }

  // Named only when the layer actually answered — otherwise its absence is already above, and
  // saying both would count one hole twice.
  if (loaded.includes('premises')) {
    gaps.push({ key: 'premises-source', text: copy.osmPremises(premisesSource) });
  }

  gaps.push({ key: 'commercial-rent', text: copy.noCommercialRent });

  return gaps;
}
