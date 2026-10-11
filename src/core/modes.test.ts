/**
 * Les trois modes métier — w6-modes (#36).
 *
 * Le « Fait quand » du ticket tient en une phrase — *« Le basculement de mode réordonne les
 * axes et les alertes, sans inventer de chiffre »* — et c'est une propriété de POPULATION, pas
 * une observation d'écran : une session qui bascule trois fois et regarde ne démontre rien sur
 * le quatrième axe ni sur le septième. Les contrôles ci-dessous dérivent donc leurs populations
 * de `TRADE_MODES`, `VERDICT_AXIS_ORDER` et `TRADE_CHECK_IDS`, et n'en listent aucune : un
 * quatrième mode ou un septième axe entre ici le jour où il entre dans le noyau.
 *
 * Trois choses sont tenues, et ce sont exactement les trois moitiés du critère :
 *
 *  1. **réordonne** — l'ordre d'un mode diffère de celui du noyau, et les trois diffèrent
 *     entre eux ;
 *  2. **les axes** — c'est une PERMUTATION : même population, même longueur, rien de perdu ;
 *  3. **sans inventer de chiffre** — le verdict recomposé dans l'ordre d'un mode porte les
 *     mêmes clauses, les mêmes valeurs et les mêmes axes porteurs ; et aucun chiffre de la
 *     checklist n'existe sans la provenance qui le porte.
 *
 * **Ce que ça ne rattrape pas.** Rien ici ne juge que l'ordre déclaré soit le BON pour un
 * restaurateur — c'est un arbitrage produit, écrit dans `LEAD_AXES` avec le STATUT de sa raison
 * (`w6-mode-raison`, #197) et en attente d'une décision d'Ivan. Une raison écrite n'est pas une
 * raison mesurée : ces contrôles tiennent qu'elle existe et qu'elle dit de quelle espèce elle
 * est, jamais qu'elle a raison. Et rien ici n'ouvre la page : que le composant rende bien la
 * séquence que ces fonctions renvoient est démontré ailleurs, par le bras `page`.
 */

import { describe, expect, it } from 'vitest';

import {
  LEAD_REASON_STATUSES,
  TRADE_CHECKS,
  TRADE_CHECK_IDS,
  TRADE_MODES,
  isTradeMode,
  modeAxisOrder,
  modeLeadAxes,
  resolveChecks,
  type TradeCheckId,
  type TradeFacts,
} from './modes';
import { PLU_ORIGIN, TERRASSES_ORIGIN } from './provenance';
import {
  BEARING_AXES,
  VERDICT_AXIS_ORDER,
  composeVerdict,
  type VerdictAxis,
  type VerdictFinding,
} from './verdict';
import { OSM_ORIGIN } from './provenance';

const ORIGINS = {
  terrasses: TERRASSES_ORIGIN('2026-09-01'),
  plu: PLU_ORIGIN('2024-11-20'),
};

const FACTS: TradeFacts = {
  radiusM: 25,
  total: 5,
  terrasseOui: 2,
  terrasseInconnu: 1,
  pluProtege: 5,
  pluProximite: 0,
};

/** Un relevé complet, une valeur par axe, sans aucune retenue. */
const findings = (): VerdictFinding[] =>
  VERDICT_AXIS_ORDER.map((axis) => ({
    axis,
    measured: { value: 60, ...OSM_ORIGIN('2026-09-16'), method: 'measured' as const },
  }));

describe('modeAxisOrder — réordonner, jamais filtrer', () => {
  it('rend une permutation de VERDICT_AXIS_ORDER pour chaque mode', () => {
    for (const mode of TRADE_MODES) {
      const ordre = modeAxisOrder(mode);
      expect(ordre.length, mode).toBe(VERDICT_AXIS_ORDER.length);
      expect([...ordre].sort(), mode).toEqual([...VERDICT_AXIS_ORDER].sort());
    }
  });

  it('rend l’ordre du noyau quand aucun mode n’est choisi', () => {
    expect(modeAxisOrder(null)).toEqual(VERDICT_AXIS_ORDER);
  });

  it('bascule vraiment : chaque mode diffère du noyau et les trois diffèrent entre eux', () => {
    const rendus = TRADE_MODES.map((mode) => modeAxisOrder(mode).join(','));
    for (const [i, mode] of TRADE_MODES.entries()) {
      expect(rendus[i], mode).not.toBe(VERDICT_AXIS_ORDER.join(','));
    }
    expect(new Set(rendus).size).toBe(TRADE_MODES.length);
  });

  it('place en queue un axe qu’aucun mode ne nomme, plutôt que de le perdre', () => {
    // La contre-preuve du filtrage : l'axe que le noyau lit en dernier n'est mené par aucun
    // mode aujourd'hui, et il doit rester présent partout. Dérivé, jamais nommé — le jour où
    // un mode le mène, ce contrôle porte sur le suivant.
    // La tête d'un mode est `modeLeadAxes`, jamais « les trois premiers » : le jour où un mode
    // mène deux axes ou quatre, ce contrôle suit sans qu'on y pense.
    const menes = new Set(TRADE_MODES.flatMap((mode) => modeLeadAxes(mode).map((e) => e.axis)));
    const jamaisMene = VERDICT_AXIS_ORDER.filter((axis) => !menes.has(axis));
    for (const mode of TRADE_MODES) {
      for (const axis of jamaisMene) {
        expect(modeAxisOrder(mode), `${mode}/${axis}`).toContain(axis);
      }
    }
  });
});

describe('modeLeadAxes — un ordre affiché porte sa raison', () => {
  it('est la tête de l’ordre, et pas une seconde liste à tenir en phase', () => {
    // Deux lectures d'une même table. Si elles divergeaient, l'écran poserait la raison d'un
    // axe à côté d'un autre — une faute qu'aucun des deux ne rendrait visible tout seul.
    for (const mode of TRADE_MODES) {
      const menes = modeLeadAxes(mode);
      expect(menes.length, mode).toBeGreaterThan(0);
      expect(modeAxisOrder(mode).slice(0, menes.length), mode).toEqual(menes.map((e) => e.axis));
      expect(new Set(menes.map((e) => e.axis)).size, mode).toBe(menes.length);
    }
  });

  it('donne à chaque axe de tête un statut de l’énumération, jamais une phrase', () => {
    // Le critère 2 du ticket : « le libellé de statut vient d'une énumération, jamais d'une
    // phrase à relire ». Ce qui est tenu ici est la moitié noyau ; `modeText.test.ts` tient
    // l'autre, où le libellé se lit depuis ce statut et non depuis la raison.
    for (const mode of TRADE_MODES) {
      for (const { axis, status } of modeLeadAxes(mode)) {
        expect(LEAD_REASON_STATUSES, `${mode}/${axis}`).toContain(status);
      }
    }
  });

  it('n’annonce « mesuré » sur aucun axe, parce qu’aucune mesure n’a été faite', () => {
    // Le ticket est né d'une recommandation retirée le jour même — « le bruit est corrélé au
    // passage », affirmé sans rien avoir mesuré. `mesure` est le seul des trois statuts qui
    // engage une mesure exécutée, et aucun axe ne le porte aujourd'hui.
    //
    // **Ce contrôle rougit le jour où quelqu'un l'écrit, et c'est ce qu'on lui demande** : il
    // ne sait pas lire une mesure, donc il exige qu'on vienne ici dire où elle est.
    const mesures = TRADE_MODES.flatMap((mode) =>
      modeLeadAxes(mode)
        .filter((e) => e.status === 'mesure')
        .map((e) => `${mode}/${e.axis}`),
    );
    expect(mesures).toEqual([]);
  });
});

describe('composeVerdict — l’ordre change, la phrase dit la même chose', () => {
  it('garde les mêmes clauses, les mêmes valeurs et les mêmes axes porteurs', () => {
    const noyau = composeVerdict(findings(), 'fr');
    expect(noyau.kind).toBe('compose');
    if (noyau.kind !== 'compose') return;

    for (const mode of TRADE_MODES) {
      const rendu = composeVerdict(findings(), 'fr', modeAxisOrder(mode));
      expect(rendu.kind, mode).toBe('compose');
      if (rendu.kind !== 'compose') continue;

      // Même population d'axes porteurs — l'ordre ne peut pas en retirer un.
      expect([...rendu.used].sort(), mode).toEqual([...noyau.used].sort());
      expect([...rendu.used].sort(), mode).toEqual([...BEARING_AXES].sort());
      // Même texte pour chaque axe, donc aucune valeur n'a bougé.
      const texte = (v: typeof rendu) =>
        new Map([...v.clauses, ...v.supporting].map((c) => [c.axis, c.text]));
      expect(texte(rendu), mode).toEqual(texte(noyau));
      // Même population de clauses portées ET de clauses d'appui.
      expect([...rendu.supporting].map((c) => c.axis).sort(), mode).toEqual(
        [...noyau.supporting].map((c) => c.axis).sort(),
      );
    }
  });

  it('la phrase d’un mode est une permutation de celle du noyau, pas un autre texte', () => {
    const noyau = composeVerdict(findings(), 'fr');
    for (const mode of TRADE_MODES) {
      const rendu = composeVerdict(findings(), 'fr', modeAxisOrder(mode));
      if (noyau.kind !== 'compose' || rendu.kind !== 'compose') throw new Error('verdict attendu');
      const morceaux = (s: string) => s.replace(/\.$/, '').split(', ').map((m) => m.toLowerCase()).sort();
      expect(morceaux(rendu.sentence), mode).toEqual(morceaux(noyau.sentence));
    }
  });

  it('un refus nomme les mêmes manques, quel que soit le mode', () => {
    const retenu = findings().map((f) =>
      f.axis === 'density'
        ? { ...f, measured: { ...f.measured, value: null }, withheldBecause: 'hors_corpus' as const }
        : f,
    );
    const noyau = composeVerdict(retenu, 'fr');
    expect(noyau.kind).toBe('refus');
    for (const mode of TRADE_MODES) {
      const rendu = composeVerdict(retenu, 'fr', modeAxisOrder(mode));
      expect(rendu.kind, mode).toBe('refus');
      if (rendu.kind !== 'refus' || noyau.kind !== 'refus') continue;
      expect(rendu.missing.map((g) => g.axis).sort(), mode).toEqual(
        noyau.missing.map((g) => g.axis).sort(),
      );
      expect([...rendu.available].sort(), mode).toEqual([...noyau.available].sort());
    }
  });

  it('un ordre partiel complète avec le noyau plutôt que de perdre un axe', () => {
    // Personne n'appelle `composeVerdict` avec un ordre partiel aujourd'hui — `modeAxisOrder`
    // rend toujours une permutation. Le contrôle existe pour l'appelant suivant : un ordre qui
    // sélectionnerait changerait ce que la phrase AFFIRME, et pas seulement sa séquence.
    const rendu = composeVerdict(findings(), 'fr', ['noise']);
    if (rendu.kind !== 'compose') throw new Error('verdict attendu');
    expect([...rendu.used].sort()).toEqual([...BEARING_AXES].sort());
  });
});

describe('resolveChecks — une checklist, jamais un score', () => {
  it('visite tous les identifiants déclarés, sans en oublier ni en inventer', () => {
    const vus = new Set<TradeCheckId>(
      TRADE_MODES.flatMap((mode) => TRADE_CHECKS[mode].map((r) => r.id)),
    );
    expect([...vus].sort()).toEqual([...TRADE_CHECK_IDS].sort());
  });

  it('rend exactement la checklist du mode, dans l’ordre du ticket', () => {
    for (const mode of TRADE_MODES) {
      const rendus = resolveChecks(mode, FACTS, ORIGINS).map((c) => c.id);
      expect(rendus, mode).toEqual(TRADE_CHECKS[mode].map((r) => r.id));
    }
  });

  it('ne rend jamais un chiffre sans provenance, ni une provenance sans chiffre', () => {
    for (const mode of TRADE_MODES) {
      for (const check of resolveChecks(mode, FACTS, ORIGINS)) {
        if (check.state.kind === 'constate') {
          expect(check.measured, check.id).toBeDefined();
          expect(check.measured?.value, check.id).toBe(check.state.count);
          expect(check.measured?.source.length, check.id).toBeGreaterThan(0);
          expect(check.measured?.licence.length, check.id).toBeGreaterThan(0);
          expect(check.measured?.asOf.length, check.id).toBeGreaterThan(0);
        } else {
          expect(check.measured?.value ?? null, check.id).toBeNull();
        }
      }
    }
  });

  it('relaie les comptes du corpus tels quels — aucune arithmétique de mode', () => {
    const restauration = resolveChecks('restauration', FACTS, ORIGINS);
    const terrasse = restauration.find((c) => c.id === 'terrasse');
    expect(terrasse?.state).toEqual({ kind: 'constate', count: 2, of: 5, radiusM: 25, indetermine: 1 });

    // Le même fait, lu depuis deux modes, rend le même compte : c'est « sans inventer de
    // chiffre » dans sa forme la plus directe — le mode choisit ce qui est montré, jamais
    // combien il y en a.
    const boutique = resolveChecks('boutique', FACTS, ORIGINS).find((c) => c.id === 'plu_lineaire');
    const artisanat = resolveChecks('artisanat', FACTS, ORIGINS).find(
      (c) => c.id === 'plu_artisanat',
    );
    expect(boutique?.state).toEqual({ kind: 'constate', count: 5, of: 5, radiusM: 25, indetermine: 0 });
    expect(artisanat?.state).toEqual({ kind: 'constate', count: 0, of: 5, radiusM: 25, indetermine: 0 });
  });

  it('distingue un rayon vide d’une couche absente', () => {
    const vide = resolveChecks('boutique', { ...FACTS, total: 0 }, ORIGINS).find(
      (c) => c.id === 'plu_lineaire',
    );
    expect(vide?.state).toEqual({ kind: 'aucun_local', radiusM: 25 });
    expect(vide?.measured).toBeUndefined();

    const absente = resolveChecks('boutique', null, ORIGINS).find((c) => c.id === 'plu_lineaire');
    expect(absente?.state.kind).toBe('couche_absente');
    // La couche absente porte quand même sa provenance, avec un motif et aucune valeur : c'est
    // la règle de `unavailable()` — une absence n'est pas un zéro.
    expect(absente?.measured?.value).toBeNull();
    expect(absente?.measured?.missing).toEqual({ kind: 'couche_absente', layer: 'premises' });
  });

  it('un contrôle sans source le dit, et nomme ce qui lui manque', () => {
    for (const mode of TRADE_MODES) {
      for (const [i, rule] of TRADE_CHECKS[mode].entries()) {
        const rendu = resolveChecks(mode, FACTS, ORIGINS)[i];
        if (!rule.gap) continue;
        expect(rendu.state, `${mode}/${rule.id}`).toEqual({ kind: 'sans_source', gap: rule.gap });
        expect(rendu.measured, `${mode}/${rule.id}`).toBeUndefined();
      }
    }
  });

  it('une retenue de licence n’est pas une absence de source', () => {
    // La seule ligne des trois checklists où le chiffre EXISTE en base et ne peut pas être
    // servi. Confondre les deux effacerait la question posée à l'APUR.
    const rotation = TRADE_CHECKS.boutique.find((r) => r.id === 'rotation_metier');
    expect(rotation?.gap?.retenueLicence).toBe(true);
    const sansSource = TRADE_CHECKS.restauration.find((r) => r.id === 'cuisine');
    expect(sansSource?.gap?.retenueLicence).toBeUndefined();
    expect(sansSource?.gap?.issue).toBeNull();
  });

  it('sans origine, un contrôle du corpus se tait au lieu d’inventer une source', () => {
    const sansOrigine = resolveChecks('restauration', FACTS, {}).find((c) => c.id === 'terrasse');
    expect(sansOrigine?.state.kind).toBe('couche_absente');
    expect(sansOrigine?.measured).toBeUndefined();
  });
});

describe('isTradeMode — ce qui arrive de l’URL', () => {
  it('accepte les trois et rien d’autre', () => {
    for (const mode of TRADE_MODES) expect(isTradeMode(mode), mode).toBe(true);
    for (const autre of ['', 'RESTAURATION', 'restaurant', 'tous', '../boutique']) {
      expect(isTradeMode(autre), autre).toBe(false);
    }
  });
});

/** Un axe déclaré par un mode et inconnu du noyau serait un ordre qui ment. */
describe('les listes déclarées restent dans la population du noyau', () => {
  it('chaque axe mené par un mode est un axe du noyau', () => {
    const connus = new Set<VerdictAxis>(VERDICT_AXIS_ORDER);
    for (const mode of TRADE_MODES) {
      for (const axis of modeAxisOrder(mode)) expect(connus.has(axis), `${mode}/${axis}`).toBe(true);
    }
  });
});
