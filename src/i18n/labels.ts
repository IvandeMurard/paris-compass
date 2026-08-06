import type { Locale } from './locale';

/** Canonical (English) qualitative labels produced by the scoring services. */
const LABELS: Record<string, { fr: string; en: string }> = {
  excellent: { fr: 'Excellent', en: 'Excellent' },
  good: { fr: 'Bon', en: 'Good' },
  moderate: { fr: 'Moyen', en: 'Moderate' },
  poor: { fr: 'Mauvais', en: 'Poor' },
  'very poor': { fr: 'Très mauvais', en: 'Very poor' },
  high: { fr: 'Élevé', en: 'High' },
  low: { fr: 'Faible', en: 'Low' },
  'very low': { fr: 'Très faible', en: 'Very low' },
};

export const translateLabel = (label: string | undefined, locale: Locale): string | undefined => {
  if (!label) return undefined;
  return LABELS[label.toLowerCase()]?.[locale] ?? label;
};
