
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
  /**
   * Empty means no constraint. Arrondissement is derived from the OpenStreetMap postcode,
   * so it is often unknown — and an unknown one never excludes a premise.
   *
   * This replaced a `selectedAmenities: string[]` that offered seven checkboxes — parking,
   * shopping centre, restaurant area — for categories Compass has no data on. They were
   * stored and never read; filtering on them would have meant filtering on nothing.
   */
  arrondissements: number[];
}
