import React, { createContext, useContext, useMemo, useState } from 'react';
import type { AmenityScore, FilterState } from '@/types/filters';
import type { BBox, Premise } from '@/services/opendata/types';
import { PARIS_BBOX } from '@/hooks/useOpenData';

const initialAmenityScores: AmenityScore = {
  schools: 0,
  healthcare: 0,
  groceries: 0,
  transit: 0,
  parks: 0,
};

const initialFilters: FilterState = {
  query: '',
  sizeRange: [0, 500],
  walkabilityScore: [0, 100],
  amenityScores: initialAmenityScores,
  selectedAmenities: [],
};

interface FiltersContextValue {
  filters: FilterState;
  vacantOnly: boolean;
  setVacantOnly: (value: boolean) => void;
  updateQuery: (query: string) => void;
  updateSizeRange: (range: number[]) => void;
  updateWalkabilityScore: (range: number[]) => void;
  updateAmenityScores: (scores: Partial<AmenityScore>) => void;
  toggleAmenity: (amenity: string) => void;
  reset: () => void;
  matches: (premise: Premise) => boolean;
  bbox: BBox;
  setBbox: (bbox: BBox) => void;
}

// Keep a single context identity across Vite HMR updates, otherwise a hot reload
// of this module creates a new context while the mounted provider still holds the old one.
const globalScope = globalThis as typeof globalThis & {
  __filtersContext?: React.Context<FiltersContextValue | null>;
};
const FiltersContext =
  globalScope.__filtersContext ??
  (globalScope.__filtersContext = createContext<FiltersContextValue | null>(null));

export const FiltersProvider = ({ children }: { children: React.ReactNode }) => {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [vacantOnly, setVacantOnly] = useState(false);
  const [bbox, setBbox] = useState<BBox>(PARIS_BBOX);

  const value = useMemo<FiltersContextValue>(() => {
    const matches = (premise: Premise) => {
      if (vacantOnly && premise.status !== 'vacant') return false;

      // No rent filter on purpose: no open dataset carries commercial rents, so filtering
      // on one would mean filtering on an invented number. See DIAGNOSTIC.md §1.

      const [minSize, maxSize] = filters.sizeRange;
      if (premise.sizeM2 !== null && (premise.sizeM2 < minSize || premise.sizeM2 > maxSize)) {
        return false;
      }

      // Same rule as the size filter above: a score we could not compute never excludes
      // a premise. Dropping it would be asserting it falls outside the range, which is
      // precisely what the data does not say.
      const [minWalk, maxWalk] = filters.walkabilityScore;
      const walkability = premise.scores.walkability.value;
      if (walkability !== null && (walkability < minWalk || walkability > maxWalk)) {
        return false;
      }

      for (const [key, min] of Object.entries(filters.amenityScores)) {
        const score = premise.scores[key as keyof AmenityScore].value;
        if (min > 0 && score !== null && score < min) return false;
      }

      if (filters.query.trim()) {
        const needle = filters.query.trim().toLowerCase();
        const haystack = `${premise.title} ${premise.address} ${premise.category}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    };

    return {
      filters,
      vacantOnly,
      setVacantOnly,
      updateQuery: (query) => setFilters((prev) => ({ ...prev, query })),
      updateSizeRange: (sizeRange) => setFilters((prev) => ({ ...prev, sizeRange })),
      updateWalkabilityScore: (walkabilityScore) =>
        setFilters((prev) => ({ ...prev, walkabilityScore })),
      updateAmenityScores: (scores) =>
        setFilters((prev) => ({ ...prev, amenityScores: { ...prev.amenityScores, ...scores } })),
      toggleAmenity: (amenity) =>
        setFilters((prev) => ({
          ...prev,
          selectedAmenities: prev.selectedAmenities.includes(amenity)
            ? prev.selectedAmenities.filter((a) => a !== amenity)
            : [...prev.selectedAmenities, amenity],
        })),
      reset: () => {
        setFilters(initialFilters);
        setVacantOnly(false);
      },
      matches,
      bbox,
      setBbox,
    };
  }, [filters, vacantOnly, bbox]);

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
};

export const useFiltersContext = () => {
  const context = useContext(FiltersContext);
  if (!context) throw new Error('useFiltersContext must be used within a FiltersProvider');
  return context;
};
