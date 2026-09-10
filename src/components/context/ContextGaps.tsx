/**
 * « Ce que Compass ne sait pas ici » — a block, not a footnote.
 *
 * Deliberately given the same weight as the findings above it. The gaps are the credibility
 * argument: every one of them is computed from what this page actually read, by
 * `collectGaps`, and none of them is a disclaimer that would read identically on every
 * address. The decision of what belongs here lives in `src/lib/contextGaps.ts` so it can be
 * tested; this file only puts it on screen.
 */

import type { Gap } from '@/lib/contextGaps';
import { CONTEXT_COPY } from '@/i18n/contextText';
import { useLocale } from '@/i18n/locale';

const ContextGaps = ({ gaps }: { gaps: readonly Gap[] }) => {
  const { locale } = useLocale();
  const c = CONTEXT_COPY[locale];

  return (
    <section aria-labelledby="gaps" className="rounded-lg border border-dashed bg-white p-5">
      <h2 id="gaps" className="text-lg font-semibold">
        {c.gapsHeading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{c.gapsIntro}</p>
      {gaps.length === 0 ? (
        <p className="mt-3 text-sm">{c.noGaps}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {gaps.map((gap) => (
            <li key={gap.key} className="border-l-2 border-muted pl-3">
              {gap.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ContextGaps;
