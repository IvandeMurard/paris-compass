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
  /** Reference rent (€/m²/month) of the surrounding Paris quartier, when available. */
  rentReferenceEurM2: number | null;
  rentQuartier?: string;
  estimatedMonthlyRent: number | null;
  scores: AreaScores;
  noise: NoiseEstimate;
}
