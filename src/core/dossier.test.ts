/**
 * The dossier of one address — w6-dossier (#33).
 *
 * **The criterion of the ticket is « chaque figure est re-dérivable », and it is tested as a
 * round trip rather than as a checklist.** The scorer runs over a real neighbourhood, the
 * dossier is built from what it returned, and then every figure is recomputed FROM THE FILE —
 * its constants, its operands — and compared to the value the file publishes. A test that only
 * asserted « the row has a `source` field » would pass on a dossier whose numbers cannot be
 * obtained again, which is the whole thing this ticket exists to prevent.
 *
 * The second half is the refusal: a withheld figure must go down with the cause of its absence
 * and must NOT re-derive to zero. `unavailable()` and `composeVerdict` both hold that line one
 * level up, and a file that quietly turned « source injoignable » into « 0 / 100 » would undo
 * both of them at the last step, where nobody would be looking.
 */

import { describe, expect, it } from 'vitest';
import {
  AMENITY_RADIUS_M,
  BDCOM_ORIGIN,
  FOOTFALL_RADIUS_M,
  FOOTFALL_WEIGHTS,
  IDFM_ORIGIN,
  M_PER_DEG_LAT,
  NOISE_RADIUS_M,
  NOISE_SCALE,
  OSM_ORIGIN,
  PREMISE_SATURATION,
  SERVICE_RADIUS_M,
  SERVICE_SATURATION,
  SERVICE_WEIGHTS,
  TRANSIT_DECAY_M,
  VERDICT_AXES,
  VERDICT_AXIS_ORDER,
  buildDossier,
  buildIndex,
  composeVerdict,
  contextToolCall,
  dayShape,
  dossierFilename,
  dossierToJson,
  findingsFromScores,
  mPerDegLng,
  rederive,
  scoreLocationDetailed,
  type Dossier,
  type DossierLabels,
  type Layer,
  type LayerOrigins,
  type NeighbourhoodContext,
  type Point,
  type PremisePoint,
  type ServicePoint,
  type VerdictAxis,
  type Withholding,
} from './index';

/** Rue de Bretagne, the address every measurement of this sheet has been taken on since #156. */
const BRETAGNE: Point = { lat: 48.8631, lng: 2.3621 };

function offset(point: Point, northM: number, eastM: number): Point {
  return {
    lat: point.lat + northM / M_PER_DEG_LAT,
    lng: point.lng + eastM / mPerDegLng(point.lat),
  };
}

/**
 * Layer origins shaped like the sheet's own: the corpus behind the premises and the services,
 * IDFM behind the rail stop, OpenStreetMap behind the roads.
 *
 * Not `uniformOrigins`, and the difference is the one the dossier has to survive: three sources
 * with three licences and three vintages on one address is the ordinary case, and a file that
 * stamped one provenance across six rows would be wrong on four of them.
 */
const ORIGINS: LayerOrigins = {
  premises: BDCOM_ORIGIN(2023, 'ODbL-1.0', '2023-06'),
  services: BDCOM_ORIGIN(2023, 'ODbL-1.0', '2023-06'),
  stations: IDFM_ORIGIN('2026-07-01'),
  amenities: OSM_ORIGIN('2026-09-15'),
  roads: OSM_ORIGIN('2026-09-15'),
};

const LABELS: DossierLabels = Object.fromEntries(
  VERDICT_AXIS_ORDER.map((axis) => [axis, { label: `nom ${axis}`, counts: `ce que compte ${axis}` }]),
) as DossierLabels;

const COPY = { methodology: 'méthodologie', doctrine: 'Un dossier, une adresse.' };

/** Premises and shops spread inside the radius, in numbers a dense Paris street really holds. */
function neighbourhood(partial: Partial<NeighbourhoodContext> = {}): NeighbourhoodContext {
  const premises: PremisePoint[] = Array.from({ length: 140 }, (_, i) => ({
    ...offset(BRETAGNE, (i % 14) * 20, Math.floor(i / 14) * 20),
    status: i % 9 === 0 ? 'vacant' : 'occupied',
  }));
  const services: ServicePoint[] = [
    ...Array.from({ length: 62 }, (_, i) => ({ ...offset(BRETAGNE, i * 5, 0), family: 'alimentaire' as const })),
    ...Array.from({ length: 30 }, (_, i) => ({ ...offset(BRETAGNE, 0, i * 5), family: 'soins' as const })),
    ...Array.from({ length: 110 }, (_, i) => ({ ...offset(BRETAGNE, i * 3, i * 2), family: 'restauration' as const })),
    ...Array.from({ length: 80 }, (_, i) => ({ ...offset(BRETAGNE, -i * 4, 0), family: 'demarches' as const })),
    ...Array.from({ length: 24 }, (_, i) => ({ ...offset(BRETAGNE, 0, -i * 6), family: 'culture' as const })),
  ];
  return {
    amenities: [],
    roads: [
      { ...offset(BRETAGNE, 40, 0), weight: 4 },
      { ...offset(BRETAGNE, 180, 60), weight: 3 },
      { ...offset(BRETAGNE, 460, 0), weight: 2 },
    ],
    premises,
    services,
    // 187 m and not 190: a round operand makes a whole family of defect invisible. Measured on
    // 15 September 2026 — with 190 here, a `derivationOf` that rounded the published distance to
    // the nearest ten left this file GREEN, because the rounding was a no-op on the fixture. The
    // control was sound and the fixture was blind. `docs/REPRISE-PIEGES.md` carries the geste.
    nearestStationM: 187,
    bounds: {
      south: BRETAGNE.lat - 0.02,
      north: BRETAGNE.lat + 0.02,
      west: BRETAGNE.lng - 0.02,
      east: BRETAGNE.lng + 0.02,
    },
    loaded: ['amenities', 'roads', 'premises', 'services', 'stations'],
    ...partial,
  };
}

/** One dossier, built the way the sheet builds it: score, findings, verdict, file. */
function dossierFor(
  partial: Partial<NeighbourhoodContext> = {},
  withheldBy: Partial<Record<Layer, Withholding>> = {},
): Dossier {
  const points = neighbourhood(partial);
  const scored = scoreLocationDetailed(BRETAGNE, buildIndex(points), ORIGINS);
  const findings = findingsFromScores(scored.scores, withheldBy);
  return buildDossier({
    address: {
      label: 'Rue de Bretagne, 75003 Paris',
      lat: BRETAGNE.lat,
      lng: BRETAGNE.lng,
      source: 'Base Adresse Nationale',
      licence: 'Licence Ouverte (Etalab 2.0)',
    },
    findings,
    operands: scored.operands,
    verdict: composeVerdict(findings, 'fr'),
    labels: LABELS,
    locale: 'fr',
    issuedAt: '2026-09-15T18:42:07.000Z',
    copy: COPY,
  });
}

describe('le dossier porte les six constats de la fiche, et rien de listé à la main', () => {
  it('énumère VERDICT_AXIS_ORDER, dans l’ordre de lecture de la fiche', () => {
    // The population is derived: a seventh axis on the sheet is a seventh row in the file the
    // same day, without a list anywhere to remember to extend.
    expect(dossierFor().figures.map((f) => f.axis)).toEqual([...VERDICT_AXIS_ORDER]);
  });

  it('dit de chaque constat s’il PORTE le verdict, sans retaper la table', () => {
    for (const f of dossierFor().figures) {
      expect(f.bearing, f.axis).toBe(VERDICT_AXES[f.axis].bearing);
    }
  });

  it('descend la provenance de chaque chiffre : source, licence, millésime, méthode', () => {
    for (const f of dossierFor().figures) {
      expect(f.source, f.axis).toBeTruthy();
      expect(f.licence, f.axis).toBeTruthy();
      expect(f.asOf, f.axis).toBeTruthy();
      expect(f.method, f.axis).toBeTruthy();
    }
  });

  it('attribue chaque constat à la couche qu’il lit, et pas à une provenance unique', () => {
    const byAxis = new Map(dossierFor().figures.map((f) => [f.axis, f]));
    expect(byAxis.get('density')?.source).toBe('APUR BDCom 2023');
    expect(byAxis.get('rail')?.source).toBe(ORIGINS.stations.source);
    expect(byAxis.get('noise')?.source).toBe(ORIGINS.roads.source);
    // Footfall mixes two layers and must name both — `combineOrigins`, never « la principale ».
    expect(byAxis.get('footfall')?.source).toContain('APUR BDCom 2023');
    expect(byAxis.get('footfall')?.source).toContain(ORIGINS.stations.source);
  });
});

describe('chaque figure est re-dérivable — le critère du ticket', () => {
  it('recalcule chaque chiffre à partir des seules constantes et opérandes du fichier', () => {
    const dossier = dossierFor();
    // Nothing is read from the module here: `rederive` is handed the row, and the row came out
    // of `JSON.parse`, so this is what a reader with the file and nothing else can do.
    const relu = JSON.parse(dossierToJson(dossier)) as Dossier;
    expect(relu.figures.filter((f) => f.value !== null).length).toBe(VERDICT_AXIS_ORDER.length);
    for (const f of relu.figures) {
      expect(rederive(f.derivation), `${f.axis} ne se recalcule pas`).toBe(f.value);
    }
  });

  it('publie les constantes du noyau, jamais des littéraux recopiés', () => {
    const byAxis = new Map(dossierFor().figures.map((f) => [f.axis, f.derivation]));
    expect(byAxis.get('density')).toMatchObject({
      radiusM: FOOTFALL_RADIUS_M,
      constants: { S: PREMISE_SATURATION },
    });
    expect(byAxis.get('alimentaire')).toMatchObject({
      radiusM: SERVICE_RADIUS_M,
      constants: { S: SERVICE_SATURATION.alimentaire },
    });
    expect(byAxis.get('rail')).toMatchObject({
      radiusM: AMENITY_RADIUS_M,
      constants: { D: TRANSIT_DECAY_M },
    });
    expect(byAxis.get('footfall')).toMatchObject({
      constants: { w_locaux: FOOTFALL_WEIGHTS.premises, w_rail: FOOTFALL_WEIGHTS.rail },
    });
    expect(byAxis.get('noise')).toMatchObject({
      radiusM: NOISE_RADIUS_M,
      constants: { K: NOISE_SCALE, R: NOISE_RADIUS_M },
    });
    const services = byAxis.get('services');
    for (const family of Object.keys(SERVICE_WEIGHTS) as (keyof typeof SERVICE_WEIGHTS)[]) {
      expect(services?.constants[`w_${family}`], family).toBe(SERVICE_WEIGHTS[family]);
      expect(services?.constants[`S_${family}`], family).toBe(SERVICE_SATURATION[family]);
    }
  });

  it('publie l’opérande, et c’est ce que la formule a réellement compté', () => {
    const points = neighbourhood();
    const scored = scoreLocationDetailed(BRETAGNE, buildIndex(points), ORIGINS);
    const dossier = dossierFor();
    const density = dossier.figures.find((f) => f.axis === 'density');
    // The count the scorer walked, not a recount beside it: the two would agree today and be
    // free to diverge the day `FOOTFALL_RADIUS_M` moved under one of them.
    expect(density?.derivation.operands.n).toBe(scored.operands.occupiedPremises);
    expect(density?.derivation.operands.n).toBeGreaterThan(0);
    const rail = dossier.figures.find((f) => f.axis === 'rail');
    expect(rail?.derivation.operands.d).toBe(187);
    expect(rail?.derivation.operands.d).toBe(scored.operands.nearestStationM);
    const noise = dossier.figures.find((f) => f.axis === 'noise');
    expect(noise?.derivation.operands.voies).toBe(3);
  });

  it('re-dérive le passage depuis deux chiffres que le fichier publie lui-même', () => {
    const dossier = dossierFor();
    const byAxis = new Map(dossier.figures.map((f) => [f.axis, f]));
    const footfall = byAxis.get('footfall');
    expect(footfall?.derivation.operands.densité).toBe(byAxis.get('density')?.value);
    expect(footfall?.derivation.operands.desserte).toBe(byAxis.get('rail')?.value);
    expect(rederive(footfall!.derivation)).toBe(footfall?.value);
  });
});

describe('un constat absent descend avec sa cause, et ne se recalcule JAMAIS en zéro', () => {
  const sansMiroir = () =>
    dossierFor({ loaded: ['premises', 'services', 'stations'] }, { roads: 'source_injoignable' });

  it('nomme la cause structurée et la raison écrite par le noyau', () => {
    const noise = sansMiroir().figures.find((f) => f.axis === 'noise');
    expect(noise?.value).toBeNull();
    expect(noise?.withheldBecause).toBe('source_injoignable');
    expect(noise?.missingReason).toBeTruthy();
  });

  it('rend null plutôt que zéro — une absence n’est pas un silence mesuré', () => {
    const noise = sansMiroir().figures.find((f) => f.axis === 'noise');
    expect(rederive(noise!.derivation)).toBeNull();
  });

  it('garde la formule et le rayon d’un constat absent : le lecteur sait ce qui manque', () => {
    const noise = sansMiroir().figures.find((f) => f.axis === 'noise');
    expect(noise?.derivation.formula).toBeTruthy();
    expect(noise?.derivation.radiusM).toBe(NOISE_RADIUS_M);
  });

  it('distingue une couche EN ROUTE d’un trou — les deux se lisent pareil et ne le sont pas', () => {
    // Écrit APRÈS la démonstration au navigateur du 15 septembre 2026, pas avant : le fichier
    // téléchargé 2,1 s après le verdict portait `noise` en « indetermine », sans rien qui dise
    // qu'OpenStreetMap était encore attendu. C'est la distinction que `#180` a construite à
    // l'écran, perdue à la dernière étape — celle qui se transmet par courrier.
    const points = neighbourhood({ loaded: ['premises', 'services', 'stations'] });
    const scored = scoreLocationDetailed(BRETAGNE, buildIndex(points), ORIGINS);
    const findings = findingsFromScores(scored.scores);
    const dossier = buildDossier({
      address: { label: 'A', lat: BRETAGNE.lat, lng: BRETAGNE.lng, source: 'BAN', licence: 'LO' },
      findings,
      pending: new Set<VerdictAxis>(['noise']),
      operands: scored.operands,
      verdict: composeVerdict(findings, 'fr'),
      labels: LABELS,
      locale: 'fr',
      issuedAt: '2026-09-15T18:42:07.000Z',
      copy: COPY,
    });
    const noise = dossier.figures.find((f) => f.axis === 'noise');
    expect(noise?.pending).toBe(true);
    expect(dossier.gaps.find((g) => g.axis === 'noise')?.pending).toBe(true);
    // Et un trou qui n'est PAS en route ne porte pas le drapeau, sans quoi il ne dirait rien.
    const vrai = sansMiroir().figures.find((f) => f.axis === 'noise');
    expect(vrai?.pending).toBeUndefined();
    expect(vrai?.withheldBecause).toBe('source_injoignable');
  });

  it('dresse la liste des trous depuis ses propres lignes, jamais d’un paramètre à part', () => {
    const dossier = sansMiroir();
    expect(dossier.gaps.map((g) => g.axis)).toEqual(
      dossier.figures.filter((f) => f.value === null).map((f) => f.axis),
    );
  });

  it('descend un refus de verdict comme tel, sans axes utilisés', () => {
    // A bearing layer is silent, so `composeVerdict` refuses — and the file says « refus »
    // rather than carrying a sentence composed over a hole (`#54`, the defect verdict.ts exists
    // for). This is the case a banker is most likely to be handed and least likely to expect.
    const dossier = dossierFor(
      { loaded: ['amenities', 'roads', 'services', 'stations'] },
      { premises: 'hors_corpus' },
    );
    expect(dossier.verdict.kind).toBe('refus');
    expect(dossier.verdict.used).toEqual([]);
    expect(dossier.verdict.sentence).toContain('Compass ne compose pas de verdict');
    expect(dossier.gaps.some((g) => g.because === 'hors_corpus')).toBe(true);
  });

  it('classe en indetermine un axe que l’appelant n’a pas fourni du tout', () => {
    // Not reachable from the sheet, which always passes six. Reachable from any other caller,
    // and the row says so instead of the dossier being quietly one figure short.
    const points = neighbourhood();
    const scored = scoreLocationDetailed(BRETAGNE, buildIndex(points), ORIGINS);
    const findings = findingsFromScores(scored.scores).filter((f) => f.axis !== 'noise');
    const dossier = buildDossier({
      address: { label: 'A', lat: BRETAGNE.lat, lng: BRETAGNE.lng, source: 'BAN', licence: 'LO' },
      findings,
      operands: scored.operands,
      verdict: composeVerdict(findings, 'fr'),
      labels: LABELS,
      locale: 'fr',
      issuedAt: '2026-09-15T18:42:07.000Z',
      copy: COPY,
    });
    const noise = dossier.figures.find((f) => f.axis === 'noise');
    expect(noise?.value).toBeNull();
    expect(noise?.withheldBecause).toBe('indetermine');
  });
});

describe('le fichier se tient tout seul', () => {
  it('porte la doctrine — un dossier, une adresse — dans le fichier et pas seulement à l’écran', () => {
    expect(dossierFor().doctrine).toBe(COPY.doctrine);
  });

  it('porte l’appel MCP qui refait la même lecture sur le même point', () => {
    expect(dossierFor().reproduce.agentCall).toEqual(contextToolCall(BRETAGNE));
  });

  it('se nomme, se date et se versionne', () => {
    const dossier = dossierFor();
    expect(dossier.format).toBe('compass.dossier');
    expect(dossier.version).toBeGreaterThanOrEqual(1);
    expect(dossier.issuedAt).toBe('2026-09-15T18:42:07.000Z');
  });

  it('descend un nom de fichier sans accent, daté du jour de l’émission', () => {
    expect(dossierFilename(dossierFor())).toBe(
      'compass-dossier-rue-de-bretagne-75003-paris-2026-09-15.json',
    );
  });

  it('descend un nom utilisable même pour une adresse qui n’en donne aucun', () => {
    const dossier = { ...dossierFor(), address: { ...dossierFor().address, label: '—' } };
    expect(dossierFilename(dossier)).toBe('compass-dossier-adresse-2026-09-15.json');
  });

  it('nomme les axes comme la fiche les nomme, sans seconde table de libellés', () => {
    for (const f of dossierFor().figures) {
      expect(f.label, f.axis).toBe(LABELS[f.axis as VerdictAxis].label);
      expect(f.counts, f.axis).toBe(LABELS[f.axis as VerdictAxis].counts);
    }
  });

  it('est du JSON lisible, et survit à l’aller-retour', () => {
    const dossier = dossierFor();
    expect(JSON.parse(dossierToJson(dossier))).toEqual(JSON.parse(JSON.stringify(dossier)));
    expect(dossierToJson(dossier)).toContain('\n  ');
  });
});

/**
 * The seventh criterion of w2-rythme (#208): the exported file carries the shape of the
 * nearest station's day — its licence, its vintage, its reserve and its reading — under the
 * same rule as every other figure, and OUTSIDE `figures`, which is the frontier of criterion 5
 * made checkable in the artefact that gets forwarded.
 */
describe('le dossier porte la forme de la journée, à côté des constats — w2-rythme (#208)', () => {
  const AS_OF = '2026-03-10';

  const shape = dayShape(
    // Opéra's real relative shape, measured 17 September 2026: evening-led.
    [
      { catJour: 'JOHV', hourBucket: '7H-8H', pct: 0.6 },
      { catJour: 'JOHV', hourBucket: '8H-9H', pct: 1.4 },
      { catJour: 'JOHV', hourBucket: '12H-13H', pct: 4.5 },
      { catJour: 'JOHV', hourBucket: '17H-18H', pct: 11.7 },
      { catJour: 'JOHV', hourBucket: '18H-19H', pct: 14.5 },
    ],
    { name: 'Opéra', distanceM: 120.4 },
    AS_OF,
  );

  const avecRythme = (measured = shape): Dossier => {
    const points = neighbourhood();
    const scored = scoreLocationDetailed(BRETAGNE, buildIndex(points), ORIGINS);
    const findings = findingsFromScores(scored.scores, {});
    return buildDossier({
      address: {
        label: 'Rue de Bretagne, 75003 Paris',
        lat: BRETAGNE.lat,
        lng: BRETAGNE.lng,
        source: 'Base Adresse Nationale',
        licence: 'Licence Ouverte (Etalab 2.0)',
      },
      findings,
      operands: scored.operands,
      verdict: composeVerdict(findings, 'fr'),
      labels: LABELS,
      locale: 'fr',
      issuedAt: '2026-09-15T18:42:07.000Z',
      copy: COPY,
      rythme: { measured, reading: 'lecture de test', settles: 'recoupement de test' },
    });
  };

  it('porte forme, licence, millésime, réserve et lecture', () => {
    const r = avecRythme().rythme;
    expect(r?.shape?.stationName).toBe('Opéra');
    expect(r?.shape?.kind).toBe('depart_du_soir');
    expect(r?.shape?.dayType).toBe('JOHV');
    expect(r?.shape?.buckets.length).toBe(5);
    expect(r?.licence).toBe('ODbL');
    expect(r?.asOf).toBe(AS_OF);
    expect(r?.note).toBeTruthy();
    expect(r?.noteMotifs).toEqual([{ kind: 'journee_de_station' }]);
    expect(r?.reading).toBe('lecture de test');
    expect(r?.settles).toBe('recoupement de test');
  });

  it('porte l’ODbL du profil et JAMAIS la Licence Ouverte de l’axe de distance', () => {
    // The two licences are on the same page and in the same file, one per figure. The rail
    // axis's row and the day-shape record are the exact pair a copy would collapse.
    const dossier = avecRythme();
    const rail = dossier.figures.find((f) => f.axis === 'rail');
    expect(rail?.licence).toBe(IDFM_ORIGIN('2026-03-10').licence);
    expect(dossier.rythme?.licence).not.toBe(rail?.licence);
  });

  it('ne se range PAS dans les figures, et n’ajoute aucun axe — critère 5 dans le fichier', () => {
    const dossier = avecRythme();
    expect(dossier.figures.map((f) => f.axis)).toEqual([...VERDICT_AXIS_ORDER]);
    expect(dossier.verdict.used.some((a) => String(a).includes('rythme'))).toBe(false);
    // And the verdict sentence is byte-identical with and without it: a block that changed
    // the conclusion would be a seventh axis whatever it was called.
    expect(dossier.verdict.sentence).toBe(dossierFor().verdict.sentence);
  });

  it('dit son échelle, pour qu’on ne la pose pas sur celle des constats', () => {
    expect(avecRythme().rythme?.scale).toBe('pourcentage-de-la-journee-de-la-station');
    for (const f of avecRythme().figures) expect(f.scale).toBe('0-100');
  });

  it('aucun nombre du bloc ne peut se lire comme un compte de personnes — critère 2', () => {
    const r = avecRythme().rythme;
    for (const b of r?.shape?.buckets ?? []) {
      expect(b.pct).toBeGreaterThanOrEqual(0);
      expect(b.pct).toBeLessThanOrEqual(100);
    }
    for (const v of Object.values(r?.shape?.windows ?? {})) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('descend l’absence de station comme une réponse, sans lecture — critère 6', () => {
    const vide = dayShape([], { name: null, distanceM: null }, AS_OF);
    const r = avecRythme(vide).rythme;
    expect(r?.shape).toBeNull();
    expect(r?.missingMotif).toEqual({ kind: 'aucun_arret_dans_rayon' });
    expect(r?.missingReason).toBeTruthy();
    // No reading over a distribution that does not exist — the one claim this record cannot make.
    expect(r?.reading).toBeUndefined();
    expect(r?.settles).toBeUndefined();
    // And the licence survives the absence: a hole that cannot name its dataset is the hole
    // this product refuses.
    expect(r?.licence).toBe('ODbL');
  });

  it('est absent du fichier quand la couche n’a pas répondu du tout', () => {
    // Three states, not two — the distinction `#180` drew for a pending layer. An outage
    // leaves no record at all, so a consumer never reads « no rhythm here » off a silence.
    expect(dossierFor().rythme).toBeUndefined();
  });

  it('survit à l’aller-retour JSON comme le reste du fichier', () => {
    const dossier = avecRythme();
    expect(JSON.parse(dossierToJson(dossier))).toEqual(JSON.parse(JSON.stringify(dossier)));
  });
});
