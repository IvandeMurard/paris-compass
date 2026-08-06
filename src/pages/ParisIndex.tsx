import { Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { getArrondissements } from '@/content/localized';
import { SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';

const COPY = {
  fr: {
    title: 'Locaux commerciaux à Paris, arrondissement par arrondissement',
    description:
      'Explorez les 20 arrondissements de Paris : locaux commerciaux, commerces actifs, transports, environnement et loyers de référence, à partir de données publiques.',
    schemaName: 'Arrondissements de Paris',
    schemaNamePrefix: 'arrondissement',
    pageTitle: 'Paris, arrondissement par arrondissement',
    intro:
      'Chaque arrondissement mélange des situations très différentes. Ces pages donnent le cadre — quartiers, repères, environnement — avant d’ouvrir la carte sur la rue visée.',
    crumb: 'Paris',
  },
  en: {
    title: 'Commercial premises in Paris, borough by borough',
    description:
      'Explore the 20 arrondissements of Paris: commercial premises, active businesses, transport, environment and reference rents, based on public data.',
    schemaName: 'Arrondissements of Paris',
    schemaNamePrefix: 'arrondissement',
    pageTitle: 'Paris, borough by borough',
    intro:
      'Every arrondissement blends very different situations. These pages give the context — neighborhoods, landmarks, environment — before you open the map on the target street.',
    crumb: 'Paris',
  },
} as const;

const ParisIndex = () => {
  const { locale, lp } = useLocale();
  const c = COPY[locale];
  const ARRONDISSEMENTS = getArrondissements(locale);

  return (
    <>
      <Seo
        title={c.title}
        description={c.description}
        path="/paris"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: c.schemaName,
            itemListElement: ARRONDISSEMENTS.map((a, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `${a.label} ${c.schemaNamePrefix} — ${a.name}`,
              url: `${SITE_URL}/paris/${a.slug}`,
            })),
          },
        ]}
      />
      <PageLayout
        title={c.pageTitle}
        intro={c.intro}
        crumbs={[{ label: c.crumb }]}
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {ARRONDISSEMENTS.map((a) => (
            <li key={a.slug} className="rounded-lg border bg-white p-4">
              <Link to={lp(`/paris/${a.slug}`)} className="font-semibold hover:text-primary">
                {a.label} — {a.name}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{a.intro}</p>
            </li>
          ))}
        </ul>
      </PageLayout>
    </>
  );
};

export default ParisIndex;
