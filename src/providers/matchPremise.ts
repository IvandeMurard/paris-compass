/**
 * Does a premise survive the current filters?
 *
 * Extracted from `FiltersProvider` so the rules can be tested by the node-environment
 * runner the project already has — the same move as `components/figureText.ts`. It is not
 * cosmetic: three filters were silently doing nothing, and the reason none of it was caught
 * is that `vitest.config.ts` only collects `src/**\/*.test.ts`, so nothing inside a `.tsx`
 * has ever been exercised.
 *
 * One rule governs every branch below: **an unknown value never excludes a premise.**
 * Dropping it would assert that it falls outside the bounds, which is precisely what the
 * data does not say. The same discipline as `n/d` never being rendered as `0`.
 */

import type { AmenityScore, FilterState } from '@/types/filters';
import type { Premise } from '@/services/opendata/types';

export function matchesPremise(
  premise: Premise,
  filters: FilterState,
  vacantOnly: boolean,
): boolean {
  if (vacantOnly && premise.status !== 'vacant') return false;

  // No rent filter on purpose: no open dataset carries commercial rents, so filtering
  // on one would mean filtering on an invented number. See DIAGNOSTIC.md §1.

  const [minSize, maxSize] = filters.sizeRange;
  if (premise.sizeM2 !== null && (premise.sizeM2 < minSize || premise.sizeM2 > maxSize)) {
    return false;
  }

  const [minWalk, maxWalk] = filters.walkabilityScore;
  const walkability = premise.scores.walkability.value;
  if (walkability !== null && (walkability < minWalk || walkability > maxWalk)) {
    return false;
  }

  for (const [key, min] of Object.entries(filters.amenityScores)) {
    const score = premise.scores[key as keyof AmenityScore].value;
    if (min > 0 && score !== null && score < min) return false;
  }

  // An empty selection means "no constraint", not "nothing matches". A premise whose
  // arrondissement is unknown — OpenStreetMap often carries no postcode — is kept for the
  // same reason a missing score is kept: absence is not a verdict.
  if (filters.arrondissements.length > 0 && premise.arrondissement !== undefined) {
    if (!filters.arrondissements.includes(premise.arrondissement)) return false;
  }

  if (filters.query.trim()) {
    const needle = filters.query.trim().toLowerCase();
    // Searched against the source values, not the rendered title: a query must find the
    // same premise whichever language the interface is in.
    const haystack = [
      premise.naming.name,
      premise.naming.kind,
      premise.naming.previousKind,
      premise.address,
      premise.category,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}
