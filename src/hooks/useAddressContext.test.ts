/**
 * Ce que la fiche de contexte lit, et ce qui lui reste quand un miroir tombe —
 * w6-fiche-corpus (#157).
 *
 * **Le contrôle qui porte le ticket est le deuxième**, et il est écrit en contre-preuve :
 * miroirs Overpass injoignables, la fiche doit rendre QUAND MÊME un constat, et ce constat
 * doit porter « APUR BDCom 2023 ». Le 13 septembre 2026 tous les axes de cette page portaient
 * `uniformOrigins(OSM_ORIGIN(today()))`, et un test qui n'aurait vérifié que le chemin heureux
 * serait passé au vert ce jour-là aussi — la fiche décorait OpenStreetMap et la porte était
 * entièrement verte.
 *
 * Aucun réseau : les deux sources sont bouchonnées, et c'est ce qui permet de jouer les
 * combinaisons qu'on ne peut pas provoquer sur le distant — un millésime retenu, notamment,
 * qui n'existe pas pour un appelant anonyme sur 2023.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AmenityCategory, PremisePoint } from '@/core';

const fetchOverpassSnapshot = vi.fn();
const fetchCorpusPremises = vi.fn();
const fetchPremisesOrigin = vi.fn();
const fetchActivityTransitions = vi.fn();
const fetchCorpusServices = vi.fn();
const fetchCorpusStation = vi.fn();
const fetchStationOrigin = vi.fn();

vi.mock('@/services/opendata/overpass', () => ({
  fetchOverpassSnapshot: (...args: unknown[]) => fetchOverpassSnapshot(...args),
}));

vi.mock('@/services/compass/addressCorpus', async () => {
  const actual = await vi.importActual<typeof import('@/services/compass/addressCorpus')>(
    '@/services/compass/addressCorpus',
  );
  return {
    ...actual,
    fetchCorpusPremises: (...args: unknown[]) => fetchCorpusPremises(...args),
    fetchPremisesOrigin: (...args: unknown[]) => fetchPremisesOrigin(...args),
    fetchActivityTransitions: (...args: unknown[]) => fetchActivityTransitions(...args),
    fetchCorpusServices: (...args: unknown[]) => fetchCorpusServices(...args),
    fetchCorpusStation: (...args: unknown[]) => fetchCorpusStation(...args),
    fetchStationOrigin: (...args: unknown[]) => fetchStationOrigin(...args),
  };
});

const { fetchAddressContext } = await import('./useAddressContext');
const { CorpusUnavailable } = await import('@/services/compass/addressCorpus');
const { composeVerdict, findingsFromScores } = await import('@/core');
const { BDCOM_ORIGIN, IDFM_ORIGIN } = await import('@/core');

const POINT = { lat: 48.8631, lng: 2.3621 };

/** La provenance que `compass_vintages` rend pour 2023 — relevée le 14 septembre 2026. */
const BDCOM_2023 = BDCOM_ORIGIN(2023, 'ODbL-1.0', '2023-06');

/** La provenance que `ingestion_run` rend pour `idfm` — relevée le 15 septembre 2026. */
const IDFM_2026 = IDFM_ORIGIN('2026-03-10');

/** Un instantané Overpass qui répond, avec de quoi faire aboutir les trois axes OSM. */
function overpassSnapshot() {
  const near = (dLat: number, category: AmenityCategory) => ({
    lat: POINT.lat + dLat,
    lng: POINT.lng,
    category,
  });
  return {
    pois: [
      near(0.0001, 'transit'),
      near(0.0002, 'transit'),
      near(0.0003, 'groceries'),
      near(0.0004, 'schools'),
      near(0.0005, 'healthcare'),
      near(0.0006, 'parks'),
    ],
    roads: [{ lat: POINT.lat + 0.0002, lng: POINT.lng, weight: 3 }],
    // Des locaux OSM dans l'instantané, et la fiche ne doit PLUS les regarder : c'est le
    // `shop=vacant` bénévole que le corpus remplace. Ils sont là pour que le contrôle
    // ci-dessous ait quelque chose à ne pas trouver.
    premises: [
      { id: 'osm/1', lat: POINT.lat, lng: POINT.lng, tags: {}, status: 'vacant' as const },
    ],
    loaded: ['amenities', 'roads', 'premises'] as const,
  };
}

/** Des locaux BDCom autour du point, tous occupés — le millésime 2023 n'en porte aucun vacant. */
function corpusPremises(n: number): { points: PremisePoint[]; totalMatched: number; truncated: boolean } {
  const points: PremisePoint[] = Array.from({ length: n }, (_, i) => ({
    lat: POINT.lat + i * 0.00001,
    lng: POINT.lng,
    status: 'occupied' as const,
  }));
  return { points, totalMatched: n, truncated: false };
}

/**
 * Des services marchands relevés autour du point — w6-amenites-corpus.
 *
 * Les effectifs sont ceux mesurés rue de Bretagne le 15 septembre 2026 à 400 m, divisés par
 * dix pour que le bouchon reste lisible : la forme du mélange est ce qui compte ici, pas son
 * volume, et un test qui recopierait 588 points testerait la patience de personne.
 */
function corpusServices() {
  const families = [
    ['alimentaire', 9],
    ['soins', 4],
    ['restauration', 18],
    ['demarches', 16],
    ['culture', 13],
  ] as const;
  const points = families.flatMap(([family, n]) =>
    Array.from({ length: n }, (_, i) => ({
      lat: POINT.lat + i * 0.00001,
      lng: POINT.lng,
      family,
    })),
  );
  return { points, rendered: 92, totalMatched: 92, truncated: false };
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchOverpassSnapshot.mockResolvedValue(overpassSnapshot());
  fetchCorpusPremises.mockResolvedValue(corpusPremises(120));
  fetchPremisesOrigin.mockResolvedValue(BDCOM_2023);
  fetchCorpusServices.mockResolvedValue(corpusServices());
  // Oberkampf — Filles du Calvaire, à 317 m, mesuré le 15 septembre 2026.
  fetchCorpusStation.mockResolvedValue({ distanceM: 317, name: 'Oberkampf - Filles du Calvaire' });
  fetchStationOrigin.mockResolvedValue(IDFM_2026);
  fetchActivityTransitions.mockResolvedValue({
    withheld: true,
    evidence: 'Une transition dérive de deux millésimes, et 2020 n’est pas redistribuable.',
    licence: 'custom',
    pairs: 0,
  });
});

describe('fetchAddressContext — le corpus d’abord', () => {
  it('attribue les locaux à l’APUR et le reste à OpenStreetMap : les origines ne sont plus uniformes', async () => {
    const context = await fetchAddressContext(POINT);

    expect(context.origins.premises.source).toBe('APUR BDCom 2023');
    expect(context.origins.premises.licence).toBe('ODbL-1.0');
    expect(context.origins.premises.asOf).toBe('2023-06');
    expect(context.origins.amenities.source).toBe('OpenStreetMap via Overpass');
    // La règle du ticket, écrite comme une inégalité plutôt que comme deux égalités : c'est
    // l'uniformité elle-même qui devait disparaître.
    expect(context.origins.premises.source).not.toBe(context.origins.amenities.source);
  });

  it('IGNORE les locaux de l’instantané Overpass, même quand il en porte', async () => {
    // Le bouchon rend un local OSM marqué `vacant`. Si la fiche le comptait encore, il
    // arriverait ici — et le marquage bénévole reprendrait la place du relevé de terrain sans
    // que la provenance affichée change d'un mot.
    const { points } = await fetchAddressContext(POINT);
    expect(points.premises).toHaveLength(120);
    expect(points.premises.some((p) => p.status === 'vacant')).toBe(false);
  });

  it('rend un constat porté par APUR BDCom 2023, avec sa licence et son millésime', async () => {
    const { scores } = await fetchAddressContext(POINT);

    expect(scores.density.value).not.toBeNull();
    expect(scores.density.source).toBe('APUR BDCom 2023');
    expect(scores.density.licence).toBe('ODbL-1.0');
    expect(scores.density.asOf).toBe('2023-06');
    // Le passage lit les deux couches, donc il les nomme les deux — jamais « la principale ».
    // Depuis w6-amenites-corpus la seconde est IDFM et non plus Overpass : c'est ce qui fait
    // que l'axe survit à un miroir mort, et c'est ce que cette ligne tient en place.
    expect(scores.footfall.source).toContain('APUR BDCom 2023');
    expect(scores.footfall.source).toContain('IDFM');
    expect(scores.footfall.source).not.toContain('OpenStreetMap');
    // Et le millésime d'un composite est celui du plus ancien de ses ingrédients.
    expect(scores.footfall.asOf).toBe('2023-06');
  });

  it('chaque constat neuf porte SA source : IDFM pour le ferré, l’APUR pour le reste', async () => {
    // Critère 3 du ticket, écrit une origine à la fois. Un libellé recopié d'un axe sur
    // l'autre serait invisible à l'œil et faux pour un redistributeur : les deux licences
    // diffèrent, ODbL-1.0 d'un côté, Licence Ouverte 2.0 de l'autre.
    const { scores } = await fetchAddressContext(POINT);

    expect(scores.rail.source).toBe('IDFM — référentiel des arrêts');
    expect(scores.rail.licence).toBe('Licence Ouverte 2.0 (Etalab)');
    expect(scores.rail.asOf).toBe('2026-03-10');

    for (const axis of ['services', 'alimentaire'] as const) {
      expect(scores[axis].source).toBe('APUR BDCom 2023');
      expect(scores[axis].licence).toBe('ODbL-1.0');
      expect(scores[axis].asOf).toBe('2023-06');
    }
  });

  it('CONTRE-PREUVE : miroirs injoignables, le constat du corpus tient et garde sa provenance', async () => {
    fetchOverpassSnapshot.mockRejectedValue(new Error('les trois miroirs ont refusé'));

    const { scores, loaded, withheldBy } = await fetchAddressContext(POINT);

    // Ce qui tombe, tombe.
    expect(loaded).toEqual(['premises', 'services', 'stations']);
    expect(withheldBy.amenities).toBe('source_injoignable');
    expect(withheldBy.roads).toBe('source_injoignable');
    expect(scores.noise.value).toBeNull();
    // Ce qui tient, tient — et c'est tout le ticket. Avant le 14 septembre 2026 cette ligne
    // rendait `null` : un miroir public gratuit vidait la fiche d'un corpus qu'il ne portait pas.
    expect(scores.density.value).not.toBeNull();
    expect(scores.density.source).toBe('APUR BDCom 2023');
  });

  it('CRITÈRE 1 — miroirs coupés, le verdict SE COMPOSE au lieu de refuser', async () => {
    // Le contrôle qui porte w6-amenites-corpus, et il est écrit en contre-preuve du ticket
    // précédent : le 14 septembre 2026, ce même appel rendait « Pas de verdict ici » avec
    // trois axes porteurs sur `amenities`, une couche à source unique. Mesuré en production
    // sur `/contexte/rue-de-bretagne-paris` : un constat sur six.
    fetchOverpassSnapshot.mockRejectedValue(new Error('les trois miroirs ont refusé'));

    const { scores } = await fetchAddressContext(POINT);
    const verdict = composeVerdict(findingsFromScores(scores));

    expect(verdict.kind).toBe('compose');
    if (verdict.kind !== 'compose') return;
    // Les quatre porteurs, tous lus dans le corpus.
    expect(verdict.used).toEqual(['density', 'footfall', 'rail', 'services']);
    // Et le seul axe qui reste sur Overpass est non porteur : son absence colore, elle ne
    // refuse pas. C'est la raison pour laquelle `noise` n'est pas passé au corpus.
    expect(scores.noise.value).toBeNull();
    expect(verdict.supporting.map((c) => c.axis)).toEqual(['alimentaire']);
  });

  it('un arrêt trouvé et un arrêt absent sont deux LECTURES, pas une absence', async () => {
    // Le bois de Vincennes, mesuré le 15 septembre 2026 : aucun arrêt ferré dans 800 m. La
    // couche a répondu, donc l'axe vaut zéro et le dit dans sa note — le transformer en
    // « inconnu » détruirait la seule réponse que la couche donne avec certitude.
    fetchCorpusStation.mockResolvedValue({ distanceM: null, name: null });

    const { scores, loaded, withheldBy } = await fetchAddressContext(POINT);

    expect(loaded).toContain('stations');
    expect(withheldBy.stations).toBeUndefined();
    expect(scores.rail.value).toBe(0);
    expect(scores.rail.note).toContain('not because the layer is silent');
  });

  it('une couche ferrée injoignable retire l’axe plutôt que de le compter à zéro', async () => {
    fetchCorpusStation.mockRejectedValue(new CorpusUnavailable('PostgREST muet', 'source_injoignable'));

    const { scores, loaded, withheldBy } = await fetchAddressContext(POINT);

    expect(loaded).not.toContain('stations');
    expect(withheldBy.stations).toBe('source_injoignable');
    expect(scores.rail.value).toBeNull();
    // Et la provenance survit à l'absence : un lecteur doit apprendre QUELLE source s'est tue.
    expect(scores.rail.source).toBe('IDFM — référentiel des arrêts');
    // Le passage lit les deux couches du corpus, donc il tombe avec celle-ci.
    expect(scores.footfall.value).toBeNull();
  });

  it('un miroir mort ne suspend pas l’appel au corpus dans son budget', async () => {
    // Le budget de dix secondes est passé à Overpass et à personne d'autre. Si le corpus
    // partageait ce minuteur, le miroir aurait le pouvoir d'annuler la base — l'inversion que
    // ce ticket a défaite.
    await fetchAddressContext(POINT);
    expect(fetchOverpassSnapshot).toHaveBeenCalledWith(expect.anything(), { budgetMs: 10000 });
    expect(fetchCorpusPremises).toHaveBeenCalledWith(POINT.lat, POINT.lng, 400);
  });
});

describe('fetchAddressContext — les trois absences ne se confondent pas', () => {
  it('HORS CORPUS : les trois couches du corpus tombent ensemble, aucune ne vaut zéro', async () => {
    // Trouvé à l'écran, à Massy, le 15 septembre 2026, avant livraison de w6-amenites-corpus.
    // Les deux fonctions neuves RÉUSSISSENT hors de Paris et rendent zéro ligne :
    // `compass_premises_within` n'a jamais porté `out_of_corpus` (DIAGNOSTIC.md §36) et
    // `idfm_station` est restreinte à Paris à l'ingestion. Traitées isolément, elles donnaient
    // « services 0/100 » et « desserte ferrée 0/100 » sur une commune qui a des commerces et un
    // RER — un chiffre calculé sur rien, estampillé d'une source. C'est DIAGNOSTIC.md §16 un
    // cran plus loin, et ce contrôle est ce qui empêche qu'il revienne.
    fetchCorpusPremises.mockRejectedValue(
      new CorpusUnavailable('hors des 80 quartiers', 'hors_corpus'),
    );
    // Les deux autres répondent, et vide — exactement ce que le distant fait à Massy.
    fetchCorpusServices.mockResolvedValue({ points: [], rendered: 0, totalMatched: 0, truncated: false });
    fetchCorpusStation.mockResolvedValue({ distanceM: null, name: null });

    const { scores, loaded, withheldBy } = await fetchAddressContext(POINT);

    for (const layer of ['premises', 'services', 'stations'] as const) {
      expect(loaded).not.toContain(layer);
      expect(withheldBy[layer]).toBe('hors_corpus');
    }
    for (const axis of ['density', 'footfall', 'rail', 'services', 'alimentaire'] as const) {
      expect(scores[axis].value).toBeNull();
    }

    // Et le verdict refuse en nommant la frontière, jamais en composant sur des zéros.
    const verdict = composeVerdict(findingsFromScores(scores, withheldBy));
    expect(verdict.kind).toBe('refus');
    if (verdict.kind !== 'refus') return;
    expect(verdict.missing.every((g) => g.because === 'hors_corpus')).toBe(true);
  });

  it('millésime retenu : « retenue de licence », et la couche est retirée plutôt que comptée à zéro', async () => {
    fetchCorpusPremises.mockRejectedValue(
      new CorpusUnavailable('licence APUR non lue', 'retenue_licence'),
    );

    const { scores, loaded, withheldBy } = await fetchAddressContext(POINT);

    expect(withheldBy.premises).toBe('retenue_licence');
    expect(loaded).not.toContain('premises');
    // Le point capital : PAS un zéro mesuré. Une licence que personne n'a lue rendue comme une
    // absence de commerces serait le défaut que tout ce mécanisme existe pour empêcher.
    expect(scores.density.value).toBeNull();
    expect(scores.density.missingReason).toBeTruthy();
  });

  it('hors corpus : « hors corpus », et jamais le même motif qu’une licence', async () => {
    fetchCorpusPremises.mockRejectedValue(
      new CorpusUnavailable('point hors de Paris intra-muros', 'hors_corpus'),
    );

    const { withheldBy, scores } = await fetchAddressContext(POINT);

    expect(withheldBy.premises).toBe('hors_corpus');
    expect(scores.density.value).toBeNull();
  });

  it('CONTRE-PREUVE : un rayon réellement vide DANS Paris rend un zéro mesuré, pas une absence', async () => {
    // Mesuré le 14 septembre 2026 au bois de Vincennes : dans le quartier Picpus, zéro local
    // BDCom à 400 m. C'est la seule réponse que le relevé donne avec certitude, et la traiter
    // comme « inconnu » la détruirait.
    fetchCorpusPremises.mockResolvedValue(corpusPremises(0));

    const { scores, loaded, withheldBy } = await fetchAddressContext(POINT);

    expect(loaded).toContain('premises');
    expect(withheldBy.premises).toBeUndefined();
    expect(scores.density.value).toBe(0);
    expect(scores.density.missingReason).toBeUndefined();
    expect(scores.density.source).toBe('APUR BDCom 2023');
  });

  it('des lignes sans leur licence sont des lignes qu’on ne score pas', async () => {
    fetchPremisesOrigin.mockRejectedValue(new Error('compass_vintages: indisponible'));

    const { scores, loaded, withheldBy, origins } = await fetchAddressContext(POINT);

    expect(loaded).not.toContain('premises');
    // Ni « retenue de licence » ni « hors corpus » : on ne sait pas, et on le dit.
    expect(withheldBy.premises).toBe('indetermine');
    expect(scores.density.value).toBeNull();
    // Le chiffre absent nomme quand même le jeu de données qui se tait.
    expect(origins.premises.source).toBe('APUR BDCom 2023');
  });
});

describe('fetchAddressContext — un compte plafonné est un plancher, et il le dit', () => {
  it('remonte la troncature en réserve sur les deux chiffres qui lisent la couche', async () => {
    // Mesuré rue de Bretagne le 14 septembre 2026 : 1 000 lignes rendues sur 3 528 à 800 m.
    fetchCorpusPremises.mockResolvedValue({
      ...corpusPremises(1000),
      totalMatched: 3528,
      truncated: true,
    });

    const { scores } = await fetchAddressContext(POINT);

    expect(scores.density.note).toContain('1000');
    expect(scores.density.note).toContain('3528');
    expect(scores.density.note).toContain('plancher');
    // Le passage lit la même couche, donc il porte la même réserve — en plus de la sienne.
    expect(scores.footfall.note).toContain('plancher');
    expect(scores.footfall.note).toContain('proxy');
  });

  it('aucune réserve quand rien n’a été coupé', async () => {
    const { scores } = await fetchAddressContext(POINT);
    expect(scores.density.note).toBeUndefined();
  });
});

describe('fetchAddressContext — ce que le corpus détient et ne peut pas servir', () => {
  it('remonte la retenue des transitions d’activité, avec la phrase écrite par la fonction', async () => {
    const { transitions } = await fetchAddressContext(POINT);
    expect(transitions?.withheld).toBe(true);
    expect(transitions?.evidence).toContain('2020');
  });

  it('une panne de cet appel ne devient pas une retenue de licence', async () => {
    fetchActivityTransitions.mockRejectedValue(new Error('réseau'));
    const { transitions } = await fetchAddressContext(POINT);
    // `null`, jamais `{ withheld: true }` : un incident et un refus de licence appellent deux
    // actions différentes, et les confondre ferait écrire à l'APUR pour une panne de réseau.
    expect(transitions).toBeNull();
  });
});
