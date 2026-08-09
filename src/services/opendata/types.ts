export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export type PoiCategory =
  | 'schools'
  | 'healthcare'
  | 'groceries'
  | 'parks'
  | 'transit'
  | 'commerce';

export interface Poi {
  id: string;
  category: PoiCategory;
  name?: string;
  lat: number;
  lng: number;
}

export interface AirQuality {
  aqi: number;
  pm25: number | null;
  no2: number | null;
  label: string;
}

/**
 * Null means the estimate could not be produced, not that the place is silent.
 * `src/core/provenance.ts` forbids substituting zero for an absent figure, so the
 * absence travels all the way to the interface, which renders it as "n/d".
 */
export interface NoiseEstimate {
  score: number | null;
  label: string | null;
}

export interface RiskInfo {
  labels: string[];
  commune?: string;
}

/** Same rule as NoiseEstimate: an absent score is null, never zero. */
export interface AreaScores {
  walkability: number | null;
  schools: number | null;
  healthcare: number | null;
  groceries: number | null;
  transit: number | null;
  parks: number | null;
  footfall: number | null;
}

export interface Premise {
  id: string;
  title: string;
  category: string;
  status: 'vacant' | 'occupied';
  address: string;
  postcode?: string;
  arrondissement?: number;
  lat: number;
  lng: number;
  sizeM2: number | null;
  /**
   * Residential rent reference (€/m²/month) of the surrounding Paris quartier — a
   * catchment-area standard-of-living signal, NOT a commercial rent. Housing only.
   * See services/opendata/neighbourhood.ts.
   */
  residentialRentEurM2: number | null;
  quartier?: string;
  /** Vintage of the rent decree the figure above comes from. Always displayed with it. */
  residentialRentYear?: string;
  scores: AreaScores;
  noise: NoiseEstimate;
}
