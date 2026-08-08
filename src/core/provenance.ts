/**
 * Provenance-carrying values.
 *
 * Compass has one founding constraint: if a number cannot be re-derived from a cited
 * public source, it is not shown. A bare `number` cannot express that. `Measured<T>`
 * makes the constraint mechanical rather than declarative — a value that cannot state
 * where it comes from, when, and how it was obtained does not type-check, so it cannot
 * reach the interface.
 *
 * It is also what an agent needs: the MCP layer serialises these fields directly into a
 * chain of thought, so a caller can explain a figure without reconstructing it.
 */

export type Method =
  /** Counted or recorded by an instrument or a survey. The strongest claim. */
  | 'measured'
  /** Output of a published model (air quality, strategic noise maps). */
  | 'modelled'
  /** Computed from other values by a formula published in the methodology. */
  | 'derived'
  /** A proxy standing in for data that does not exist openly. Always say so. */
  | 'estimated';

export interface Measured<T> {
  value: T | null;
  /** Human-readable origin, e.g. "APUR BDCom 2023" or "OpenStreetMap via Overpass". */
  source: string;
  /** Licence of the underlying dataset, e.g. "ODbL". */
  licence: string;
  /** When the underlying data was produced, ISO-ish: "2023-06", "2026-08-07". */
  asOf: string;
  method: Method;
  /** Why the figure should be read with caution — truncation, proxy, small sample. */
  note?: string;
  /** Why there is no value. Required reading whenever `value` is null. */
  missingReason?: string;
}

export interface Origin {
  source: string;
  licence: string;
  asOf: string;
}

export function withValue<T>(
  value: T,
  origin: Origin,
  method: Method,
  note?: string,
): Measured<T> {
  return { value, ...origin, method, ...(note ? { note } : {}) };
}

/** A figure Compass cannot produce. Never fall back to zero: absent is not the same as none. */
export function unavailable<T>(origin: Origin, missingReason: string): Measured<T> {
  return { value: null, ...origin, method: 'derived', missingReason };
}

/** True when the figure can be shown as-is, without a caveat. */
export function isReliable(m: Measured<unknown>): boolean {
  return m.value !== null && m.method !== 'estimated' && !m.note;
}

export const OSM_ORIGIN = (asOf: string): Origin => ({
  source: 'OpenStreetMap via Overpass',
  licence: 'ODbL',
  asOf,
});
