import { Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { ARRONDISSEMENTS } from '@/content/arrondissements';
import { SITE_URL } from '@/content/site';

const ParisIndex = () => (
  <>
    <Seo
      title="Locaux commerciaux à Paris, arrondissement par arrondissement"
      description="Explorez les 20 arrondissements de Paris : locaux commerciaux, commerces actifs, transports, environnement et loyers de référence, à partir de données publiques."
      path="/paris"
      jsonLd={[
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Arrondissements de Paris',
          itemListElement: ARRONDISSEMENTS.map((a, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `${a.label} arrondissement — ${a.name}`,
            url: `${SITE_URL}/paris/${a.slug}`,
          })),
        },
      ]}
    />
    <PageLayout
      title="Paris, arrondissement par arrondissement"
      intro="Chaque arrondissement mélange des situations très différentes. Ces pages donnent le cadre — quartiers, repères, environnement — avant d’ouvrir la carte sur la rue visée."
      crumbs={[{ label: 'Paris' }]}
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {ARRONDISSEMENTS.map((a) => (
          <li key={a.slug} className="rounded-lg border bg-white p-4">
            <Link to={`/paris/${a.slug}`} className="font-semibold hover:text-primary">
              {a.label} — {a.name}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{a.intro}</p>
          </li>
        ))}
      </ul>
    </PageLayout>
  </>
);

export default ParisIndex;
