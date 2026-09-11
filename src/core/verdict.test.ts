/**
 * The verdict refuses to compose over a withheld or undetermined bearing finding.
 *
 * The load-bearing test of w6-contexte (#119), and it is written as a counter-proof rather
 * than as an assertion on wording: the same call, with one bearing finding withheld, must
 * return the refusal and not the sentence. `#54 w0-conclusion` was a conclusion drawn over a
 * withholding; a test that only checked the happy sentence would have passed then too.
 */

import { describe, expect, it } from 'vitest';
import {
  BEARING_AXES,
  bandOf,
  composeVerdict,
  findingsFromScores,
  findForbiddenForm,
  unavailable,
  withValue,
  VERDICT_AXES,
  VERDICT_AXIS_ORDER,
  type AreaScores,
  type Measured,
  type Origin,
  type VerdictAxis,
  type VerdictFinding,
} from './index';

const ORIGIN: Origin = { source: 'test', licence: 'ODbL-1.0', asOf: '2026-09' };

const score = (n: number): Measured<number> => withValue(n, ORIGIN, 'derived');

/** Every axis resolved and high — the only shape that may produce a sentence. */
function fullFindings(overrides: Partial<Record<VerdictAxis, Measured<number>>> = {}) {
  return VERDICT_AXIS_ORDER.map<VerdictFinding>((axis) => ({
    axis,
    measured: overrides[axis] ?? score(85),
  }));
}

describe('composeVerdict — la règle qui porte le ticket', () => {
  it('compose une phrase et nomme les constats qu’elle a utilisés', () => {
    const verdict = composeVerdict(fullFindings());
    expect(verdict.kind).toBe('compose');
    if (verdict.kind !== 'compose') return;
    expect(verdict.used).toEqual([...BEARING_AXES]);
    // Named, and named *inside* the sentence, not only in the structure beside it. Compared
    // lowercased because the first clause is capitalised to open the sentence.
    for (const clause of verdict.clauses) {
      expect(verdict.sentence.toLowerCase()).toContain(clause.text.toLowerCase());
    }
    expect(verdict.sentence).toBe(
      'Passage soutenu, desserte forte, services à pied nombreux.',
    );
  });

  it('CONTRE-PREUVE : le même appel avec un constat porteur retenu rend le refus', () => {
    const compose = composeVerdict(fullFindings());
    const refus = composeVerdict(
      fullFindings({
        transit: unavailable<number>(ORIGIN, 'The amenity layer did not load for this area.'),
      }).map((f) =>
        f.axis === 'transit' ? { ...f, withheldBecause: 'retenue_licence' as const } : f,
      ),
    );

    expect(compose.kind).toBe('compose');
    expect(refus.kind).toBe('refus');
    if (refus.kind !== 'refus') return;
    // Not a softened sentence: nothing that composed before survives into the refusal.
    if (compose.kind === 'compose') {
      expect(refus.sentence).not.toContain('desserte forte');
      expect(refus.sentence).not.toBe(compose.sentence);
    }
    expect(refus.sentence).toContain('la desserte : retenu pour licence');
    expect(refus.missing).toEqual([
      {
        axis: 'transit',
        because: 'retenue_licence',
        reason: 'The amenity layer did not load for this area.',
      },
    ]);
    // The findings that DID resolve are not destroyed by the refusal — they are still named,
    // separately. Refusing to conclude is not refusing to inform.
    expect(refus.available).toEqual(['footfall', 'walkability']);
  });

  it('refuse aussi sur un constat porteur indéterminé, sans motif déclaré', () => {
    const verdict = composeVerdict(
      fullFindings({ footfall: unavailable<number>(ORIGIN, 'aucune donnée') }),
    );
    expect(verdict.kind).toBe('refus');
    if (verdict.kind !== 'refus') return;
    expect(verdict.missing[0]).toMatchObject({ axis: 'footfall', because: 'indetermine' });
    expect(verdict.sentence).toContain('le passage : indéterminé');
  });

  it('refuse quand un constat porteur n’a même pas été fourni', () => {
    // Composing over a finding nobody attempted is the same defect one step earlier: the
    // absence is then invisible, which is worse than a null value.
    const verdict = composeVerdict(fullFindings().filter((f) => f.axis !== 'walkability'));
    expect(verdict.kind).toBe('refus');
    if (verdict.kind !== 'refus') return;
    expect(verdict.missing.map((g) => g.axis)).toEqual(['walkability']);
  });

  it('nomme TOUS les constats porteurs manquants, pas seulement le premier', () => {
    const verdict = composeVerdict(
      fullFindings({
        footfall: unavailable<number>(ORIGIN, 'a'),
        transit: unavailable<number>(ORIGIN, 'b'),
      }),
    );
    expect(verdict.kind).toBe('refus');
    if (verdict.kind !== 'refus') return;
    expect(verdict.missing.map((g) => g.axis)).toEqual(['footfall', 'transit']);
  });

  it('un constat d’appui absent ne bloque pas le verdict, et n’est pas inventé', () => {
    const verdict = composeVerdict(
      fullFindings({ noise: unavailable<number>(ORIGIN, 'roads absent') }),
    );
    expect(verdict.kind).toBe('compose');
    if (verdict.kind !== 'compose') return;
    expect(verdict.supporting.map((c) => c.axis)).toEqual(['groceries']);
    expect(verdict.sentence).not.toContain('bruit');
  });

  it('garde les constats d’appui hors de la phrase, même présents', () => {
    const verdict = composeVerdict(fullFindings());
    if (verdict.kind !== 'compose') return;
    expect(verdict.supporting.map((c) => c.axis)).toEqual(['groceries', 'noise']);
    for (const clause of verdict.supporting) {
      expect(verdict.sentence).not.toContain(clause.text);
    }
  });

  it('ne rend jamais de note agrégée : le verdict n’a pas de champ pour en porter une', () => {
    const verdict = composeVerdict(fullFindings());
    // `docs/PERIMETRE.md` §4 : les pondérations dépendent du métier, un score unique moyenne
    // ce qui s'oppose. Une note sur 100 ne peut pas apparaître par accident si la forme du
    // retour n'en accepte pas — c'est la forme qu'on teste, pas une intention.
    expect(Object.keys(verdict)).not.toContain('score');
    expect(JSON.stringify(verdict)).not.toMatch(/\/100/);
  });

  it('compose et refuse en anglais avec les mêmes règles', () => {
    const compose = composeVerdict(fullFindings(), 'en');
    expect(compose.kind).toBe('compose');
    if (compose.kind === 'compose') {
      expect(compose.sentence).toBe(
        'Steady footfall, strong transit access, many services within walking distance.',
      );
    }
    const refus = composeVerdict(
      fullFindings({ transit: unavailable<number>(ORIGIN, 'x') }),
      'en',
    );
    if (refus.kind !== 'refus') throw new Error('expected a refusal');
    expect(refus.sentence).toContain('transit access: undetermined');
  });

  it('les deux phrases restent des observations, jamais des prévisions', () => {
    // w1-survie, appliqué au texte le plus lu du produit. `composeVerdict` passe déjà par
    // `assertObservational` — ce test tient la garde en place si quelqu'un reformule.
    const sentences = [
      composeVerdict(fullFindings()).sentence,
      composeVerdict(fullFindings(), 'en').sentence,
      composeVerdict(fullFindings({ transit: unavailable<number>(ORIGIN, 'x') })).sentence,
      composeVerdict(fullFindings({ transit: unavailable<number>(ORIGIN, 'x') }), 'en').sentence,
    ];
    for (const s of sentences) {
      expect(findForbiddenForm(s), s).toBeNull();
    }
  });
});

describe('bandOf', () => {
  it('lit le bruit sur son échelle, pas sur celle des scores', () => {
    // 70/100 d'exposition routière et 70/100 de marchabilité ne sont pas la même affirmation.
    expect(bandOf('noise', 70)).toBe('fort');
    expect(bandOf('walkability', 70)).toBe('fort');
    expect(bandOf('noise', 45)).toBe('moyen');
    expect(bandOf('walkability', 45)).toBe('moyen');
    expect(bandOf('noise', 20)).toBe('faible');
    // Sur l'échelle des scores, 20 est faible aussi — mais par une autre borne.
    expect(bandOf('walkability', 20)).toBe('faible');
  });
});

describe('findingsFromScores', () => {
  const scores = (partial: Partial<AreaScores> = {}): AreaScores => ({
    walkability: score(70),
    schools: score(70),
    healthcare: score(70),
    groceries: score(70),
    parks: score(70),
    transit: score(70),
    footfall: score(70),
    noise: score(20),
    ...partial,
  });

  it('rend un constat par axe du verdict, dans l’ordre de lecture', () => {
    expect(findingsFromScores(scores()).map((f) => f.axis)).toEqual([...VERDICT_AXIS_ORDER]);
  });

  it('attribue la retenue à la couche que l’axe lit vraiment', () => {
    const withheld = findingsFromScores(
      scores({
        footfall: unavailable<number>(ORIGIN, 'premises withheld'),
        transit: unavailable<number>(ORIGIN, 'amenities down'),
      }),
      { premises: 'retenue_licence', amenities: 'source_injoignable' },
    );
    const byAxis = new Map(withheld.map((f) => [f.axis, f]));
    // Footfall reads premises first, so the licence withholding is the one that stopped it.
    expect(byAxis.get('footfall')?.withheldBecause).toBe('retenue_licence');
    expect(byAxis.get('transit')?.withheldBecause).toBe('source_injoignable');
  });

  it('n’invente pas de motif : sans déclaration, c’est indéterminé', () => {
    const findings = findingsFromScores(scores({ transit: unavailable<number>(ORIGIN, 'x') }));
    expect(findings.find((f) => f.axis === 'transit')?.withheldBecause).toBe('indetermine');
  });

  it('ne pose aucun motif sur un constat qui a une valeur', () => {
    for (const f of findingsFromScores(scores())) {
      expect(f.withheldBecause, f.axis).toBeUndefined();
    }
  });
});

describe('la table des axes', () => {
  it('déclare exactement trois porteurs, et l’ordre de lecture les contient tous', () => {
    expect([...BEARING_AXES]).toEqual(['footfall', 'transit', 'walkability']);
    for (const axis of VERDICT_AXIS_ORDER) {
      expect(VERDICT_AXES[axis], axis).toBeDefined();
    }
    expect(VERDICT_AXIS_ORDER.length).toBe(Object.keys(VERDICT_AXES).length);
  });
});
