/**
 * Une panne muette ressemble exactement à une absence mesurée — #145.
 *
 * Le 13 septembre 2026, sur le site publié, Géorisques échouait (`TypeError: Failed to fetch`,
 * journalisé dans la console et nulle part ailleurs) et l'écran affichait `n/d`. C'est ce que
 * l'écran affiche aussi quand un point n'a aucun risque enregistré. Les deux cas rendaient la
 * même chose parce qu'ils rendaient la même VALEUR : `null`.
 *
 * Ce contrôle existe pour que la distinction ne puisse pas se reperdre à la première réécriture.
 * Il ne touche pas le réseau : `fetchJson` est doublé, comme dans `overpass.test.ts`, parce que
 * le comportement éprouvé est ce que ce module fait d'une réponse — pas ce que le réseau fait.
 *
 * **Ce qu'il ne couvre pas** : que l'écran affiche bien la distinction. C'est du rendu, et il vit
 * dans `MapView`. Ce fichier garantit que la distinction ARRIVE jusqu'à lui.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchJson = vi.hoisted(() => vi.fn());
vi.mock('./http', () => ({ fetchJson }));

const { fetchAirQuality, fetchRisks } = await import('./environment');

const LAT = 48.8675;
const LNG = 2.3636;

beforeEach(() => {
  fetchJson.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('la qualité de l’air', () => {
  it('rend `read` avec sa valeur quand le modèle répond', async () => {
    fetchJson.mockResolvedValue({ current: { european_aqi: 34, pm2_5: 8.2, nitrogen_dioxide: 21 } });
    const lecture = await fetchAirQuality(LAT, LNG);
    expect(lecture.state).toBe('read');
    if (lecture.state !== 'read') throw new Error('inatteignable');
    expect(lecture.value.aqi).toBe(34);
    expect(lecture.value.pm25).toBe(8.2);
    expect(lecture.value.label).toBe('Good');
  });

  it('rend `empty` quand le modèle répond SANS indice — c’est une réponse', async () => {
    fetchJson.mockResolvedValue({ current: {} });
    expect((await fetchAirQuality(LAT, LNG)).state).toBe('empty');
  });

  it('rend `withheld` avec `source_injoignable` quand la requête échoue', async () => {
    fetchJson.mockRejectedValue(new TypeError('Failed to fetch'));
    const lecture = await fetchAirQuality(LAT, LNG);
    expect(lecture.state).toBe('withheld');
    if (lecture.state !== 'withheld') throw new Error('inatteignable');
    // Le motif vient du vocabulaire du noyau, pas d'une chaîne écrite ici : les quatre causes
    // sont déjà nommées par `Withholding`, et en inventer une cinquième la rendrait intraduisible.
    expect(lecture.because).toBe('source_injoignable');
  });
});

describe('les risques Géorisques', () => {
  it('rend `read` quand la commune ou des risques reviennent', async () => {
    fetchJson.mockResolvedValue({
      commune: { libelle: 'Paris' },
      risquesNaturels: { inondation: { present: true, libelle: 'Inondation' } },
      risquesTechnologiques: { tmd: { present: false, libelle: 'Transport de matières' } },
    });
    const lecture = await fetchRisks(LAT, LNG);
    expect(lecture.state).toBe('read');
    if (lecture.state !== 'read') throw new Error('inatteignable');
    // Seuls les risques `present` comptent : un risque recensé et absent n'est pas un risque.
    expect(lecture.value.labels).toEqual(['Inondation']);
    expect(lecture.value.commune).toBe('Paris');
  });

  it('rend `empty` quand la réponse ne porte ni commune ni risque', async () => {
    // Aucun risque à un kilomètre est une vraie réponse, et rassurante. La rapporter comme une
    // panne serait aussi faux que l'inverse.
    fetchJson.mockResolvedValue({ risquesNaturels: {}, risquesTechnologiques: {} });
    expect((await fetchRisks(LAT, LNG)).state).toBe('empty');
  });

  it('rend `withheld` quand Géorisques ne répond pas — le cas du 13 septembre', async () => {
    fetchJson.mockRejectedValue(new TypeError('Failed to fetch'));
    const lecture = await fetchRisks(LAT, LNG);
    expect(lecture.state).toBe('withheld');
    if (lecture.state !== 'withheld') throw new Error('inatteignable');
    expect(lecture.because).toBe('source_injoignable');
  });
});

describe('ce que la distinction empêche', () => {
  it('ne rend JAMAIS la même chose pour une panne et pour une absence', async () => {
    // Le défaut fondateur tient en une ligne : les deux rendaient `null`. Ce contrôle est celui
    // qui échouerait si quelqu'un refusionnait les deux cas pour simplifier un appelant.
    fetchJson.mockResolvedValue({ risquesNaturels: {}, risquesTechnologiques: {} });
    const vide = await fetchRisks(LAT, LNG);
    fetchJson.mockRejectedValue(new TypeError('Failed to fetch'));
    const panne = await fetchRisks(LAT, LNG);
    expect(vide.state).not.toBe(panne.state);
  });

  it('journalise la panne en plus de la rendre, pour qui lit la console', async () => {
    // La console reste utile — c'est par elle que #145 a été trouvé. Ce qui change est qu'elle
    // n'est plus le SEUL endroit où la panne existe.
    fetchJson.mockRejectedValue(new TypeError('Failed to fetch'));
    await fetchRisks(LAT, LNG);
    expect(console.error).toHaveBeenCalledWith('Géorisques lookup failed', expect.any(TypeError));
  });
});
