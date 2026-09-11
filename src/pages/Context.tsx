/**
 * `/contexte/:slug` — the context sheet of one address, and the product itself.
 *
 * **Route shape.** The slug comes from the BAN label; the coordinates ride in the query string
 * so an ordinary visit does not pay for a second geocoding. A URL typed by hand carries no
 * coordinates, so it geocodes once and then replaces itself with the canonical one — which is
 * also how this route is tested, since nothing links to it yet.
 *
 * **`noindex`, decided by Ivan on 10 September 2026, and what it costs.** These pages are
 * generated, one per address consulted, and a search engine penalises mass production of
 * near-identical pages across the whole domain. So the product itself is not discoverable by
 * search: nobody lands here looking for « commerce rue de Bretagne », and the site is found
 * only through the sitemap's editorial URLs. An indexable middle level — the quartier, or the
 * street, never the address — stays open and is deliberately not decided here.
 *
 * **What the page holds, in reading order.** The verdict or its refusal, the findings each with
 * its provenance chevron, what Compass does not know *here*, the 400 m map in support, the
 * comparison with at most one second address, and the MCP call that answers the same question.
 * Steps 3 to 6 of the ticket, completed 11 September 2026.
 *
 * **The comparison is bounded to two, and the bound is structural.** `compareAddresses` takes
 * two arguments and returns an `a` and a `b`; the URL carries one `compare=` key, and a URL
 * naming several is refused rather than truncated to its first value. See
 * `secondAddressFromParams`.
 */

import { Suspense, lazy, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Map as MapIcon, X } from 'lucide-react';
import Seo from '@/components/Seo';
import SiteFooter from '@/components/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ContextAgentCall from '@/components/context/ContextAgentCall';
import ContextCompare from '@/components/context/ContextCompare';
import ContextFinding from '@/components/context/ContextFinding';
import ContextGaps from '@/components/context/ContextGaps';
import ContextVerdict from '@/components/context/ContextVerdict';
import {
  compareAddresses,
  compareToolCall,
  composeVerdict,
  contextToolCall,
  findingsFromScores,
  VERDICT_AXIS_ORDER,
} from '@/core';
import { useAddressContext, useAddressFromSlug } from '@/hooks/useAddressContext';
import { CONTEXT_COPY } from '@/i18n/contextText';
import { useLocale } from '@/i18n/locale';
import {
  contextPath,
  fromSlug,
  isResolvableSlug,
  pointFromParams,
  secondAddressFromParams,
  withComparison,
} from '@/lib/addressSlug';
import { collectGaps } from '@/lib/contextGaps';
import { geocode } from '@/services/opendata/geocoding';

// Leaflet is loaded only once a sheet has figures to illustrate. Criterion 3 asks that the
// verdict and the findings be readable without scrolling; a mapping library in the critical
// path of that first paint would be the one thing able to delay it.
const ContextMap = lazy(() => import('@/components/context/ContextMap'));

/**
 * The field that attaches a second address.
 *
 * It resolves the address itself and hands the caller a label and a point, so the URL gets the
 * canonical coordinates rather than a slug the sheet would have to geocode again. It cannot
 * attach a third: `withComparison` rewrites the comparison keys instead of appending them.
 */
const CompareField = ({
  onResolved,
}: {
  onResolved: (label: string, point: { lat: number; lng: number }) => void;
}) => {
  const { locale } = useLocale();
  const c = CONTEXT_COPY[locale];
  const [query, setQuery] = useState('');
  const [state, setState] = useState<'idle' | 'searching' | 'notFound'>('idle');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const search = query.trim();
    if (search.length < 3) return;
    setState('searching');
    try {
      const [match] = await geocode(search, 1);
      if (!match) {
        setState('notFound');
        return;
      }
      setState('idle');
      setQuery('');
      onResolved(match.label, match);
    } catch {
      setState('notFound');
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
      <label htmlFor="compare-address" className="sr-only">
        {c.compareOther}
      </label>
      <Input
        id="compare-address"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (state === 'notFound') setState('idle');
        }}
        placeholder={c.comparePlaceholder}
        className="flex-1"
      />
      <Button type="submit" variant="outline" disabled={state === 'searching'}>
        {c.compareSubmit}
      </Button>
      <p aria-live="polite" className="sr-only">
        {state === 'notFound' ? c.compareNotFound : ''}
      </p>
    </form>
  );
};

const Context = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  // The raw query string, kept so the comparison keys are rewritten into the URL the visitor is
  // actually on — the coordinates of the first address must survive attaching a second.
  const { search: querySearch } = useLocation();
  const navigate = useNavigate();
  const { locale, lp } = useLocale();
  const c = CONTEXT_COPY[locale];

  const fromUrl = pointFromParams(params);
  const search = isResolvableSlug(slug) ? fromSlug(slug) : '';
  const geocoded = useAddressFromSlug(search, true);

  /**
   * The point is the URL's when the URL carries one, and the geocoder never overrides it.
   *
   * That is what « coordinates in the query to avoid a re-geocoding » buys, and it is the half
   * that matters: the figures below do not depend on BAN answering, do not drift if BAN
   * re-ranks its results, and start loading before the geocoder has said anything.
   *
   * The LABEL is a different question, and it is why the geocoder still runs. A slug has lost
   * its capitals and its accents for good; rebuilding « 12 Rue de Bretagne » from
   * `12-rue-de-bretagne` would mean inventing them, and the heading of the page would then be
   * a string that looks measured and is not. BAN is the only thing that knows the real label,
   * the answer is cached for a day, and until it arrives the de-slugified text stands in.
   */
  const point = fromUrl ?? (geocoded.data ? { lat: geocoded.data.lat, lng: geocoded.data.lng } : null);
  const label = geocoded.data?.label ?? search;

  // A hand-typed URL lands on the canonical one, so a reload, a share or a back button all
  // resolve to the same page without asking BAN again.
  useEffect(() => {
    if (fromUrl === null && geocoded.data) {
      navigate(contextPath(geocoded.data.label, geocoded.data, locale), { replace: true });
    }
  }, [fromUrl, geocoded.data, locale, navigate]);

  const context = useAddressContext(point);

  const verdict = useMemo(
    () =>
      context.data
        ? composeVerdict(findingsFromScores(context.data.scores, context.data.withheldBy), locale)
        : null,
    [context.data, locale],
  );

  const gaps = useMemo(
    () =>
      context.data
        ? collectGaps(
            context.data.scores,
            context.data.loaded,
            context.data.origins.premises.source,
            locale,
          )
        : [],
    [context.data, locale],
  );

  const phrases = useMemo(() => {
    const byAxis = new Map<string, string>();
    if (verdict?.kind === 'compose') {
      for (const clause of [...verdict.clauses, ...verdict.supporting]) {
        byAxis.set(clause.axis, clause.text);
      }
    }
    return byAxis;
  }, [verdict]);

  const notFound = fromUrl === null && geocoded.isFetched && !geocoded.data;

  // ── The second address, bounded to one. See `secondAddressFromParams` for why the plural is
  // read and refused rather than silently truncated to the first value.
  const second = secondAddressFromParams(params);
  const secondSearch = second.kind === 'one' ? fromSlug(second.slug) : '';
  const secondGeocoded = useAddressFromSlug(secondSearch, second.kind === 'one');
  const secondPoint =
    second.kind === 'one'
      ? (second.point ??
        (secondGeocoded.data ? { lat: secondGeocoded.data.lat, lng: secondGeocoded.data.lng } : null))
      : null;
  const secondLabel = secondGeocoded.data?.label ?? secondSearch;
  const secondContext = useAddressContext(secondPoint);

  const comparison = useMemo(
    () =>
      context.data && secondContext.data
        ? compareAddresses(
            findingsFromScores(context.data.scores, context.data.withheldBy),
            findingsFromScores(secondContext.data.scores, secondContext.data.withheldBy),
            locale,
          )
        : null,
    [context.data, secondContext.data, locale],
  );

  // The invocation shown to a visitor is the comparison's when there is one, the sheet's
  // otherwise — one call, matching what the page is actually displaying.
  const agentCall =
    point && secondPoint ? compareToolCall(point, secondPoint) : point ? contextToolCall(point) : null;

  return (
    <div className="min-h-screen bg-customBg font-sans flex flex-col">
      <Seo
        title={label ? `${c.metaTitle} — ${label}` : c.metaTitle}
        description={c.metaDescription}
        path={`/contexte/${slug ?? ''}`}
        noindex
      />

      <header className="bg-white border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link to={lp('/')} className="text-xl font-bold text-primary">
            Compass
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to={lp('/carte')}>
              <MapIcon size={16} className="mr-2" />
              {c.backToMap}
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.address}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{label}</h1>
          {point && (
            <p className="mt-1 text-xs text-muted-foreground">
              {c.coords} {point.lat.toFixed(5)}, {point.lng.toFixed(5)} — BAN (Etalab)
            </p>
          )}

          {notFound && <p className="mt-8 text-base">{c.notFound}</p>}

          {!notFound && context.isPending && (
            <p className="mt-8 text-base text-muted-foreground">{c.loading}</p>
          )}

          {verdict && context.data && (
            <div className="mt-6 space-y-6">
              <ContextVerdict verdict={verdict} />

              <section aria-labelledby="findings">
                <h2 id="findings" className="text-lg font-semibold">
                  {c.findingsHeading}
                </h2>
                <ul className="mt-3 space-y-3">
                  {VERDICT_AXIS_ORDER.map((axis) => (
                    <ContextFinding
                      key={axis}
                      axis={axis}
                      measured={context.data.scores[axis]}
                      phrase={phrases.get(axis)}
                    />
                  ))}
                </ul>
              </section>

              <ContextGaps gaps={gaps} />

              {point && (
                <Suspense fallback={null}>
                  <ContextMap
                    point={point}
                    points={context.data.points}
                    scores={context.data.scores}
                    loaded={context.data.loaded}
                  />
                </Suspense>
              )}

              {comparison && (
                <ContextCompare comparison={comparison} labelA={label} labelB={secondLabel} />
              )}

              <section aria-labelledby="compare-form" className="rounded-lg border bg-white p-5">
                <h2
                  id="compare-form"
                  className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {c.compareHeading}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{c.compareHelp}</p>

                {second.kind === 'refus' && (
                  <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    {c.compareTooMany}
                  </p>
                )}

                {second.kind === 'one' && secondContext.isPending && (
                  <p className="mt-3 text-sm text-muted-foreground">{c.compareLoading}</p>
                )}

                {second.kind === 'one' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate({ search: withComparison(querySearch, null, null) })}
                  >
                    <X size={14} className="mr-1" aria-hidden />
                    {c.compareClear}
                  </Button>
                ) : (
                  <CompareField
                    onResolved={(l, p) => navigate({ search: withComparison(querySearch, l, p) })}
                  />
                )}
              </section>

              {agentCall && <ContextAgentCall call={agentCall} />}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Context;
