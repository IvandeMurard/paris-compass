/**
 * How a survival figure reads on screen — and what it is mechanically prevented from saying.
 *
 * w1-survie draws one line and calls it doctrine: « 72 % des cafés tiennent six ans » is an
 * observation, « votre café a 72 % de chances » is a forecast, and the second is forbidden.
 * The ticket states the rule and stops there. A rule that only exists in a ticket is a rule
 * nothing enforces, so this file turns it into three mechanisms:
 *
 *  1. **The subject is the past cohort, never the premise being looked at.** Every sentence
 *     starts from « Sur les N locaux recensés … en 2017 » — a count of things that already
 *     happened, in a place. The shop on screen is never the grammatical subject, and is never
 *     counted in the sentence about it.
 *  2. **Three numbers, never a lone percentage.** A rate on its own reads as a probability;
 *     "268 of 310, between 2017 and 2023" does not. `describeSurvival` refuses to render a
 *     rate whose cohort or period it does not also have — it returns the absent form instead.
 *  3. **`assertObservational` runs on the way out**, not only in the test. Any second person,
 *     any future tense, any word of probability throws before it can reach a screen. That
 *     includes text arriving from the database: `evidence` is written in SQL, and SQL is
 *     exactly where a well-meant "votre" would eventually be typed.
 *
 * Same reasoning as `timelineText.ts` and `figureText.ts`: the decision lives in a pure
 * function the node runner can test, and the component only puts the result on screen. The two
 * founding errors of PLAN.md §2.5 were both made in prose written by hand, not in the data.
 */

import type { Locale } from '@/i18n/locale';

export const SURVIVAL_COPY = {
  fr: {
    na: 'n/d',
    premise: 'le local',
    operator: "l'exploitant",
    withheldMarker: 'millésime retenu',
    insufficientMarker: 'effectif insuffisant',
    method: 'méthode',
  },
  en: {
    na: 'n/a',
    premise: 'the premises',
    operator: 'the operator',
    withheldMarker: 'vintage withheld',
    insufficientMarker: 'cohort too small',
    method: 'method',
  },
} as const;

/**
 * Forms that turn an observation into a forecast, and are refused on the way out.
 *
 * Explicit rather than a clever regex over verb endings: `-ra` would catch « opéra » and
 * « caméra », and a guard that fires on innocent words is a guard someone disables. Every
 * entry here is a word that only appears when a sentence has started addressing the reader or
 * predicting for them.
 */
const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  {
    pattern: /\b(votre|vos|vous|your|yours|you)\b/i,
    why: "deuxième personne : la phrase s'adresse au lecteur au lieu de décrire une cohorte",
  },
  {
    pattern: /\b(chance|chances|risque|risques|probabilit\w*|pr[ée]vision\w*|probability|odds|forecast\w*|likelihood)\b/i,
    why: 'vocabulaire de probabilité : un taux observé est rendu comme une chance individuelle',
  },
  {
    pattern:
      /\b(tiendra|tiendront|durera|dureront|survivra|survivront|fermera|fermeront|restera|resteront|sera|seront|aura|auront|will|would|expect\w*)\b/i,
    why: 'futur : une observation sur le passé est rendue comme une prédiction',
  },
];

/**
 * Throws if a sentence has drifted from observation into forecast.
 *
 * Exported because the same check has to apply to `evidence`, which the database writes, and
 * to any sentence a future component assembles. Throwing rather than sanitising is deliberate:
 * silently stripping « votre » would leave a sentence that means something its author did not
 * intend, and the point is to stop the sentence from being written that way at all.
 */
export function assertObservational(sentence: string, where = 'phrase de survie'): string {
  for (const { pattern, why } of FORBIDDEN) {
    const hit = pattern.exec(sentence);
    if (hit) {
      throw new Error(
        `${where} — interdit doctrinal w1-survie : ${why}. Terme trouvé : « ${hit[0]} ». ` +
          `Phrase : « ${sentence} »`,
      );
    }
  }
  return sentence;
}

/** One row of `compass_survival_by_trade`, as the browser receives it. */
export interface SurvivalRow {
  quartierName: string | null;
  /** 'APUR BDCom' | 'INSEE SIRENE' — carried verbatim, never rewritten. */
  source: string;
  /** 'local' | 'exploitant' — which of the two survivals this is. */
  subject: string;
  activityLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  years: number | null;
  cohortN: number | null;
  survivedN: number | null;
  survivalRate: number | null;
  withheld: boolean;
  insufficientN: boolean;
  outOfCorpus: boolean;
  licence: string | null;
  evidence: string | null;
}

export interface SurvivalDescription {
  /** The headline, e.g. "268 sur 310". Never a bare percentage. */
  text: string;
  /** The rate, as a suffix, only when the three numbers are all present. */
  rate?: string;
  /** True when there is no figure — the caller greys the row out. */
  absent: boolean;
  /** Why it is absent, or what qualifies it. Always present when absent. */
  caveat?: string;
  /** Short marker word, when one applies. */
  marker?: string;
  /** The full sentence, already checked. Safe to render. */
  sentence: string;
}

/**
 * The three reasons a figure can be missing, kept apart.
 *
 * A withheld vintage, a cohort too small and a point outside Paris are three different
 * statements about the world, and rendering them identically is the defect this codebase has
 * now corrected five times (DIAGNOSTIC.md §9 to §16). They get three different sentences.
 */
function describeAbsence(row: SurvivalRow, locale: Locale): SurvivalDescription | null {
  const c = SURVIVAL_COPY[locale];

  if (row.outOfCorpus) {
    return {
      text: c.na,
      absent: true,
      caveat: row.evidence ?? undefined,
      sentence:
        locale === 'fr'
          ? "Ce point est hors des 80 quartiers parisiens : aucune cohorte n'existe ici."
          : 'This point lies outside the 80 Paris quartiers: no cohort exists here.',
    };
  }

  if (row.withheld) {
    return {
      text: c.na,
      absent: true,
      marker: c.withheldMarker,
      caveat: row.evidence ?? undefined,
      sentence:
        locale === 'fr'
          ? "Le relevé existe et n'est pas redistribuable : la licence de ce millésime n'a pas été lue."
          : 'The survey exists and cannot be redistributed: this vintage’s licence has not been read.',
    };
  }

  if (row.insufficientN || row.survivalRate === null) {
    return {
      text: c.na,
      absent: true,
      marker: c.insufficientMarker,
      caveat: row.evidence ?? undefined,
      sentence:
        locale === 'fr'
          ? `Cohorte de ${row.cohortN ?? 0} : trop petite pour qu'un taux décrive autre chose que le hasard.`
          : `Cohort of ${row.cohortN ?? 0}: too small for a rate to describe anything but noise.`,
    };
  }

  return null;
}

/**
 * A survival row, as a sentence about a past cohort.
 *
 * Returns the absent form rather than a rate whenever any of the three numbers is missing —
 * see mechanism 2 in this file's header. A caller cannot obtain a lone percentage from this
 * function, which is the point: there is no code path that produces one.
 */
export function describeSurvival(row: SurvivalRow, locale: Locale): SurvivalDescription {
  const absent = describeAbsence(row, locale);
  if (absent) {
    if (absent.caveat) assertObservational(absent.caveat, `evidence (${row.source})`);
    assertObservational(absent.sentence, `phrase absente (${row.source})`);
    return absent;
  }

  // Reached only when the row carries a rate, so the three numbers are present by
  // construction — but checked rather than assumed, because the row crosses a network.
  const { cohortN, survivedN, survivalRate, periodStart, periodEnd } = row;
  if (cohortN === null || survivedN === null || survivalRate === null || !periodStart || !periodEnd) {
    return {
      text: SURVIVAL_COPY[locale].na,
      absent: true,
      caveat:
        locale === 'fr'
          ? "Taux reçu sans son effectif ou sa période : il n'est pas affichable seul."
          : 'Rate received without its cohort or period: it is not displayable on its own.',
      sentence:
        locale === 'fr'
          ? "Un taux sans son effectif ni sa période n'est pas un chiffre publiable."
          : 'A rate without its cohort and period is not a publishable figure.',
    };
  }

  const yearFrom = periodStart.slice(0, 4);
  const yearTo = periodEnd.slice(0, 4);
  const trade = row.activityLabel ?? (locale === 'fr' ? 'ce métier' : 'this trade');
  const place = row.quartierName ?? (locale === 'fr' ? 'ce quartier' : 'this quartier');

  // The cohort is the subject of every sentence below. The premise on screen appears in
  // none of them, and that is mechanism 1 rather than a stylistic preference.
  const sentence =
    row.subject === 'exploitant'
      ? locale === 'fr'
        ? `Sur les ${cohortN} entreprises « ${trade} » immatriculées ${place} entre ${yearFrom} et ${yearTo}, ${survivedN} exerçaient encore ${row.years} ans après leur immatriculation.`
        : `Of the ${cohortN} “${trade}” businesses registered in ${place} between ${yearFrom} and ${yearTo}, ${survivedN} were still trading ${row.years} years after registration.`
      : locale === 'fr'
        ? `Sur les ${cohortN} locaux recensés « ${trade} » ${place} en ${yearFrom}, ${survivedN} en étaient encore un en ${yearTo}.`
        : `Of the ${cohortN} premises surveyed as “${trade}” in ${place} in ${yearFrom}, ${survivedN} still were in ${yearTo}.`;

  assertObservational(sentence, `phrase de survie (${row.source})`);
  if (row.evidence) assertObservational(row.evidence, `evidence (${row.source})`);

  return {
    text: `${survivedN} / ${cohortN}`,
    rate: `${survivalRate.toFixed(1).replace('.', locale === 'fr' ? ',' : '.')} %`,
    absent: false,
    caveat: row.evidence ?? undefined,
    sentence,
  };
}
