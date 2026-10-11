/**
 * The day shape — w2-rythme (#208).
 *
 * Five of the ticket's seven criteria are held here, and the two that are not are held where
 * they live: criterion 4's wording is in `rythmeText.test.ts`, criterion 7's export in
 * `dossier.test.ts`.
 *
 *  1. the figure carries the PROFILE's licence and never the distance axis's;
 *  2. no number leaving this module can be read as a count of people;
 *  5. nothing here enters `VERDICT_AXES` or the composition of the verdict;
 *  6. no station in range is an answer and not an outage;
 *  and the reading carries a status taken from the existing enumeration, not a sentence.
 *
 * **What these controls do NOT catch**, and it has to be said: they judge what this module
 * PRODUCES. A page that read `Measured.value.windows` and multiplied it by a ridership figure
 * from somewhere else would pass every one of them — nothing here can see outside the module.
 * What makes that hard is elsewhere and is structural: the source publishes no volume, so
 * there is no count in the database to multiply by.
 */

import { describe, expect, it } from 'vitest';

import {
  IDFM_ORIGIN,
  IDFM_PROFILE_ORIGIN,
  LEAD_REASON_STATUSES,
  MOTIF_KINDS,
  RYTHME_DAY_TYPE,
  RYTHME_MARGIN,
  RYTHME_SHAPES,
  RYTHME_WINDOWS,
  RYTHME_WINDOW_IDS,
  VERDICT_AXES,
  VERDICT_AXIS_ORDER,
  bucketHour,
  dayShape,
  shapeOf,
  type RythmeShape,
  type StationHourShare,
} from './index';

/** The date the sheet passes: `ingestion_run.source_as_of` for `idfm`, measured 17 Sept 2026. */
const AS_OF = '2026-03-10';

const STATION = { name: 'Poissonnière', distanceM: 366.5 };

/**
 * A profile built from a per-hour table, normalised to 100 % so it is the same KIND of thing
 * the source publishes — measured over all 258 stations on 17 September 2026: their JOHV
 * buckets sum to between 99,96 % and 100,04 %.
 *
 * Other day-type codes are added around it, because the real call returns five and the module
 * has to read one. A fixture carrying only JOHV could not fail the way production can.
 */
function profile(byHour: Readonly<Record<number, number>>): StationHourShare[] {
  const total = Object.values(byHour).reduce((s, v) => s + v, 0);
  const johv = Object.entries(byHour).map(([h, v]) => ({
    catJour: RYTHME_DAY_TYPE,
    hourBucket: `${h}H-${(Number(h) + 1) % 24}H`,
    pct: (v / total) * 100,
  }));
  // A Sunday profile with a completely different shape, to prove the filter is doing work.
  const dimanche = Object.keys(byHour).map((h) => ({
    catJour: 'DIJFP',
    hourBucket: `${h}H-${(Number(h) + 1) % 24}H`,
    pct: 100 / Object.keys(byHour).length,
  }));
  return [...dimanche, ...johv];
}

/** Jourdain's real relative shape, 17 September 2026: morning-led, 29,6 % against 21,3 %. */
const MATINAL = profile({ 7: 6.6, 8: 13.2, 9: 9.8, 12: 5.4, 13: 5.3, 17: 8.7, 18: 7.3, 19: 5.3 });
/** Opéra's real relative shape, same day: evening-led, 3,6 % against 37,1 %. */
const VESPERAL = profile({ 7: 0.6, 8: 1.4, 9: 1.6, 12: 4.5, 13: 4.8, 17: 11.7, 18: 14.5, 19: 10.9 });
/** Porte de Vanves, same day: 26,1 % against 26,8 %, inside the margin. */
const DEUX = profile({ 7: 6.6, 8: 12.1, 9: 7.4, 12: 4.9, 13: 4.8, 17: 10.9, 18: 9.6, 19: 6.3 });

describe('la forme de la journée — w2-rythme (#208)', () => {
  it('lit le jour ouvré hors vacances et jette les quatre autres codes', () => {
    const m = dayShape(MATINAL, STATION, AS_OF);
    expect(m.value?.dayType).toBe(RYTHME_DAY_TYPE);
    // The fixture carries a flat DIJFP profile over the same hours. If it leaked in, the
    // windows would move; the count is the check that says which rows were kept.
    expect(m.value?.buckets.length).toBe(MATINAL.filter((r) => r.catJour === RYTHME_DAY_TYPE).length);
    for (const b of m.value?.buckets ?? []) {
      expect(MATINAL.some((r) => r.catJour === RYTHME_DAY_TYPE && r.hourBucket === b.label)).toBe(true);
    }
  });

  it('rend les tranches dans l’ordre des heures, quel que soit l’ordre reçu', () => {
    const melange = [...MATINAL].reverse();
    const hours = dayShape(melange, STATION, AS_OF).value?.buckets.map((b) => b.hour) ?? [];
    expect(hours).toEqual([...hours].sort((a, b) => a - b));
    expect(hours.length).toBeGreaterThan(0);
  });

  it('lit l’heure d’ouverture d’une tranche sans confondre 1H et 10H', () => {
    // The failure shape #165 shipped: `(\d+)` on `10_000` returned 10. Here the mirror of it —
    // a loose pattern reading `10H-11H` as hour 1 — would silently move a bucket into the
    // morning window and change the reading of 89 stations.
    expect(bucketHour('1H-2H')).toBe(1);
    expect(bucketHour('10H-11H')).toBe(10);
    expect(bucketHour('23H-0H')).toBe(23);
    expect(bucketHour('0H-1H')).toBe(0);
    expect(bucketHour('24H-25H')).toBeNull();
    expect(bucketHour('matin')).toBeNull();
    expect(bucketHour('8H')).toBeNull();
  });

  it('range une tranche inconnue plutôt que de l’inventer à zéro', () => {
    // 70 of the 258 stations carry fewer than 24 buckets (measured 17 September 2026), so a
    // label the parser cannot read must be DROPPED, never defaulted — a bucket filled with a
    // measured 0 is the §16 defect, in a new place.
    const avecIntrus: StationHourShare[] = [
      ...MATINAL,
      { catJour: RYTHME_DAY_TYPE, hourBucket: 'inconnu', pct: 42 },
    ];
    const m = dayShape(avecIntrus, STATION, AS_OF);
    expect(m.value?.buckets.some((b) => b.pct === 42)).toBe(false);
  });
});

describe('la licence est celle du PROFIL, jamais celle de l’axe de distance — critère 1', () => {
  it('les deux jeux d’une même ingestion portent deux licences différentes', () => {
    // The trap, in one assertion: one run, one date, two obligations. Copying the stop
    // reference's Licence Ouverte onto an ODbL figure would release a redistributor from the
    // share-alike clause; the reverse would bind them to one they do not owe.
    expect(IDFM_PROFILE_ORIGIN(AS_OF).licence).toBe('ODbL');
    expect(IDFM_ORIGIN(AS_OF).licence).toBe('Licence Ouverte 2.0 (Etalab)');
    expect(IDFM_PROFILE_ORIGIN(AS_OF).licence).not.toBe(IDFM_ORIGIN(AS_OF).licence);
    expect(IDFM_PROFILE_ORIGIN(AS_OF).source).not.toBe(IDFM_ORIGIN(AS_OF).source);
  });

  it('la figure porte l’ODbL et le millésime du dépôt, sur les deux états', () => {
    for (const m of [dayShape(MATINAL, STATION, AS_OF), dayShape([], STATION, AS_OF)]) {
      expect(m.licence).toBe(IDFM_PROFILE_ORIGIN(AS_OF).licence);
      expect(m.licence).not.toBe(IDFM_ORIGIN(AS_OF).licence);
      expect(m.source).toBe(IDFM_PROFILE_ORIGIN(AS_OF).source);
      // Same date as the distance axis, and that is correct: one ingestion run.
      expect(m.asOf).toBe(IDFM_ORIGIN(AS_OF).asOf);
    }
  });

  it('n’a aucun paramètre par lequel un appelant pourrait passer la mauvaise licence', () => {
    // The structural half of criterion 1, and the one a review asks for: `dayShape` takes a
    // DATE. Its arity is what makes the mistake unavailable rather than merely tested — a
    // fourth parameter appearing here would be the day this control has to be reread.
    expect(dayShape.length).toBe(3);
  });
});

describe('aucun volume n’est affiché ni dérivé — critère 2', () => {
  /** Every number the module emits, reached by walking the object rather than listing fields. */
  const nombres = (v: unknown, path = ''): Array<[string, number]> => {
    if (typeof v === 'number') return [[path, v]];
    if (Array.isArray(v)) return v.flatMap((x, i) => nombres(x, `${path}[${i}]`));
    if (v && typeof v === 'object') {
      return Object.entries(v).flatMap(([k, x]) => nombres(x, path ? `${path}.${k}` : k));
    }
    return [];
  };

  it('tout nombre émis est une part, sauf la distance — et la population est balayée', () => {
    for (const fixture of [MATINAL, VESPERAL, DEUX]) {
      const value = dayShape(fixture, STATION, AS_OF).value;
      expect(value).not.toBeNull();
      const found = nombres(value);
      // Walked, not listed: a field added to `DayShape` enters this control the day it is
      // added. That is the difference between a rule that enumerates and one that lists.
      expect(found.length).toBeGreaterThan(RYTHME_WINDOW_IDS.length);
      for (const [path, n] of found) {
        if (path === 'distanceM') continue;
        if (path.endsWith('.hour')) {
          expect(n, path).toBeGreaterThanOrEqual(0);
          expect(n, path).toBeLessThanOrEqual(23);
          continue;
        }
        // A share of one day. Anything above 100 cannot be one, and a count of people at a
        // Paris station would clear it by three orders of magnitude.
        expect(n, path).toBeGreaterThanOrEqual(0);
        expect(n, path).toBeLessThanOrEqual(100);
      }
    }
  });

  it('les tranches somment à 100 %, ce qui est la preuve que c’est une part', () => {
    // Measured over the whole population on 17 September 2026: 99,96 % to 100,04 % at all 258
    // stations. A figure that ever summed to something else would be a count wearing a
    // percent sign — and the bound is the source's own, not a tolerance chosen here.
    for (const fixture of [MATINAL, VESPERAL, DEUX]) {
      const buckets = dayShape(fixture, STATION, AS_OF).value?.buckets ?? [];
      const total = buckets.reduce((s, b) => s + b.pct, 0);
      expect(total).toBeGreaterThan(99.9);
      expect(total).toBeLessThan(100.1);
    }
  });

  it('n’expose aucun champ dont le nom annonce un compte', () => {
    // The names matter as much as the values: a consumer branches on a key. `pct`, `windows`
    // and `buckets` say share; `total`, `count`, `validations` or `voyageurs` would invite the
    // multiplication this whole block refuses.
    const COMPTE = /count|total|nombre|volume|voyageur|passager|frequentation|ridership/iu;
    const cles = (v: unknown): string[] =>
      Array.isArray(v)
        ? v.flatMap(cles)
        : v && typeof v === 'object'
          ? Object.entries(v).flatMap(([k, x]) => [k, ...cles(x)])
          : [];
    for (const k of cles(dayShape(MATINAL, STATION, AS_OF))) {
      expect(COMPTE.test(k), `champ « ${k} »`).toBe(false);
    }
  });
});

describe('la lecture, et son statut pris de l’énumération — critère 4, la moitié du noyau', () => {
  it('rend les trois formes, et la marge décide seule', () => {
    expect(dayShape(MATINAL, STATION, AS_OF).value?.shape).toBe('depart_matinal');
    expect(dayShape(VESPERAL, STATION, AS_OF).value?.shape).toBe('depart_du_soir');
    expect(dayShape(DEUX, STATION, AS_OF).value?.shape).toBe('deux_pointes');
    // The three fixtures cover the population, so a fourth shape cannot be added without a
    // fixture — the census discipline, applied to a `const` array.
    const rendues = new Set<RythmeShape>([
      dayShape(MATINAL, STATION, AS_OF).value?.shape as RythmeShape,
      dayShape(VESPERAL, STATION, AS_OF).value?.shape as RythmeShape,
      dayShape(DEUX, STATION, AS_OF).value?.shape as RythmeShape,
    ]);
    expect(rendues.size).toBe(RYTHME_SHAPES.length);
  });

  it('la marge est symétrique et elle est le seul seuil', () => {
    // Exactly at the margin is NOT led: the comparison is strict on both sides, so the two
    // named shapes cannot both be true of one profile and neither can be true by rounding.
    expect(shapeOf(100, 100)).toBe('deux_pointes');
    expect(shapeOf(100 * RYTHME_MARGIN, 100)).toBe('deux_pointes');
    expect(shapeOf(100, 100 * RYTHME_MARGIN)).toBe('deux_pointes');
    expect(shapeOf(100 * RYTHME_MARGIN + 0.01, 100)).toBe('depart_matinal');
    expect(shapeOf(100, 100 * RYTHME_MARGIN + 0.01)).toBe('depart_du_soir');
  });

  it('porte un statut de l’énumération existante, et jamais « mesuré »', () => {
    // Criterion 4 in the core: the KIND of claim is read off `LEAD_REASON_STATUSES`, the
    // enumeration w6-mode-raison (#197) established, never written as a sentence. And it
    // cannot be `mesure`: settling it needs a count of jobs the corpus does not hold.
    const status = dayShape(MATINAL, STATION, AS_OF).value?.status;
    expect(LEAD_REASON_STATUSES).toContain(status);
    expect(status).toBe('arbitrage');
    expect(status).not.toBe('mesure');
  });

  it('le midi ne décide d’aucune forme, et il est quand même calculé', () => {
    // Measured over the 258 stations on 17 September 2026: the midday window is the strongest
    // of the three at ZERO of them. It is carried because the ticket and two migration
    // comments expect it to be decisive, so the screen has to be able to show it is not —
    // and moving it must never move a shape.
    expect(RYTHME_WINDOW_IDS).toContain('midi');
    const gonfle = profile({ 7: 1, 8: 1, 9: 1, 12: 40, 13: 40, 17: 1, 18: 1, 19: 1 });
    expect(dayShape(gonfle, STATION, AS_OF).value?.windows.midi).toBeGreaterThan(50);
    // Morning and evening are equal in that fixture, so the shape is the balanced one however
    // large midday grows.
    expect(dayShape(gonfle, STATION, AS_OF).value?.shape).toBe('deux_pointes');
  });

  it('les fenêtres sont des bornes demi-ouvertes, lues du noyau', () => {
    const value = dayShape(MATINAL, STATION, AS_OF).value;
    for (const id of RYTHME_WINDOW_IDS) {
      const { from, to } = RYTHME_WINDOWS[id];
      const attendu = (value?.buckets ?? [])
        .filter((b) => b.hour >= from && b.hour < to)
        .reduce((s, b) => s + b.pct, 0);
      expect(value?.windows[id]).toBeCloseTo(attendu, 10);
    }
  });
});

describe('rien de ceci n’entre dans la composition du verdict — critère 5', () => {
  it('aucune forme et aucune fenêtre n’est un axe du verdict', () => {
    // The frontier, held against the core's own population rather than against a list: the day
    // an axis called `rythme` were added to `VERDICT_AXES`, this reddens.
    const axes = new Set<string>(VERDICT_AXIS_ORDER);
    expect(axes.size).toBe(Object.keys(VERDICT_AXES).length);
    for (const nom of [...RYTHME_SHAPES, ...RYTHME_WINDOW_IDS, 'rythme', 'journee']) {
      expect(axes.has(nom), `« ${nom} » est devenu un axe du verdict`).toBe(false);
    }
  });

  it('la figure n’a pas la forme d’un constat : ni valeur sur 100, ni portance', () => {
    // A `Measured<number>` on a 0-100 scale is what `findingsFromScores` and `composeVerdict`
    // consume. This one holds an object, so it cannot be handed to either by accident — the
    // frontier is in the type before it is in a test.
    const value = dayShape(MATINAL, STATION, AS_OF).value;
    expect(typeof value).toBe('object');
    expect(value).not.toHaveProperty('bearing');
    expect(value).not.toHaveProperty('scale');
  });
});

describe('aucune station dans le rayon est une réponse, pas une panne — critère 6', () => {
  it('rend le motif que l’axe de distance emploie déjà pour ce même fait', () => {
    // Measured at the Bois de Vincennes on 17 September 2026: `compass_station_profile`
    // answers 200 with zero rows. An unreachable database throws in the service and never
    // arrives here, so the two can never be read alike.
    const m = dayShape([], { name: null, distanceM: null }, AS_OF);
    expect(m.value).toBeNull();
    expect(m.missing).toEqual({ kind: 'aucun_arret_dans_rayon' });
    expect(MOTIF_KINDS).toContain('aucun_arret_dans_rayon');
    // It still names its source and its licence: an absence that cannot say which dataset is
    // silent is the absence this product refuses.
    expect(m.licence).toBe('ODbL');
  });

  it('une station nommée sans aucune tranche est la même réponse', () => {
    // The rows of a station whose JOHV profile is entirely missing. Not a crash and not an
    // empty chart: the same motif, because the statement is the same one.
    const m = dayShape(
      [{ catJour: 'DIJFP', hourBucket: '8H-9H', pct: 100 }],
      STATION,
      AS_OF,
    );
    expect(m.value).toBeNull();
    expect(m.missing).toEqual({ kind: 'aucun_arret_dans_rayon' });
  });
});

describe('la réserve voyage avec le chiffre — critère 3, la moitié du noyau', () => {
  it('est portée par la figure elle-même, en motif structuré', () => {
    // A `caveats` entry and not a footnote: the screen renders it beside the figure, the
    // dossier carries it inside the record, and the agent path gets it in English. A reserve
    // that lived in the component would be one the exported file does not carry.
    const m = dayShape(MATINAL, STATION, AS_OF);
    expect(m.caveats).toEqual([{ kind: 'journee_de_station' }]);
    expect(MOTIF_KINDS).toContain('journee_de_station');
    expect(m.note).toBeTruthy();
  });

  it('dit les deux choses qu’elle doit dire, dans les deux langues', () => {
    // The station-not-the-frontage reserve, and the direction of the signal — a validation is
    // recorded on boarding. The second is what stops the whole block from being read backwards.
    const m = dayShape(MATINAL, STATION, AS_OF);
    expect(m.note).toMatch(/STATION/);
    expect(m.note).toMatch(/boarding/i);
  });
});
