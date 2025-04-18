
export interface AmenityScore {
  walkability: number;
  schools: number;
  groceries: number;
  transit: number;
  parks: number;
}

export interface FilterState {
  query: string;
  priceRange: number[];
  sizeRange: number[];
  selectedAmenities: string[];
  walkabilityScore: number[];
}
