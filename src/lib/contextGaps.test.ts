import { describe, expect, it } from 'vitest';
import { unavailable, withValue, type AreaScores, type Layer, type Measured, type Origin } from '@/core';
import { collectGaps } from './contextGaps';

const OSM: Origin = { source: 'OpenStreetMap via Overpass', licence: 'ODbL-1.0', asOf: '2026-09-10' };

const plain = (n: number): Measured<number> => withValue(n, OSM, 'derived');
const withNote = (n: number, note: string): Measured<number> => withValue(n, OSM, 'estimated', note);

const scores = (partial: Partial<AreaScores> = {}): AreaScores => ({
  walkability: plain(70),
  schools: plain(70),
  healthcare: plain(70),
  groceries: plain(70),
  parks: plain(70),
  transit: plain(70),
  footfall: plain(60),
  noise: plain(20),
  ...partial,
});

const ALL: readonly Layer[] = ['amenities', 'roads', 'premises'];

describe('collectGaps', () => {
  it('nomme la raison écrite par le noyau, sans la réécrire', () => {
    const reason = 'The road layer did not load for this area, so exposure could not be modelled.';
    const gaps = collectGaps(scores({ noise: unavailable(OSM, reason) }), ['amenities', 'premises'], OSM.source, 'fr');
    expect(gaps.find((g) => g.key === 'note:noise')).toBeUndefined();
    expect(gaps.find((g) => g.key === 'missing:noise')?.text).toContain(reason);
  });

  it('remonte la réserve d’un chiffre présent', () => {
    const gaps = collectGaps(scores({ footfall: withNote(60, 'proxy, pas une mesure') }), ALL, OSM.source, 'fr');
    expect(gaps.find((g) => g.key === 'note:footfall')?.text).toContain('proxy, pas une mesure');
  });

  it('ne compte pas deux fois une couche absente', () => {
    // Sa disparition est déjà nommée axe par axe ; répéter la source par-dessus compterait
    // le même trou deux fois.
    const absent = collectGaps(
      scores({ footfall: unavailable(OSM, 'premises absent') }),
      ['amenities', 'roads'],
      OSM.source,
      'fr',
    );
    expect(absent.some((g) => g.key === 'premises-source')).toBe(false);
    expect(collectGaps(scores(), ALL, OSM.source, 'fr').some((g) => g.key === 'premises-source')).toBe(true);
  });

  it('nomme la source réellement lue pour les locaux', () => {
    const gaps = collectGaps(scores(), ALL, OSM.source, 'fr');
    expect(gaps.find((g) => g.key === 'premises-source')?.text).toContain('OpenStreetMap via Overpass');
  });

  it('porte toujours l’absence de loyer commercial, quel que soit le point', () => {
    // Vraie du pays, pas du point — et c'est la question que tout visiteur apporte.
    for (const s of [scores(), scores({ transit: unavailable(OSM, 'x') })]) {
      expect(collectGaps(s, ALL, OSM.source, 'fr').some((g) => g.key === 'commercial-rent')).toBe(true);
    }
  });

  it('n’invente aucun trou sur un point où tout a répondu et rien n’a de réserve', () => {
    const gaps = collectGaps(scores(), ALL, OSM.source, 'fr');
    // Deux seulement : la source des locaux, et le loyer commercial. Aucun axe n'en ajoute.
    expect(gaps.map((g) => g.key)).toEqual(['premises-source', 'commercial-rent']);
  });

  it('rend la même structure en anglais', () => {
    const fr = collectGaps(scores({ transit: unavailable(OSM, 'x') }), ALL, OSM.source, 'fr');
    const en = collectGaps(scores({ transit: unavailable(OSM, 'x') }), ALL, OSM.source, 'en');
    expect(en.map((g) => g.key)).toEqual(fr.map((g) => g.key));
    expect(en.find((g) => g.key === 'commercial-rent')?.text).not.toBe(
      fr.find((g) => g.key === 'commercial-rent')?.text,
    );
  });
});
