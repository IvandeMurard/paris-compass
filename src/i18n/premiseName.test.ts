/**
 * The defect these guard: `properties.ts` built the title in French whatever the interface
 * language, and built it ungrammatically — "ancien Boulangerie", masculine article on a
 * feminine noun, with a capital in the middle of a sentence.
 */

import { describe, expect, it } from 'vitest';
import { premiseAddressLabel, premiseTitle } from './premiseName';

describe('premiseTitle — occupied', () => {
  it('prefers the business name, untranslated, because it is what is on the sign', () => {
    const naming = { name: 'Boulangerie Martin', kind: 'bakery' };
    expect(premiseTitle(naming, 'occupied', 'fr')).toBe('Boulangerie Martin');
    expect(premiseTitle(naming, 'occupied', 'en')).toBe('Boulangerie Martin');
  });

  it('falls back to the kind, in the reader’s language', () => {
    expect(premiseTitle({ kind: 'bakery' }, 'occupied', 'fr')).toBe('Boulangerie');
    expect(premiseTitle({ kind: 'bakery' }, 'occupied', 'en')).toBe('Bakery');
  });

  it('names an unlabelled kind without inventing an article', () => {
    expect(premiseTitle({ kind: 'shoe_repair' }, 'occupied', 'fr')).toBe('Local shoe repair');
    expect(premiseTitle({ kind: 'shoe_repair' }, 'occupied', 'en')).toBe('shoe repair unit');
  });

  it('handles a premise with no kind at all', () => {
    expect(premiseTitle({ kind: 'commerce' }, 'occupied', 'fr')).toBe('Local commercial');
    expect(premiseTitle({}, 'occupied', 'en')).toBe('Commercial unit');
  });
});

describe('premiseTitle — vacant', () => {
  it('says so plainly when nothing is known of the previous trade', () => {
    expect(premiseTitle({}, 'vacant', 'fr')).toBe('Local commercial vacant');
    expect(premiseTitle({}, 'vacant', 'en')).toBe('Vacant commercial unit');
  });

  // The bug, verbatim: "Local vacant (ancien Boulangerie)".
  it('agrees the French adjective with a feminine noun', () => {
    expect(premiseTitle({ previousKind: 'bakery' }, 'vacant', 'fr')).toBe(
      'Local vacant (ancienne boulangerie)',
    );
  });

  it('agrees it with a masculine noun too', () => {
    expect(premiseTitle({ previousKind: 'restaurant' }, 'vacant', 'fr')).toBe(
      'Local vacant (ancien restaurant)',
    );
  });

  it('needs no agreement in English', () => {
    expect(premiseTitle({ previousKind: 'bakery' }, 'vacant', 'en')).toBe(
      'Vacant unit (former bakery)',
    );
  });

  // An unknown kind defaults to masculine rather than guessing — the least wrong option.
  it('does not crash on a kind it has no label for', () => {
    expect(premiseTitle({ previousKind: 'shoe_repair' }, 'vacant', 'fr')).toBe(
      'Local vacant (ancien shoe repair)',
    );
    expect(premiseTitle({ previousKind: 'shoe_repair' }, 'vacant', 'en')).toBe(
      'Vacant unit (former shoe repair)',
    );
  });
});

describe('premiseAddressLabel', () => {
  it('returns the address when there is one', () => {
    expect(premiseAddressLabel('7 rue Clauzel, 75009 Paris', 'fr')).toBe(
      '7 rue Clauzel, 75009 Paris',
    );
  });

  // The absence names its source: it is OpenStreetMap that carries no address here.
  it('phrases the absence in the reader’s language', () => {
    expect(premiseAddressLabel(null, 'fr')).toBe('Adresse non renseignée dans OpenStreetMap');
    expect(premiseAddressLabel(null, 'en')).toBe('No address recorded in OpenStreetMap');
  });
});
