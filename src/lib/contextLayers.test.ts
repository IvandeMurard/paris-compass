import { describe, expect, it } from 'vitest';
import {
  VERDICT_AXES,
  VERDICT_AXIS_ORDER,
  unavailable,
  withValue,
  type AreaScores,
  type Layer,
  type Measured,
  type Origin,
} from '@/core';
import { drawableLayers, pendingAxes, resolvedAxes } from './contextLayers';

const OSM: Origin = { source: 'OpenStreetMap via Overpass', licence: 'ODbL-1.0', asOf: '2026-09-11' };
const plain = (n: number): Measured<number> => withValue(n, OSM, 'derived');
const absent = (layer: Layer): Measured<number> =>
  unavailable<number>(OSM, { kind: 'couche_absente', layer });

const scores = (partial: Partial<AreaScores> = {}): AreaScores => ({
  density: plain(65),
  services: plain(65),
  rail: plain(65),
  alimentaire: plain(65),
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

const ALL: readonly Layer[] = ['amenities', 'roads', 'premises', 'services', 'stations'];

describe('resolvedAxes', () => {
  it('ne retient que les axes qui portent un chiffre', () => {
    const withheld = absent('premises');
    expect(resolvedAxes(scores({ footfall: withheld }))).not.toContain('footfall');
    expect(resolvedAxes(scores())).toEqual([...VERDICT_AXIS_ORDER]);
  });
});

describe('drawableLayers', () => {
  it('dérive les couches des axes affichés, jamais d’une liste écrite à la main', () => {
    // La preuve de la dérivation : la vérité comparée est VERDICT_AXES, pas un littéral.
    const expected = new Set(VERDICT_AXIS_ORDER.flatMap((a) => [...VERDICT_AXES[a].layers]));
    expect(drawableLayers(scores(), ALL)).toEqual(expected);
  });

  it('retire la couche d’un axe retenu — un point qui n’a rien illustré ne se dessine pas', () => {
    // `density` et `footfall` tombent : il ne reste rien qui lise `premises`. Les deux, depuis
    // w6-fiche-corpus (#157) — un seul suffisait quand `footfall` était le seul à lire cette
    // couche, et c'est le genre de test qui passe au vert en cessant de prouver son énoncé.
    const withheld = absent('premises');
    const layers = drawableLayers(
      scores({
        density: withheld,
        footfall: withheld,
        services: withheld,
        alimentaire: withheld,
        rail: withheld,
      }),
      ALL,
    );
    expect(layers.has('premises')).toBe(false);
    expect(layers.has('roads')).toBe(true); // le bruit reste, et il lit `roads`
  });

  it('ne dessine pas une couche qui n’a pas chargé, même si un axe a abouti', () => {
    expect(drawableLayers(scores(), ['amenities']).has('premises')).toBe(false);
    expect(drawableLayers(scores(), ['amenities']).has('roads')).toBe(false);
    // Et depuis w6-amenites-corpus les deux couches du corpus suivent la même règle : `amenities`
    // seul chargé ne dessine plus RIEN, parce que plus aucun axe du verdict ne lit cette couche.
    expect(drawableLayers(scores(), ['amenities']).size).toBe(0);
  });

  it('ne dessine rien quand rien n’a abouti', () => {
    const nothing = absent('amenities');
    const blank = Object.fromEntries(
      Object.keys(scores()).map((k) => [k, nothing]),
    ) as unknown as AreaScores;
    expect(drawableLayers(blank, ALL).size).toBe(0);
  });
});

describe('pendingAxes — w6-fiche-delai (#180)', () => {
  it('rend l’axe dont TOUTES les couches voyagent encore, et la vérité comparée est VERDICT_AXES', () => {
    const attendu = VERDICT_AXIS_ORDER.filter((a) =>
      VERDICT_AXES[a].layers.every((l) => l === 'amenities' || l === 'roads'),
    );
    expect([...pendingAxes(['amenities', 'roads'])]).toEqual(attendu);
    // Et depuis w6-amenites-corpus cet ensemble vaut exactement `noise` : c'est la propriété
    // qui autorise la fiche à rendre son verdict sans Overpass. Le jour où un axe porteur
    // reviendrait sur cette couche, cette ligne rougirait avant l'écran.
    expect(attendu).toEqual(['noise']);
    expect(attendu.every((a) => !VERDICT_AXES[a].bearing)).toBe(true);
  });

  it('ne rend rien quand rien ne voyage, ni un axe dont une seule couche voyage', () => {
    expect(pendingAxes([]).size).toBe(0);
    // `footfall` lit `premises` ET `stations` : une moitié en vol ne rend pas l'axe « en cours »,
    // c'est `scoreLocation` qui décide ce que vaut un axe à moitié servi.
    expect(pendingAxes(['premises']).has('footfall')).toBe(false);
  });
});
