import { describe, expect, it } from 'vitest';

import {
  describeTimelineRow,
  formatAmount,
  formatOccurredOn,
  licenceLabel,
  readingOf,
  TIMELINE_COPY,
  type TimelineRow,
} from './timelineText';

/**
 * The fixtures are copies of rows actually returned by the remote on 24 August 2026, with
 * the publishable key and nothing else — so the anonymous caller's view is what is tested,
 * which is the view the browser has. Measured, not imagined:
 *
 *   location 7073  (31 rue Berger, Halles)  2017 withheld, 2020 withheld, 2023 HIPPOPOTAMUS
 *   location 38385 (3 rue du Jour, Halles)  four BODACC notices + 2023 AGNES B
 *   location 54653                          2023 observed = false
 */

const withheld2017: TimelineRow = {
  occurred_on: '2017-01-01',
  granularity: 'year',
  source: 'APUR BDCom 2017',
  source_ref: null,
  source_url: 'https://carto2.apur.org/apur/rest/services/OPENDATA/BDCOM_OD/MapServer/0',
  source_licence: 'custom',
  kind: 'survey',
  observed: null,
  withheld: true,
  activity_code: null,
  label: null,
  detail: null,
  amount_eur: null,
  evidence:
    "Millésime non redistribuable publiquement : sa licence n'a pas été lue. Rien n'est dit de ce relevé, ni son contenu ni son existence. Question envoyée à l'APUR.",
  confidence: 'indetermine',
  confidence_rule: 'vintage_licence_withheld',
  confidence_reason: 'millésime retenu pour raison de licence : ni contenu ni existence',
};

const surveyed2023: TimelineRow = {
  occurred_on: '2023-01-01',
  granularity: 'year',
  source: 'APUR BDCom 2023',
  source_ref: 'bdcom:2023:481',
  source_url: 'https://carto2.apur.org/apur/rest/services/BDCOM/bdcom2023/MapServer/0',
  source_licence: 'ODbL-1.0',
  kind: 'survey',
  observed: true,
  withheld: false,
  activity_code: 'CH101',
  label: 'Restaurant traditionnel français',
  detail: 'HIPPOPOTAMUS',
  amount_eur: null,
  evidence: 'Relevé de terrain, identifiant 481, rattachement ordre',
  confidence: 'etabli',
  confidence_rule: 'observed_matched',
  confidence_reason: 'observed = true, match_method = ordre',
};

const notSurveyed2023: TimelineRow = {
  ...surveyed2023,
  source_ref: null,
  observed: false,
  activity_code: null,
  label: null,
  detail: null,
  evidence:
    "Millésime restreint aux commerces : le local n'y figure pas. Cette couche ne publie que les commerces — ni locaux vacants, ni locaux non commerciaux — donc l'absence ne permet aucune conclusion sur l'état du local.",
  confidence: 'indetermine',
  confidence_rule: 'not_observed',
  confidence_reason: 'observed = false',
};

const proceeding: TimelineRow = {
  occurred_on: '2015-09-16',
  granularity: 'day',
  source: 'BODACC procédure collective',
  source_ref: 'A201501771875',
  source_url: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:A201501771875',
  source_licence: 'Licence Ouverte',
  kind: 'proceeding',
  observed: true,
  withheld: false,
  activity_code: null,
  label: "Dépôt de l'état des créances",
  detail: 'LITTLE FASHION GALLERY',
  amount_eur: null,
  evidence: "Adresse du siège social de l'entreprise, pas de l'établissement.",
  confidence: 'corrobore',
  confidence_rule: 'siege_confirmed',
  confidence_reason: 'siège social, et SIRENE place un établissement de cette entreprise à moins de 50 m',
};

describe('readingOf', () => {
  it('keeps the four statements apart', () => {
    expect(readingOf(withheld2017)).toBe('withheld');
    expect(readingOf(surveyed2023)).toBe('surveyed');
    expect(readingOf(notSurveyed2023)).toBe('not-surveyed');
    expect(readingOf(proceeding)).toBe('event');
  });

  // The row a SECURITY DEFINER slip could produce: withheld raised while `observed` still
  // carries a value. Withholding is about the dataset, so it wins over anything below it.
  it('lets withholding win over a leaked observed value', () => {
    expect(readingOf({ ...surveyed2023, withheld: true })).toBe('withheld');
    expect(readingOf({ ...notSurveyed2023, withheld: true })).toBe('withheld');
  });
});

describe('describeTimelineRow — the two forbidden sentences', () => {
  // The ticket in one assertion, and the first of the two errors of PLAN.md §2.5 verbatim.
  it.each(['fr', 'en'] as const)('reads observed = false as "not surveyed" (%s)', (locale) => {
    const line = describeTimelineRow(notSurveyed2023, locale);
    expect(line.headline).toBe(TIMELINE_COPY[locale].notSurveyed);
    expect(line.absent).toBe(true);
    expect(line.headline.toLowerCase()).not.toContain('vacant');
    expect(line.headline.toLowerCase()).not.toContain('commerce');
    expect(line.headline.toLowerCase()).not.toContain('shop');
  });

  it('does not read a withheld vintage as an absence of survey', () => {
    const line = describeTimelineRow(withheld2017, 'fr');
    expect(line.headline).toBe(TIMELINE_COPY.fr.withheld);
    expect(line.headline).not.toBe(TIMELINE_COPY.fr.notSurveyed);
  });

  it('discloses nothing at all for a withheld vintage', () => {
    const leaking = { ...withheld2017, detail: 'HIPPOPOTAMUS', amount_eur: 160868 };
    const line = describeTimelineRow(leaking, 'fr');
    expect(line.detail).toBeUndefined();
    expect(line.amount).toBeUndefined();
  });
});

describe('describeTimelineRow — no coalesce on the label', () => {
  it('shows the label when there is one, and only then', () => {
    expect(describeTimelineRow(surveyed2023, 'fr').headline).toBe('Restaurant traditionnel français');
    expect(describeTimelineRow(surveyed2023, 'fr').detail).toBe('HIPPOPOTAMUS');
  });

  // Every neighbouring column is populated here. A fallback would pick one of them up.
  it('never borrows another column when the label is null', () => {
    const line = describeTimelineRow({ ...surveyed2023, label: null }, 'fr');
    expect(line.headline).toBe(TIMELINE_COPY.fr.unlabelled);
    expect(line.headline).not.toContain('HIPPOPOTAMUS');
    expect(line.headline).not.toContain('CH101');
    expect(line.headline).not.toContain('APUR');
    expect(line.absent).toBe(true);
  });

  // The second error of PLAN.md §2.5: a value read under a date that does not carry it.
  it('never borrows a neighbouring year', () => {
    const rows = [withheld2017, notSurveyed2023].map((r) => describeTimelineRow(r, 'fr'));
    for (const line of rows) {
      expect(line.headline).not.toContain('Restaurant');
      expect(line.detail).toBeUndefined();
    }
  });
});

describe('describeTimelineRow — the pièce', () => {
  it('relays the source justification verbatim rather than rewriting it', () => {
    expect(describeTimelineRow(notSurveyed2023, 'fr').evidence).toBe(notSurveyed2023.evidence);
    expect(describeTimelineRow(withheld2017, 'en').evidence).toBe(withheld2017.evidence);
  });

  it('carries the confidence level and the rule that produced it', () => {
    const line = describeTimelineRow(proceeding, 'fr');
    expect(line.confidenceLabel).toBe('Corroboré');
    expect(line.reason).toBe(proceeding.confidence_reason);
    expect(line.confidenceMeaning).toContain('indépendantes');
  });
});

describe('formatOccurredOn', () => {
  it('keeps a yearly survey a year, and does not invent a day', () => {
    expect(formatOccurredOn('2017-01-01', 'year', 'fr')).toBe('2017');
    expect(formatOccurredOn('2023-01-01', 'year', 'en')).toBe('2023');
  });

  it('renders a dated notice at day granularity, in each language', () => {
    expect(formatOccurredOn('2015-09-16', 'day', 'fr')).toBe('16 septembre 2015');
    expect(formatOccurredOn('2015-09-16', 'day', 'en')).toBe('16 September 2015');
    expect(formatOccurredOn('2018-04-01', 'day', 'fr')).toBe('1er avril 2018');
  });
});

describe('formatAmount', () => {
  it('is undefined when no price was published — never 0', () => {
    expect(formatAmount(null, 'fr')).toBeUndefined();
    expect(formatAmount(0, 'fr')).toBe('0\u202f€');
  });

  // U+202F, not an ordinary space: a wrap would split one number into two.
  it('groups thousands in each language', () => {
    expect(formatAmount(160868, 'fr')).toBe('160\u202f868\u202f€');
    expect(formatAmount(160868, 'en')).toBe('€160,868');
  });
});

describe('licenceLabel', () => {
  it('does not repeat the word when the licence is already named for it', () => {
    expect(licenceLabel('Licence Ouverte')).toBe('Licence Ouverte');
  });

  it('names the field for identifiers that do not', () => {
    expect(licenceLabel('ODbL-1.0')).toBe('Licence ODbL-1.0');
    expect(licenceLabel('custom')).toBe('Licence custom');
  });
});
