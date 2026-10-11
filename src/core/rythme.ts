/**
 * The shape of the nearest station's day — w2-rythme (#208).
 *
 * **What this module is for.** Every other figure of this product is a still photograph: a
 * count inside a radius, with no hour attached. The sheet says « passage soutenu » and a
 * shopkeeper answers that « soutenu » at 8:30, at noon and at 3 p.m. names three different
 * trades with almost no overlap between them. `idfm_validation_profile` has held the hour of
 * the day since 7 September 2026 — 29 489 rows, remeasured against `ingestion_run.row_count`
 * on 17 September 2026 — and nothing read it: `fetchCorpusStation` kept two of the six columns
 * `compass_station_profile` returns and dropped the other four.
 *
 * **It is a SHARE and never a volume, and that is a property of the source.** Each row is the
 * percentage of one station's own day falling in one hour bucket. The dataset publishes no
 * absolute count at all, so two stations cannot be compared on how busy they are — only on the
 * shape of their day. Measured over the whole population on 17 September 2026: the JOHV
 * buckets of each of the 258 stations sum to between 99,96 % and 100,04 %. `rythme.test.ts`
 * holds that no number leaving this module can be read as a count of people.
 *
 * **It is not a seventh axis, and that is the design decision.** The six findings render a
 * LEVEL — high, medium, low — and the verdict composes bands out of them. A day's shape does
 * not go into a band: « morning-led » is neither high nor low, and forcing it onto a 0-100
 * scale would destroy the one thing this module exists to show. So it sits beside the six and
 * `VERDICT_AXES` never hears of it — held by a test, not by a promise.
 *
 * ---------------------------------------------------------------------------------------
 * **THE TICKET'S OWN READING WAS INVERTED, AND THE MEASUREMENT IS WHY THIS FILE DOES NOT
 * IMPLEMENT IT.** Issue #208 illustrates the reading as « double peak morning and evening, a
 * midday trough — a neighbourhood people leave to go to work » against « a midday swell — a
 * neighbourhood people come to work in ». The comment `20260907000002` puts on
 * `idfm_validation_profile.cat_jour` says the same — « an office rhythm (a lunchtime peak)
 * from a residential one (an evening peak) » — and `compass_station_profile`'s own comment
 * repeats it.
 *
 * Measured over all 258 Paris stations on 17 September 2026, as `anon`:
 *
 *   - the peak hour is 8h at 89 stations, 17h at 90, 18h at 76 and 16h at 3;
 *   - the midday window 11h-14h is the strongest of the three at ZERO stations;
 *   - morning 7h-10h beats evening 17h-20h at 59 stations, the reverse at 199.
 *
 * A validation is a tap-IN: it is recorded where a traveller BOARDS, and the Paris rail
 * network has no tap-out. A station's profile is therefore the shape of the DEPARTURES from
 * that place, not of the arrivals to it — which inverts the sign of the whole reading. A
 * residential neighbourhood is morning-led, because that is when people leave it (Jourdain:
 * 29,6 % of its day in 7h-10h against 21,3 % in 17h-20h). A workplace or a destination is
 * evening-led, because that is when people leave IT (Opéra: 3,6 % against 37,1 %). And nobody
 * boards a train to have lunch, which is why the midday swell the ticket expects exists at not
 * one station.
 *
 * So the reading below is built on the asymmetry the data carries, and `DIAGNOSTIC.md` §57
 * records the two migration comments that state the opposite — comments on a posted migration,
 * so the correction is one more migration and never a rewrite (`CLAUDE.md`).
 * ---------------------------------------------------------------------------------------
 */

import type { LeadReasonStatus } from './modes';
import type { FigureMotif } from './motif';
import type { Measured, Origin } from './provenance';
import { IDFM_PROFILE_ORIGIN, unavailable, withValue } from './provenance';

/**
 * The day-type code the reading is taken on: a term-time working day.
 *
 * The source publishes five (JOHV, JOVS, SAHV, SAVS, DIJFP) and the ingestion loads all five,
 * because loading them costs nothing extra. Only this one is read, and the screen says so: a
 * shape averaged over school holidays and Sundays would describe a week nobody works.
 */
export const RYTHME_DAY_TYPE = 'JOHV';

/**
 * One row of `compass_station_profile`, as the service hands it over.
 *
 * The bucket label is the source's own — `'8H-9H'`, `'23H-0H'` — kept verbatim rather than
 * reformatted, for the reason `20260907000002` keeps it verbatim in the column: a relabelled
 * bucket is a second spelling of a key, free to fall out of step with the one stored.
 */
export interface StationHourShare {
  catJour: string;
  hourBucket: string;
  /** Share of that station's own day, in percent. Never a count — see the header. */
  pct: number;
}

/** One hour of the day, with the share of the station's day that falls in it. */
export interface DayBucket {
  /** The hour the bucket opens on, 0 to 23, parsed from the source's label. */
  hour: number;
  /** The source's own label for the bucket, unchanged. */
  label: string;
  /** Share of the station's day, in percent. */
  pct: number;
}

/**
 * The three windows the reading compares, as half-open hour ranges.
 *
 * Declared rather than derived, and the reason is the one `LEAD_AXES` gives for its own order:
 * which hours count as « morning » is a product judgement about a working day, not a property
 * of the data. What IS derived is everything downstream — the sums, the ratio and the shape
 * all read this table, so moving a boundary moves the reading and the test together.
 *
 * `midi` is carried although no shape turns on it, because it is the window the ticket and two
 * migration comments expect to be decisive: the screen has to be able to show that it is not.
 */
export const RYTHME_WINDOWS = {
  matin: { from: 7, to: 10 },
  midi: { from: 11, to: 14 },
  soir: { from: 17, to: 20 },
} as const;

export type RythmeWindow = keyof typeof RYTHME_WINDOWS;

export const RYTHME_WINDOW_IDS = Object.keys(RYTHME_WINDOWS) as readonly RythmeWindow[];

/**
 * How far apart the two windows must be before the day is called led by one of them.
 *
 * **A margin and not a threshold on the share itself**, because the shares are already
 * normalised to one station's own day: only their ratio carries information. 1,15 is a
 * judgement and it is written here alone, so a reader who disagrees moves one number.
 *
 * What it buys, measured over the 258 stations on 17 September 2026: 39 morning-led, 43
 * two-peaked, 176 evening-led. Below it, two windows are not distinguishable given that a
 * station served by two lines has its profiles AVERAGED rather than weighted — the réserve
 * `20260907000002` states, which this module cannot repair and must not ignore.
 */
export const RYTHME_MARGIN = 1.15;

/**
 * The three shapes a day can be called, as a `const` array — same idiom as `MOTIF_KINDS`.
 *
 * A census reads its population here: the test that visits every shape, the copy table that
 * owes a sentence to each. A fourth shape without a sentence does not type-check.
 */
export const RYTHME_SHAPES = ['depart_matinal', 'deux_pointes', 'depart_du_soir'] as const;

export type RythmeShape = (typeof RYTHME_SHAPES)[number];

/** The shape of one station's working day, and how it was obtained. */
export interface DayShape {
  /** The station the profile belongs to, named. Never the address. */
  stationName: string;
  /** Metres from the address to that station. */
  distanceM: number;
  /** The day-type code the shape is read on. Always `RYTHME_DAY_TYPE` today. */
  dayType: string;
  /**
   * The buckets the source carries for this station, ordered by hour.
   *
   * **Not always 24, and an absent bucket is not a zero.** Measured on 17 September 2026:
   * 188 of the 258 stations carry all 24, 50 carry 23, 17 carry 22 and 3 carry 21 — and the
   * shares still sum to 100 %, so the missing buckets are hours the source recorded nothing
   * for. They are left out rather than filled with a measured 0, which is the rule
   * `scoring.ts` follows for a layer that did not answer.
   */
  buckets: readonly DayBucket[];
  /** The share of the day falling in each declared window, in percent. */
  windows: Readonly<Record<RythmeWindow, number>>;
  shape: RythmeShape;
  /**
   * What KIND of claim the shape's reading is — read off `LEAD_REASON_STATUSES`, the
   * enumeration `w6-mode-raison` (#197) established, never a sentence.
   *
   * `arbitrage` today, and the reason is in the ticket rather than assumed: Compass counts no
   * jobs. BDCom surveys ground-floor premises; the Filosofi 200 m grid counts residents where
   * they SLEEP. Nothing in the corpus counts a worker where they WORK. « A street of offices »
   * can therefore only be a deduction from a departure profile, never a measurement. What
   * would settle it is INSEE's employment-at-workplace, not loaded, published at IRIS —
   * coarser than a street, which is a limit to write rather than to hide.
   */
  status: LeadReasonStatus;
}

/** The hour a source bucket opens on, or `null` when the label is not one this module knows. */
export function bucketHour(label: string): number | null {
  // Anchored on both sides of the hour so the whole prefix must be digits and `10H-11H` cannot
  // be read as `1` — the failure shape `#165` shipped, where `(\d+)` on `10_000` returned 10.
  const hit = /^(\d{1,2})H-/.exec(label);
  if (!hit) return null;
  const hour = Number(hit[1]);
  return hour >= 0 && hour <= 23 ? hour : null;
}

/** The share of a day falling inside a half-open hour window. Absent buckets contribute nothing. */
function windowShare(buckets: readonly DayBucket[], window: RythmeWindow): number {
  const { from, to } = RYTHME_WINDOWS[window];
  return buckets
    .filter((b) => b.hour >= from && b.hour < to)
    .reduce((total, b) => total + b.pct, 0);
}

/**
 * Which of the three shapes a pair of window shares is, at the declared margin.
 *
 * Exported so the test can visit every shape without rebuilding a profile for each, and so the
 * rule is stated once. It compares morning against evening and nothing else: midday decides
 * nothing, because measurement says it never does — see the header.
 */
export function shapeOf(matin: number, soir: number): RythmeShape {
  if (matin > soir * RYTHME_MARGIN) return 'depart_matinal';
  if (soir > matin * RYTHME_MARGIN) return 'depart_du_soir';
  return 'deux_pointes';
}

/**
 * The reserve that travels with this figure, always.
 *
 * A station is not a street frontage, and the reserve is worth twice here what it is worth on
 * the distance axis: two addresses on either side of one stop receive the same shape of day
 * although the testimony that opened this ticket is precisely about what separates them. It is
 * a `caveats` entry and not a footnote, so it reaches the screen beside the figure, the export
 * inside the record, and the agent path in English — never on hover.
 */
export const RYTHME_CAVEATS: readonly FigureMotif[] = [{ kind: 'journee_de_station' }];

/**
 * The shape of the nearest station's day, or a figure that says why there is none.
 *
 * **It takes a DATE and builds its own origin, and that is the licence guard.** The caller
 * cannot hand it the wrong licence, because the caller never names one: `idfm_station` is
 * Licence Ouverte 2.0 (Etalab) and `idfm_validation_profile` is ODbL, the two are loaded by
 * one run and dated by one `ingestion_run` row, and copying the distance axis's licence onto
 * this figure would bind a redistributor to an obligation the data does not carry — or
 * release them from one it does. Passing the date rather than the origin makes that mistake
 * unavailable rather than merely tested, which is the standing question of a review here: a
 * correctif has to protect the consumer who does not exist yet.
 *
 * Zero rows is an ANSWER: no Paris station with a profile sits inside the radius. It carries
 * `aucun_arret_dans_rayon`, the motif the distance axis already uses for the same fact, so a
 * reader is told « there is none near » and never « the layer went silent ». A database that
 * could not be reached never gets here — it throws in the service, one level up.
 */
export function dayShape(
  rows: readonly StationHourShare[],
  station: { name: string | null; distanceM: number | null },
  /** `ingestion_run.source_as_of` for source `idfm`, read by the service. Never typed here. */
  asOf: string,
): Measured<DayShape> {
  const origin: Origin = IDFM_PROFILE_ORIGIN(asOf);
  const buckets = rows
    .filter((row) => row.catJour === RYTHME_DAY_TYPE)
    .flatMap((row) => {
      const hour = bucketHour(row.hourBucket);
      return hour === null ? [] : [{ hour, label: row.hourBucket, pct: row.pct }];
    })
    .sort((a, b) => a.hour - b.hour);

  if (buckets.length === 0 || station.name === null || station.distanceM === null) {
    return unavailable<DayShape>(origin, { kind: 'aucun_arret_dans_rayon' });
  }

  const windows = {
    matin: windowShare(buckets, 'matin'),
    midi: windowShare(buckets, 'midi'),
    soir: windowShare(buckets, 'soir'),
  };

  return withValue<DayShape>(
    {
      stationName: station.name,
      distanceM: station.distanceM,
      dayType: RYTHME_DAY_TYPE,
      buckets,
      windows,
      shape: shapeOf(windows.matin, windows.soir),
      // The reading is a deduction from a departure profile, and the core says so as a STATUS
      // rather than inside a sentence — the rule `w6-mode-raison` settled. Nothing here may
      // promote it to `mesure`: that would need a count of jobs the corpus does not hold, and
      // `rythme.test.ts` reddens the day someone writes it.
      status: 'arbitrage',
    },
    origin,
    // `measured`: the percentages are counted by the operator's own validation system. What is
    // a judgement is the READING of them, and that is what `status` carries — not the figure.
    'measured',
    RYTHME_CAVEATS,
  );
}
