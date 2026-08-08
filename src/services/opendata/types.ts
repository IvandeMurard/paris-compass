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

export interface NoiseEstimate {
  score: number;
  label: string;
}

export interface RiskInfo {
  labels: string[];
  commune?: string;
}

export interface AreaScores {
  walkability: number;
  schools: number;
  healthcare: number;
  groceries: number;
  transit: number;
  parks: number;
  footfall: number;
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
