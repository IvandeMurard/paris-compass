
export interface AmenityScore {
  schools: number;
  healthcare: number;
  groceries: number;
  transit: number;
  parks: number;
}

export interface FilterState {
  query: string;
  priceRange: number[];
  sizeRange: number[];
  walkabilityScore: number[];
  amenityScores: AmenityScore;
  selectedAmenities: string[];
}
