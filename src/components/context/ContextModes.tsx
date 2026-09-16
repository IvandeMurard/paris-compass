/**
 * The trade selector and its checklist — w6-modes (#36).
 *
 * **This component decides nothing.** Which axes lead, which checks belong to a trade, what
 * each check's state is and how each state reads are all settled in `src/core/modes.ts` and
 * `src/i18n/modeText.ts`, where they are tested without a DOM. What is left here is where the
 * pieces sit and which link a button carries.
 *
 * **The buttons are links, not state.** The mode lives in the query string (`src/lib/tradeMode.ts`),
 * so a sheet read as a shopkeeper can be sent to someone and arrive as the same sheet. Rendering
 * them as `<a>` also means the browser's own affordances — middle click, copy link, back —
 * work, which a `useState` toggle silently takes away.
 *
 * **No figure is typed here.** A count reaches the screen through `TradeCheck.measured`, with
 * its source, its licence and its date behind the same `<details>` chevron `ContextFinding`
 * uses — and for the same reason: provenance that only exists on hover does not exist on a
 * touch screen and does not survive being read aloud.
 */

import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { TRADE_MODES, type TradeCheck, type TradeMode } from '@/core';
import { CONTEXT_COPY } from '@/i18n/contextText';
import { CHECK_COPY, MODE_COPY, MODE_NAMES, checkStateText } from '@/i18n/modeText';
import { useLocale } from '@/i18n/locale';
import { cn } from '@/lib/utils';

interface Props {
  mode: TradeMode | null;
  /** The search string each button navigates to, already rewritten by `withTradeMode`. */
  hrefFor: (mode: TradeMode | null) => string;
  /** The resolved checklist, empty when no mode is chosen. */
  checks: readonly TradeCheck[];
}

const ContextModes = ({ mode, hrefFor, checks }: Props) => {
  const { locale } = useLocale();
  const c = MODE_COPY[locale];
  const provenance = CONTEXT_COPY[locale];

  return (
    <section aria-labelledby="modes" className="rounded-lg border bg-white p-5">
      <h2 id="modes" className="text-lg font-semibold">
        {c.heading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{c.intro}</p>

      {/* A radio group and not a tab list: these are four mutually exclusive readings of one
          page, and `aria-current` on a link is what tells a screen reader which one is on. */}
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={c.heading}>
        {TRADE_MODES.map((candidate) => (
          <Link
            key={candidate}
            to={{ search: hrefFor(candidate) }}
            aria-current={mode === candidate ? 'true' : undefined}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              mode === candidate
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-white hover:bg-muted',
            )}
          >
            {MODE_NAMES[locale][candidate]}
          </Link>
        ))}
        <Link
          to={{ search: hrefFor(null) }}
          aria-current={mode === null ? 'true' : undefined}
          title={c.clearHint}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm transition-colors',
            mode === null
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-white hover:bg-muted',
          )}
        >
          {c.clear}
        </Link>
      </div>

      {mode !== null && (
        <>
          <p className="mt-3 text-sm text-muted-foreground">{c.reorderNote}</p>

          <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {c.checklistHeading}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{c.checklistIntro}</p>

          <ul className="mt-3 space-y-3">
            {checks.map((check) => {
              const copy = CHECK_COPY[locale][check.id];
              return (
                <li key={check.id} className="border-l-2 border-muted pl-3">
                  <h4 className="text-sm font-semibold">{copy.name}</h4>
                  <p className="mt-0.5 text-sm">{checkStateText(check.id, check.state, locale)}</p>
                  {/* The reserve rides with a positive answer and the subject rides with an
                      absent one: a reader who is told nothing answers this wants to know what
                      « this » was, and a reader who is given a count wants to know what it does
                      not license them to conclude. */}
                  {check.state.kind === 'constate' && copy.reserve && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{copy.reserve}</p>
                  )}
                  {check.state.kind !== 'constate' && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{copy.about}</p>
                  )}

                  {check.measured && (
                    <details className="group mt-2">
                      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <ChevronRight
                          size={14}
                          className="transition-transform group-open:rotate-90"
                          aria-hidden
                        />
                        {provenance.provenance}
                      </summary>
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <dt className="font-medium">{provenance.source}</dt>
                        <dd>{check.measured.source}</dd>
                        <dt className="font-medium">{provenance.licence}</dt>
                        <dd>{check.measured.licence}</dd>
                        <dt className="font-medium">{provenance.asOf}</dt>
                        <dd>{check.measured.asOf}</dd>
                        <dt className="font-medium">{provenance.method}</dt>
                        <dd>
                          {check.measured.method} — {provenance.methods[check.measured.method]}
                        </dd>
                      </dl>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
};

export default ContextModes;
