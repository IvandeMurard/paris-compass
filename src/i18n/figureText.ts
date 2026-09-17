/**
 * How a provenance-carrying figure reads on screen, decided without any DOM.
 *
 * The rules Compass cares about — absent is not zero, an estimate says so — are
 * decisions, not markup. Keeping them in a pure function means they can be tested by the
 * node-environment runner the project already has, instead of requiring a rendering
 * harness; `MeasuredFigure.tsx` is then only responsible for putting the result on screen.
 */

import type { Measured } from '@/core';
import type { Locale } from '@/i18n/locale';

export const FIGURE_COPY = {
  fr: {
    na: 'n/d',
    naTitle: "Donnée absente : la couche n'a pas pu être chargée pour ce point.",
    estimated: 'estimation',
    estimatedTitle: 'Chiffre estimé, pas mesuré. Voir la méthode.',
    method: 'méthode',
  },
  en: {
    na: 'n/a',
    naTitle: 'Figure unavailable: the layer could not be loaded for this point.',
    estimated: 'estimate',
    estimatedTitle: 'Estimated, not measured. See the method.',
    method: 'method',
  },
} as const;

export interface FigureDescription {
  /** What stands where the number goes. */
  text: string;
  /** True when there is no value — the caller greys the text out. */
  absent: boolean;
  /** Why the figure needs reading with caution. Absent figures always carry one. */
  caveat?: string;
  /** The word the caveat link shows. Undefined when no caveat applies. */
  marker?: string;
}

export function describeFigure(
  measured: Measured<number>,
  locale: Locale,
  options: { unit?: string; display?: string } = {},
): FigureDescription {
  const c = FIGURE_COPY[locale];
  const { unit = '/100', display } = options;

  // An absent figure is never dressed up with a unit or a label: there is nothing to
  // qualify. `missingReason` is preferred to the generic wording because the core knows
  // which layer was missing and the reader deserves that, not a shrug.
  if (measured.value === null) {
    return { text: c.na, absent: true, caveat: measured.missingReason ?? c.naTitle };
  }

  const text = display ?? `${measured.value}${unit}`;

  // A note wins over the generic estimate wording: it is the specific thing the core had
  // to say about this figure — truncated coverage, a proxy's limits — and it is worth
  // more than the category the figure belongs to.
  if (measured.note) {
    return { text, absent: false, caveat: measured.note, marker: '?' };
  }
  if (measured.method === 'estimated') {
    return { text, absent: false, caveat: c.estimatedTitle, marker: c.estimated };
  }
  return { text, absent: false };
}
