import type { AreaScores } from '@/core';
import type { PremiseNaming } from '@/i18n/premiseName';

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

export interface RiskInfo {
  labels: string[];
  commune?: string;
}

/**
 * Scores reach the interface with their provenance attached.
 *
 * This used to be a record of plain numbers, unwrapped in the adapter. The unwrapping
 * dropped source, licence, vintage and caveats — so the interface could show a figure
 * it was unable to attribute, which is the one thing Compass refuses. The core type is
 * re-exported as-is: `value` stays nullable (absent is not zero), and `method` plus
 * `note` are what the card turns into a visible caveat.
 */
export type { AreaScores };

export interface Premise {
  id: string;
  /** OpenStreetMap values, rendered into a language by `src/i18n/premiseName.ts`. */
  naming: PremiseNaming;
  category: string;
  status: 'vacant' | 'occupied';
  /** Null when OpenStreetMap carries no address. The interface phrases the absence. */
  address: string | null;
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
  /** Noise lives inside this record too — it is a score, and it carries the heaviest caveat. */
  scores: AreaScores;
}
