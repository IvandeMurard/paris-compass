import type { Locale } from '@/i18n/locale';
import { FAQ, type FaqItem } from './faq';
import { GUIDES, type Guide } from './guides';
import { GLOSSARY } from './glossary';
import { ARRONDISSEMENTS } from './arrondissements';
import { FAQ_EN } from './en/faq';
import { GUIDES_EN } from './en/guides';
import { GLOSSARY_EN } from './en/glossary';
import { ARRONDISSEMENTS_EN } from './en/arrondissements';

export const getFaq = (locale: Locale): FaqItem[] => (locale === 'en' ? FAQ_EN : FAQ);

export const getGuides = (locale: Locale): Guide[] => (locale === 'en' ? GUIDES_EN : GUIDES);

export const getGuideBySlug = (locale: Locale, slug?: string) =>
  getGuides(locale).find((g) => g.slug === slug);

export const getGlossary = (locale: Locale) => (locale === 'en' ? GLOSSARY_EN : GLOSSARY);

export const getArrondissements = (locale: Locale) =>
  locale === 'en' ? ARRONDISSEMENTS_EN : ARRONDISSEMENTS;

export const getArrondissementBySlug = (locale: Locale, slug?: string) =>
  getArrondissements(locale).find((a) => a.slug === slug);
