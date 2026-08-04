import React, { createContext, useContext, useMemo, useState } from 'react';
import type { AmenityScore, FilterState } from '@/types/filters';
import type { Premise } from '@/services/opendata/types';

const initialAmenityScores: AmenityScore = {
  schools: 0,
  healthcare: 0,
  groceries: 0,
  transit: 0,
  parks: 0,
};

const initialFilters: FilterState = {
  query: '',
  priceRange: [0, 10000],
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
  updatePriceRange: (range: number[]) => void;
  updateSizeRange: (range: number[]) => void;
  updateWalkabilityScore: (range: number[]) => void;
  updateAmenityScores: (scores: Partial<AmenityScore>) => void;
  toggleAmenity: (amenity: string) => void;
  reset: () => void;
  matches: (premise: Premise) => boolean;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export const FiltersProvider = ({ children }: { children: React.ReactNode }) => {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [vacantOnly, setVacantOnly] = useState(false);

  const value = useMemo<FiltersContextValue>(() => {
    const matches = (premise: Premise) => {
      if (vacantOnly && premise.status !== 'vacant') return false;

      const [minPrice, maxPrice] = filters.priceRange;
      if (premise.estimatedMonthlyRent !== null) {
        if (premise.estimatedMonthlyRent < minPrice || premise.estimatedMonthlyRent > maxPrice) {
          return false;
        }
      }

      const [minSize, maxSize] = filters.sizeRange;
      if (premise.sizeM2 !== null && (premise.sizeM2 < minSize || premise.sizeM2 > maxSize)) {
        return false;
      }

      const [minWalk, maxWalk] = filters.walkabilityScore;
      if (premise.scores.walkability < minWalk || premise.scores.walkability > maxWalk) {
        return false;
      }

      for (const [key, min] of Object.entries(filters.amenityScores)) {
        if (min > 0 && premise.scores[key as keyof AmenityScore] < min) return false;
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
      updatePriceRange: (priceRange) => setFilters((prev) => ({ ...prev, priceRange })),
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
    };
  }, [filters, vacantOnly]);

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
};

export const useFiltersContext = () => {
  const context = useContext(FiltersContext);
  if (!context) throw new Error('useFiltersContext must be used within a FiltersProvider');
  return context;
};
