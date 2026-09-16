/**
 * These assertions used to live against the service adapter, which unwrapped
 * `Measured<T>` into plain numbers. That unwrapping is gone — provenance now travels to
 * the component — so the rule it protected moved here, to the last place before a figure
 * reaches a reader. The trap is unchanged: a zero substituted for an absence is a
 * measurement no one made.
 */

import { describe, expect, it } from 'vitest';
import {
  motifText,
  OSM_ORIGIN,
  unavailable,
  withValue,
  type FigureMotif,
  type Measured,
} from '@/core';
import { describeFigure } from './figureText';

const ORIGIN = OSM_ORIGIN('2026-08-10');

/** The two motifs these assertions need, named once — w6-langue-absences (#181). */
const ROADS: FigureMotif = { kind: 'couche_absente', layer: 'roads' };
const TRONQUEE: FigureMotif = { kind: 'couverture_tronquee' };

const derived = (value: number, ...caveats: FigureMotif[]): Measured<number> =>
  withValue(value, ORIGIN, 'derived', caveats);

describe('describeFigure', () => {
  it('writes an absent figure as n/d rather than as a number', () => {
    const d = describeFigure(unavailable(ORIGIN, ROADS), 'fr');
    expect(d.text).toBe('n/d');
    expect(d.absent).toBe(true);
  });

  it('explains an absence with the reason the core gave, not a generic one', () => {
    const d = describeFigure(unavailable(ORIGIN, ROADS), 'fr');
    expect(d.caveat).toBe(motifText(ROADS, 'fr'));
  });

  // The distinction the whole change exists for: both of these once rendered "0/100".
  it('keeps a genuine zero as a zero', () => {
    const d = describeFigure(derived(0), 'fr');
    expect(d.text).toBe('0/100');
    expect(d.absent).toBe(false);
  });

  it('marks an estimate as one, and links it', () => {
    const d = describeFigure(withValue(62, ORIGIN, 'estimated'), 'fr');
    expect(d.marker).toBe('estimation');
    expect(d.caveat).toBeTruthy();
  });

  it('does not mark a derived count', () => {
    expect(describeFigure(derived(62), 'fr').marker).toBeUndefined();
  });

  // A note is the specific thing the core had to say; the category is only a fallback.
  it('prefers a note over the generic estimate wording', () => {
    const d = describeFigure(withValue(40, ORIGIN, 'estimated', [TRONQUEE]), 'fr');
    expect(d.caveat).toBe(motifText(TRONQUEE, 'fr'));
  });

  it('still marks a caveated figure that is not an estimate', () => {
    expect(describeFigure(derived(40, TRONQUEE), 'fr').marker).toBe('?');
  });

  it('shows a label instead of the number without dropping the caveat', () => {
    const d = describeFigure(withValue(75, ORIGIN, 'estimated'), 'fr', { display: 'Élevé' });
    expect(d.text).toBe('Élevé');
    expect(d.marker).toBe('estimation');
  });

  // An absent figure has nothing to qualify: dressing it with a label would suggest one.
  it('ignores a label when there is no value', () => {
    const d = describeFigure(unavailable(ORIGIN, ROADS), 'fr', { display: 'Élevé' });
    expect(d.text).toBe('n/d');
  });

  it('translates the absence marker', () => {
    expect(describeFigure(unavailable(ORIGIN, ROADS), 'en').text).toBe('n/a');
  });

  /**
   * Le critère 2 du ticket, joué dans les deux sens — w6-langue-absences (#181).
   *
   * Un même `Measured<T>`, deux locales, deux phrases. Le sens inverse compte autant que
   * l'autre : `truncatedNote` du navigateur était écrite en français et arrivait telle quelle
   * sur `/en/context/`, donc un contrôle qui ne regarderait que la page française laisserait
   * passer exactement la moitié du défaut.
   */
  it('CONTRE-PREUVE : une même figure absente se lit dans la langue de sa page, des deux côtés', () => {
    const m = unavailable<number>(ORIGIN, ROADS);
    expect(describeFigure(m, 'fr').caveat).toBe(motifText(ROADS, 'fr'));
    expect(describeFigure(m, 'en').caveat).toBe(motifText(ROADS, 'en'));
    expect(describeFigure(m, 'fr').caveat).not.toBe(describeFigure(m, 'en').caveat);

    // Et sur une réserve chiffrée, où les nombres doivent survivre à la traduction.
    const plafonnee: FigureMotif = {
      kind: 'reponse_plafonnee',
      layer: 'premises',
      rendered: 1000,
      total: 17190,
      radiusM: 2000,
    };
    const capped = withValue(60, ORIGIN, 'estimated', [plafonnee]);
    for (const locale of ['fr', 'en'] as const) {
      const caveat = describeFigure(capped, locale).caveat ?? '';
      expect(caveat).toBe(motifText(plafonnee, locale));
      expect(caveat).toContain('1000');
      expect(caveat).toContain('17190');
      expect(caveat).toContain('2000');
    }
    expect(describeFigure(capped, 'fr').caveat).not.toBe(describeFigure(capped, 'en').caveat);
  });
});
