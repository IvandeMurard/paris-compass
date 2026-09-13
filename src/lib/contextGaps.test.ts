import { describe, expect, it } from 'vitest';
import {
  unavailable,
  withValue,
  type AreaScores,
  type Layer,
  type Measured,
  type Origin,
  type Withholding,
} from '@/core';
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

  it('nomme la panne, pas seulement la couche qui s’est tue — w6-fiche-robuste (#156)', () => {
    // The outage of 13 September 2026, exactly as `useAddressContext` hands it over. « The
    // amenity layer did not load » is a symptom; « source injoignable » is what tells a reader
    // whether coming back tomorrow changes anything. Both halves are on the line.
    const withheld: Partial<Record<Layer, Withholding>> = {
      amenities: 'source_injoignable',
      roads: 'source_injoignable',
      premises: 'source_injoignable',
    };
    const gaps = collectGaps(
      scores({ transit: unavailable(OSM, 'The amenity layer did not load for this area.') }),
      [],
      OSM.source,
      'fr',
      withheld,
    );

    const transit = gaps.find((g) => g.key === 'missing:transit')?.text ?? '';
    expect(transit).toContain('source injoignable');
    expect(transit).toContain('The amenity layer did not load for this area.');
  });

  it('ne devine jamais une retenue de licence quand personne n’a déclaré de motif', () => {
    // The honest default, and the same one `findingsFromScores` takes: « we do not know why »
    // is a fact. Guessing a cause here would put a licence refusal on screen on an outage.
    const gaps = collectGaps(scores({ transit: unavailable(OSM, 'x') }), [], OSM.source, 'fr');
    expect(gaps.find((g) => g.key === 'missing:transit')?.text).toContain('indéterminé');
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
