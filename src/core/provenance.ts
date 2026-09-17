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

/**
 * `ODbL-1.0` rather than the loose "ODbL" this used to carry, and the spelling matters:
 * it is the identifier `bdcom_vintage.licence` already uses for the 2023 BDCom vintage.
 * The footfall proxy combines the two layers, and two spellings of one licence would be
 * joined into "ODbL-1.0 + ODbL" — a figure announcing two obligations where there is one.
 * Only the front's prose pages keep the short form; nothing renders this field as a label.
 */
export const OSM_ORIGIN = (asOf: string): Origin => ({
  source: 'OpenStreetMap via Overpass',
  licence: 'ODbL-1.0',
  asOf,
});

/**
 * APUR's BDCom door-to-door survey, one vintage.
 *
 * Licence and vintage date are parameters rather than constants on purpose: they differ
 * per vintage and only the database knows them (`compass_vintages`). Hard-coding "ODbL,
 * 2023" here would be an unmeasured claim about data this module never reads — the same
 * failure `Measured<T>` exists to prevent, one level up.
 */
export const BDCOM_ORIGIN = (vintageYear: number, licence: string, asOf: string): Origin => ({
  source: `APUR BDCom ${vintageYear}`,
  licence,
  asOf,
});

/**
 * Provenance of a figure computed from more than one source.
 *
 * The footfall proxy is the case that forces this: it mixes premise density with transport
 * access, which on the agent path are APUR and OpenStreetMap respectively. Attributing it
 * to either one alone would be false, and picking "the main one" is the habit this whole
 * ticket exists to remove.
 *
 * Three rules, published on the Methodology page:
 * - **Sources** are named in the order they were combined, joined by " + ".
 * - **Licences** are joined the same way, duplicates removed. A consumer of the composite
 *   is bound by every licence that went into it, so none may be dropped.
 * - **`asOf` is the oldest of the inputs**, not the newest. A composite is exactly as
 *   fresh as its stalest ingredient; taking the newest would overstate it.
 *
 * Identical origins collapse back to a single one, so the common case — every layer from
 * the same snapshot — reads no differently than before.
 */
export function combineOrigins(...origins: readonly Origin[]): Origin {
  if (origins.length === 0) throw new Error('combineOrigins needs at least one origin');
  const unique: Origin[] = [];
  for (const o of origins) {
    if (!unique.some((u) => u.source === o.source && u.licence === o.licence && u.asOf === o.asOf)) {
      unique.push(o);
    }
  }
  if (unique.length === 1) return unique[0];
  return {
    source: unique.map((o) => o.source).join(' + '),
    licence: [...new Set(unique.map((o) => o.licence))].join(' + '),
    // String comparison is the right one here: `asOf` is ISO-ish and left-aligned
    // ("2023", "2023-06", "2026-08-07"), so lexical order is chronological order, and a
    // coarser vintage sorts before any day inside it — which is the cautious direction.
    asOf: unique.reduce((oldest, o) => (o.asOf < oldest ? o.asOf : oldest), unique[0].asOf),
  };
}
