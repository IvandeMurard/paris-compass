
import { useState } from 'react';
import { FilterState } from '@/types/filters';

export const useFilters = () => {
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    priceRange: [500, 5000],
    sizeRange: [20, 200],
    walkabilityScore: [0, 100],
    selectedAmenities: []
  });

  const updateQuery = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
  };

  const updatePriceRange = (priceRange: number[]) => {
    setFilters(prev => ({ ...prev, priceRange }));
  };

  const updateSizeRange = (sizeRange: number[]) => {
    setFilters(prev => ({ ...prev, sizeRange }));
  };

  const updateWalkabilityScore = (walkabilityScore: number[]) => {
    setFilters(prev => ({ ...prev, walkabilityScore }));
  };

  const toggleAmenity = (amenity: string) => {
    setFilters(prev => ({
      ...prev,
      selectedAmenities: prev.selectedAmenities.includes(amenity)
        ? prev.selectedAmenities.filter(a => a !== amenity)
        : [...prev.selectedAmenities, amenity]
    }));
  };

  return {
    filters,
    updateQuery,
    updatePriceRange,
    updateSizeRange,
    updateWalkabilityScore,
    toggleAmenity
  };
};
