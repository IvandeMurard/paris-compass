/**
 * The doctrinal ban of w1-survie, as assertions rather than as a paragraph.
 *
 * « 72 % des cafés tiennent six ans » is an observation; « votre café a 72 % de chances » is
 * a forecast. The ticket forbids the second and does not say how the screen prevents it —
 * these tests are that "how". They fail if a sentence ever addresses the reader, predicts,
 * or shows a rate without the cohort and period that make it readable as a past count.
 */

import { describe, expect, it } from 'vitest';
import { assertObservational, describeSurvival, type SurvivalRow } from './survivalText';

const HALLES: SurvivalRow = {
  quartierName: 'Halles',
  source: 'APUR BDCom',
  subject: 'local',
  activityLabel: 'Café et Restaurant',
  periodStart: '2017-01-01',
  periodEnd: '2023-01-01',
  years: 6,
  cohortN: 310,
  survivedN: 268,
  survivalRate: 86.5,
  withheld: false,
  insufficientN: false,
  outOfCorpus: false,
  licence: 'ODbL-1.0',
  evidence: null,
};

const OPERATOR: SurvivalRow = {
  ...HALLES,
  source: 'INSEE SIRENE',
  subject: 'exploitant',
  periodStart: '2017-01-01',
  periodEnd: '2020-08-01',
  cohortN: 10686,
  survivedN: 5613,
  survivalRate: 52.5,
  licence: 'Licence Ouverte v2',
};

describe('assertObservational', () => {
  it('refuses the second person, which is what turns a rate into a forecast', () => {
    expect(() => assertObservational('Votre café a 72 % de chances de tenir')).toThrow(
      /deuxième personne/,
    );
  });

  it('refuses the vocabulary of probability even in the third person', () => {
    expect(() => assertObservational('Un café ici a 72 % de chances de tenir six ans')).toThrow(
      /probabilité/,
    );
  });

  it('refuses the future tense, which predicts rather than observes', () => {
    expect(() => assertObservational('Sur 310 cafés, 268 tiendront six ans')).toThrow(/futur/);
  });

  it('names the offending term, so the fix does not require guessing', () => {
    expect(() => assertObservational('votre local')).toThrow(/« votre »/);
  });

  it('accepts the observational form the product actually publishes', () => {
    expect(() =>
      assertObservational(
        'Sur les 310 locaux recensés « Café et Restaurant » Halles en 2017, 268 en étaient encore un en 2023.',
      ),
    ).not.toThrow();
  });
});

describe('describeSurvival', () => {
  it('makes the past cohort the subject, never the premise being looked at', () => {
    const d = describeSurvival(HALLES, 'fr');
    expect(d.sentence).toMatch(/^Sur les 310 locaux recensés/);
    expect(d.sentence).not.toMatch(/ce local|votre/i);
  });

  it('shows the two counts, not a bare percentage', () => {
    const d = describeSurvival(HALLES, 'fr');
    expect(d.text).toBe('268 / 310');
    expect(d.rate).toBe('86,5 %');
  });

  // The mechanism, not a preference: there is no code path that yields a lone rate.
  it('refuses a rate that arrives without its cohort', () => {
    const d = describeSurvival({ ...HALLES, cohortN: null }, 'fr');
    expect(d.absent).toBe(true);
    expect(d.rate).toBeUndefined();
  });

  it('refuses a rate that arrives without its period', () => {
    const d = describeSurvival({ ...HALLES, periodEnd: null }, 'fr');
    expect(d.absent).toBe(true);
    expect(d.rate).toBeUndefined();
  });

  it('names the two survivals differently, because they answer different questions', () => {
    expect(describeSurvival(HALLES, 'fr').sentence).toMatch(/locaux recensés/);
    expect(describeSurvival(OPERATOR, 'fr').sentence).toMatch(/entreprises .* immatriculées/);
  });

  // The three absences of DIAGNOSTIC.md §9–§16, kept apart rather than collapsed into n/d.
  it('distinguishes a withheld vintage from a cohort too small', () => {
    const withheld = describeSurvival({ ...HALLES, withheld: true, survivalRate: null }, 'fr');
    const small = describeSurvival(
      { ...HALLES, insufficientN: true, survivalRate: null, cohortN: 12 },
      'fr',
    );
    expect(withheld.marker).toBe('millésime retenu');
    expect(small.marker).toBe('effectif insuffisant');
    expect(withheld.sentence).not.toBe(small.sentence);
  });

  it('distinguishes both from a point outside Paris', () => {
    const outside = describeSurvival(
      { ...HALLES, outOfCorpus: true, survivalRate: null, cohortN: null },
      'fr',
    );
    expect(outside.sentence).toMatch(/hors des 80 quartiers/);
    expect(outside.marker).toBeUndefined();
  });

  // `evidence` is written in SQL, which is exactly where a well-meant "votre" would appear.
  it('applies the guard to text that came from the database', () => {
    expect(() =>
      describeSurvival({ ...HALLES, evidence: 'Votre local a de bonnes chances' }, 'fr'),
    ).toThrow(/interdit doctrinal/);
  });

  it('produces an observational sentence in English too', () => {
    const d = describeSurvival(HALLES, 'en');
    expect(d.sentence).toMatch(/^Of the 310 premises surveyed/);
    expect(d.rate).toBe('86.5 %');
  });
});
