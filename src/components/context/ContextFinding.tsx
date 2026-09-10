/**
 * One finding: a figure, a phrase, and a chevron that unfolds where the figure comes from.
 *
 * The chevron is a native `<details>`, not a tooltip and not a modal. Same reason
 * `MeasuredFigure` links its caveat instead of hovering it: provenance that only exists on
 * hover does not exist on a touch screen and does not survive being read aloud. Being open by
 * keyboard and printable is the point — this is the evidence, not a decoration.
 *
 * Nothing here holds a number. The value, its source, its licence, its vintage, its method and
 * its caveat all come off `Measured<T>`; the band phrase comes off `src/core/verdict.ts`. A
 * literal typed into this file would be a figure with no source, which is the one thing the
 * product refuses.
 */

import { ChevronRight } from 'lucide-react';
import { MeasuredScore } from '@/components/MeasuredFigure';
import { bandOf, noiseLabel, type Measured, type VerdictAxis } from '@/core';
import { AXIS_NAMES, AXIS_WHAT, CONTEXT_COPY } from '@/i18n/contextText';
import { useLocale } from '@/i18n/locale';

interface Props {
  axis: VerdictAxis;
  measured: Measured<number>;
  /** The clause the verdict would use for this axis, when it has a value. */
  phrase?: string;
}

const ContextFinding = ({ axis, measured, phrase }: Props) => {
  const { locale } = useLocale();
  const c = CONTEXT_COPY[locale];
  const name = AXIS_NAMES[locale][axis];

  // Noise is read on its own scale, in words rather than out of 100: an exposure figure is a
  // band, and showing "62/100" of road noise invites it to be compared with 62/100 of
  // walkability, which is a different claim entirely.
  const display =
    axis === 'noise' && measured.value !== null ? noiseLabel(measured.value) : undefined;

  return (
    <li className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {name}
        </h3>
        <p className="text-2xl font-semibold tabular-nums">
          <MeasuredScore measured={measured} display={display} />
        </p>
      </div>

      <p className="mt-1 text-base">
        {measured.value === null
          ? (measured.missingReason ?? c.whyMissing)
          : (phrase ?? bandOf(axis, measured.value))}
      </p>

      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronRight
            size={14}
            className="transition-transform group-open:rotate-90"
            aria-hidden
          />
          {c.provenance}
        </summary>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <dt className="font-medium">{c.source}</dt>
          <dd>{measured.source}</dd>
          <dt className="font-medium">{c.licence}</dt>
          <dd>{measured.licence}</dd>
          <dt className="font-medium">{c.asOf}</dt>
          <dd>{measured.asOf}</dd>
          <dt className="font-medium">{c.method}</dt>
          <dd>
            {measured.method} — {c.methods[measured.method]}
          </dd>
          {measured.note && (
            <>
              <dt className="font-medium">{c.caveat}</dt>
              <dd>{measured.note}</dd>
            </>
          )}
          {measured.missingReason && (
            <>
              <dt className="font-medium">{c.whyMissing}</dt>
              <dd>{measured.missingReason}</dd>
            </>
          )}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">{AXIS_WHAT[locale][axis]}</p>
      </details>
    </li>
  );
};

export default ContextFinding;
