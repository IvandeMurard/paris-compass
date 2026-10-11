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
 *
 * **And nothing here holds a reason either.** Why an axis leads a trade is settled in
 * `src/core/modes.ts` and worded in `src/i18n/modeText.ts`; this file receives it already
 * assembled and decides only where it sits — w6-mode-raison (#197).
 */

import { ChevronRight } from 'lucide-react';
import { MeasuredScore } from '@/components/MeasuredFigure';
import { bandOf, missingText, noiseLabel, noteText, type Measured, type VerdictAxis } from '@/core';
import { AXIS_NAMES, AXIS_WHAT, CONTEXT_COPY } from '@/i18n/contextText';
import { translateLabel } from '@/i18n/labels';
import { useLocale } from '@/i18n/locale';
import type { LeadReasonText } from '@/i18n/modeText';

interface Props {
  axis: VerdictAxis;
  measured: Measured<number>;
  /** The clause the verdict would use for this axis, when it has a value. */
  phrase?: string;
  /**
   * True while every layer this axis reads is still in flight — w6-fiche-delai (#180).
   *
   * The card is rendered either way: a finding whose source has not answered yet keeps its
   * name, its place in the reading order and its provenance block. What it must not do is
   * borrow the words of an absence — `missingReason` says the layer « did not load », which is
   * a statement about a walk that has not finished.
   */
  pending?: boolean;
  /**
   * Why this axis leads the chosen trade — w6-mode-raison (#197). Absent when it does not lead,
   * and absent for every axis when no trade is chosen.
   *
   * **Already written, in the reader's language, by `src/i18n/modeText.ts`.** The ticket names
   * the fault it is avoiding: a reason composed here would be a reason the MCP server cannot
   * serve, and the server serves the same order.
   */
  lead?: LeadReasonText;
}

const ContextFinding = ({ axis, measured, phrase, pending = false, lead }: Props) => {
  const { locale } = useLocale();
  const c = CONTEXT_COPY[locale];
  const name = AXIS_NAMES[locale][axis];

  // Noise is read on its own scale, in words rather than out of 100: an exposure figure is a
  // band, and showing "62/100" of road noise invites it to be compared with 62/100 of
  // walkability, which is a different claim entirely. `noiseLabel` returns the canonical
  // English label the scoring services produce — translated here, never rendered raw, which is
  // what `translateLabel` exists for.
  const display =
    axis === 'noise' && measured.value !== null
      ? translateLabel(noiseLabel(measured.value), locale)
      : undefined;

  // The core's own words about this figure, in the reader's language — w6-langue-absences
  // (#181). `measured.note` and `measured.missingReason` are the English rendering of the same
  // motifs, kept for the agent path; rendering them here is what put « The road layer did not
  // load » on a page written entirely in French (`DIAGNOSTIC.md` §49).
  const why = missingText(measured, locale);
  const caveat = noteText(measured, locale);

  return (
    <li className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {name}
        </h3>
        <p className="text-2xl font-semibold tabular-nums">
          {pending && measured.value === null ? (
            <span className="text-muted-foreground" title={c.findingPending} aria-live="polite">
              …
            </span>
          ) : (
            <MeasuredScore measured={measured} display={display} />
          )}
        </p>
      </div>

      <p className="mt-1 text-base">
        {measured.value === null
          ? pending
            ? c.findingPending
            : (why ?? c.whyMissing)
          : (phrase ?? bandOf(axis, measured.value))}
      </p>

      {/* Beside the axis, never behind a chevron and never on hover — w6-mode-raison (#197).
          Same rule as the reserve markers: a justification that only exists on hover does not
          exist on a touch screen and does not survive being read aloud. The status rides in the
          heading rather than at the end of the sentence, so « a judgement » is read BEFORE the
          judgement it qualifies. */}
      {lead && (
        <div className="mt-3 rounded-md border border-dashed bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {lead.label} — {lead.status}
          </p>
          <p className="mt-1 text-sm">{lead.reason}</p>
          {lead.settles && (
            <p className="mt-1 text-xs text-muted-foreground">
              {lead.settlesLabel} — {lead.settles}
            </p>
          )}
        </div>
      )}

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
          {caveat && (
            <>
              <dt className="font-medium">{c.caveat}</dt>
              <dd>{caveat}</dd>
            </>
          )}
          {why && (
            <>
              <dt className="font-medium">{c.whyMissing}</dt>
              <dd>{why}</dd>
            </>
          )}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">{AXIS_WHAT[locale][axis]}</p>
      </details>
    </li>
  );
};

export default ContextFinding;
