import type { UiKey } from '@/i18n/ui';

export const SITE_URL = 'https://paris-compass.lovable.app';
export const SITE_NAME = 'Compass';

export interface NavItem {
  to: string;
  labelKey: UiKey;
}

export const MAIN_NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.map' },
  { to: '/presentation', labelKey: 'nav.presentation' },
  { to: '/a-propos', labelKey: 'nav.about' },
  { to: '/methodologie', labelKey: 'nav.methodology' },
  { to: '/sources', labelKey: 'nav.sources' },
  { to: '/guides', labelKey: 'nav.guides' },
  { to: '/faq', labelKey: 'nav.faq' },
  { to: '/glossaire', labelKey: 'nav.glossary' },
];
