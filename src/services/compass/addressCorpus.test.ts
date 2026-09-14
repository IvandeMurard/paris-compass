/**
 * Ce que le navigateur fait des réponses de `compass_*` — w6-fiche-corpus (#157).
 *
 * Aucune base : le client Supabase est bouchonné, et les formes bouchonnées sont celles qui
 * ont été RELEVÉES sur le distant le 14 septembre 2026, pas imaginées. Trois d'entre elles ne
 * peuvent pas être provoquées depuis un appelant anonyme — un millésime retenu n'existe que
 * pour 2017 et 2020 — et c'est précisément pour celles-là qu'un bouchon vaut mieux qu'une
 * sonde.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));

const {
  CorpusUnavailable,
  SHEET_VINTAGE,
  fetchActivityTransitions,
  fetchCorpusPremises,
  fetchPremisesOrigin,
  motifOf,
} = await import('./addressCorpus');

const ok = (data: unknown) => ({ data, error: null });

beforeEach(() => vi.clearAllMocks());

describe('fetchCorpusPremises', () => {
  it('rend les points et dit que le compte est complet', async () => {
    rpc.mockResolvedValue(
      ok([
        { lat: 48.86, lng: 2.36, is_vacant: false, total_matched: 2, withheld: false, out_of_corpus: false },
        { lat: 48.87, lng: 2.37, is_vacant: false, total_matched: 2, withheld: false, out_of_corpus: false },
      ]),
    );

    const layer = await fetchCorpusPremises(48.8631, 2.3621, 400);

    expect(layer.points).toHaveLength(2);
    expect(layer.totalMatched).toBe(2);
    expect(layer.truncated).toBe(false);
    expect(rpc).toHaveBeenCalledWith('compass_scoring_context_within', {
      p_lat: 48.8631,
      p_lng: 2.3621,
      p_radius_m: 400,
      p_vintage_year: SHEET_VINTAGE,
    });
  });

  it('voit le plafond de PostgREST : moins de lignes que le rayon n’en contient', async () => {
    // Relevé rue de Bretagne, 800 m : 1 000 lignes rendues, `total_matched` à 3 528. La
    // colonne était dans le type depuis le 15 août et n'était lue par personne — un compte
    // plafonné à mille rendu comme un total. DIAGNOSTIC.md §51.
    rpc.mockResolvedValue(
      ok(
        Array.from({ length: 1000 }, () => ({
          lat: 48.86,
          lng: 2.36,
          is_vacant: false,
          total_matched: 3528,
          withheld: false,
          out_of_corpus: false,
        })),
      ),
    );

    const layer = await fetchCorpusPremises(48.8631, 2.3621, 800);

    expect(layer.points).toHaveLength(1000);
    expect(layer.totalMatched).toBe(3528);
    expect(layer.truncated).toBe(true);
  });

  it('un millésime retenu est un JET nommé, jamais un tableau vide', async () => {
    rpc.mockResolvedValue(
      ok([
        { lat: null, lng: null, is_vacant: null, total_matched: null, withheld: true, out_of_corpus: false },
      ]),
    );

    // Rendre `[]` déclarerait la couche chargée, et les deux chiffres qui la lisent
    // sortiraient en zéro mesuré : une licence que personne n'a lue, rendue comme une absence
    // de commerces.
    await expect(fetchCorpusPremises(48.8631, 2.3621, 400)).rejects.toThrow(CorpusUnavailable);
    await expect(fetchCorpusPremises(48.8631, 2.3621, 400)).rejects.toMatchObject({
      motif: 'retenue_licence',
    });
  });

  it('un point hors corpus porte SON motif, pas celui d’une licence', async () => {
    rpc.mockResolvedValue(
      ok([
        { lat: null, lng: null, is_vacant: null, total_matched: null, withheld: false, out_of_corpus: true },
      ]),
    );

    // Les deux mènent à deux actions différentes — un courrier à l'APUR, une adresse hors
    // Paris. Les confondre, c'est écrire à l'APUR pour Massy.
    await expect(fetchCorpusPremises(48.7262, 2.2833, 400)).rejects.toMatchObject({
      motif: 'hors_corpus',
    });
  });

  it('CONTRE-PREUVE : zéro ligne reste un zéro, et ne devient pas une absence', async () => {
    // Mesuré au bois de Vincennes le 14 septembre 2026 : dans le quartier Picpus, aucun local
    // BDCom à 400 m. C'est une vraie réponse et la seule que le relevé donne avec certitude.
    rpc.mockResolvedValue(ok([]));

    const layer = await fetchCorpusPremises(48.8285, 2.4359, 400);

    expect(layer.points).toEqual([]);
    expect(layer.totalMatched).toBe(0);
    expect(layer.truncated).toBe(false);
  });

  it('une erreur PostgREST remonte, elle ne se tait pas en tableau vide', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'timeout' } });
    await expect(fetchCorpusPremises(48.8631, 2.3621, 400)).rejects.toThrow('timeout');
  });
});

describe('fetchPremisesOrigin', () => {
  const VINTAGES = [
    {
      vintage_year: 2017,
      vintage_scope: 'all_premises',
      licence: 'custom',
      licence_note: 'Custom APUR licence, terms not yet read.',
      as_of: '2017',
    },
    {
      vintage_year: 2023,
      vintage_scope: 'retail_only',
      licence: 'ODbL-1.0',
      licence_note: 'Retail and commercial services only.',
      as_of: '2023-06',
    },
  ];

  it('lit la licence et le millésime dans la base, jamais dans ce fichier', async () => {
    rpc.mockResolvedValue(ok(VINTAGES));
    const origin = await fetchPremisesOrigin();
    expect(origin).toEqual({ source: 'APUR BDCom 2023', licence: 'ODbL-1.0', asOf: '2023-06' });
  });

  it('une licence « custom » est rendue comme non lue, jamais comme ODbL', async () => {
    rpc.mockResolvedValue(ok([{ ...VINTAGES[0], vintage_year: 2023 }]));
    const origin = await fetchPremisesOrigin();
    expect(origin.licence).toContain('non lue');
    expect(origin.licence).not.toContain('ODbL');
  });

  it('un millésime que la base ne déclare pas fait échouer, il ne s’invente pas', async () => {
    rpc.mockResolvedValue(ok([VINTAGES[0]]));
    await expect(fetchPremisesOrigin()).rejects.toThrow(/millésime/);
  });
});

describe('fetchActivityTransitions', () => {
  it('rend la retenue et la phrase que la fonction a écrite sur sa propre réponse', async () => {
    const evidence =
      'Une transition dérive de deux millésimes, et 2020 n’est pas redistribuable : la licence APUR n’a pas été lue.';
    rpc.mockResolvedValue(
      ok([
        {
          from_niv18: null,
          from_label: null,
          to_niv18: null,
          to_label: null,
          premises: null,
          is_same_trade: null,
          withheld: true,
          licence: 'custom',
          evidence,
        },
      ]),
    );

    const answer = await fetchActivityTransitions(48.8631, 2.3621, 400);

    expect(answer.withheld).toBe(true);
    expect(answer.pairs).toBe(0);
    // Relayée, jamais reformulée : la réécrire ici en ferait une seconde version de la raison,
    // libre de diverger le jour où la licence change.
    expect(answer.evidence).toBe(evidence);
  });

  it('le jour où l’APUR répond, la même fonction rend des couples', async () => {
    rpc.mockResolvedValue(
      ok([
        { from_niv18: 1, from_label: 'Boulangerie', to_niv18: 2, to_label: 'Restauration rapide', premises: 4, is_same_trade: false, withheld: false, licence: 'ODbL-1.0', evidence: 'Relevé de terrain APUR.' },
        { from_niv18: 3, from_label: 'Librairie', to_niv18: 3, to_label: 'Librairie', premises: 9, is_same_trade: true, withheld: false, licence: 'ODbL-1.0', evidence: 'Relevé de terrain APUR.' },
      ]),
    );

    const answer = await fetchActivityTransitions(48.8631, 2.3621, 400);

    expect(answer.withheld).toBe(false);
    expect(answer.pairs).toBe(2);
  });
});

describe('motifOf', () => {
  it('n’invente pas de cause : ce qui n’est pas nommé est une source injoignable', () => {
    expect(motifOf(new Error('boom'))).toBe('source_injoignable');
    expect(motifOf(new CorpusUnavailable('x', 'retenue_licence'))).toBe('retenue_licence');
  });
});
