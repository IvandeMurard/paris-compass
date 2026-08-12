/**
 * These assertions used to live against the service adapter, which unwrapped
 * `Measured<T>` into plain numbers. That unwrapping is gone — provenance now travels to
 * the component — so the rule it protected moved here, to the last place before a figure
 * reaches a reader. The trap is unchanged: a zero substituted for an absence is a
 * measurement no one made.
 */

import { describe, expect, it } from 'vitest';
import { OSM_ORIGIN, unavailable, withValue, type Measured } from '@/core';
import { describeFigure } from './figureText';

const ORIGIN = OSM_ORIGIN('2026-08-10');

const derived = (value: number, note?: string): Measured<number> =>
  withValue(value, ORIGIN, 'derived', note);

describe('describeFigure', () => {
  it('writes an absent figure as n/d rather than as a number', () => {
    const d = describeFigure(unavailable(ORIGIN, 'no road data loaded'), 'fr');
    expect(d.text).toBe('n/d');
    expect(d.absent).toBe(true);
  });

  it('explains an absence with the reason the core gave, not a generic one', () => {
    const d = describeFigure(unavailable(ORIGIN, 'no road data loaded'), 'fr');
    expect(d.caveat).toBe('no road data loaded');
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
    const d = describeFigure(withValue(40, ORIGIN, 'estimated', 'coverage is truncated'), 'fr');
    expect(d.caveat).toBe('coverage is truncated');
  });

  it('still marks a caveated figure that is not an estimate', () => {
    expect(describeFigure(derived(40, 'coverage is truncated'), 'fr').marker).toBe('?');
  });

  it('shows a label instead of the number without dropping the caveat', () => {
    const d = describeFigure(withValue(75, ORIGIN, 'estimated'), 'fr', { display: 'Élevé' });
    expect(d.text).toBe('Élevé');
    expect(d.marker).toBe('estimation');
  });

  // An absent figure has nothing to qualify: dressing it with a label would suggest one.
  it('ignores a label when there is no value', () => {
    const d = describeFigure(unavailable(ORIGIN, 'nothing loaded'), 'fr', { display: 'Élevé' });
    expect(d.text).toBe('n/d');
  });

  it('translates the absence marker', () => {
    expect(describeFigure(unavailable(ORIGIN, 'x'), 'en').text).toBe('n/a');
  });
});
