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
  LEAD_REASON_STATUSES,
  TRADE_CHECKS,
  TRADE_CHECK_IDS,
  TRADE_MODES,
  findForbiddenForm,
  modeAxisOrder,
  modeLeadAxes,
  resolveChecks,
  type TradeCheckState,
  type TradeFacts,
} from '@/core';
import { PLU_ORIGIN, TERRASSES_ORIGIN } from '@/core';
import {
  CHECK_COPY,
  LEAD_REASON_COPY,
  LEAD_STATUS_LABELS,
  MODE_COPY,
  MODE_NAMES,
  checkStateText,
  leadReasonText,
} from './modeText';
import { LOCALES } from './locale';

/** Les axes de tête, dérivés de `LEAD_AXES` et jamais listés ici. */
const MENES = TRADE_MODES.flatMap((mode) => modeLeadAxes(mode).map((entry) => ({ mode, ...entry })));

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

describe('la raison d’un axe de tête — w6-mode-raison (#197)', () => {
  it('couvre exactement les axes de tête, dans les deux langues et dans les DEUX SENS', () => {
    // C'est le critère 1 et la contre-preuve du critère 3 dans un seul contrôle. Sens 1 : un
    // mode qui gagnerait un axe de tête sans raison rougit au lieu de s'afficher nu. Sens 2 :
    // une raison restée derrière un axe qui ne mène plus rougit aussi — sans quoi le fichier de
    // mots deviendrait une seconde liste, juste le jour où on l'écrit.
    const menes = new Set(MENES.map((l) => `${l.mode}/${l.axis}`));
    expect(menes.size).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      const ecrites = new Set(
        TRADE_MODES.flatMap((mode) =>
          Object.keys(LEAD_REASON_COPY[locale][mode]).map((axis) => `${mode}/${axis}`),
        ),
      );
      for (const cle of menes) {
        expect(ecrites.has(cle), `axe de tête sans raison : ${cle} [${locale}]`).toBe(true);
      }
      for (const cle of ecrites) {
        expect(menes.has(cle), `raison orpheline : ${cle} [${locale}]`).toBe(true);
      }
    }
  });

  it('rend une raison lisible et SANS CHIFFRE pour chaque axe de tête', () => {
    // Le contrat du module : aucun nombre dans la prose. Un « 25 m » écrit ici serait un
    // littéral que rien ne tient en phase avec le noyau, et un chiffre sans provenance.
    for (const locale of LOCALES) {
      for (const { mode, axis } of MENES) {
        const rendu = leadReasonText(mode, axis, locale);
        expect(rendu, `${locale}/${mode}/${axis}`).not.toBeNull();
        expect(rendu!.reason.length, `${locale}/${mode}/${axis}`).toBeGreaterThan(40);
        expect(rendu!.reason, `${locale}/${mode}/${axis}`).not.toMatch(/\d/u);
        expect(rendu!.label.length, `${locale}/${mode}/${axis}`).toBeGreaterThan(5);
      }
    }
  });

  it('rend null pour un axe qui ne mène pas, plutôt qu’une phrase par défaut', () => {
    // La contre-preuve du premier contrôle : si `leadReasonText` inventait une raison pour un
    // axe quelconque, la correspondance ci-dessus serait vraie sans rien dire.
    const menes = new Set(MENES.map((l) => `${l.mode}/${l.axis}`));
    const suiveurs = TRADE_MODES.flatMap((mode) =>
      modeAxisOrder(mode)
        .filter((axis) => !menes.has(`${mode}/${axis}`))
        .map((axis) => ({ mode, axis })),
    );
    expect(suiveurs.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      for (const { mode, axis } of suiveurs) {
        expect(leadReasonText(mode, axis, locale), `${locale}/${mode}/${axis}`).toBeNull();
      }
    }
  });

  it('donne un libellé à chaque statut de l’énumération, dans les deux langues', () => {
    // Critère 2 : la population des libellés est `LEAD_REASON_STATUSES`, donc un quatrième
    // statut ajouté au noyau entre ici le jour où il y entre.
    for (const locale of LOCALES) {
      for (const status of LEAD_REASON_STATUSES) {
        expect(LEAD_STATUS_LABELS[locale][status].length, `${locale}/${status}`).toBeGreaterThan(5);
      }
    }
    expect(new Set(Object.values(LEAD_STATUS_LABELS.fr)).size).toBe(LEAD_REASON_STATUSES.length);
    expect(new Set(Object.values(LEAD_STATUS_LABELS.en)).size).toBe(LEAD_REASON_STATUSES.length);
  });

  it('lit le statut depuis l’énumération et non depuis la phrase', () => {
    // Le libellé rendu doit être exactement celui du statut porté par `LEAD_AXES` — pas une
    // phrase qu'il faudrait relire pour savoir de quelle espèce de claim il s'agit.
    for (const locale of LOCALES) {
      for (const { mode, axis, status } of MENES) {
        expect(leadReasonText(mode, axis, locale)!.status, `${locale}/${mode}/${axis}`).toBe(
          LEAD_STATUS_LABELS[locale][status],
        );
      }
    }
  });

  it('dit « non mesuré à ce jour » depuis le statut, dans les deux langues', () => {
    // Critère 4, première moitié. La mention appartient au libellé du statut : écrite dans la
    // raison, elle serait une phrase qu'une réécriture peut emporter sans que rien ne rougisse.
    expect(LEAD_STATUS_LABELS.fr.mesurable).toMatch(/non mesur/iu);
    expect(LEAD_STATUS_LABELS.en.mesurable).toMatch(/not measured/iu);
  });

  it('nomme ce qui trancherait exactement quand le statut est « mesurable »', () => {
    // Critère 4, seconde moitié : le cas 2 « ouvre la porte à qui voudra le faire ». Un
    // arbitrage n'en porte pas — promettre une mesure sur un jugement serait le même maquillage
    // dans l'autre sens.
    for (const locale of LOCALES) {
      for (const { mode, axis, status } of MENES) {
        const rendu = leadReasonText(mode, axis, locale)!;
        if (status === 'mesurable') {
          expect(rendu.settles?.length ?? 0, `${locale}/${mode}/${axis}`).toBeGreaterThan(40);
          expect(rendu.settlesLabel?.length ?? 0, `${locale}/${mode}/${axis}`).toBeGreaterThan(5);
        } else {
          expect(rendu.settles, `${locale}/${mode}/${axis}`).toBeUndefined();
          expect(rendu.settlesLabel, `${locale}/${mode}/${axis}`).toBeUndefined();
        }
      }
    }
    expect(MENES.filter((l) => l.status === 'mesurable').length).toBeGreaterThan(0);
  });

  it('n’affirme aucune corrélation que personne n’a mesurée', () => {
    // La faute exacte qui a ouvert ce ticket, le 16 septembre 2026 : « le bruit est corrélé au
    // passage », recommandé puis retiré le jour même, rien n'ayant été mesuré. Seul un axe au
    // statut `mesure` — il n'en existe aucun — pourrait porter un tel mot, puisque lui seul
    // cite une mesure.
    const CORRELATION = /corr[eé]l|correlat|va de pair|goes hand in hand/iu;

    // La contre-preuve : une règle qu'on n'a jamais vue rougir est une règle dont on ne sait pas
    // si elle regarde quelque chose.
    expect('Le bruit est corrélé au passage.').toMatch(CORRELATION);
    expect('Noise correlates with footfall.').toMatch(CORRELATION);

    for (const locale of LOCALES) {
      for (const { mode, axis, status } of MENES) {
        if (status === 'mesure') continue;
        const rendu = leadReasonText(mode, axis, locale)!;
        expect(rendu.reason, `${locale}/${mode}/${axis}`).not.toMatch(CORRELATION);
        expect(rendu.settles ?? '', `${locale}/${mode}/${axis}`).not.toMatch(CORRELATION);
      }
    }
  });

  it('n’écrit aucune prévision, dans aucune langue', () => {
    // Même interdit que les phrases de la checklist : une raison est l'endroit exact où « ce
    // local marchera » se réécrit tout seul.
    for (const locale of LOCALES) {
      for (const { mode, axis } of MENES) {
        const rendu = leadReasonText(mode, axis, locale)!;
        for (const phrase of [rendu.label, rendu.status, rendu.reason, rendu.settlesLabel ?? '', rendu.settles ?? '']) {
          const interdit = findForbiddenForm(phrase);
          expect(interdit, `${interdit?.term} — ${phrase}`).toBeNull();
        }
      }
    }
  });
});
