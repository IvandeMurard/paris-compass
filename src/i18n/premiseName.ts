/**
 * Naming a premise, in the reader's language.
 *
 * `services/opendata/properties.ts` used to build these strings itself, in French, whatever
 * the interface language — so the English map showed "Local vacant (ancien Boulangerie)":
 * wrong language, and wrong gender even in French. A service has no business producing
 * display text; it now carries the OpenStreetMap values and this module renders them.
 *
 * Pure on purpose, like `components/figureText.ts`: no JSX, so the node-environment runner
 * can exercise it.
 */

import type { Locale } from '@/i18n/locale';

/** What OpenStreetMap tells us about a premise, before any language is chosen. */
export interface PremiseNaming {
  /** The business name as OSM carries it. A proper noun — never translated. */
  name?: string;
  /** OSM `shop` / `office` value for an occupied premise, e.g. `bakery`. */
  kind?: string;
  /** For a vacant premise, the `disused:shop` / `was:shop` value it used to carry. */
  previousKind?: string;
}

/**
 * French needs the gender to agree the adjective in "ancienne boulangerie" — which is why
 * the label is not just a string. English needs none of it, hence the asymmetry.
 */
interface Kind {
  fr: string;
  gender: 'm' | 'f';
  en: string;
}

const KINDS: Record<string, Kind> = {
  bakery: { fr: 'boulangerie', gender: 'f', en: 'bakery' },
  butcher: { fr: 'boucherie', gender: 'f', en: 'butcher' },
  cafe: { fr: 'café', gender: 'm', en: 'café' },
  clothes: { fr: 'boutique de prêt-à-porter', gender: 'f', en: 'clothes shop' },
  convenience: { fr: 'supérette', gender: 'f', en: 'convenience store' },
  florist: { fr: 'fleuriste', gender: 'm', en: 'florist' },
  greengrocer: { fr: 'primeur', gender: 'm', en: 'greengrocer' },
  hairdresser: { fr: 'salon de coiffure', gender: 'm', en: 'hairdresser' },
  optician: { fr: 'opticien', gender: 'm', en: 'optician' },
  pharmacy: { fr: 'pharmacie', gender: 'f', en: 'pharmacy' },
  restaurant: { fr: 'restaurant', gender: 'm', en: 'restaurant' },
  supermarket: { fr: 'supermarché', gender: 'm', en: 'supermarket' },
};

const COPY = {
  fr: {
    vacant: 'Local commercial vacant',
    vacantWas: (kind: string, gender: 'm' | 'f') =>
      `Local vacant (${gender === 'f' ? 'ancienne' : 'ancien'} ${kind})`,
    genericPremise: (kind: string) => `Local ${kind}`,
    unnamed: 'Local commercial',
    unknownAddress: 'Adresse non renseignée dans OpenStreetMap',
  },
  en: {
    vacant: 'Vacant commercial unit',
    vacantWas: (kind: string) => `Vacant unit (former ${kind})`,
    genericPremise: (kind: string) => `${kind} unit`,
    unnamed: 'Commercial unit',
    unknownAddress: 'No address recorded in OpenStreetMap',
  },
} as const;

/**
 * An OSM value we have no label for is shown as-is rather than dressed in a wrong article.
 * `shoe_repair` becomes "shoe repair" — imperfect, but it never invents a gender.
 */
const readable = (value: string) => value.replace(/_/g, ' ');

export function premiseTitle(
  naming: PremiseNaming,
  status: 'vacant' | 'occupied',
  locale: Locale,
): string {
  if (status === 'vacant') {
    if (!naming.previousKind) return COPY[locale].vacant;
    const known = KINDS[naming.previousKind];
    if (locale === 'fr') {
      return known
        ? COPY.fr.vacantWas(known.fr, known.gender)
        : COPY.fr.vacantWas(readable(naming.previousKind), 'm');
    }
    return COPY.en.vacantWas(known ? known.en : readable(naming.previousKind));
  }

  // A business name is what the reader recognises on the street. It wins over any label.
  if (naming.name) return naming.name;
  if (!naming.kind || naming.kind === 'commerce') return COPY[locale].unnamed;

  const known = KINDS[naming.kind];
  if (known) {
    const label = locale === 'fr' ? known.fr : known.en;
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return COPY[locale].genericPremise(readable(naming.kind));
}

/** The address, or a sentence saying the source does not carry one. */
export function premiseAddressLabel(address: string | null, locale: Locale): string {
  return address ?? COPY[locale].unknownAddress;
}
