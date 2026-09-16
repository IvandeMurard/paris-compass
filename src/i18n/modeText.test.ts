/**
 * Les mots des trois modes — w6-modes (#36).
 *
 * Un recensement, pas une relecture. Les populations sont dérivées de `TRADE_MODES`,
 * `TRADE_CHECK_IDS` et des états que `resolveChecks` peut rendre : un quatrième mode, un
 * dixième contrôle ou un cinquième état entrent dans ces contrôles le jour où ils entrent dans
 * le noyau, et pas le jour où quelqu'un pense à les ajouter ici.
 *
 * Le contrôle qui compte est le dernier : **aucune phrase de ce module n'est une prévision.**
 * `w1-survie` a interdit les formes prédictives sur la phrase de verdict, et une checklist
 * métier est exactement l'endroit où « ce local marchera » se réécrit tout seul.
 *
 * **Ce que ça ne rattrape pas** : ces contrôles jugent qu'il y a deux langues et qu'aucune n'est
 * vide, jamais que chacune dit vrai — la même limite que `motif.test.ts` nomme pour lui-même.
 */

import { describe, expect, it } from 'vitest';

import {
  TRADE_CHECKS,
  TRADE_CHECK_IDS,
  TRADE_MODES,
  findForbiddenForm,
  resolveChecks,
  type TradeCheckState,
  type TradeFacts,
} from '@/core';
import { PLU_ORIGIN, TERRASSES_ORIGIN } from '@/core';
import { CHECK_COPY, MODE_COPY, MODE_NAMES, checkStateText } from './modeText';
import { LOCALES } from './locale';

const ORIGINS = {
  terrasses: TERRASSES_ORIGIN('2026-09-01'),
  plu: PLU_ORIGIN('2024-11-20'),
};

const FACTS: TradeFacts = {
  radiusM: 25,
  total: 4,
  terrasseOui: 1,
  terrasseInconnu: 0,
  pluProtege: 4,
  pluProximite: 0,
};

/**
 * Un exemplaire de CHAQUE état, les comptes déclinés sur les trois cas que `constate` distingue.
 *
 * L'exhaustivité est vérifiée plus bas contre ce que `resolveChecks` rend réellement, jamais
 * affirmée ici : une liste d'exemplaires écrite à la main cesse de couvrir le cinquième cas
 * sans que personne s'en aperçoive.
 */
const ETATS: readonly TradeCheckState[] = [
  { kind: 'constate', count: 0, of: 4, radiusM: 25, indetermine: 0 },
  { kind: 'constate', count: 1, of: 4, radiusM: 25, indetermine: 0 },
  { kind: 'constate', count: 4, of: 4, radiusM: 25, indetermine: 0 },
  // Le troisième état du registre, celui qui manquait à l'écran : une adresse où une
  // autorisation existe sans que la source dise lequel des locaux la porte.
  { kind: 'constate', count: 0, of: 28, radiusM: 25, indetermine: 26 },
  { kind: 'constate', count: 1, of: 28, radiusM: 25, indetermine: 26 },
  { kind: 'aucun_local', radiusM: 25 },
  { kind: 'couche_absente' },
  { kind: 'sans_source', gap: { issue: null } },
  { kind: 'sans_source', gap: { issue: 13 } },
  { kind: 'sans_source', gap: { issue: 49, retenueLicence: true } },
];

describe('le recensement des mots', () => {
  it('nomme les trois modes dans les deux langues', () => {
    for (const locale of LOCALES) {
      for (const mode of TRADE_MODES) {
        expect(MODE_NAMES[locale][mode].length, `${locale}/${mode}`).toBeGreaterThan(2);
      }
    }
  });

  it('donne un nom et un objet à chaque contrôle, dans les deux langues', () => {
    for (const locale of LOCALES) {
      for (const id of TRADE_CHECK_IDS) {
        const copy = CHECK_COPY[locale][id];
        expect(copy.name.length, `${locale}/${id}/name`).toBeGreaterThan(3);
        expect(copy.about.length, `${locale}/${id}/about`).toBeGreaterThan(20);
      }
    }
  });

  it('donne ses deux formes verbales à tout contrôle que le corpus peut compter', () => {
    // La population est celle des règles SANS manque — dérivée, jamais recopiée. Un contrôle
    // qui gagnerait une source demain entre ici le jour où son `gap` disparaît.
    const comptables = TRADE_MODES.flatMap((mode) =>
      TRADE_CHECKS[mode].filter((rule) => !rule.gap).map((rule) => rule.id),
    );
    expect(comptables.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      for (const id of comptables) {
        expect(CHECK_COPY[locale][id].positive.length, `${locale}/${id}`).toBeGreaterThan(5);
        expect(CHECK_COPY[locale][id].negative.length, `${locale}/${id}`).toBeGreaterThan(5);
      }
    }
  });

  it('porte une réserve sur chaque contrôle que le corpus répond', () => {
    // Une réponse positive est le moment où la réserve compte : une autorisation n'est pas une
    // terrasse installée, un linéaire protégé n'est pas une décision d'urbanisme.
    const comptables = TRADE_MODES.flatMap((mode) =>
      TRADE_CHECKS[mode].filter((rule) => !rule.gap).map((rule) => rule.id),
    );
    for (const locale of LOCALES) {
      for (const id of comptables) {
        expect(CHECK_COPY[locale][id].reserve?.length ?? 0, `${locale}/${id}`).toBeGreaterThan(30);
      }
    }
  });
});

describe('checkStateText', () => {
  it('visite tous les états que resolveChecks rend, sans en oublier', () => {
    // La population est ce que le noyau rend VRAIMENT, sur trois jeux de faits : complet, rayon
    // vide, couche absente. Une liste d'états écrite à la main ici cesserait de couvrir le
    // cinquième cas sans que personne s'en aperçoive.
    const rendus = new Set(
      TRADE_MODES.flatMap((mode) => [
        ...resolveChecks(mode, FACTS, ORIGINS),
        ...resolveChecks(mode, { ...FACTS, total: 0 }, ORIGINS),
        ...resolveChecks(mode, null, ORIGINS),
      ]).map((check) => check.state.kind),
    );
    const couverts = new Set(ETATS.map((state) => state.kind));
    for (const kind of rendus) expect(couverts.has(kind), kind).toBe(true);
  });

  it('couvre aussi le cas indéterminé, qui n’est pas un genre d’état mais un chiffre', () => {
    // `kind` ne suffit pas à recenser `constate` : c'est le seul état porteur de trois nombres,
    // et c'est précisément le troisième — l'indéterminé — qui manquait à l'écran. Le recensement
    // par `kind` seul était vert dessus.
    const indetermines = TRADE_MODES.flatMap((mode) =>
      resolveChecks(mode, { ...FACTS, terrasseInconnu: 2 }, ORIGINS),
    ).filter((check) => check.state.kind === 'constate' && check.state.indetermine > 0);
    expect(indetermines.length).toBeGreaterThan(0);
    expect(ETATS.some((s) => s.kind === 'constate' && s.indetermine > 0)).toBe(true);
  });

  it('rend une phrase non vide pour chaque état, chaque contrôle et chaque langue', () => {
    for (const locale of LOCALES) {
      for (const id of TRADE_CHECK_IDS) {
        for (const state of ETATS) {
          const phrase = checkStateText(id, state, locale);
          expect(phrase.length, `${locale}/${id}/${state.kind}`).toBeGreaterThan(20);
          expect(phrase.trim(), `${locale}/${id}/${state.kind}`).toBe(phrase);
        }
      }
    }
  });

  it('distingue « tous », « aucun » et « une partie » — trois phrases, pas trois comptes', () => {
    const tous = checkStateText('plu_lineaire', { kind: 'constate', count: 4, of: 4, radiusM: 25, indetermine: 0 }, 'fr');
    const aucun = checkStateText('plu_lineaire', { kind: 'constate', count: 0, of: 4, radiusM: 25, indetermine: 0 }, 'fr');
    const partie = checkStateText('plu_lineaire', { kind: 'constate', count: 1, of: 4, radiusM: 25, indetermine: 0 }, 'fr');
    expect(new Set([tous, aucun, partie]).size).toBe(3);
    // « Aucun … n'est … » et jamais « aucun … portent » : c'est l'accord que deux formes
    // verbales achètent, et qu'un template unique aurait cassé.
    expect(aucun).toMatch(/\bn[e’']/u);
    expect(aucun).not.toContain('Aucun des 4 locaux relevés à moins de 25 m sont');
  });

  it('élide « ne » devant une voyelle, et le contrôle est une POPULATION', () => {
    // Mesuré à l'écran le 16 septembre 2026, rue de Bretagne, avant livraison : la page rendait
    // « aucun des 25 locaux relevés à moins de 25 m NE EST sur un linéaire protégé ». Le
    // template écrivait « ne » et recevait un verbe nu ; le français élide devant une voyelle et
    // un gabarit ne sait pas quelle lettre vient après.
    //
    // Le contrôle du dessus était VERT sur cette phrase — il demandait s'il y avait « ne », et
    // il y en avait un. Celui-ci balaie donc toutes les phrases françaises que ce module peut
    // produire, et pas la seule qu'une session aurait pensé à relire.
    const elisionManquante = /\bne\s+[aeiouâàéèêëîïôöûüùh]/iu;

    // La contre-preuve, et c'est la phrase EXACTE qui est arrivée à l'écran : une règle qu'on
    // n'a jamais vue rougir est une règle dont on ne sait pas si elle regarde quelque chose.
    expect(
      'Aucun des 25 locaux relevés à moins de 25 m ne est sur un linéaire portant une protection.',
    ).toMatch(elisionManquante);

    for (const id of TRADE_CHECK_IDS) {
      for (const state of ETATS) {
        const phrase = checkStateText(id, state, 'fr');
        expect(phrase, `${id}/${state.kind}`).not.toMatch(elisionManquante);
      }
    }
  });

  it('ne dit jamais « aucun » tout court quand la source n’a pas tranché', () => {
    // Mesuré à l'écran le 16 septembre 2026, rue de Bretagne : 0 des 25 locaux relevés portent
    // une autorisation nominative, et 26 des 28 emplacements sont `inconnu`. La phrase qui
    // s'arrêtait à « aucun » disait qu'aucune terrasse n'est autorisée là — alors que des
    // autorisations y sont, sans que le registre dise lesquelles. C'est l'absence inventée que
    // `src/i18n/terrasseText.ts` refuse, reproduite un cran plus haut dans un agrégat.
    for (const locale of LOCALES) {
      const sansTiers = checkStateText(
        'terrasse',
        { kind: 'constate', count: 0, of: 28, radiusM: 25, indetermine: 0 },
        locale,
      );
      const avecTiers = checkStateText(
        'terrasse',
        { kind: 'constate', count: 0, of: 28, radiusM: 25, indetermine: 26 },
        locale,
      );
      expect(avecTiers, locale).not.toBe(sansTiers);
      expect(avecTiers, locale).toContain('26');
      expect(avecTiers.length, locale).toBeGreaterThan(sansTiers.length);
    }
  });

  it('nomme le rayon et la population plutôt que de les taire', () => {
    const phrase = checkStateText('terrasse', { kind: 'constate', count: 1, of: 4, radiusM: 25, indetermine: 0 }, 'fr');
    expect(phrase).toContain('25 m');
    expect(phrase).toContain('4');
  });

  it('ne confond pas une retenue de licence avec une absence de source', () => {
    const retenue = checkStateText('rotation_metier', { kind: 'sans_source', gap: { issue: 49, retenueLicence: true } }, 'fr');
    const absente = checkStateText('cuisine', { kind: 'sans_source', gap: { issue: null } }, 'fr');
    expect(retenue).not.toBe(absente);
    expect(retenue).toContain('#49');
    expect(absente).not.toContain('#');
  });

  it('n’écrit aucune prévision, dans aucune langue', () => {
    // `w1-survie` a interdit les formes prédictives sur la phrase de verdict. Une checklist
    // métier est l'endroit exact où « ce local marchera » se réécrit tout seul.
    const phrases: string[] = [];
    for (const locale of LOCALES) {
      phrases.push(MODE_COPY[locale].intro, MODE_COPY[locale].checklistIntro);
      for (const id of TRADE_CHECK_IDS) {
        const copy = CHECK_COPY[locale][id];
        phrases.push(copy.name, copy.about, copy.reserve ?? '');
        for (const state of ETATS) phrases.push(checkStateText(id, state, locale));
      }
    }
    for (const phrase of phrases) {
      const interdit = findForbiddenForm(phrase);
      expect(interdit, `${interdit?.term} — ${phrase}`).toBeNull();
    }
  });
});
