/**
 * The doctrine of w1-terrasses, as assertions rather than as a paragraph.
 *
 * Three things must survive the trip from `premise_location.terrasse_status` to a screen, and
 * each has cost this project a defect somewhere else already:
 *
 *  - **Three states stay three.** 'inconnu' is "an authorisation exists here and the source
 *    does not say whose", not "no". Flattening two answers into one is `DIAGNOSTIC.md` §9
 *    to §16, five times over.
 *  - **An authorisation is not a terrace installed today.** The reserve that says so is a
 *    required field, so the tests can check it is on every positive answer.
 *  - **The fact carries its source, and the source carries its date.** A source line that
 *    silently drops an unknown date reads as current.
 */

import { describe, expect, it } from 'vitest';

import { findForbiddenForm } from '@/core';
import type { Locale } from '@/i18n/locale';
import { describeTerrasse, type TerrasseFact } from './terrasseText';

const LOCALES: Locale[] = ['fr', 'en'];

const fact = (over: Partial<TerrasseFact> = {}): TerrasseFact => ({
  status: 'oui',
  permanente: true,
  estivale: false,
  etalage: false,
  sourceAsOf: '2026-08-25',
  ...over,
});

/** Every shape the four columns can arrive in, including the ones SQL should never send. */
const everyFact = (): TerrasseFact[] => {
  const out: TerrasseFact[] = [];
  for (const status of ['oui', 'non', 'inconnu', null] as const) {
    for (const permanente of [true, false]) {
      for (const estivale of [true, false]) {
        for (const etalage of [true, false]) {
          for (const sourceAsOf of ['2026-08-25', null]) {
            out.push({ status, permanente, estivale, etalage, sourceAsOf });
          }
        }
      }
    }
  }
  return out;
};

describe('describeTerrasse — les trois états restent trois', () => {
  it('rend un état distinct pour chaque valeur de la colonne', () => {
    expect(describeTerrasse(fact({ status: 'oui' }), 'fr').state).toBe('oui');
    expect(describeTerrasse(fact({ status: 'non' }), 'fr').state).toBe('non');
    expect(describeTerrasse(fact({ status: 'inconnu' }), 'fr').state).toBe('inconnu');
  });

  it('ne lit pas une absence de statut comme un « non »', () => {
    const reading = describeTerrasse(fact({ status: null }), 'fr');
    expect(reading.state).toBe('indisponible');
    expect(reading.state).not.toBe('non');
  });

  it.each(LOCALES)('donne trois phrases différentes en %s', (locale) => {
    const headlines = (['oui', 'non', 'inconnu', null] as const).map(
      (status) => describeTerrasse(fact({ status }), locale).headline,
    );
    expect(new Set(headlines).size).toBe(4);

    const reserves = (['oui', 'non', null] as const).map(
      (status) => describeTerrasse(fact({ status }), locale).reserve,
    );
    expect(new Set(reserves).size).toBe(3);
  });

  it('« inconnu » nomme ce qui n’est pas publié, sans énoncer d’absence', () => {
    const fr = describeTerrasse(fact({ status: 'inconnu' }), 'fr');
    expect(fr.detail).toMatch(/ne dit pas lequel/);
    expect(`${fr.headline} ${fr.detail}`).not.toMatch(/aucune autorisation/i);

    const en = describeTerrasse(fact({ status: 'inconnu' }), 'en');
    expect(en.detail).toMatch(/does not say which one/);
    expect(`${en.headline} ${en.detail}`).not.toMatch(/no authorisation/i);
  });
});

describe('describeTerrasse — une autorisation n’est pas une terrasse installée', () => {
  it.each(LOCALES)('parle d’autorisation et non d’installation, en %s', (locale) => {
    const reading = describeTerrasse(fact({ status: 'oui' }), locale);
    expect(reading.headline).toMatch(locale === 'fr' ? /autoris/i : /authorised/i);
  });

  it.each(LOCALES)('porte la réserve sur toute réponse positive, en %s', (locale) => {
    for (const status of ['oui', 'inconnu'] as const) {
      const reading = describeTerrasse(fact({ status }), locale);
      expect(reading.reserve.length).toBeGreaterThan(0);
      expect(reading.reserve).toMatch(
        locale === 'fr' ? /ni date d’expiration|ni statut/ : /no expiry|no status/,
      );
    }
  });

  it('ne rend aucune dimension ni aucun montant', () => {
    const reading = describeTerrasse(fact({ status: 'oui' }), 'fr');
    const rendered = Object.values(reading).filter((v) => typeof v === 'string').join(' ');
    // The dimensions stay in `terrasse_autorisation`: `compass_premises_within` never exposes
    // them, so no screen can multiply a length by a width and call the result a terrace's worth.
    expect(rendered).not.toMatch(/\d+([.,]\d+)?\s*(m²|m2|€)/);
  });
});

describe('describeTerrasse — la source et sa date', () => {
  it.each(LOCALES)('nomme le producteur, la licence et la date, en %s', (locale) => {
    const reading = describeTerrasse(fact({ sourceAsOf: '2026-08-25' }), locale);
    expect(reading.source).toMatch(/Direction de l’Urbanisme/);
    expect(reading.source).toMatch(/ODbL/);
    expect(reading.source).toMatch(locale === 'fr' ? /25 août 2026/ : /25 August 2026/);
  });

  it.each(LOCALES)('dit que la date manque plutôt que de la taire, en %s', (locale) => {
    const reading = describeTerrasse(fact({ sourceAsOf: null }), locale);
    expect(reading.source).toMatch(locale === 'fr' ? /date de la source non lue/ : /source date not read/);
  });

  it('rend une source sur chacune des formes possibles', () => {
    for (const f of everyFact()) {
      for (const locale of LOCALES) {
        expect(describeTerrasse(f, locale).source.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('describeTerrasse — le type', () => {
  it('accorde le libellé au nombre de types', () => {
    expect(describeTerrasse(fact({ permanente: true }), 'fr').typesLabel).toBe('Type autorisé');
    expect(
      describeTerrasse(fact({ permanente: true, etalage: true }), 'fr').typesLabel,
    ).toBe('Types autorisés');
  });

  it('dit « à cette adresse » quand le titulaire n’est pas publié', () => {
    const reading = describeTerrasse(fact({ status: 'inconnu', estivale: true }), 'fr');
    expect(reading.typesLabel).toBe('Types autorisés à cette adresse');
    expect(reading.typesText).toMatch(/terrasse estivale/);
  });

  it('ne ressuscite aucun type sur un « non », même si les drapeaux sont restés vrais', () => {
    const reading = describeTerrasse(
      fact({ status: 'non', permanente: true, estivale: true, etalage: true }),
      'fr',
    );
    expect(reading.typesLabel).toBeNull();
    expect(reading.typesText).toBeNull();
  });

  it('ne rend la fenêtre estivale que sur une autorisation estivale', () => {
    expect(describeTerrasse(fact({ estivale: true }), 'fr').seasonNote).toMatch(
      /1er avril au 31 octobre/,
    );
    expect(describeTerrasse(fact({ estivale: false }), 'fr').seasonNote).toBeNull();
    expect(describeTerrasse(fact({ status: 'non', estivale: true }), 'fr').seasonNote).toBeNull();
  });

  it('rend un type nul plutôt qu’un libellé vide quand la source n’en donne aucun', () => {
    const reading = describeTerrasse(
      fact({ status: 'oui', permanente: false, estivale: false, etalage: false }),
      'fr',
    );
    expect(reading.typesLabel).toBeNull();
    expect(reading.typesText).toBeNull();
    expect(reading.headline.length).toBeGreaterThan(0);
  });
});

describe('describeTerrasse — l’interdit doctrinal partagé', () => {
  it('ne produit aucune phrase de prévision ni de deuxième personne', () => {
    for (const f of everyFact()) {
      for (const locale of LOCALES) {
        const reading = describeTerrasse(f, locale);
        for (const sentence of [
          reading.headline,
          reading.detail,
          reading.reserve,
          reading.seasonNote,
          reading.source,
        ]) {
          if (!sentence) continue;
          expect(findForbiddenForm(sentence), `${locale} / ${f.status} / « ${sentence} »`).toBeNull();
        }
      }
    }
  });
});
