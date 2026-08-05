import { Helmet } from 'react-helmet-async';
import { SITE_NAME, SITE_URL } from '@/content/site';

interface SeoProps {
  title: string;
  description: string;
  /** Route path, e.g. "/faq". Used for canonical and og:url. */
  path: string;
  type?: 'website' | 'article';
  /** JSON-LD objects rendered for this route. */
  jsonLd?: Record<string, unknown>[];
  noindex?: boolean;
}

const Seo = ({ title, description, path, type = 'website', jsonLd = [], noindex }: SeoProps) => {
  const url = `${SITE_URL}${path === '/' ? '/' : path}`;
  const fullTitle = path === '/' ? title : `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="fr_FR" />
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
