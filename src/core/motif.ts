/**
 * Why a figure is absent or needs caution, in a form that has no language — w6-langue-absences (#181).
 *
 * **The defect this exists to remove** (`DIAGNOSTIC.md` §49). `src/core/` writes its messages in
 * English by convention (`CLAUDE.md`, « Style »), and those messages did not stay in the core:
 * `Measured.missingReason` and `Measured.note` were rendered as-is by `/contexte/:slug`, so a
 * page entirely in French said *« The road layer did not load for this area »*. The defect was
 * never the page's — preferring the core's sentence to a generic « donnée indisponible » is
 * right, because only the core knows WHICH layer went silent. It is one rung lower: **the core
 * produced prose destined for a screen, and prose on a screen has a language.**
 *
 * So the core stops producing a sentence and starts producing a MOTIF. The sentence is derived
 * from it, in the reader's language, at the boundary that knows what that language is.
 *
 * **Not a lookup on the English text.** Translating with `includes()` on the old phrases is the
 * shortcut `#61` refused once already: classifying on free text is rebuilding an enumeration out
 * of its own prose, and it breaks the day someone rewords a sentence. The producer of the
 * absence names it, exactly as `Withholding` is named by the code that met the failure.
 *
 * **Why the two languages live here and not in `src/i18n/`.** The ticket proposed `src/i18n/`;
 * that module is the browser's, and `src/core` must stay callable from the MCP server, which
 * compiles this directory and nothing else of `src/`. English in the core and French in `i18n`
 * would also be two homes for one sentence. This is the arrangement `verdict.ts` already
 * reached for `CLAUSES`, `WHY` and `withholdingText`, for the same reason and in the same words:
 * a second copy reads identically the day it is written and drifts the day one is reworded.
 *
 * **A motif is also what an agent wants.** A caller reading the MCP response can branch on
 * `{ kind: "couche_absente", layer: "roads" }`; it can never branch on a sentence.
 *
 * **What this does not catch.** Nothing here says anything about prose written in SQL: the
 * `evidence` strings of the database are produced outside TypeScript, and invariant `I21` keeps
 * them under its own guard.
 */

import type { Layer } from './scoring';
import type { VerdictLocale } from './verdict';

/**
 * The motif kinds, as a `const` array with the type derived from it.
 *
 * Same shape as `WITHHOLDINGS` and for the same reason: a census — a test that has to visit
 * every motif, a report that has to list them — reads the population off this array instead of
 * a second hand-written list free to fall out of step with the union below.
 */
export const MOTIF_KINDS = [
  'couche_absente',
  'couverture_tronquee',
  'reponse_plafonnee',
  'aucun_arret_dans_rayon',
  'mandataire_passage',
  'bruit_modelise',
] as const;

export type MotifKind = (typeof MOTIF_KINDS)[number];

/**
 * Why a figure carries no value, or why it has to be read with caution.
 *
 * The parameters are part of the motif, not of the sentence: `reponse_plafonnee` carries the
 * two counts and the radius because a reader who is told a count is a floor immediately wants
 * to know how far below the total it is, and a translator handed only the finished sentence
 * could not put the numbers back in the right place in another language.
 */
export type FigureMotif =
  /** The layer never answered. An absence, never a zero. */
  | { kind: 'couche_absente'; layer: Layer }
  /** The fetched area stops before the search radius, so the count is a floor. */
  | { kind: 'couverture_tronquee' }
  /** The service capped its response below what the radius holds — PostgREST's row limit. */
  | { kind: 'reponse_plafonnee'; layer: Layer; rendered: number; total: number; radiusM: number }
  /** The rail layer answered and found no stop in range. A measurement, not an absence. */
  | { kind: 'aucun_arret_dans_rayon' }
  /** Footfall is a proxy: no open pedestrian count exists for Île-de-France. */
  | { kind: 'mandataire_passage' }
  /** Road noise is modelled from geometry alone. */
  | { kind: 'bruit_modelise' };

/**
 * How each layer is named inside a sentence, in each language.
 *
 * Only `reponse_plafonnee` composes with it. `couche_absente` writes its five sentences out in
 * full instead, because they do not differ by a noun: an unloaded road layer means « this is
 * not a quiet location », an unloaded premises layer means « activity is unknown rather than
 * absent », and a template would flatten five different things to say into one.
 */
const LAYER_NOUN: Record<VerdictLocale, Record<Layer, string>> = {
  fr: {
    amenities: 'La couche des équipements',
    roads: 'La couche des voies',
    premises: 'La couche des locaux',
    services: 'La couche des services marchands relevés',
    stations: 'La couche des arrêts ferrés',
  },
  en: {
    amenities: 'The amenity layer',
    roads: 'The road layer',
    premises: 'The premises layer',
    services: 'The surveyed-services layer',
    stations: 'The rail-stop layer',
  },
};

/**
 * What an unloaded layer means, one sentence per layer per language.
 *
 * The English column is the prose that used to live in `MISSING` of `scoring.ts`, moved rather
 * than rewritten: it is the wording the MCP server has been serving, and re-typing it would
 * have been a silent change to a published response, on a ticket about language.
 *
 * Each sentence says two things on purpose — what did not happen, and what that does NOT
 * license the reader to conclude. « Nothing counted is not the same as nothing there » is the
 * doctrine of the product in one clause, and it was the half a French reader never got.
 */
const ABSENTE: Record<VerdictLocale, Record<Layer, string>> = {
  fr: {
    amenities:
      "La couche des équipements n'a pas pu être chargée pour cette zone : rien n'a été compté. Rien de compté n'est pas la même chose que rien sur place.",
    roads:
      "La couche des voies n'a pas pu être chargée pour cette zone : l'exposition n'a pas pu être modélisée. Ce n'est pas un endroit calme, c'est un endroit non mesuré.",
    premises:
      "La couche des locaux n'a pas pu être chargée pour cette zone : l'activité alentour est inconnue, et non absente.",
    services:
      "La couche des services marchands relevés n'a pas pu être chargée pour cette zone : les services accessibles à pied sont inconnus, et non absents. Rien de compté n'est pas la même chose que rien sur place.",
    stations:
      "La couche des arrêts ferrés n'a pas pu être chargée pour cette zone : la distance au plus proche arrêt est inconnue. Ce n'est pas un endroit mal desservi, c'est un endroit non mesuré.",
  },
  en: {
    amenities:
      'The amenity layer did not load for this area, so nothing was counted. Nothing counted is not the same as nothing there.',
    roads:
      'The road layer did not load for this area, so exposure could not be modelled. This is not a quiet location, it is an unmeasured one.',
    premises:
      'The premises layer did not load for this area, so surrounding activity is unknown rather than absent.',
    services:
      'The surveyed-services layer did not load for this area, so merchant services on foot are unknown rather than absent. Nothing counted is not the same as nothing there.',
    stations:
      'The rail-stop layer did not load for this area, so distance to the nearest stop is unknown. This is not a location far from transit, it is an unmeasured one.',
  },
};

const COPY = {
  fr: {
    couverture_tronquee:
      "Les données couvrant ce point s'arrêtent avant le rayon de recherche complet : le compte est un plancher, pas un total.",
    reponse_plafonnee: (noun: string, rendered: number, total: number, radiusM: number) =>
      `${noun} est tronquée : le service a rendu ${rendered} lignes sur les ${total} que le rayon de ${radiusM} m contient, parce que PostgREST plafonne une réponse à sa propre limite de lignes. Toute figure qui lit cette couche est un plancher, pas un total. Un rayon plus étroit rend l'ensemble.`,
    aucun_arret_dans_rayon:
      "Aucun arrêt ferré Île-de-France Mobilités n'a été trouvé dans le rayon de recherche : ce zéro dit qu'il n'y en a aucun à proximité, pas que la couche s'est tue.",
    mandataire_passage:
      "Il n'existe aucun comptage piéton ouvert pour l'Île-de-France. Ce chiffre est une approximation dérivée de la densité de commerces actifs et de la desserte ferrée : elle compare deux emplacements entre eux, elle ne dit rien du passage réel.",
    bruit_modelise:
      "Modélisé à partir de la seule proximité et de la seule classe des voies principales. Les bâtiments, le volume de trafic et l'heure de la journée n'entrent pas dans le calcul.",
  },
  en: {
    couverture_tronquee:
      'The data covering this point stops before the full search radius, so the count is a floor, not a total.',
    reponse_plafonnee: (noun: string, rendered: number, total: number, radiusM: number) =>
      `${noun} is truncated: the service returned ${rendered} of the ${total} rows the ${radiusM} m radius holds, because PostgREST caps a response at its own row limit. Every figure that reads this layer is a FLOOR, not a total. A narrower radius returns the whole set.`,
    aucun_arret_dans_rayon:
      'No Île-de-France Mobilités rail stop was found inside the search radius, so this reads zero because none is near — not because the layer is silent.',
    mandataire_passage:
      'No open pedestrian count exists for Île-de-France. This is a proxy from active-business density and rail access: it compares two locations against each other, it says nothing about actual footfall.',
    bruit_modelise:
      'Modelled from the proximity and class of major roads only. Buildings, traffic volume and time of day are not taken into account.',
  },
} as const;

/**
 * The motif, written out for a reader of `locale`.
 *
 * `fr` by default, like every other text function of this directory: the product is French and
 * the English page is its translation, not the other way round. The `switch` is exhaustive by
 * construction — adding a seventh member to `FigureMotif` without a sentence for it does not
 * type-check, which is the reason the motif is a discriminated union and not a bare string.
 */
export function motifText(motif: FigureMotif, locale: VerdictLocale = 'fr'): string {
  const c = COPY[locale];
  switch (motif.kind) {
    case 'couche_absente':
      return ABSENTE[locale][motif.layer];
    case 'couverture_tronquee':
      return c.couverture_tronquee;
    case 'reponse_plafonnee':
      return c.reponse_plafonnee(
        LAYER_NOUN[locale][motif.layer],
        motif.rendered,
        motif.total,
        motif.radiusM,
      );
    case 'aucun_arret_dans_rayon':
      return c.aucun_arret_dans_rayon;
    case 'mandataire_passage':
      return c.mandataire_passage;
    case 'bruit_modelise':
      return c.bruit_modelise;
  }
}

/**
 * Several motifs about one figure, joined into one paragraph.
 *
 * Two caveats about a figure are two caveats, not a choice between them — a premises layer
 * capped by PostgREST at the edge of a truncated fetch area is a real combination, and keeping
 * only the last one written would drop whichever the reader most needed. The joining happens
 * here rather than at each call site so the separator is decided once.
 */
export function motifsText(
  motifs: readonly FigureMotif[],
  locale: VerdictLocale = 'fr',
): string | undefined {
  if (motifs.length === 0) return undefined;
  return motifs.map((m) => motifText(m, locale)).join(' ');
}
