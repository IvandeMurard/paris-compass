/**
 * The filters had never been tested, and three of them were doing nothing.
 *
 * The cause was structural rather than careless: `vitest.config.ts` collects only
 * `src/**\/*.test.ts` in a node environment, so every rule living inside a `.tsx` was
 * unreachable by the suite. Extracting `matchesPremise` into a module is what makes the
 * assertions below possible at all — and what stops the next regression being invisible.
 */

import { describe, expect, it } from 'vitest';
import { OSM_ORIGIN, withValue, unavailable, type AreaScores } from '@/core';
import type { FilterState } from '@/types/filters';
import type { Premise } from '@/services/opendata/types';
import { matchesPremise } from './matchPremise';

const ORIGIN = OSM_ORIGIN('2026-08-15');

function scores(overrides: Partial<AreaScores> = {}): AreaScores {
  const at = (n: number) => withValue(n, ORIGIN, 'derived');
  return {
    walkability: at(70),
    schools: at(60),
    healthcare: at(60),
    groceries: at(60),
    parks: at(60),
    transit: at(60),
    footfall: withValue(50, ORIGIN, 'estimated', 'proxy'),
    noise: withValue(20, ORIGIN, 'estimated', 'roads only'),
    ...overrides,
  };
}

function premise(overrides: Partial<Premise> = {}): Premise {
  return {
    id: 'node/1',
    title: 'Boulangerie Martin',
    category: 'bakery',
    status: 'vacant',
    address: '7 rue Clauzel',
    arrondissement: 9,
    lat: 48.87,
    lng: 2.34,
    sizeM2: 60,
    residentialRentEurM2: null,
    scores: scores(),
    ...overrides,
  };
}

const NO_FILTER: FilterState = {
  query: '',
  sizeRange: [0, 500],
  walkabilityScore: [0, 100],
  amenityScores: { schools: 0, healthcare: 0, groceries: 0, transit: 0, parks: 0 },
  arrondissements: [],
};

const filters = (overrides: Partial<FilterState> = {}): FilterState => ({
  ...NO_FILTER,
  ...overrides,
});

describe('matchesPremise', () => {
  it('keeps everything when no filter is set', () => {
    expect(matchesPremise(premise(), NO_FILTER, false)).toBe(true);
  });

  describe('vacant only', () => {
    it('drops an occupied premise', () => {
      expect(matchesPremise(premise({ status: 'occupied' }), NO_FILTER, true)).toBe(false);
    });

    it('keeps a vacant one', () => {
      expect(matchesPremise(premise({ status: 'vacant' }), NO_FILTER, true)).toBe(true);
    });
  });

  describe('amenity minimums — the sliders that shipped inert', () => {
    // The regression this guards: the call site passed an updater function to a setter
    // expecting a patch, so the minimum never left 0 and this branch never fired.
    it('drops a premise below the minimum', () => {
      const f = filters({ amenityScores: { ...NO_FILTER.amenityScores, groceries: 80 } });
      expect(matchesPremise(premise({ scores: scores({ groceries: withValue(40, ORIGIN, 'derived') }) }), f, false)).toBe(false);
    });

    it('keeps a premise at or above the minimum', () => {
      const f = filters({ amenityScores: { ...NO_FILTER.amenityScores, groceries: 40 } });
      expect(matchesPremise(premise({ scores: scores({ groceries: withValue(40, ORIGIN, 'derived') }) }), f, false)).toBe(true);
    });

    it('never excludes on a score it could not compute', () => {
      const f = filters({ amenityScores: { ...NO_FILTER.amenityScores, groceries: 80 } });
      const blind = premise({ scores: scores({ groceries: unavailable(ORIGIN, 'no amenity layer') }) });
      expect(matchesPremise(blind, f, false)).toBe(true);
    });

    it('a minimum of zero constrains nothing', () => {
      const f = filters({ amenityScores: { ...NO_FILTER.amenityScores, groceries: 0 } });
      expect(matchesPremise(premise({ scores: scores({ groceries: withValue(0, ORIGIN, 'derived') }) }), f, false)).toBe(true);
    });
  });

  describe('arrondissement — the checkboxes that had no state at all', () => {
    it('drops a premise outside the selection', () => {
      expect(matchesPremise(premise({ arrondissement: 9 }), filters({ arrondissements: [1, 2] }), false)).toBe(false);
    });

    it('keeps a premise inside the selection', () => {
      expect(matchesPremise(premise({ arrondissement: 2 }), filters({ arrondissements: [1, 2] }), false)).toBe(true);
    });

    it('an empty selection means no constraint, not nothing matches', () => {
      expect(matchesPremise(premise({ arrondissement: 9 }), filters({ arrondissements: [] }), false)).toBe(true);
    });

    // OpenStreetMap often carries no postcode. Absence is not a verdict — the same rule
    // that keeps a missing score from excluding a premise.
    it('keeps a premise whose arrondissement is unknown', () => {
      expect(matchesPremise(premise({ arrondissement: undefined }), filters({ arrondissements: [1] }), false)).toBe(true);
    });
  });

  describe('size', () => {
    it('drops a premise outside the range', () => {
      expect(matchesPremise(premise({ sizeM2: 900 }), filters({ sizeRange: [0, 500] }), false)).toBe(false);
    });

    it('keeps a premise whose size is unknown', () => {
      expect(matchesPremise(premise({ sizeM2: null }), filters({ sizeRange: [100, 200] }), false)).toBe(true);
    });
  });

  describe('walkability', () => {
    it('drops a premise below the range', () => {
      expect(matchesPremise(premise(), filters({ walkabilityScore: [80, 100] }), false)).toBe(false);
    });

    it('keeps a premise whose walkability is unknown', () => {
      const blind = premise({ scores: scores({ walkability: unavailable(ORIGIN, 'no layer') }) });
      expect(matchesPremise(blind, filters({ walkabilityScore: [80, 100] }), false)).toBe(true);
    });
  });

  describe('text query', () => {
    it('matches on title, address or category, case-insensitively', () => {
      expect(matchesPremise(premise(), filters({ query: 'BOULANGERIE' }), false)).toBe(true);
      expect(matchesPremise(premise(), filters({ query: 'clauzel' }), false)).toBe(true);
      expect(matchesPremise(premise(), filters({ query: 'bakery' }), false)).toBe(true);
    });

    it('drops what it does not match', () => {
      expect(matchesPremise(premise(), filters({ query: 'pharmacie' }), false)).toBe(false);
    });

    it('ignores a whitespace-only query', () => {
      expect(matchesPremise(premise(), filters({ query: '   ' }), false)).toBe(true);
    });
  });

  it('combines filters conjunctively', () => {
    const f = filters({ arrondissements: [9], query: 'boulangerie' });
    expect(matchesPremise(premise(), f, true)).toBe(true);
    expect(matchesPremise(premise({ status: 'occupied' }), f, true)).toBe(false);
  });
});
