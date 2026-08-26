/**
 * How an authorised terrace reads on screen — w1-terrasses (issue #15).
 *
 * The ticket's question is binary for a café owner: *is a terrace already authorised on this
 * frontage?* The database answers in three states, not two, and the whole point of this file
 * is that the third one survives the trip to the screen. `terrasse_status = 'inconnu'` means
 * an authorisation exists at this street number and several surveyed premises share it — the
 * source does not publish which one holds it. Rendering that as "non" invents an absence;
 * rendering it as "oui" attributes someone else's authorisation. It gets its own sentence.
 *
 * Three doctrinal rules, and each is a mechanism here rather than a paragraph elsewhere:
 *
 * 1. **An authorisation is not a terrace installed today.** No branch that answers "oui" can
 *    be built without `reserve`, which is a required field of the returned object and says so
 *    in words. The source publishes no grant date, no expiry and no status: an authorisation
 *    that lapsed last year is indistinguishable from one served this morning (measured
 *    26 August 2026 — see `docs/tickets/w1-terrasses.md`).
 * 2. **No CA terrasse is derived from it.** The arithmetic that would produce one is not
 *    reachable from here: `longueur` and `largeur` stay in `terrasse_autorisation` and
 *    `compass_premises_within` exposes four flags and no dimension. This module receives no
 *    number at all, so there is no code path from a screen back to a surface — let alone to
 *    a turnover. That is a structural guarantee, not a promise.
 * 3. **The fact carries its source and the source carries its date.** `source` is a required
 *    field too, and it is built from `ingestion_run.source_as_of` — how current the *source*
 *    is, never when we last loaded it. The register moves: `terrasse_autorisation` holds
 *    24 194 rows plus 10 unclassifiable ones from the 25 August load, and the portal's export
 *    read again on 26 August 2026 returned 24 199. Five rows in a day, on a layer that
 *    publishes no cadence — the date on that line is not decoration.
 *
 * `assertObservational` runs on every sentence on the way out, for the same reason as in
 * `survivalText.ts`: "votre terrasse" is exactly the phrasing this kind of panel drifts into.
 *
 * Same division of labour as `timelineText.ts` and `survivalText.ts` — the sentence is decided
 * in a pure function the node runner tests, and the component only puts the result on screen.
 */

import { assertObservational } from '@/core';
import type { Locale } from '@/i18n/locale';
import { formatOccurredOn } from '@/i18n/timelineText';

/** The three states `premise_location.terrasse_status` can hold. Never two. */
export type TerrasseStatus = 'oui' | 'non' | 'inconnu';

/**
 * A fourth state the column cannot hold but the network can produce: the row came back
 * without one. Kept apart from `'non'` — a missing answer is not a negative answer, which is
 * the defect this codebase has now separated out five times (`DIAGNOSTIC.md` §9 to §16).
 */
export type TerrasseState = TerrasseStatus | 'indisponible';

/** The four terrace columns of `compass_premises_within`, plus the source's own date. */
export interface TerrasseFact {
  status: TerrasseStatus | null;
  permanente: boolean;
  estivale: boolean;
  etalage: boolean;
  /**
   * `ingestion_run.source_as_of` — the recency of the data as the source states it, never
   * `last_success_at` and never `now()`. Null when the freshness row could not be read.
   */
  sourceAsOf: string | null;
}

export interface TerrasseReading {
  state: TerrasseState;
  /** What the source says. Always about an *authorisation*, never about an installation. */
  headline: string;
  /** How that answer was reached — the address match, and what it can and cannot settle. */
  detail: string;
  /** Null when there is no type to name, i.e. on 'non' and 'indisponible'. */
  typesLabel: string | null;
  typesText: string | null;
  /** The regulatory window, present only when a summer authorisation is among the types. */
  seasonNote: string | null;
  /** Required, not optional: the reserve travels with the answer or the answer does not ship. */
  reserve: string;
  /** Required too — a fact on screen carries its source (`CLAUDE.md`, `Measured<T>`). */
  source: string;
  sourceUrl: string;
}

/** The dataset's own page on the portal, for a reader who wants the record itself. */
export const TERRASSE_SOURCE_URL =
  'https://opendata.paris.fr/explore/dataset/terrasses-autorisations/';

/**
 * The Ville de Paris page the dataset links to, and the only place the two kinds are defined.
 *
 * Re-read 26 August 2026: "Les terrasses estivales sont autorisées pour 7 mois chaque année,
 * du 1er avril au 31 octobre", against "terrasse annuelle" for the year-round kind. The
 * dataset publishes no code table for `typologie`, so this page is what the derivation in
 * `scripts/ingest/terrasses.ts` reads — informational, with no regulatory value, exactly as
 * the PLU layer is presented (`PLAN.md` §2.4).
 */
export const TERRASSE_RULES_URL = 'https://www.paris.fr/pages/terrasses-et-etalages-3516';

export const TERRASSE_COPY = {
  fr: {
    title: 'Terrasse et étalage',
    stateLabel: { oui: 'Oui', non: 'Non', inconnu: 'Inconnu', indisponible: 'Non rendu' },
    rulesLink: 'Règlement de la Ville de Paris',
    sourceLink: 'Consulter le jeu de données',
  },
  en: {
    title: 'Terrace and display stall',
    stateLabel: { oui: 'Yes', non: 'No', inconnu: 'Unknown', indisponible: 'Not returned' },
    rulesLink: 'Ville de Paris regulations',
    sourceLink: 'Open the dataset',
  },
} as const;

const TYPE_LABELS = {
  fr: { permanente: 'terrasse permanente', estivale: 'terrasse estivale', etalage: 'étalage' },
  en: { permanente: 'year-round terrace', estivale: 'summer terrace', etalage: 'display stall' },
} as const;

/**
 * The source line, built rather than typed.
 *
 * A date that is absent is said to be absent instead of being quietly dropped — a source line
 * without its date reads as current, which is the one thing it must not do for a register of
 * authorisations that carries no expiry of its own.
 */
function sourceLine(sourceAsOf: string | null, locale: Locale): string {
  const producer =
    locale === 'fr'
      ? 'Terrasses et étalages autorisés · Ville de Paris, Direction de l’Urbanisme · ODbL'
      : 'Authorised terraces and display stalls · Ville de Paris, Direction de l’Urbanisme · ODbL';
  if (!sourceAsOf) {
    return locale === 'fr'
      ? `${producer} · date de la source non lue`
      : `${producer} · source date not read`;
  }
  const when = formatOccurredOn(sourceAsOf, 'day', locale);
  return locale === 'fr'
    ? `${producer} · état de la source au ${when}`
    : `${producer} · source as of ${when}`;
}

/** The types actually authorised, in the source's own three kinds. Order is fixed. */
function typeList(fact: TerrasseFact, locale: Locale): string[] {
  const labels = TYPE_LABELS[locale];
  const list: string[] = [];
  if (fact.permanente) list.push(labels.permanente);
  if (fact.estivale) list.push(labels.estivale);
  if (fact.etalage) list.push(labels.etalage);
  return list;
}

/**
 * One premise's terrace answer, in the three states the database keeps apart.
 *
 * Every string this returns has passed `assertObservational`, including the ones that only
 * describe an absence: a sentence about nothing is still a sentence someone reads.
 */
export function describeTerrasse(fact: TerrasseFact, locale: Locale): TerrasseReading {
  const state: TerrasseState = fact.status ?? 'indisponible';
  const fr = locale === 'fr';
  const types = state === 'oui' || state === 'inconnu' ? typeList(fact, locale) : [];

  const headline =
    state === 'oui'
      ? fr
        ? 'Terrasse ou étalage autorisé à cette adresse'
        : 'A terrace or display stall is authorised at this address'
      : state === 'inconnu'
        ? fr
          ? 'Autorisation à cette adresse, titulaire non publié'
          : 'An authorisation at this address, holder not published'
        : state === 'non'
          ? fr
            ? 'Aucune autorisation enregistrée à cette adresse'
            : 'No authorisation on file at this address'
          : fr
            ? 'Statut non rendu par la base'
            : 'No status returned by the database';

  const detail =
    state === 'oui'
      ? fr
        ? 'Un seul local recensé porte ce numéro de rue : l’autorisation lui revient sans ambiguïté.'
        : 'Only one surveyed premise carries this street number, so the authorisation attaches to it unambiguously.'
      : state === 'inconnu'
        ? fr
          ? 'Plusieurs locaux recensés partagent ce numéro de rue — 69 % des locaux parisiens sont dans ce cas. La source ne dit pas lequel détient l’autorisation, et Compass n’en désigne aucun.'
          : 'Several surveyed premises share this street number — 69 % of Paris premises do. The source does not say which one holds the authorisation, and Compass does not pick one.'
        : state === 'non'
          ? fr
            ? 'Le registre de la Ville de Paris ne porte aucune terrasse ni aucun étalage à ce numéro de rue.'
            : 'The Ville de Paris register carries no terrace and no display stall at this street number.'
          : fr
            ? 'La couche n’a renvoyé aucun statut pour ce local. Une absence de réponse ne se lit pas comme un « non ».'
            : 'The layer returned no status for this premise. A missing answer does not read as a "no".';

  // The reserve is not the same statement in the three states, so it is not the same sentence.
  // On 'oui' and 'inconnu' it bounds what an authorisation proves; on 'non' it bounds what the
  // address match can miss, which is the only way a 'non' can be wrong.
  const reserve =
    state === 'oui' || state === 'inconnu'
      ? fr
        ? 'Une autorisation n’est pas une terrasse installée aujourd’hui : la source ne publie ni date de délivrance, ni date d’expiration, ni statut. Elle ne dit rien de l’activité du local ni de son chiffre d’affaires.'
        : 'An authorisation is not a terrace standing today: the source publishes no grant date, no expiry and no status. It says nothing about what the premise trades or what it takes.'
      : state === 'non'
        ? fr
          ? 'Le rattachement se fait par numéro de rue. Une autorisation dont l’adresse publiée n’a pas de numéro, ou s’écrit autrement, ne se rattache à aucun local et se lit ici comme une absence.'
          : 'The match is made on the street number. An authorisation whose published address carries no number, or is spelled differently, attaches to no premise and reads here as an absence.'
        : fr
          ? 'Ni « oui » ni « non » : ce local n’a pas reçu de statut, et les deux réponses restent ouvertes.'
          : 'Neither "yes" nor "no": this premise received no status, and both answers remain open.';

  const typesLabel =
    types.length === 0
      ? null
      : state === 'oui'
        ? fr
          ? types.length > 1
            ? 'Types autorisés'
            : 'Type autorisé'
          : types.length > 1
            ? 'Authorised types'
            : 'Authorised type'
        : fr
          ? 'Types autorisés à cette adresse'
          : 'Types authorised at this address';

  const seasonNote = fact.estivale && (state === 'oui' || state === 'inconnu')
    ? fr
      ? 'Une terrasse estivale est autorisée sept mois par an, du 1er avril au 31 octobre.'
      : 'A summer terrace is authorised for seven months a year, from 1 April to 31 October.'
    : null;

  const reading: TerrasseReading = {
    state,
    headline,
    detail,
    typesLabel,
    typesText: types.length === 0 ? null : types.join(' · '),
    seasonNote,
    reserve,
    source: sourceLine(fact.sourceAsOf, locale),
    sourceUrl: TERRASSE_SOURCE_URL,
  };

  for (const sentence of [headline, detail, reserve, seasonNote]) {
    if (sentence) assertObservational(sentence, `phrase de terrasse (${state})`);
  }

  return reading;
}
