import { Helmet } from 'react-helmet-async';
import { SITE_NAME, SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';

interface SeoProps {
  title: string;
  description: string;
  /** Canonical (French) route path, e.g. "/faq". The locale prefix is added automatically. */
  path: string;
  type?: 'website' | 'article';
  /**
   * English path, when it is not the French one under /en.
   *
   * Every route but one mounts the English tree by prefixing the canonical path, so this stays
   * undefined. `/contexte/:slug` is the exception — its English route is `/en/context/:slug`,
   * decided in w6-contexte — and without an override the alternate and canonical links would
   * point at a URL that does not exist.
   */
  enPath?: string;
  /** JSON-LD objects rendered for this route. */
  jsonLd?: Record<string, unknown>[];
  noindex?: boolean;
}

const Seo = ({
  title,
  description,
  path,
  enPath: enPathOverride,
  type = 'website',
  jsonLd = [],
  noindex,
}: SeoProps) => {
  const { locale } = useLocale();
  const frPath = path === '/' ? '/' : path;
  const enPath = enPathOverride ?? (path === '/' ? '/en' : `/en${path}`);
  const url = `${SITE_URL}${locale === 'en' ? enPath : frPath}`;
  const fullTitle = path === '/' ? title : `${title} | ${SITE_NAME}`;

  return (
    <Helmet htmlAttributes={{ lang: locale }}>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <link rel="alternate" hrefLang="fr" href={`${SITE_URL}${frPath}`} />
      <link rel="alternate" hrefLang="en" href={`${SITE_URL}${enPath}`} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${frPath}`} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content={locale === 'en' ? 'en_GB' : 'fr_FR'} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {jsonLd.map((schema, i) => (
        <script type="application/ld+json" key={i}>
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default Seo;
