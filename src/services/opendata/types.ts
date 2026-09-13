import type { AreaScores, Withholding } from '@/core';
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

/**
 * What a per-source lookup came back with — and the difference `null` could not carry.
 *
 * `#145`, 13 September 2026. `fetchAirQuality` and `fetchRisks` both returned `T | null`, and
 * `null` meant two unrelated things: the source answered and has nothing for this point, or the
 * source did not answer at all. The screen rendered `n/d` for both, so a visitor read an outage
 * as a measured absence — the exact failure `Measured<T>` exists to prevent, one layer below it.
 *
 * The vocabulary is not new: `Withholding` already names the four causes, and the address-context
 * path in `useAddressContext` already sets `source_injoignable` when every Overpass mirror
 * refuses. This type only brings the same distinction to the lookups that had lost it.
 */
export type Reading<T> =
  /** The source answered and had a value. */
  | { state: 'read'; value: T }
  /** The source answered, and there is genuinely nothing here. A measured zero. */
  | { state: 'empty' }
  /** The source did not answer, or answered something unusable. Nothing was measured. */
  | { state: 'withheld'; because: Withholding };
