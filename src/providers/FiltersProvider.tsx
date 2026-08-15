import React, { createContext, useContext, useMemo, useState } from 'react';
import type { AmenityScore, FilterState } from '@/types/filters';
import type { BBox, Premise } from '@/services/opendata/types';
import { PARIS_BBOX } from '@/hooks/useOpenData';
import { matchesPremise } from './matchPremise';

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
  arrondissements: [],
};

interface FiltersContextValue {
  filters: FilterState;
  vacantOnly: boolean;
  setVacantOnly: (value: boolean) => void;
  updateQuery: (query: string) => void;
  updateSizeRange: (range: number[]) => void;
  updateWalkabilityScore: (range: number[]) => void;
  updateAmenityScores: (scores: Partial<AmenityScore>) => void;
  toggleArrondissement: (arrondissement: number) => void;
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
    // The rules live in matchPremise.ts, where they can be tested without a DOM.
    const matches = (premise: Premise) => matchesPremise(premise, filters, vacantOnly);

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
      toggleArrondissement: (arrondissement) =>
        setFilters((prev) => ({
          ...prev,
          arrondissements: prev.arrondissements.includes(arrondissement)
            ? prev.arrondissements.filter((a) => a !== arrondissement)
            : [...prev.arrondissements, arrondissement],
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
