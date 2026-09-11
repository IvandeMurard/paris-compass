/**
 * `/` — one field, one sentence, three examples. w6-contexte (#119), step 3.
 *
 * **What was removed, and why.** This page used to be the map, the veil and three trust
 * pillars. A map answers *where should I look?*; the person Compass is built for arrives with
 * an address and a closed question — *does this one hold up?* — and every extra element above
 * the fold was an invitation to browse instead of to ask. The map is not gone, it is second:
 * `/carte`, linked below the fold for the visitor who genuinely has no address in mind. The
 * editorial content is not gone either — it was already on `/presentation`, and stays there.
 *
 * **Nothing else above the fold, and that is the whole specification.** The hero is a full
 * viewport, so the secondary links and the footer fall below it by construction rather than by
 * a designer's restraint that the next change would undo.
 *
 * **What this page deliberately does not do**: it does not score, does not read Overpass and
 * does not draw anything. It resolves an address through BAN and hands the point to
 * `/contexte/<slug>`, coordinates in the query so the sheet does not geocode a second time.
 */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Map as MapIcon, Search } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Seo from '@/components/Seo';
import SiteFooter from '@/components/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HOME_EXAMPLES, SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';
import { contextPath, toSlug } from '@/lib/addressSlug';
import { geocode } from '@/services/opendata/geocoding';

type Status = 'idle' | 'searching' | 'notFound';

const Index = () => {
  const { t, lp, locale } = useLocale();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const search = query.trim();
    if (search.length < 3) return;
    setStatus('searching');
    // A failed lookup is reported here rather than thrown at a boundary: « not in BAN » is an
    // answer about the address, not a breakdown of the site, and the visitor's next move is to
    // fix a spelling — which they cannot do on an error screen.
    try {
      const [match] = await geocode(search, 1);
      if (!match) {
        setStatus('notFound');
        return;
      }
      setStatus('idle');
      navigate(contextPath(match.label, match, locale));
    } catch {
      setStatus('notFound');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-customBg font-sans">
      <Seo
        title={t('home.metaTitle')}
        description={t('home.metaDescription')}
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Compass',
            url: locale === 'en' ? `${SITE_URL}/en` : SITE_URL,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            inLanguage: locale === 'en' ? 'en' : 'fr-FR',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            author: { '@type': 'Person', name: 'Ivan de Murard' },
            description: t('home.metaDescription'),
          },
        ]}
      />

      {/* The wordmark and the language switch, and nothing that competes with the field. The
          full navigation lives in the footer and on every other page. */}
      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-xl font-bold text-primary">Compass</span>
        <LanguageSwitcher />
      </div>

      <main className="flex flex-1 flex-col justify-center px-6 pb-20">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t('home.sentence')}
          </h1>

          <form onSubmit={submit} className="mt-8">
            <label htmlFor="address" className="sr-only">
              {t('home.fieldLabel')}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="address"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (status === 'notFound') setStatus('idle');
                  }}
                  placeholder={t('home.placeholder')}
                  autoComplete="street-address"
                  className="h-12 pl-10 text-base"
                />
              </div>
              <Button type="submit" size="lg" className="h-12" disabled={status === 'searching'}>
                {status === 'searching' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" aria-hidden />
                )}
                {t('home.submit')}
              </Button>
            </div>

            <p aria-live="polite" className="mt-2 min-h-5 text-sm text-muted-foreground">
              {status === 'searching' && t('home.searching')}
              {status === 'notFound' && t('home.notFound')}
            </p>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            <span className="mr-2">{t('home.examples')}</span>
            {HOME_EXAMPLES.map((example, i) => (
              <span key={example}>
                {i > 0 && <span aria-hidden> · </span>}
                {/* No coordinates: the sheet geocodes the slug and rewrites itself to the
                    canonical URL. See HOME_EXAMPLES for why none are written down. */}
                <Link
                  to={lp(`/contexte/${toSlug(example)}`)}
                  className="underline decoration-dotted hover:text-primary"
                >
                  {example}
                </Link>
              </span>
            ))}
          </p>
        </div>
      </main>

      {/* Below the fold, by construction: the map is second rank, not hidden. */}
      <section className="border-t bg-white">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t('home.noAddress')}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={lp('/carte')}>
                <MapIcon size={16} className="mr-2" aria-hidden />
                {t('home.openMap')}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to={lp('/presentation')}>{t('home.readMore')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Index;
