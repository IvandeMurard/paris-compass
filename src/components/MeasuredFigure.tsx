/**
 * Rendering for a figure that carries its own provenance.
 *
 * Compass has one founding constraint: a number that cannot be re-derived from a cited
 * public source is not shown. `Measured<T>` makes that constraint type-level; this file
 * makes it visible. Every score on a card goes through here, so there is exactly one
 * place where the rules below reach the screen:
 *
 *  - a null value renders as "n/d", never as zero and never as a blank cell;
 *  - a modelled proxy or a caveated figure is marked, and the mark links to the
 *    methodology page rather than living in a tooltip only;
 *  - the source and the vintage sit next to the number, not in a card footer that
 *    applies to everything and therefore to nothing in particular.
 *
 * The decisions themselves live in `i18n/figureText.ts`, where they are tested without a DOM
 * and shared with the Leaflet popups, which cannot render a component.
 */

import { Link } from 'react-router-dom';
import type { Measured } from '@/core';
import { describeFigure, FIGURE_COPY } from '@/i18n/figureText';
import { useLocale } from '@/i18n/locale';

interface ScoreProps {
  measured: Measured<number>;
  /** Rendered after the number, e.g. "/100". */
  unit?: string;
  /**
   * Shown instead of the number — for a figure the interface presents as a word, such as
   * the noise band. The caveat marker still applies: translating a score into a label
   * does not make it a measurement, and noise is the one that most needs saying.
   */
  display?: string;
}

/**
 * A score and its caveat marker.
 *
 * The marker is a link, not a hover tooltip: a caveat that only exists on hover does not
 * exist on a touch screen, and does not survive being read aloud.
 */
export const MeasuredScore = ({ measured, unit, display }: ScoreProps) => {
  const { locale, lp } = useLocale();
  const { text, absent, caveat, marker } = describeFigure(measured, locale, { unit, display });

  if (absent) {
    return (
      <span className="text-muted-foreground" title={caveat}>
        {text}
      </span>
    );
  }

  return (
    <span>
      {text}
      {marker && (
        <Link
          to={lp('/methodologie')}
          title={caveat}
          aria-label={caveat}
          className="ml-1 align-super text-[10px] text-muted-foreground underline decoration-dotted hover:text-foreground"
        >
          {marker}
        </Link>
      )}
    </span>
  );
};

/**
 * Source and vintage of a figure.
 *
 * Deliberately not a licence dump: the licence governs redistribution, which concerns the
 * export and the MCP layer, not someone reading a card.
 */
export const MeasuredOrigin = ({ measured }: { measured: Measured<unknown> }) => {
  const { locale, lp } = useLocale();
  return (
    <span className="text-[11px] text-muted-foreground">
      {measured.source} · {measured.asOf} ·{' '}
      <Link to={lp('/methodologie')} className="underline decoration-dotted hover:text-foreground">
        {FIGURE_COPY[locale].method}
      </Link>
    </span>
  );
};
