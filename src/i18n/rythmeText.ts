/**
 * Wording of the day-shape block — w2-rythme (#208).
 *
 * Prose only, same contract as `contextText.ts` and `modeText.ts`: **nothing here holds a
 * number.** Every percentage the block shows comes off `Measured<DayShape>`, and the window
 * boundaries the sentences name are interpolated from `RYTHME_WINDOWS` rather than typed. A
 * « 7h-10h » written here would be a literal on screen that nothing keeps in step with the
 * core, which is the failure `Measured<T>` exists to prevent, moved into prose.
 *
 * **The reading carries a STATUS, and the status is read off the enum.** `LEAD_STATUS_LABELS`
 * of `modeText.ts` already renders `LeadReasonStatus` in both languages, and this module reads
 * it instead of writing a fourth spelling of « arbitrage, pas une mesure ». One enumeration,
 * one set of labels — the rule `w6-mode-raison` (#197) settled.
 *
 * **And the reading says what would settle it, because it is an arbitrage.** Compass counts no
 * jobs: BDCom surveys ground-floor premises and the Filosofi grid counts residents where they
 * sleep. « A street of offices » is a deduction from a departure profile. The cross-check that
 * would settle it is INSEE's employment-at-workplace, not loaded, published at IRIS — coarser
 * than a street, which is a limit the sentence states rather than hides.
 */

import {
  RYTHME_DAY_TYPE,
  RYTHME_WINDOWS,
  type DayShape,
  type RythmeShape,
} from '@/core';
import type { Locale } from '@/i18n/locale';
import { LEAD_STATUS_LABELS } from '@/i18n/modeText';

export const RYTHME_COPY = {
  fr: {
    heading: 'Les heures où cette adresse sert à quelqu’un',
    /** What the block is, and — above all — what it is not. */
    intro: `Ce que la station la plus proche dit de la forme d’une journée ouvrée, hors vacances scolaires (code ${RYTHME_DAY_TYPE} de la source). Ce n’est pas un septième constat : une forme de journée n’est ni forte ni faible, elle n’entre dans aucune note et elle ne pèse pas sur le verdict.`,
    station: 'Station lue',
    distance: 'Distance à l’adresse',
    dayType: 'Type de jour',
    scale: 'Échelle',
    /** The one sentence that makes a misreading of the chart impossible. */
    scaleValue:
      'Part de la journée de cette station, en pourcentage. La source ne publie aucun compte : deux stations ne se comparent pas sur leur fréquentation, seulement sur la forme de leur journée.',
    windows: 'Les trois fenêtres',
    windowNames: {
      matin: `Matin ${RYTHME_WINDOWS.matin.from}h-${RYTHME_WINDOWS.matin.to}h`,
      midi: `Midi ${RYTHME_WINDOWS.midi.from}h-${RYTHME_WINDOWS.midi.to}h`,
      soir: `Soir ${RYTHME_WINDOWS.soir.from}h-${RYTHME_WINDOWS.soir.to}h`,
    },
    readingLabel: 'La lecture',
    settlesLabel: 'Ce qui la trancherait',
    settles:
      'L’emploi au lieu de travail de l’INSEE, non chargé, publié à l’IRIS — plus grossier que la rue, donc il trancherait le quartier et jamais l’adresse. Rien dans le corpus ne compte aujourd’hui un actif là où il travaille : BDCom recense des locaux en rez-de-chaussée, et la grille Filosofi compte les résidents là où ils dorment.',
    chartLabel: 'Part de la journée, heure par heure',
    /** The absence of a station is an answer. `motifText` supplies the sentence itself. */
    none: 'Aucune forme de journée à lire ici',
    /** The whole layer was withheld — a different statement from « no station near ». */
    withheld:
      'La couche des profils horaires n’a pas répondu pour ce point : la forme de la journée est inconnue, et non plate.',
    /** What the whole block cannot say, whatever its figures. */
    limit:
      'Une station n’est pas une rue. Deux adresses de part et d’autre du même arrêt reçoivent cette même forme, alors que c’est précisément ce qui les sépare qui intéresse un preneur. La présence par secteur — qui est là plutôt que qui transite — est un autre chantier, suivi en #20.',
  },
  en: {
    heading: 'The hours this address is useful to someone',
    intro: `What the nearest station says about the shape of a working day outside school holidays (the source’s ${RYTHME_DAY_TYPE} code). This is not a seventh finding: the shape of a day is neither high nor low, it enters no score and it does not weigh on the verdict.`,
    station: 'Station read',
    distance: 'Distance from the address',
    dayType: 'Day type',
    scale: 'Scale',
    scaleValue:
      'Share of this station’s own day, in percent. The source publishes no count: two stations cannot be compared on how busy they are, only on the shape of their day.',
    windows: 'The three windows',
    windowNames: {
      matin: `Morning ${RYTHME_WINDOWS.matin.from}-${RYTHME_WINDOWS.matin.to}`,
      midi: `Midday ${RYTHME_WINDOWS.midi.from}-${RYTHME_WINDOWS.midi.to}`,
      soir: `Evening ${RYTHME_WINDOWS.soir.from}-${RYTHME_WINDOWS.soir.to}`,
    },
    readingLabel: 'The reading',
    settlesLabel: 'What it takes to settle it',
    settles:
      'INSEE’s employment-at-workplace, not loaded, published at IRIS level — coarser than a street, so it settles the neighbourhood and never the address. Nothing in the corpus counts a worker where they work today: BDCom surveys ground-floor premises, and the Filosofi grid counts residents where they sleep.',
    chartLabel: 'Share of the day, hour by hour',
    none: 'No shape of a day to read here',
    withheld:
      'The hourly-profile layer did not answer for this point, so the shape of the day is unknown rather than flat.',
    limit:
      'A station is not a street. Two addresses on either side of the same stop receive this same shape, when what separates them is precisely what a prospective tenant cares about. Presence by sector — who IS there rather than who passes through — is a separate piece of work, tracked in #20.',
  },
} as const;

/**
 * What each shape means, in one sentence, in both languages.
 *
 * **These sentences are the inverse of the ones the ticket proposed, and the header of
 * `src/core/rythme.ts` holds the measurement that inverted them.** A validation is recorded on
 * BOARDING, so a station's profile is the shape of the departures from that place. A
 * neighbourhood people sleep in is morning-led; a neighbourhood people come to is
 * evening-led — and no Paris station peaks at midday, because nobody boards a train for lunch.
 *
 * Each sentence is a description of a departure profile followed by the deduction it invites,
 * and the deduction is marked as one by the STATUS the card renders above it.
 */
const SHAPE_COPY: Record<Locale, Record<RythmeShape, string>> = {
  fr: {
    depart_matinal:
      'On part d’ici le matin, plus qu’on n’en part le soir : le profil d’un quartier où les gens dorment et qu’ils quittent pour aller travailler. Les commerces qui tiennent y servent avant 9h et après 18h, quand leurs clients sont chez eux.',
    deux_pointes:
      'On part d’ici le matin et le soir dans des proportions voisines : un quartier qui loge et qui emploie à la fois, sans que le profil désigne l’un des deux.',
    depart_du_soir:
      'On part d’ici le soir, bien plus qu’on n’en part le matin : le profil d’un quartier où l’on vient — pour travailler, étudier ou sortir — et qu’on quitte en fin de journée. Les gens présents à midi ne dorment pas ici.',
  },
  en: {
    depart_matinal:
      'People depart from here in the morning more than in the evening: the profile of a neighbourhood people sleep in and leave to go to work. The shops that survive serve before 9 and after 18, when their customers are home.',
    deux_pointes:
      'People depart from here in the morning and in the evening in similar proportions: a neighbourhood that both houses and employs, with the profile pointing to neither.',
    depart_du_soir:
      'People depart from here in the evening far more than in the morning: the profile of a neighbourhood people come TO — to work, to study or to go out — and leave at the end of the day. Those present at midday do not sleep here.',
  },
};

/**
 * The measured statement the ticket's own illustration got wrong, kept on screen.
 *
 * It is not decoration: the ticket, `20260907000002` and `compass_station_profile` all say a
 * midday swell is the office signature, and a reader arriving with that expectation will read
 * the flat midday of every Paris station as a defect in the chart. The sentence states what
 * was measured over the whole population and why the dataset cannot show what they expect.
 */
const MIDDAY_NOTE: Record<Locale, string> = {
  fr: 'Aucune station parisienne ne culmine à midi, et ce n’est pas une lacune du relevé : une validation se compte à la montée, et on ne prend pas le train pour déjeuner. La fenêtre du midi est montrée parce qu’elle ne décide rien — pas parce qu’elle décide.',
  en: 'No Paris station peaks at midday, and that is not a gap in the survey: a validation is counted on boarding, and nobody takes the train to have lunch. The midday window is shown because it decides nothing — not because it does.',
};

/** A reading ready to render: the four pieces the block shows, in the reader's language. */
export interface RythmeReadingText {
  label: string;
  /** What the shape says, and the deduction it invites. */
  reading: string;
  /** The status label, read off `LeadReasonStatus` and never written here. */
  status: string;
  settlesLabel: string;
  settles: string;
  /** The measured correction to the expectation the ticket and the schema both carry. */
  middayNote: string;
}

/**
 * The reading of a day shape, with the kind of claim it is.
 *
 * Assembled here rather than in the component, for the reason `leadReasonText` gives: the MCP
 * server owes the same sentence the day it serves this block (`w5-explain-metier`, #31), and a
 * sentence composed inside a React file is one an agent can never be handed.
 */
export function rythmeReadingText(shape: DayShape, locale: Locale): RythmeReadingText {
  const c = RYTHME_COPY[locale];
  return {
    label: c.readingLabel,
    reading: SHAPE_COPY[locale][shape.shape],
    status: LEAD_STATUS_LABELS[locale][shape.status],
    settlesLabel: c.settlesLabel,
    settles: c.settles,
    middayNote: MIDDAY_NOTE[locale],
  };
}
