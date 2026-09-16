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

import { motifsText, motifText, type FigureMotif } from './motif';
import type { VerdictLocale } from './verdict';

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
  /**
   * Why the figure should be read with caution — truncation, proxy, small sample.
   *
   * **English, and derived — w6-langue-absences (#181).** It is `caveats` written out for the
   * agent path, which is English by the convention of this directory. A screen never renders
   * it: it renders `caveats` in the reader's language. Kept beside the motifs rather than
   * dropped because the MCP response has served this sentence since the first release, and an
   * agent that was reading prose must not find the field gone.
   */
  note?: string;
  /** Why there is no value, in English and derived from `missing`. Same rule as `note`. */
  missingReason?: string;
  /**
   * Why there is no value, in a form that has no language — `src/core/motif.ts`.
   *
   * This is the field a screen reads and the field an agent branches on. `missingReason` is
   * this motif rendered into English; the French page renders the same motif into French, and
   * neither is obtained by reading the other (`#61`).
   */
  missing?: FigureMotif;
  /** The caveats behind `note`, in the order they were joined. Structured, so translatable. */
  caveats?: readonly FigureMotif[];
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
  /** Structured caveats, never a sentence — w6-langue-absences (#181). */
  caveats: readonly FigureMotif[] = [],
): Measured<T> {
  const note = motifsText(caveats, 'en');
  return {
    value,
    ...origin,
    method,
    ...(note ? { note, caveats } : {}),
  };
}

/**
 * A figure Compass cannot produce. Never fall back to zero: absent is not the same as none.
 *
 * **The second parameter is a motif and not a sentence, and the type is the enforcement** —
 * w6-langue-absences (#181). An absence that can only say why in one language is an absence
 * half the readers cannot read, and a `string` here is what let that happen for five weeks
 * (`DIAGNOSTIC.md` §49). The English sentence is still produced, from the motif, for the agent
 * path; it can no longer be produced without one.
 */
export function unavailable<T>(origin: Origin, missing: FigureMotif): Measured<T> {
  return {
    value: null,
    ...origin,
    method: 'derived',
    missing,
    missingReason: motifText(missing, 'en'),
  };
}

/** True when the figure can be shown as-is, without a caveat. */
export function isReliable(m: Measured<unknown>): boolean {
  return m.value !== null && m.method !== 'estimated' && !m.note;
}

/**
 * Why a figure is absent, in the reader's language — or `undefined` when it has a value.
 *
 * Every screen and every document goes through these two functions rather than reading `note`
 * and `missingReason`: those two are the English rendering, and a page that reads them is the
 * defect this ticket closed. Reading the motif is also what makes the English page and the
 * French page the same code path, run twice.
 */
export const missingText = (
  m: Measured<unknown>,
  locale: VerdictLocale = 'fr',
): string | undefined => (m.missing ? motifText(m.missing, locale) : m.missingReason);

/** The caveats of a figure, in the reader's language. Same rule as `missingText`. */
export const noteText = (m: Measured<unknown>, locale: VerdictLocale = 'fr'): string | undefined =>
  m.caveats ? motifsText(m.caveats, locale) : m.note;

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
 * Île-de-France Mobilités' rail-stop reference — w6-amenites-corpus.
 *
 * `asOf` is a parameter for the same reason it is on `BDCOM_ORIGIN`: only the database knows
 * it (`ingestion_run.source_as_of` for source `idfm`), and writing a date here would be an
 * unmeasured claim about data this module never reads.
 *
 * **The licence is the STOP reference's, not the validation profile's, and the two differ.**
 * `idfm_station` — the 258 Paris zones d'arrêt this axis measures a distance to — is Licence
 * Ouverte 2.0 (Etalab). `idfm_validation_profile`, loaded beside it, is ODbL and is NOT read
 * by any figure here: it holds the SHAPE of a station's day as percentages and carries no
 * volume at all, so nothing on this page can be counted from it. Naming ODbL on a figure
 * derived from the Etalab layer would bind a redistributor to an obligation the data does not
 * carry — the mirror image of the mislabelling `LayerOrigins` was created to stop.
 */
export const IDFM_ORIGIN = (asOf: string): Origin => ({
  source: 'IDFM — référentiel des arrêts',
  licence: 'Licence Ouverte 2.0 (Etalab)',
  asOf,
});

/**
 * The Ville de Paris terrace and display-stall register — w6-modes (#36).
 *
 * `asOf` is a parameter for the same reason it is on the three above: only the database knows
 * it (`ingestion_run.source_as_of` for source `terrasses`), and a date written here would be a
 * claim about data this module never reads. The licence is the one
 * `src/services/opendata/sources.ts` has published since 26 August and the one
 * `src/i18n/terrasseText.ts` prints beside the premise's own answer — a second spelling of it
 * would put two obligations on screen where there is one.
 */
export const TERRASSES_ORIGIN = (asOf: string): Origin => ({
  source: 'Ville de Paris — terrasses et étalages autorisés',
  licence: 'ODbL',
  asOf,
});

/**
 * The PLU protection of commerce and craft, `plub_protcom` — w6-modes (#36).
 *
 * **Informational, with no regulatory value**, and that reserve belongs with the figure rather
 * than beside it: the authority is the Portail des Règles d'Urbanisme, never this table
 * (`docs/PLAN.md` §2.4, `20260825000004_plu_protection.sql`). The reserve is carried on screen
 * by the checklist wording, which is tested; what this constructor owes is the licence and the
 * date, and `asOf` is the Conseil de Paris vote the dataset itself states — read from
 * `ingestion_run.source_as_of`, never typed.
 */
export const PLU_ORIGIN = (asOf: string): Origin => ({
  source: 'Ville de Paris — PLU bioclimatique, protection du commerce et de l’artisanat',
  licence: 'ODbL',
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
