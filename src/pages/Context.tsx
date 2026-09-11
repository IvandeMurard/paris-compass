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
 * **What this page is NOT, yet.** Steps 3 to 6 of the ticket remain: the home page still holds
 * the map, there is no `/carte`, no `ContextMap`, no two-address comparison and no agent-parity
 * link. This half is purely additive on purpose — a new function and a new route, nothing
 * removed — so an interrupted session leaves the application whole.
 */

import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Map as MapIcon } from 'lucide-react';
import Seo from '@/components/Seo';
import SiteFooter from '@/components/SiteFooter';
import { Button } from '@/components/ui/button';
import ContextFinding from '@/components/context/ContextFinding';
import ContextGaps from '@/components/context/ContextGaps';
import ContextVerdict from '@/components/context/ContextVerdict';
import { composeVerdict, findingsFromScores, VERDICT_AXIS_ORDER } from '@/core';
import { useAddressContext, useAddressFromSlug } from '@/hooks/useAddressContext';
import { CONTEXT_COPY } from '@/i18n/contextText';
import { useLocale } from '@/i18n/locale';
import { contextPath, fromSlug, isResolvableSlug, pointFromParams } from '@/lib/addressSlug';
import { collectGaps } from '@/lib/contextGaps';

const Context = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
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
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Context;
