/**
 * The wording of the day-shape block — w2-rythme (#208).
 *
 * The three controls that matter are the last three: **no sentence here is a forecast**, **no
 * sentence here names a number of people**, and **the reading says what kind of claim it is by
 * reading the enum rather than by saying so in prose**. The first two are the doctrinal
 * interdicts `w1-survie` and this ticket set; the third is what `w6-mode-raison` (#197)
 * established and what a block about hours is most tempted to break, because « a neighbourhood
 * people leave to go to work » sounds like a measurement and is a deduction.
 *
 * **What these controls do NOT catch**, the same limit `motif.test.ts` names for itself: they
 * check that both languages exist, that neither is empty and that neither uses a forbidden
 * form — never that either one says something true.
 */

import { describe, expect, it } from 'vitest';

import {
  LEAD_REASON_STATUSES,
  RYTHME_DAY_TYPE,
  RYTHME_SHAPES,
  RYTHME_WINDOWS,
  RYTHME_WINDOW_IDS,
  findForbiddenForm,
  type DayShape,
  type RythmeShape,
} from '@/core';
import { LEAD_STATUS_LABELS } from '@/i18n/modeText';
import { RYTHME_COPY, rythmeReadingText } from '@/i18n/rythmeText';

const LOCALES = ['fr', 'en'] as const;

/** A shape of each kind, so the copy table is visited over its whole population. */
const shapeWith = (kind: RythmeShape): DayShape => ({
  stationName: 'Poissonnière',
  distanceM: 366.5,
  dayType: RYTHME_DAY_TYPE,
  buckets: [{ hour: 8, label: '8H-9H', pct: 100 }],
  windows: { matin: 100, midi: 0, soir: 0 },
  shape: kind,
  status: 'arbitrage',
});

/** Every sentence this module can put on screen, in one locale. Walked, never listed. */
function everySentence(locale: (typeof LOCALES)[number]): string[] {
  const c = RYTHME_COPY[locale];
  const flat = (v: unknown): string[] =>
    typeof v === 'string'
      ? [v]
      : v && typeof v === 'object'
        ? Object.values(v).flatMap(flat)
        : [];
  const readings = RYTHME_SHAPES.flatMap((kind) => {
    const t = rythmeReadingText(shapeWith(kind), locale);
    return [t.label, t.reading, t.status, t.settlesLabel, t.settles, t.middayNote];
  });
  return [...flat(c), ...readings];
}

describe('les mots de la forme de la journée — w2-rythme (#208)', () => {
  it('existe dans les deux langues, sans trou', () => {
    for (const locale of LOCALES) {
      const phrases = everySentence(locale);
      expect(phrases.length).toBeGreaterThan(0);
      for (const p of phrases) expect(p.trim().length, `[${locale}] « ${p} »`).toBeGreaterThan(0);
    }
    // The two languages say different things, which is the cheapest check that one is not the
    // other copied — the defect §49 was, in a block that has both from day one.
    expect(everySentence('fr').join()).not.toBe(everySentence('en').join());
  });

  it('couvre exactement les trois formes, dans les deux langues', () => {
    // The population is `RYTHME_SHAPES`, read rather than listed: a fourth shape without a
    // sentence reddens here instead of reaching the screen bare — the same control, in both
    // directions, that `modeText.test.ts` holds over `LEAD_AXES`.
    for (const locale of LOCALES) {
      const rendues = new Set(
        RYTHME_SHAPES.map((kind) => rythmeReadingText(shapeWith(kind), locale).reading),
      );
      expect(rendues.size).toBe(RYTHME_SHAPES.length);
      for (const r of rendues) expect(r.length).toBeGreaterThan(20);
    }
  });

  it('n’écrit aucune prévision, dans aucune langue', () => {
    // A block about hours is exactly where « ce local marchera le midi » writes itself.
    for (const locale of LOCALES) {
      for (const phrase of everySentence(locale)) {
        const interdit = findForbiddenForm(phrase);
        expect(interdit, `${interdit?.term} — ${phrase}`).toBeNull();
      }
    }
  });

  it('ne nomme jamais un nombre de personnes — critère 2, du côté des mots', () => {
    // The figures cannot be a volume (`rythme.test.ts` holds that); the WORDS could still
    // invite one. « fréquentation », « voyageurs », « X personnes » around a percentage is how
    // a share becomes a count in a reader's head.
    const VOLUME =
      /\b(voyageurs?|passagers?|usagers?|personnes?|fr[ée]quentation|montées|riders?|ridership|footfall count)\b/iu;
    for (const locale of LOCALES) {
      for (const phrase of everySentence(locale)) {
        // « la source ne publie aucun compte » and « two stations cannot be compared on how
        // busy they are » are the sentences that REFUSE a volume, and they are allowed to name
        // one. Everything else is not, and the negation has to be present to earn it.
        const refuse = /aucun compte|no count|jamais un compte|never a count|ne se comparent pas|cannot be compared/iu;
        if (refuse.test(phrase)) continue;
        const hit = VOLUME.exec(phrase);
        expect(hit?.[0], `[${locale}] « ${phrase} »`).toBeUndefined();
      }
    }
  });

  it('lit le statut de l’énumération et ne l’écrit pas — critère 4', () => {
    // Read off `LEAD_REASON_STATUSES` through `LEAD_STATUS_LABELS`, so this block and a lead
    // reason say « arbitrage » with the same words. A fourth spelling of it here would be a
    // state a reader has to infer from prose, which is the state the product does not hold.
    for (const locale of LOCALES) {
      for (const kind of RYTHME_SHAPES) {
        const t = rythmeReadingText(shapeWith(kind), locale);
        expect(t.status).toBe(LEAD_STATUS_LABELS[locale].arbitrage);
        expect(Object.values(LEAD_STATUS_LABELS[locale])).toContain(t.status);
      }
      // And no reading may claim to be measured — there is no `mesure` status anywhere here.
      expect(LEAD_REASON_STATUSES).toContain('mesure');
      for (const kind of RYTHME_SHAPES) {
        expect(rythmeReadingText(shapeWith(kind), locale).status).not.toBe(
          LEAD_STATUS_LABELS[locale].mesure,
        );
      }
    }
  });

  it('dit ce qui trancherait la lecture, et nomme sa limite', () => {
    // An arbitrage owes the cross-check that settles it, and the cross-check owes its own
    // limit: INSEE's employment-at-workplace is published at IRIS, coarser than a street.
    for (const locale of LOCALES) {
      const t = rythmeReadingText(shapeWith('depart_du_soir'), locale);
      expect(t.settlesLabel.length).toBeGreaterThan(0);
      expect(t.settles).toMatch(/INSEE/);
      expect(t.settles).toMatch(/IRIS/);
    }
  });

  it('porte la correction du midi, mesurée, dans les deux langues', () => {
    // The ticket, `20260907000002` and `compass_station_profile` all say a midday swell is the
    // office signature. Measured over the 258 stations on 17 September 2026, it is the
    // strongest window at none of them. A reader arriving with the expectation the schema
    // itself carries has to be told, or they read the flat midday as a broken chart.
    for (const locale of LOCALES) {
      const note = rythmeReadingText(shapeWith('deux_pointes'), locale).middayNote;
      expect(note).toMatch(/midi|midday/i);
      expect(note.length).toBeGreaterThan(40);
    }
  });

  it('interpole les bornes du noyau plutôt que de les écrire', () => {
    // A « 7h-10h » typed into the copy would be a literal nothing keeps in step with
    // `RYTHME_WINDOWS` — the failure `Measured<T>` exists to prevent, moved into prose. The
    // population is the core's, so a fourth window gets a label the day it is declared.
    for (const locale of LOCALES) {
      for (const id of RYTHME_WINDOW_IDS) {
        const label = RYTHME_COPY[locale].windowNames[id];
        expect(label).toContain(String(RYTHME_WINDOWS[id].from));
        expect(label).toContain(String(RYTHME_WINDOWS[id].to));
      }
      expect(RYTHME_COPY[locale].intro).toContain(RYTHME_DAY_TYPE);
    }
  });

  it('dit que ce constat n’entre pas dans le verdict — critère 5, du côté des mots', () => {
    // The frontier is held by `rythme.test.ts` in the code. A reader cannot run a test, so the
    // block says it too — and saying it is what makes it falsifiable by whoever reads the page.
    expect(RYTHME_COPY.fr.intro).toMatch(/n’entre dans aucune note|ne pèse pas sur le verdict/);
    expect(RYTHME_COPY.en.intro).toMatch(/enters no score|does not weigh on the verdict/);
  });
});
