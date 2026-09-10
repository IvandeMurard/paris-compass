/**
 * The verdict, or the refusal to give one.
 *
 * This component decides nothing. `composeVerdict` in `src/core/verdict.ts` already chose
 * between the two, wrote the sentence and named the axes it used; putting any of that here
 * would put it out of reach of the MCP server, and « la même réponse pour un agent » would
 * stop being true. What is left is layout and a link to the published rule.
 */

import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import type { Verdict } from '@/core';
import { AXIS_NAMES, CONTEXT_COPY } from '@/i18n/contextText';
import { useLocale } from '@/i18n/locale';

const ContextVerdict = ({ verdict }: { verdict: Verdict }) => {
  const { locale, lp } = useLocale();
  const c = CONTEXT_COPY[locale];
  const names = AXIS_NAMES[locale];

  if (verdict.kind === 'refus') {
    return (
      <section
        aria-labelledby="verdict"
        className="rounded-lg border border-amber-300 bg-amber-50 p-5"
      >
        <h2
          id="verdict"
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-800"
        >
          <AlertTriangle size={16} aria-hidden />
          {c.refusalHeading}
        </h2>
        <p className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">{verdict.sentence}</p>
        <p className="mt-2 text-sm text-amber-900">{c.refusalHelp}</p>
        <ul className="mt-3 space-y-1 text-sm text-amber-900">
          {verdict.missing.map((gap) => (
            <li key={gap.axis}>
              <span className="font-medium">{names[gap.axis]}</span> — {gap.reason}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-labelledby="verdict" className="rounded-lg border bg-white p-5">
      <h2
        id="verdict"
        className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {c.verdictHeading}
      </h2>
      <p className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">{verdict.sentence}</p>

      <p className="mt-3 text-sm text-muted-foreground">
        <span className="font-medium">
          {c.usedHeading}
          {c.colon}
        </span>{' '}
        {verdict.used.map((axis) => names[axis]).join(', ')}
      </p>
      {verdict.supporting.length > 0 && (
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-medium">
            {c.supportingHeading}
            {c.colon}
          </span>{' '}
          {verdict.supporting.map((clause) => clause.text).join(', ')}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        <Link to={lp('/methodologie')} className="underline decoration-dotted hover:text-primary">
          {c.methodLink}
        </Link>
      </p>
    </section>
  );
};

export default ContextVerdict;
