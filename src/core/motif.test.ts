/**
 * Le recensement des motifs d'absence — w6-langue-absences (#181), `DIAGNOSTIC.md` §49.
 *
 * Le critère 1 du ticket demande un RECENSEMENT et pas une relecture : « aucune raison
 * d'absence n'est en anglais sur `/contexte/` » est une propriété de la population entière, et
 * une session qui ouvre la page et lit six lignes ne la démontre pas — elle démontre six lignes.
 * La population est donc dérivée deux fois, de `MOTIF_KINDS` et de `LAYERS`, et jamais listée
 * ici : un septième motif ou une sixième couche entre dans ces contrôles le jour où il entre
 * dans le noyau, pas le jour où quelqu'un pense à l'ajouter.
 *
 * **Ce que ça ne rattrape pas.** Rien ici ne voit la prose écrite en SQL : les `evidence` de la
 * base sont produites hors de TypeScript et `I21` les garde séparément. Et un motif dont les
 * deux colonnes seraient deux traductions FAUSSES passerait — ces contrôles jugent qu'il y a
 * deux langues, jamais que chacune dit vrai.
 */

import { describe, expect, it } from 'vitest';

import { findForbiddenForm } from './observational';
import { MOTIF_KINDS, motifText, motifsText, type FigureMotif, type MotifKind } from './motif';
import { buildIndex, scoreLocation, uniformOrigins, LAYERS } from './scoring';
import { missingText, noteText, unavailable, OSM_ORIGIN } from './provenance';

const ORIGIN = OSM_ORIGIN('2026-09-16');

/**
 * Un exemplaire de CHAQUE motif, les paramétrés déclinés sur toutes leurs couches.
 *
 * L'exhaustivité n'est pas affirmée ici, elle est vérifiée plus bas contre `MOTIF_KINDS` : une
 * liste d'exemplaires écrite à la main est exactement le genre de population qui cesse de
 * couvrir le septième cas sans que personne s'en aperçoive.
 */
const CENSUS: readonly FigureMotif[] = [
  ...LAYERS.map((layer): FigureMotif => ({ kind: 'couche_absente', layer })),
  ...LAYERS.map(
    (layer): FigureMotif => ({
      kind: 'reponse_plafonnee',
      layer,
      rendered: 1000,
      total: 17190,
      radiusM: 2000,
    }),
  ),
  { kind: 'couverture_tronquee' },
  { kind: 'aucun_arret_dans_rayon' },
  { kind: 'mandataire_passage' },
  { kind: 'bruit_modelise' },
];

describe('motifText — le recensement', () => {
  it('visite tous les genres déclarés, sans en oublier ni en inventer', () => {
    const visites = new Set<MotifKind>(CENSUS.map((m) => m.kind));
    expect([...visites].sort()).toEqual([...MOTIF_KINDS].sort());
  });

  it('rend une phrase non vide dans les deux langues, pour chaque motif', () => {
    for (const motif of CENSUS) {
      for (const locale of ['fr', 'en'] as const) {
        expect(motifText(motif, locale).length, `${motif.kind}/${locale}`).toBeGreaterThan(20);
      }
    }
  });

  /**
   * Le contrôle qui porte le ticket : deux langues, et pas deux fois la même.
   *
   * Un motif recopié d'une colonne à l'autre — ce qui arrive quand on ajoute un cas et qu'on
   * remplit le français « plus tard » — rendrait de l'anglais sur la page française en passant
   * tous les autres contrôles de ce fichier.
   */
  it('AUCUN motif ne rend la même phrase en français et en anglais', () => {
    for (const motif of CENSUS) {
      expect(motifText(motif, 'fr'), motif.kind).not.toBe(motifText(motif, 'en'));
    }
  });

  it('interpole ses nombres dans les deux langues, sans les perdre à la traduction', () => {
    const plafonnee: FigureMotif = {
      kind: 'reponse_plafonnee',
      layer: 'premises',
      rendered: 1000,
      total: 17190,
      radiusM: 2000,
    };
    for (const locale of ['fr', 'en'] as const) {
      const texte = motifText(plafonnee, locale);
      // Les trois nombres sont mesurés — rue de Bretagne, 14 septembre 2026, `DIAGNOSTIC.md`
      // §51. Une phrase qui en perdrait un annoncerait un plancher sans dire de combien.
      expect(texte).toContain('1000');
      expect(texte).toContain('17190');
      expect(texte).toContain('2000');
    }
  });

  it('nomme la couche : deux couches absentes ne rendent pas la même phrase', () => {
    // Le noyau est le seul à savoir QUELLE couche s'est tue, et c'est la raison pour laquelle
    // la page préfère sa phrase à « donnée indisponible ». Un motif qui aplatirait les cinq
    // couches en une seule phrase rendrait la page générique en la traduisant.
    for (const locale of ['fr', 'en'] as const) {
      const phrases = LAYERS.map((layer) => motifText({ kind: 'couche_absente', layer }, locale));
      expect(new Set(phrases).size).toBe(LAYERS.length);
    }
  });

  it('reste des observations, jamais des prévisions — w1-survie', () => {
    for (const motif of CENSUS) {
      for (const locale of ['fr', 'en'] as const) {
        const texte = motifText(motif, locale);
        expect(findForbiddenForm(texte), texte).toBeNull();
      }
    }
  });

  it('joint plusieurs motifs, et ne rend rien quand il n’y en a aucun', () => {
    expect(motifsText([], 'fr')).toBeUndefined();
    const deux: FigureMotif[] = [{ kind: 'mandataire_passage' }, { kind: 'couverture_tronquee' }];
    const joint = motifsText(deux, 'fr') ?? '';
    // Deux réserves sur un chiffre sont deux réserves, pas un choix entre elles.
    expect(joint).toContain(motifText(deux[0], 'fr'));
    expect(joint).toContain(motifText(deux[1], 'fr'));
  });
});

describe('le motif est ce qui décide, jamais la phrase', () => {
  /**
   * La contre-preuve de `#61`, jouée : on falsifie la prose et la traduction ne bouge pas.
   *
   * Traduire au `includes()` sur la phrase anglaise était le contournement bon marché que ce
   * ticket avait interdit d'avance. Le seul moyen de démontrer qu'il n'a pas été pris est de
   * rendre la phrase FAUSSE et de vérifier que l'écran rend quand même la bonne chose.
   */
  it('CONTRE-PREUVE : une phrase anglaise falsifiée ne change pas ce que lit l’écran', () => {
    const vrai = unavailable<number>(ORIGIN, { kind: 'couche_absente', layer: 'roads' });
    const falsifie = { ...vrai, missingReason: 'the rail-stop layer did not load, obviously' };

    expect(missingText(falsifie, 'fr')).toBe(
      motifText({ kind: 'couche_absente', layer: 'roads' }, 'fr'),
    );
    expect(missingText(falsifie, 'en')).toBe(
      motifText({ kind: 'couche_absente', layer: 'roads' }, 'en'),
    );
    expect(missingText(falsifie, 'fr')).not.toBe(falsifie.missingReason);
  });

  it('produit la phrase anglaise DEPUIS le motif, et les deux ne peuvent pas diverger', () => {
    for (const motif of CENSUS) {
      const m = unavailable<number>(ORIGIN, motif);
      expect(m.missing).toEqual(motif);
      expect(m.missingReason).toBe(motifText(motif, 'en'));
    }
  });
});

describe('scoreLocation — aucune prose sans son motif', () => {
  /**
   * La règle rendue mécanique sur le chemin réel, et pas seulement sur les constructeurs.
   *
   * C'est la même exigence que `Measured<T>` porte pour la source d'un chiffre : ce qui protège
   * n'est pas la ligne réparée, c'est l'invariant qui empêche qu'elle redevienne fausse. Un axe
   * qui reviendrait ici avec une phrase et sans motif serait une phrase que la page française ne
   * pourrait pas traduire, et le §49 recommencerait sur cet axe-là seulement.
   */
  const AUCUNE_COUCHE = buildIndex({
    amenities: [],
    roads: [],
    premises: [],
    services: [],
    nearestStationM: null,
    loaded: [],
  });

  it('chaque axe absent porte un motif, et sa phrase anglaise en dérive', () => {
    const scores = scoreLocation({ lat: 48.8631, lng: 2.3621 }, AUCUNE_COUCHE, uniformOrigins(ORIGIN));
    const axes = Object.entries(scores);
    // Toutes les couches manquent, donc aucun axe ne peut avoir de valeur : si un seul en avait
    // une, il l'aurait calculée sur une supposition et ce contrôle serait vide de sens.
    expect(axes.every(([, m]) => m.value === null)).toBe(true);

    for (const [axis, m] of axes) {
      expect(m.missing, axis).toBeDefined();
      expect(m.missingReason, axis).toBe(motifText(m.missing!, 'en'));
      // Et ce que la fiche française affiche n'est ni vide ni anglais.
      expect(missingText(m, 'fr'), axis).toBe(motifText(m.missing!, 'fr'));
      expect(missingText(m, 'fr'), axis).not.toBe(m.missingReason);
    }
  });

  it('une réserve suit la même règle qu’une absence', () => {
    // Le rail a répondu et n'a trouvé aucun arrêt : une MESURE, pas une absence — donc une
    // réserve, et elle doit se traduire comme le reste.
    const index = buildIndex({
      amenities: [],
      roads: [],
      premises: [],
      services: [],
      nearestStationM: null,
      loaded: ['stations'],
    });
    const rail = scoreLocation({ lat: 48.8631, lng: 2.3621 }, index, uniformOrigins(ORIGIN)).rail;

    expect(rail.value).toBe(0);
    expect(rail.caveats).toEqual([{ kind: 'aucun_arret_dans_rayon' }]);
    expect(rail.note).toBe(motifText({ kind: 'aucun_arret_dans_rayon' }, 'en'));
    expect(noteText(rail, 'fr')).toBe(motifText({ kind: 'aucun_arret_dans_rayon' }, 'fr'));
  });
});
