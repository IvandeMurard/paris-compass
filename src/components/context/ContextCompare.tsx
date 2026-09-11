/**
 * Two addresses side by side — w6-contexte (#119), step 6.
 *
 * This component decides nothing about the comparison: `compareAddresses` in
 * `src/core/comparison.ts` built the rows, marked the incomparable ones and composed both
 * verdicts. What is left here is a table and a sentence saying that no winner is named.
 *
 * **The bound of two is upstream of this file.** The core takes two arguments and returns an
 * `a` and a `b`; there is no list to render, so there is no loop over addresses to widen. The
 * page supplies the second address from one query parameter, and refuses outright when the URL
 * carries more than one.
 *
 * **No arrow, no highlight, no « better ».** A visual emphasis on the higher band would be a
 * ranking applied in CSS, and it would say exactly what `docs/PERIMETRE.md` §4 refuses to say:
 * that the two axes can be weighed against each other without knowing the trade.
 */

import type { Comparison, ComparisonCell } from '@/core';
import { AXIS_NAMES, CONTEXT_COPY } from '@/i18n/contextText';
import { useLocale } from '@/i18n/locale';

const Cell = ({ cell, incomparable }: { cell: ComparisonCell; incomparable: string }) => {
  if (cell.kind === 'absent') {
    return (
      <span className="text-muted-foreground">
        <span className="font-medium">{incomparable}</span> — {cell.reason}
      </span>
    );
  }
  return <span>{cell.text}</span>;
};

interface ContextCompareProps {
  comparison: Comparison;
  /** The two labels, named rather than indexed — the same refusal as the core's signature. */
  labelA: string;
  labelB: string;
}

const ContextCompare = ({ comparison, labelA, labelB }: ContextCompareProps) => {
  const { locale } = useLocale();
  const c = CONTEXT_COPY[locale];
  const names = AXIS_NAMES[locale];

  return (
    <section aria-labelledby="comparison" className="rounded-lg border bg-white p-5">
      <h2 id="comparison" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {c.compareHeading}
      </h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.compareThis}</p>
          <p className="text-sm font-medium">{labelA}</p>
          <p className="mt-1 text-sm">{comparison.a.verdict.sentence}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.compareOther}</p>
          <p className="text-sm font-medium">{labelB}</p>
          <p className="mt-1 text-sm">{comparison.b.verdict.sentence}</p>
        </div>
      </div>

      {/* A wide table must scroll inside its own box, never make the page scroll sideways. */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-medium">
                {c.findingsHeading}
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                {labelA}
              </th>
              <th scope="col" className="py-2 font-medium">
                {labelB}
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.axis} className="border-b align-top last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-medium">
                  {names[row.axis]}
                </th>
                <td className="py-2 pr-3">
                  <Cell cell={row.a} incomparable={c.compareIncomparable} />
                </td>
                <td className="py-2">
                  <Cell cell={row.b} incomparable={c.compareIncomparable} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{c.compareNoWinner}</p>
    </section>
  );
};

export default ContextCompare;
