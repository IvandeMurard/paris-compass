import type { UiKey } from '@/i18n/ui';

export const SITE_URL = 'https://paris-compass.lovable.app';
export const SITE_NAME = 'Compass';

export interface NavItem {
  to: string;
  labelKey: UiKey;
}

export const MAIN_NAV: NavItem[] = [
  { to: '/carte', labelKey: 'nav.map' },
  { to: '/presentation', labelKey: 'nav.presentation' },
  { to: '/a-propos', labelKey: 'nav.about' },
  { to: '/methodologie', labelKey: 'nav.methodology' },
  { to: '/sources', labelKey: 'nav.sources' },
  { to: '/guides', labelKey: 'nav.guides' },
  { to: '/faq', labelKey: 'nav.faq' },
  { to: '/glossaire', labelKey: 'nav.glossary' },
];

/**
 * The three addresses offered on the home page — w6-contexte (#119), step 3.
 *
 * Three, and no more: the home page shows a field, a sentence and three examples, and nothing
 * else above the fold. They exist so a first visitor can see what a context sheet is without
 * having to think of an address, so they are picked for contrast rather than for prestige —
 * a dense commercial street, a quieter residential one, and a point the corpus covers unevenly.
 *
 * **They carry no coordinates on purpose.** A context page reached without them geocodes the
 * slug through BAN and rewrites itself to the canonical URL; writing latitudes here would put
 * three unsourced figures in a content module, and `Measured<T>` exists to keep exactly that
 * kind of number off the product.
 */
export const HOME_EXAMPLES: readonly string[] = [
  'Rue de Bretagne, Paris',
  'Rue du Poteau, Paris',
  'Avenue Daumesnil, Paris',
];
