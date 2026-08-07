
export interface AmenityScore {
  schools: number;
  healthcare: number;
  groceries: number;
  transit: number;
  parks: number;
}

export interface FilterState {
  query: string;
  // No rent filter: commercial rents are not available as open data, so any figure
  // Compass could filter on would be invented. See DIAGNOSTIC.md §1.
  sizeRange: number[];
  walkabilityScore: number[];
  amenityScores: AmenityScore;
  selectedAmenities: string[];
}
