/**
 * Wording of the context page — w6-contexte (#119).
 *
 * Prose only. Every figure on that page comes from `Measured<T>` and every verdict clause from
 * `src/core/verdict.ts`; nothing here holds a number, and that is the rule the page rests on
 * (« aucun chiffre affiché n'est un littéral »). What lives here is what a locale changes: the
 * name of an axis, the heading above the gaps, the label on the provenance chevron.
 *
 * Same shape as `figureText.ts`, and for the same reason: a decision about words is testable
 * without a DOM, and the Leaflet popups of a later step cannot render a component.
 */

import { AMENITY_RADIUS_M, FOOTFALL_RADIUS_M, NOISE_RADIUS_M, type VerdictAxis } from '@/core';
import type { Locale } from '@/i18n/locale';

export const AXIS_NAMES: Record<Locale, Record<VerdictAxis, string>> = {
  fr: {
    footfall: 'Passage',
    transit: 'Desserte',
    walkability: 'Services à pied',
    groceries: 'Commerces alimentaires',
    noise: 'Bruit routier',
  },
  en: {
    footfall: 'Footfall',
    transit: 'Transit access',
    walkability: 'Services on foot',
    groceries: 'Food shops',
    noise: 'Road noise',
  },
};

/**
 * What each axis actually counts, in one line. Not a formula — the formula is published on the
 * methodology page, and this links there rather than restating it badly.
 *
 * The radii are interpolated from the core's own constants rather than typed out. A « 400 m »
 * written here would be a literal on screen that nothing keeps in step with
 * `FOOTFALL_RADIUS_M`, which is exactly the failure `Measured<T>` exists to prevent, moved
 * into prose.
 */
export const AXIS_WHAT: Record<Locale, Record<VerdictAxis, string>> = {
  fr: {
    footfall: `Approximation dans ${FOOTFALL_RADIUS_M} m, à partir de la densité de commerces actifs et de l’accès aux transports. Aucun comptage piéton n’est publié en Île-de-France.`,
    transit: `Arrêts et stations comptés dans ${AMENITY_RADIUS_M} m, avec rendement décroissant.`,
    walkability: `Composite pondéré des cinq familles d’aménités dans ${AMENITY_RADIUS_M} m. Les poids sont publiés.`,
    groceries: `Commerces alimentaires comptés dans ${AMENITY_RADIUS_M} m, avec rendement décroissant.`,
    noise: `Exposition modélisée depuis la proximité et la classe des voies, jusqu’à ${NOISE_RADIUS_M} m. Ni le bâti, ni le trafic, ni l’heure n’entrent dedans.`,
  },
  en: {
    footfall: `A proxy within ${FOOTFALL_RADIUS_M} m, built from active-business density and transport access. No pedestrian count is published for Île-de-France.`,
    transit: `Stops and stations counted within ${AMENITY_RADIUS_M} m, with diminishing returns.`,
    walkability: `Weighted composite of the five amenity families within ${AMENITY_RADIUS_M} m. The weights are published.`,
    groceries: `Food shops counted within ${AMENITY_RADIUS_M} m, with diminishing returns.`,
    noise: `Exposure modelled from the proximity and class of major roads, up to ${NOISE_RADIUS_M} m. Buildings, traffic volume and time of day are not taken into account.`,
  },
};

export const CONTEXT_COPY = {
  fr: {
    metaTitle: 'Contexte de l’adresse',
    metaDescription:
      'Ce que les données publiques disent de l’environnement d’une adresse parisienne : passage, desserte, services à pied, et ce qui manque.',
    loading: 'Lecture du quartier en cours…',
    notFound:
      'Cette adresse n’a pas été retrouvée dans la Base Adresse Nationale. Vérifier l’orthographe, ou repartir de la recherche.',
    verdictHeading: 'Verdict',
    /** French typography puts a space before the colon; English does not. */
    colon: ' :',
    usedHeading: 'Constats utilisés',
    supportingHeading: 'En appui',
    refusalHeading: 'Pas de verdict ici',
    refusalHelp:
      'Un constat porteur manque. Compass affiche ce qu’il a, séparément, plutôt que de conclure par-dessus une absence.',
    findingsHeading: 'Les constats',
    provenance: 'D’où vient ce chiffre',
    source: 'Source',
    licence: 'Licence',
    asOf: 'Millésime',
    method: 'Méthode',
    caveat: 'Réserve',
    whyMissing: 'Pourquoi ce chiffre manque',
    gapsHeading: 'Ce que Compass ne sait pas ici',
    gapsIntro:
      'Cette liste est calculée pour cette adresse, pas recopiée. Elle est aussi un argument : une réponse qui ne dit pas ses trous ne se vérifie pas.',
    noGaps:
      'Aucun trou détecté pour ce point au-delà des réserves déjà portées par chaque constat.',
    methodLink: 'La règle de composition du verdict est publiée sur la méthodologie.',
    address: 'Adresse',
    coords: 'Point',
    backToMap: 'Ouvrir la carte',
    mapHeading: 'Autour du point',
    // The radius is passed in from `FOOTFALL_RADIUS_M`, never typed here: a « 400 » written in
    // this file is a figure on screen that nothing keeps in step with the core.
    mapIntro: (radius: number) =>
      `Ce que les couches affichées ci-dessus contiennent dans ${radius} m autour de l’adresse. Rien d’autre : la carte illustre les constats, elle ne les remplace pas.`,
    mapAlt: (radius: number) =>
      `Carte de ${radius} m autour de l’adresse, avec les points des couches ayant servi aux constats.`,
    mapNotInteractive:
      'Carte volontairement fixe, sans filtres. Pour explorer librement, ouvrir la carte.',
    compareHeading: 'Comparer à une seconde adresse',
    compareHelp:
      'Deux adresses, jamais plus. Compass ne fait pas de portefeuille ni de classement : la comparaison en masse est le geste que ce produit refuse, et la borne tient dans son code, pas dans une intention.',
    comparePlaceholder: 'Seconde adresse parisienne',
    compareSubmit: 'Comparer',
    compareClear: 'Retirer la comparaison',
    compareLoading: 'Lecture du second quartier…',
    compareNotFound: 'Seconde adresse introuvable dans la Base Adresse Nationale.',
    compareTooMany:
      'Une seule seconde adresse est acceptée. L’URL en portait plusieurs : Compass n’en a lu aucune plutôt que d’en choisir une au hasard.',
    compareNoWinner:
      'Aucune des deux n’est déclarée meilleure, et ce n’est pas une prudence : les pondérations entre passage, desserte et calme dépendent du métier. Les axes sont posés côte à côte, la lecture reste au lecteur.',
    compareIncomparable: 'Non comparable ici',
    compareThis: 'Cette adresse',
    compareOther: 'Seconde adresse',
    agentHeading: 'La même réponse, pour un agent',
    agentIntro:
      'Le serveur MCP de Compass rend ce verdict à partir de la même fonction de composition que cette page. Cet appel, contre le serveur publié, répond sur ce point précis.',
    agentTool: 'Outil',
    agentArguments: 'Arguments',
    agentNote:
      'La parité est vérifiée par npm run verify:mcp, qui recompose le verdict du serveur à partir des chiffres que le serveur publie, et non par cette phrase.',
    methods: {
      measured: 'compté ou relevé',
      modelled: 'sorti d’un modèle publié',
      derived: 'calculé par une formule publiée',
      estimated: 'approximation assumée',
    },
  },
  en: {
    metaTitle: 'Address context',
    metaDescription:
      'What public data says about the surroundings of a Paris address: footfall, transit, services on foot, and what is missing.',
    loading: 'Reading the neighbourhood…',
    notFound:
      'This address was not found in the Base Adresse Nationale. Check the spelling, or start again from the search.',
    verdictHeading: 'Verdict',
    colon: ':',
    usedHeading: 'Findings used',
    supportingHeading: 'Alongside',
    refusalHeading: 'No verdict here',
    refusalHelp:
      'A bearing finding is missing. Compass shows what it has, one by one, rather than concluding over an absence.',
    findingsHeading: 'The findings',
    provenance: 'Where this figure comes from',
    source: 'Source',
    licence: 'Licence',
    asOf: 'Vintage',
    method: 'Method',
    caveat: 'Caveat',
    whyMissing: 'Why this figure is missing',
    gapsHeading: 'What Compass does not know here',
    gapsIntro:
      'This list is computed for this address, not copied. It is also an argument: an answer that does not state its holes cannot be checked.',
    noGaps: 'No gap detected for this point beyond the caveats each finding already carries.',
    methodLink: 'The rule that composes the verdict is published in the methodology.',
    address: 'Address',
    coords: 'Point',
    backToMap: 'Open the map',
    mapHeading: 'Around the point',
    mapIntro: (radius: number) =>
      `What the layers shown above contain within ${radius} m of the address. Nothing else: the map illustrates the findings, it does not replace them.`,
    mapAlt: (radius: number) =>
      `Map of ${radius} m around the address, showing the points of the layers the findings were computed from.`,
    mapNotInteractive:
      'The map is deliberately fixed, with no filters. To explore freely, open the map.',
    compareHeading: 'Compare with a second address',
    compareHelp:
      'Two addresses, never more. Compass builds no portfolio and no ranking: comparison in bulk is the gesture this product refuses, and the bound is in its code rather than in an intention.',
    comparePlaceholder: 'Second Paris address',
    compareSubmit: 'Compare',
    compareClear: 'Remove the comparison',
    compareLoading: 'Reading the second neighbourhood…',
    compareNotFound: 'Second address not found in the Base Adresse Nationale.',
    compareTooMany:
      'Only one second address is accepted. The URL carried several: Compass read none rather than picking one at random.',
    compareNoWinner:
      'Neither is declared better, and that is not caution: the weights between footfall, transit and quiet depend on the trade. The axes are set side by side; the reading stays with the reader.',
    compareIncomparable: 'Not comparable here',
    compareThis: 'This address',
    compareOther: 'Second address',
    agentHeading: 'The same answer, for an agent',
    agentIntro:
      'The Compass MCP server produces this verdict from the same composition function as this page. This call, against the published server, answers on this exact point.',
    agentTool: 'Tool',
    agentArguments: 'Arguments',
    agentNote:
      'Parity is checked by npm run verify:mcp, which recomposes the server’s verdict from the figures the server publishes — not by this sentence.',
    methods: {
      measured: 'counted or surveyed',
      modelled: 'output of a published model',
      derived: 'computed by a published formula',
      estimated: 'acknowledged proxy',
    },
  },
} as const;

/** Prose gaps that are true of this page's data path, each one derived from what was actually
 *  read rather than declared in advance. The page decides which ones apply; this only holds
 *  their wording. */
export const GAP_COPY = {
  fr: {
    osmPremises: (source: string) =>
      `Les locaux comptés ici viennent de ${source} — un marquage bénévole, pas le relevé porte-à-porte de l’APUR. Un local vacant qu’aucun contributeur n’a marqué n’est pas compté.`,
    noCommercialRent:
      'Aucun loyer commercial n’est publié en données ouvertes en France. L’encadrement parisien ne couvre que le logement : il n’est ni affiché ni multiplié par une surface ici.',
    truncated: (axis: string) =>
      `${axis} : la zone chargée s’arrête avant le rayon de recherche complet, donc le compte est un plancher et non un total.`,
    proxy: (axis: string) => `${axis} : approximation assumée, pas une mesure.`,
    missing: (axis: string, why: string) => `${axis} : ${why}`,
  },
  en: {
    osmPremises: (source: string) =>
      `The premises counted here come from ${source} — volunteer tagging, not APUR's door-to-door survey. A vacant unit nobody tagged is not counted.`,
    noCommercialRent:
      'No commercial rent is published as open data in France. The Paris rent control scheme covers housing only: it is neither shown nor multiplied by a floor area here.',
    truncated: (axis: string) =>
      `${axis}: the loaded area stops before the full search radius, so the count is a floor, not a total.`,
    proxy: (axis: string) => `${axis}: an acknowledged proxy, not a measurement.`,
    missing: (axis: string, why: string) => `${axis}: ${why}`,
  },
} as const;
