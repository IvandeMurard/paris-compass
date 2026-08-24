/**
 * How one row of `compass_address_timeline` reads on screen, decided without any DOM.
 *
 * This module exists because of the two errors that created the function it renders. Both
 * were made **in the prose and not in the database** (`PLAN.md` §2.5): a census year with
 * no survey rendered as "no longer a shop", and a price belonging to another premise read
 * as this one's. The columns were right each time; the sentence was not. So the sentence
 * is derived here, from the columns, and tested — rather than typed into a component where
 * nothing can exercise it (`vitest.config.ts` only collects `src/**\/*.test.ts`).
 *
 * Two rules govern every branch below, and both are the ticket:
 *
 * 1. **`observed = false` reads "not surveyed".** Never "vacant", never "no longer a shop".
 *    Those are conclusions; the column is an absence of observation. And they are
 *    unreachable conclusions besides: an anonymous caller receives 2017 and 2020 withheld,
 *    so it cannot know the premise was ever a shop, let alone that it stopped being one.
 * 2. **No coalesce on the label.** A null `label` stays null and is phrased as such. Falling
 *    back to `detail`, to `activity_code`, to the OpenStreetMap name, or to a neighbouring
 *    year would put a value under a date that does not carry it — error number two, exactly.
 *
 * `evidence` is relayed verbatim and attributed to the source rather than paraphrased. It
 * is the pièce, not our sentence; rewriting it is the move that produced both errors.
 */

import type { Locale } from '@/i18n/locale';

export type Confidence = 'etabli' | 'corrobore' | 'probable' | 'indetermine';

/** One row of `compass_address_timeline`, as PostgREST returns it. */
export interface TimelineRow {
  occurred_on: string;
  granularity: string;
  source: string;
  source_ref: string | null;
  source_url: string | null;
  source_licence: string | null;
  kind: string;
  observed: boolean | null;
  withheld: boolean;
  activity_code: string | null;
  label: string | null;
  detail: string | null;
  amount_eur: number | null;
  evidence: string | null;
  confidence: Confidence;
  confidence_rule: string | null;
  confidence_reason: string | null;
}

/**
 * What the row states. Four values, and the interface must keep them four: the whole
 * defect history of `compass_*` is two of them being flattened into one.
 */
export type Reading =
  /** The vintage's licence has not been read. Neither content nor existence is disclosed. */
  | 'withheld'
  /** Surveyed that year, and the finding is in `label`. */
  | 'surveyed'
  /** Not surveyed that year. Not "vacant" and not "no longer a shop". */
  | 'not-surveyed'
  /** A dated legal notice — BODACC. Always an event that happened. */
  | 'event';

export interface TimelineLine {
  reading: Reading;
  /** The date at the granularity the source itself records — a year stays a year. */
  when: string;
  /** The heading of the row. Never borrowed from another column or another year. */
  headline: string;
  /** True when the headline states a gap in knowledge rather than a fact about the premise. */
  absent: boolean;
  /** Trading name or trader, as the source carries it. Never promoted into `headline`. */
  detail?: string;
  /** Published price, with its currency. */
  amount?: string;
  /** The source's own justification, verbatim. Displayed as a quotation, never rewritten. */
  evidence?: string;
  confidenceLabel: string;
  confidenceMeaning: string;
  /** The rule that produced the level, as the database states it. */
  reason?: string;
}

export const TIMELINE_COPY = {
  fr: {
    withheld: 'Millésime retenu',
    notSurveyed: 'Non observé',
    unlabelled: 'Relevé sans activité renseignée',
    evidenceLabel: 'Justification de la source',
    confidence: {
      etabli: 'Établi',
      corrobore: 'Corroboré',
      probable: 'Probable',
      indetermine: 'Indéterminé',
    },
    confidenceMeaning: {
      etabli: 'La source nomme directement ce local, et la pièce est jointe.',
      corrobore:
        'Deux sources publiques indépendantes placent l’entreprise ici ; aucune ne nomme le local.',
      probable: 'Le fait est documenté, mais son rattachement à ce local est déduit.',
      indetermine: 'La source est muette, et le dit.',
    },
    months: [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ],
  },
  en: {
    withheld: 'Withheld vintage',
    notSurveyed: 'Not surveyed',
    unlabelled: 'Surveyed, no activity recorded',
    evidenceLabel: 'Source’s own justification',
    confidence: {
      etabli: 'Established',
      corrobore: 'Corroborated',
      probable: 'Probable',
      indetermine: 'Undetermined',
    },
    confidenceMeaning: {
      etabli: 'The source names this premise directly, and the record is attached.',
      corrobore:
        'Two independent public sources place the business here; neither names the premise.',
      probable: 'The fact is documented, but tying it to this premise is inferred.',
      indetermine: 'The source is silent, and says so.',
    },
    months: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
  },
} as const;

/**
 * A date at the granularity the source claims, not at the granularity Postgres stores.
 *
 * BDCom records a year; the column holds `2017-01-01`. Rendering that as "1 January 2017"
 * would invent a day of survey — a small lie of the same family as the ones above. Written
 * by hand rather than through `Intl` so the node runner exercises the real strings.
 */
export function formatOccurredOn(
  occurredOn: string,
  granularity: string,
  locale: Locale,
): string {
  const [year, month, day] = occurredOn.split('-');
  if (granularity === 'year' || !month || !day) return year;
  const name = TIMELINE_COPY[locale].months[Number(month) - 1];
  if (!name) return occurredOn;
  return locale === 'fr'
    ? `${Number(day) === 1 ? '1er' : Number(day)} ${name} ${year}`
    : `${Number(day)} ${name} ${year}`;
}

/**
 * A published price, with its currency and nothing implied about what it covers.
 *
 * The French separator is U+202F, a narrow no-break space: an ordinary space would let
 * "160 868 €" wrap into "160" on one line and "868 €" on the next, which reads as a
 * different number. Grouped by hand rather than through `Intl` for the same reason as the
 * dates — the node runner then tests the strings that actually ship.
 */
export function formatAmount(amountEur: number | null, locale: Locale): string | undefined {
  if (amountEur === null) return undefined;
  const digits = Math.round(amountEur).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'fr' ? '\u202f' : ',');
  return locale === 'fr' ? `${grouped}\u202f€` : `€${grouped}`;
}

/**
 * The licence, prefixed by the word "licence" only when it does not already carry it.
 *
 * `source_licence` holds identifiers, not sentences: `ODbL-1.0`, `custom` — and
 * `Licence Ouverte`, which is the actual name of the French open licence. Prefixing that
 * one produced "Licence Licence Ouverte". The value itself is never rewritten: a licence
 * name is the one string on the row that governs what a reader may redistribute.
 */
export function licenceLabel(licence: string): string {
  // Same word in both languages, so no `Locale` here: adding a parameter that never
  // branches would suggest a translation exists to be got wrong.
  return licence.toLowerCase().startsWith('licence') ? licence : `Licence ${licence}`;
}

/** Which of the four statements the row makes. `withheld` wins: it is about the dataset. */
export function readingOf(row: TimelineRow): Reading {
  if (row.kind !== 'survey') return 'event';
  if (row.withheld || row.observed === null) return 'withheld';
  return row.observed ? 'surveyed' : 'not-surveyed';
}

export function describeTimelineRow(row: TimelineRow, locale: Locale): TimelineLine {
  const c = TIMELINE_COPY[locale];
  const reading = readingOf(row);

  // Deliberately not `row.label ?? something`. Three of the four readings have no label to
  // show, and each says so in its own words rather than borrowing another column's.
  let headline: string;
  let absent: boolean;
  switch (reading) {
    case 'withheld':
      headline = c.withheld;
      absent = true;
      break;
    case 'not-surveyed':
      headline = c.notSurveyed;
      absent = true;
      break;
    default:
      headline = row.label ?? c.unlabelled;
      absent = row.label === null;
  }

  return {
    reading,
    when: formatOccurredOn(row.occurred_on, row.granularity, locale),
    headline,
    absent,
    // A withheld vintage discloses nothing at all, so even a stray value would not be
    // shown. The database already nulls these; the interface does not rely on that.
    detail: reading === 'withheld' ? undefined : row.detail ?? undefined,
    amount: reading === 'withheld' ? undefined : formatAmount(row.amount_eur, locale),
    evidence: row.evidence ?? undefined,
    confidenceLabel: c.confidence[row.confidence] ?? row.confidence,
    confidenceMeaning: c.confidenceMeaning[row.confidence] ?? '',
    reason: row.confidence_reason ?? undefined,
  };
}
