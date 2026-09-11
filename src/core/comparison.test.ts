import { describe, expect, expectTypeOf, it } from 'vitest';

import { compareAddresses, type Comparison } from './comparison';
import { unavailable, withValue, type Measured, type Origin } from './provenance';
import { VERDICT_AXIS_ORDER, type VerdictAxis, type VerdictFinding } from './verdict';

const OSM: Origin = { source: 'OpenStreetMap via Overpass', licence: 'ODbL-1.0', asOf: '2026-09-11' };

const value = (n: number): Measured<number> => withValue(n, OSM, 'derived');
const absent = (why: string): Measured<number> => unavailable<number>(OSM, why);

/** A full set of findings, every axis resolved, with the ones named in `partial` overridden. */
const findings = (partial: Partial<Record<VerdictAxis, Measured<number>>> = {}, base = 75): VerdictFinding[] =>
  VERDICT_AXIS_ORDER.map((axis) => ({ axis, measured: partial[axis] ?? value(base) }));

describe('compareAddresses', () => {
  it('rend une ligne par axe, dans l’ordre de lecture du noyau', () => {
    const c = compareAddresses(findings(), findings());
    expect(c.rows.map((r) => r.axis)).toEqual([...VERDICT_AXIS_ORDER]);
  });

  it('compose le verdict de chaque côté avec la même fonction que la fiche seule', () => {
    const c = compareAddresses(findings({}, 80), findings({}, 20));
    expect(c.a.verdict.kind).toBe('compose');
    expect(c.b.verdict.kind).toBe('compose');
    // Deux bandes différentes sur la même formulation d’axe : la prose vient de clauseText.
    expect(c.a.verdict.sentence).not.toBe(c.b.verdict.sentence);
  });

  it('refuse de comparer un axe qu’un seul côté porte', () => {
    const c = compareAddresses(findings(), findings({ footfall: absent('BDCom 2020 est retenu pour licence.') }));
    const row = c.rows.find((r) => r.axis === 'footfall');
    expect(row?.comparable).toBe(false);
    expect(c.incomparableAxes).toContain('footfall');
    expect(c.comparableAxes).not.toContain('footfall');
  });

  it('reprend la raison du noyau sans la réécrire', () => {
    const reason = 'This point lies outside the BDCom corpus.';
    const c = compareAddresses(findings(), findings({ footfall: absent(reason) }));
    const row = c.rows.find((r) => r.axis === 'footfall');
    expect(row?.b.kind === 'absent' && row.b.reason).toBe(reason);
  });

  it('dit que la paire elle-même n’apprend rien quand aucun porteur ne se compare', () => {
    const withheld = { footfall: absent('x'), transit: absent('x'), walkability: absent('x') };
    const c = compareAddresses(findings(), findings(withheld));
    expect(c.bearingComparable).toBe(false);
    // Les axes d’appui, eux, restent comparables : refuser le verdict n’est pas refuser d’informer.
    expect(c.comparableAxes).toContain('groceries');
  });

  it('ne rend ni note, ni classement, ni écart — aucun champ ne pourrait en porter un', () => {
    const c = compareAddresses(findings({}, 90), findings({}, 10));
    const keys = Object.keys(c);
    for (const forbidden of ['score', 'winner', 'rank', 'delta', 'total', 'best']) {
      expect(keys.some((k) => k.toLowerCase().includes(forbidden))).toBe(false);
    }
    // Et rien dans une ligne non plus.
    for (const row of c.rows) {
      expect(Object.keys(row).sort()).toEqual(['a', 'axis', 'b', 'bearing', 'comparable']);
    }
  });
});

describe('la borne de deux tient dans la structure', () => {
  it('la signature prend deux jeux de constats, jamais une liste', () => {
    // La contre-preuve qui compte : si `compareAddresses` acceptait un tableau de N adresses,
    // cette assertion de type tomberait. C'est le refus du courtier rendu mécanique — un
    // commentaire disant « pas plus de deux » se supprime sans que rien ne rougisse.
    expectTypeOf(compareAddresses).parameter(0).toEqualTypeOf<readonly VerdictFinding[]>();
    expectTypeOf(compareAddresses).parameter(1).toEqualTypeOf<readonly VerdictFinding[]>();
    expectTypeOf(compareAddresses).parameters.toMatchTypeOf<
      [readonly VerdictFinding[], readonly VerdictFinding[], ...unknown[]]
    >();
  });

  it('le résultat nomme deux côtés et n’a pas de place pour un troisième', () => {
    const c: Comparison = compareAddresses(findings(), findings());
    expect(Object.keys(c).filter((k) => /^[a-z]$/.test(k)).sort()).toEqual(['a', 'b']);
    expectTypeOf<Comparison>().toHaveProperty('a');
    expectTypeOf<Comparison>().toHaveProperty('b');
    // @ts-expect-error — il n'y a pas de troisième côté, et c'est le ticket qui l'exige.
    expectTypeOf<Comparison>().toHaveProperty('c');
  });
});
