/**
 * The shape of the nearest station's day, beside the six findings — w2-rythme (#208).
 *
 * **It is not a finding card, and the difference is structural rather than cosmetic.** A
 * `ContextFinding` renders a level out of 100 and the verdict composes bands out of those
 * levels. This block renders a distribution that has no level: it is a `<section>` of its own,
 * outside the `<ul>` of findings, and nothing in `src/core/verdict.ts` can reach it.
 *
 * Nothing here holds a number. The shares, the station, the licence and the vintage all come
 * off `Measured<DayShape>`; the sentences come off `src/i18n/rythmeText.ts`; the reserve comes
 * off the motif. A literal typed into this file would be a figure with no source.
 *
 * **The reserve and the reading are beside the figure, never behind a chevron and never on
 * hover** — criterion 3 of the ticket and the rule `ContextFinding` already follows for a lead
 * reason: a caveat that only exists on hover does not exist on a touch screen and does not
 * survive being read aloud. What sits under the chevron is the provenance block, which is the
 * evidence, not the caveat.
 *
 * **The chart is bars drawn in the DOM, no library.** A sparkline of 24 values does not earn a
 * chart dependency on a page whose critical path `#180` spent a ticket shortening, and an
 * `<ol>` of labelled bars is what a screen reader can actually read.
 */

import { ChevronRight } from 'lucide-react';
import {
  RYTHME_WINDOW_IDS,
  missingText,
  noteText,
  type DayShape,
  type Measured,
} from '@/core';
import { CONTEXT_COPY } from '@/i18n/contextText';
import { useLocale } from '@/i18n/locale';
import { RYTHME_COPY, rythmeReadingText } from '@/i18n/rythmeText';

interface Props {
  /**
   * The shape, or `null` when the whole layer was withheld.
   *
   * Three states and not two, the same distinction `#180` drew for a pending layer: `null` is
   * « the layer did not answer », a `Measured` whose value is null is « the layer answered and
   * there is no station in range », and a value is a shape. The first is a hole, the second is
   * a measurement, and flattening them would put « no rhythm here » on screen during an outage.
   */
  rythme: Measured<DayShape> | null;
}

/** One hour of the day as a labelled bar. The width is the share, so the bar IS the figure. */
const HourBar = ({ label, pct, max }: { label: string; pct: number; max: number }) => (
  <li className="flex items-center gap-2 text-xs">
    <span className="w-16 shrink-0 tabular-nums text-muted-foreground">{label}</span>
    <span className="flex h-3 flex-1 items-center" aria-hidden>
      <span
        className="h-3 rounded-sm bg-primary/70"
        style={{ width: `${max > 0 ? (pct / max) * 100 : 0}%` }}
      />
    </span>
    <span className="w-14 shrink-0 text-right tabular-nums">{pct.toFixed(1)} %</span>
  </li>
);

const ContextRythme = ({ rythme }: Props) => {
  const { locale } = useLocale();
  const c = RYTHME_COPY[locale];
  const cc = CONTEXT_COPY[locale];

  // The layer did not answer at all. A hole, and it says so — never a flat day.
  if (rythme === null) {
    return (
      <section aria-labelledby="rythme" className="rounded-lg border bg-white p-5">
        <h2 id="rythme" className="text-lg font-semibold">
          {c.heading}
        </h2>
        <p className="mt-2 text-base">{c.withheld}</p>
      </section>
    );
  }

  // The layer answered and found no station in range — criterion 6. The sentence is the
  // motif's, in the reader's language, which is the same one the distance axis already uses
  // for this exact fact: a reader is never told the layer went silent when it did not.
  const shape = rythme.value;
  const why = missingText(rythme, locale);
  const reserve = noteText(rythme, locale);

  if (shape === null) {
    return (
      <section aria-labelledby="rythme" className="rounded-lg border bg-white p-5">
        <h2 id="rythme" className="text-lg font-semibold">
          {c.heading}
        </h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{c.none}</p>
        <p className="mt-2 text-base">{why}</p>
      </section>
    );
  }

  const reading = rythmeReadingText(shape, locale);
  const max = shape.buckets.reduce((m, b) => Math.max(m, b.pct), 0);

  return (
    <section aria-labelledby="rythme" className="rounded-lg border bg-white p-5">
      <h2 id="rythme" className="text-lg font-semibold">
        {c.heading}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{c.intro}</p>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="font-medium text-muted-foreground">{c.station}</dt>
        <dd>{shape.stationName}</dd>
        <dt className="font-medium text-muted-foreground">{c.distance}</dt>
        <dd className="tabular-nums">{Math.round(shape.distanceM)} m</dd>
        <dt className="font-medium text-muted-foreground">{c.dayType}</dt>
        <dd>{shape.dayType}</dd>
      </dl>

      {/* The reserve travels with the figure and sits ABOVE it: « this is a station's day, not
          this shop's pavement » has to be read before the shape, not after it. */}
      {reserve && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {reserve}
        </p>
      )}

      <section aria-labelledby="rythme-fenetres" className="mt-4">
        <h3
          id="rythme-fenetres"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {c.windows}
        </h3>
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {/* The population is the core's, so a fourth window appears here the day it is
              declared there — never a list kept in this file. */}
          {RYTHME_WINDOW_IDS.map((id) => (
            <div key={id} className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">{c.windowNames[id]}</dt>
              <dd className="font-semibold tabular-nums">{shape.windows[id].toFixed(1)} %</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="rythme-heures" className="mt-4">
        <h3
          id="rythme-heures"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {c.chartLabel}
        </h3>
        <ol className="mt-2 space-y-1">
          {shape.buckets.map((b) => (
            <HourBar key={b.label} label={b.label} pct={b.pct} max={max} />
          ))}
        </ol>
      </section>

      {/* The reading, with the KIND of claim it is read off the enum and printed in the
          heading — so « a judgement » is read BEFORE the judgement it qualifies. Same
          arrangement as a lead reason, for the same reason. */}
      <div className="mt-4 rounded-md border border-dashed bg-muted/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {reading.label} — {reading.status}
        </p>
        <p className="mt-1 text-sm">{reading.reading}</p>
        <p className="mt-2 text-xs text-muted-foreground">{reading.middayNote}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {reading.settlesLabel} — {reading.settles}
        </p>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{c.limit}</p>

      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronRight size={14} className="transition-transform group-open:rotate-90" aria-hidden />
          {cc.provenance}
        </summary>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <dt className="font-medium">{cc.source}</dt>
          <dd>{rythme.source}</dd>
          {/* ODbL, and NOT the Licence Ouverte of the distance axis three cards above. The two
              datasets are loaded by one run and carry two obligations — `rythme.test.ts`
              refuses a shape stamped with the stop reference's licence. */}
          <dt className="font-medium">{cc.licence}</dt>
          <dd>{rythme.licence}</dd>
          <dt className="font-medium">{cc.asOf}</dt>
          <dd>{rythme.asOf}</dd>
          <dt className="font-medium">{cc.method}</dt>
          <dd>
            {rythme.method} — {cc.methods[rythme.method]}
          </dd>
          <dt className="font-medium">{c.scale}</dt>
          <dd>{c.scaleValue}</dd>
        </dl>
      </details>
    </section>
  );
};

export default ContextRythme;
