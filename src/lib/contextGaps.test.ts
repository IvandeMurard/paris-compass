import { describe, expect, it } from 'vitest';
import {
  LAYERS,
  motifText,
  unavailable,
  withValue,
  type AreaScores,
  type FigureMotif,
  type Layer,
  type Measured,
  type Origin,
  type Withholding,
} from '@/core';
import { TRADE_MODES, modeAxisOrder } from '@/core';
import { collectGaps, orderGapsForMode } from './contextGaps';

const OSM: Origin = { source: 'OpenStreetMap via Overpass', licence: 'ODbL-1.0', asOf: '2026-09-10' };

const plain = (n: number): Measured<number> => withValue(n, OSM, 'derived');
const withNote = (n: number, ...motifs: FigureMotif[]): Measured<number> =>
  withValue(n, OSM, 'estimated', motifs);

/** L'absence d'une couche, telle que le noyau la produit. Plus aucune prose de test. */
const absente = (layer: Layer): FigureMotif => ({ kind: 'couche_absente', layer });

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

const ALL: readonly Layer[] = ['amenities', 'roads', 'premises'];

describe('collectGaps', () => {
  it('nomme la raison écrite par le noyau, sans la réécrire — et en français', () => {
    // La phrase n'est plus tapée ici : elle est DÉRIVÉE du motif, par la même fonction que
    // l'écran. Un test qui recopierait le texte attendu vérifierait sa propre copie.
    const gaps = collectGaps(scores({ noise: unavailable(OSM, absente('roads')) }), ['amenities', 'premises'], OSM.source, 'fr');
    expect(gaps.find((g) => g.key === 'note:noise')).toBeUndefined();
    expect(gaps.find((g) => g.key === 'missing:noise')?.text).toContain(
      motifText(absente('roads'), 'fr'),
    );
  });

  it('remonte la réserve d’un chiffre présent', () => {
    const proxy: FigureMotif = { kind: 'mandataire_passage' };
    const gaps = collectGaps(scores({ footfall: withNote(60, proxy) }), ALL, OSM.source, 'fr');
    expect(gaps.find((g) => g.key === 'note:footfall')?.text).toContain(motifText(proxy, 'fr'));
  });

  it('ne compte pas deux fois une couche absente', () => {
    // Sa disparition est déjà nommée axe par axe ; répéter la source par-dessus compterait
    // le même trou deux fois.
    const absent = collectGaps(
      scores({ footfall: unavailable(OSM, absente('premises')) }),
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

  /**
   * La phrase de provenance des locaux suit la source, et c'est un contrôle et non un détail —
   * w6-fiche-corpus (#157).
   *
   * Elle disait « un marquage bénévole, pas le relevé porte-à-porte de l'APUR ». Le jour où la
   * fiche a cessé de compter les locaux sur OpenStreetMap, cette phrase est devenue exactement
   * fausse — et rien ne l'aurait dit : elle est de la prose, elle ne type-checke pas, et le
   * chiffre qu'elle accompagne était juste. Une phrase de provenance qui survit au changement
   * de source qu'elle décrit est un mensonge qui s'écrit tout seul.
   */
  it('CONTRE-PREUVE : la phrase change avec la source, elle ne la décrit pas de mémoire', () => {
    const apur = collectGaps(scores(), ALL, 'APUR BDCom 2023', 'fr').find(
      (g) => g.key === 'premises-source',
    )?.text;
    const osm = collectGaps(scores(), ALL, OSM.source, 'fr').find(
      (g) => g.key === 'premises-source',
    )?.text;

    expect(apur).toContain('APUR BDCom 2023');
    expect(apur).toContain('relevé porte-à-porte');
    // Le trou de CETTE source-là : 2023 ne couvre que le commerce, donc un local vacant n'y est
    // pas — mesuré, 0 vacant sur 60 845 relevés, contre 7 853 en 2017.
    expect(apur).toContain('vacant');
    // Les deux phrases citent le marquage bénévole, et elles n'en disent pas la même chose :
    // l'une l'écarte, l'autre l'annonce comme la source du compte.
    expect(apur).toContain('pas un marquage bénévole');
    expect(osm).toContain('un marquage bénévole, pas le relevé porte-à-porte');
    expect(osm).not.toContain('APUR BDCom');
    expect(apur).not.toBe(osm);
  });

  it('met « retenue de licence » devant le lecteur sur une adresse ordinaire', () => {
    // Le seul endroit de cette page où un visiteur parisien voit une retenue de licence, et
    // c'est voulu : une transition dérive de deux millésimes et un seul est redistribuable,
    // donc `compass_activity_transitions` rend une ligne marquée sur TOUTE adresse. Mesuré rue
    // de Bretagne le 14 septembre 2026, en 68 ms.
    const evidence = 'Une transition dérive de deux millésimes, et 2020 n’est pas redistribuable.';
    const gaps = collectGaps(scores(), ALL, 'APUR BDCom 2023', 'fr', {}, {
      withheld: true,
      evidence,
    });

    const entry = gaps.find((g) => g.key === 'transitions-withheld')?.text ?? '';
    expect(entry).toContain('retenu pour licence');
    expect(entry).toContain(evidence);
  });

  it('une matrice servable n’est pas un trou, et une panne n’est pas une retenue', () => {
    const servable = collectGaps(scores(), ALL, 'APUR BDCom 2023', 'fr', {}, {
      withheld: false,
      evidence: 'Relevé de terrain APUR.',
    });
    expect(servable.some((g) => g.key === 'transitions-withheld')).toBe(false);

    // `null` = l'appel lui-même a échoué. Emprunter les mots d'une retenue de licence ferait
    // écrire à l'APUR pour une panne de réseau.
    const panne = collectGaps(scores(), ALL, 'APUR BDCom 2023', 'fr', {}, null);
    expect(panne.some((g) => g.key === 'transitions-withheld')).toBe(false);
  });

  it('porte toujours l’absence de loyer commercial, quel que soit le point', () => {
    // Vraie du pays, pas du point — et c'est la question que tout visiteur apporte.
    for (const s of [scores(), scores({ transit: unavailable(OSM, absente('stations')) })]) {
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
      services: 'source_injoignable',
      stations: 'source_injoignable',
    };
    const gaps = collectGaps(
      scores({ rail: unavailable(OSM, absente('stations')) }),
      [],
      OSM.source,
      'fr',
      withheld,
    );

    const rail = gaps.find((g) => g.key === 'missing:rail')?.text ?? '';
    expect(rail).toContain('source injoignable');
    expect(rail).toContain(motifText(absente('stations'), 'fr'));
  });

  it('ne devine jamais une retenue de licence quand personne n’a déclaré de motif', () => {
    // The honest default, and the same one `findingsFromScores` takes: « we do not know why »
    // is a fact. Guessing a cause here would put a licence refusal on screen on an outage.
    const gaps = collectGaps(scores({ rail: unavailable(OSM, absente('stations')) }), [], OSM.source, 'fr');
    expect(gaps.find((g) => g.key === 'missing:rail')?.text).toContain('indéterminé');
  });

  it('rend la même structure en anglais', () => {
    const fr = collectGaps(scores({ rail: unavailable(OSM, absente('stations')) }), ALL, OSM.source, 'fr');
    const en = collectGaps(scores({ rail: unavailable(OSM, absente('stations')) }), ALL, OSM.source, 'en');
    expect(en.map((g) => g.key)).toEqual(fr.map((g) => g.key));
    expect(en.find((g) => g.key === 'commercial-rent')?.text).not.toBe(
      fr.find((g) => g.key === 'commercial-rent')?.text,
    );
  });

  /**
   * Le critère 1 du ticket, RECENSÉ et non relu — w6-langue-absences (#181).
   *
   * La population est dérivée de `LAYERS`, jamais listée : la sixième couche entre dans ce
   * contrôle le jour où elle entre dans le noyau. Pour chacune, le bloc des trous est composé
   * dans les deux langues et chaque moitié doit porter la phrase de SA langue et pas celle de
   * l'autre — ce qui est exactement la mesure faite en production le 15 septembre 2026, où cinq
   * lignes sur six étaient anglaises sous le titre « Ce que Compass ne sait pas ici ».
   */
  it('RECENSEMENT : aucune raison d’absence ne sort dans la langue de l’autre page', () => {
    for (const layer of LAYERS) {
      const motif = absente(layer);
      const franche = motifText(motif, 'fr');
      const anglaise = motifText(motif, 'en');
      // Une couche dont les deux colonnes seraient identiques passerait le contrôle sans rien
      // traduire. Le dire ici est ce qui empêche une entrée recopiée d'un bord à l'autre.
      expect(franche).not.toBe(anglaise);

      const fr = collectGaps(scores({ rail: unavailable(OSM, motif) }), [], OSM.source, 'fr');
      const en = collectGaps(scores({ rail: unavailable(OSM, motif) }), [], OSM.source, 'en');
      const texteFr = fr.find((g) => g.key === 'missing:rail')?.text ?? '';
      const texteEn = en.find((g) => g.key === 'missing:rail')?.text ?? '';

      expect(texteFr).toContain(franche);
      expect(texteFr).not.toContain(anglaise);
      expect(texteEn).toContain(anglaise);
      expect(texteEn).not.toContain(franche);
    }
  });
});

describe('collectGaps — une couche qui voyage encore n’est pas un trou (w6-fiche-delai #180)', () => {
  const enVol = unavailable<number>(OSM, absente('roads'));

  it('n’inscrit rien pour un axe encore en cours de mesure', () => {
    const gaps = collectGaps(
      scores({ noise: enVol }),
      ['premises'],
      OSM.source,
      'fr',
      {},
      null,
      new Set(['noise' as const]),
    );
    // Le bloc liste ce que Compass ne sait pas ici. « Personne n'a encore répondu » n'est pas
    // une chose qu'il ne sait pas : c'est une chose qu'il n'a pas fini de demander. L'inscrire
    // puis la retirer deux secondes plus tard est comment une liste de trous cesse d'être lue.
    expect(gaps.find((g) => g.key === 'missing:noise')).toBeUndefined();
  });

  it('l’inscrit dès que la couche s’est déclarée injoignable', () => {
    const gaps = collectGaps(scores({ noise: enVol }), ['premises'], OSM.source, 'fr', {
      roads: 'source_injoignable' as Withholding,
    });
    const gap = gaps.find((g) => g.key === 'missing:noise');
    expect(gap?.text).toContain('source injoignable');
  });
});

describe('orderGapsForMode — les alertes se réordonnent, elles ne se filtrent pas (w6-modes #36)', () => {
  /** Un jeu de trous où CHAQUE axe en porte un, plus les entrées sans axe. */
  const tous = () =>
    collectGaps(
      // Chaque axe absent, donc chaque axe porte un trou : la population est dérivée de
      // `scores()` et jamais listée, pour que l'axe suivant y entre tout seul.
      (Object.fromEntries(
        Object.keys(scores()).map((axis) => [axis, unavailable<number>(OSM, absente('premises'))]),
      ) as unknown) as AreaScores,
      ['premises'],
      OSM.source,
      'fr',
      {},
      { withheld: true, evidence: 'millésime retenu' },
    );

  it('rend une permutation : même population, même longueur, rien de caché', () => {
    const avant = tous();
    for (const mode of TRADE_MODES) {
      const apres = orderGapsForMode(avant, mode);
      expect(apres.length, mode).toBe(avant.length);
      expect(
        apres.map((g) => g.key).sort(),
        mode,
      ).toEqual(avant.map((g) => g.key).sort());
    }
  });

  it('fait remonter l’absence que ce métier lit en premier', () => {
    const avant = tous();
    for (const mode of TRADE_MODES) {
      const premier = modeAxisOrder(mode)[0];
      const apres = orderGapsForMode(avant, mode);
      expect(apres[0]?.axis, mode).toBe(premier);
    }
  });

  it('sans mode, ne touche à rien', () => {
    const avant = tous();
    expect(orderGapsForMode(avant, null)).toEqual(avant);
  });

  it('garde les entrées sans axe derrière, dans leur ordre d’origine', () => {
    const avant = tous();
    const sansAxe = (liste: readonly { key: string; axis?: unknown }[]) =>
      liste.filter((g) => g.axis === undefined).map((g) => g.key);
    for (const mode of TRADE_MODES) {
      const apres = orderGapsForMode(avant, mode);
      expect(sansAxe(apres), mode).toEqual(sansAxe(avant));
      // Et elles sont bien EN QUEUE : le dernier trou portant un axe précède la première
      // entrée qui n'en porte pas.
      const premierSansAxe = apres.findIndex((g) => g.axis === undefined);
      const dernierAvecAxe = apres.map((g) => g.axis !== undefined).lastIndexOf(true);
      expect(dernierAvecAxe, mode).toBeLessThan(premierSansAxe);
    }
  });
});
