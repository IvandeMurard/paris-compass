import { Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { GUIDES } from '@/content/guides';
import { SITE_URL } from '@/content/site';

const Guides = () => (
  <>
    <Seo
      title="Guides : choisir un local commercial avec les données publiques"
      description="Guides pratiques pour évaluer l’emplacement d’un local commercial, ouvrir un commerce à Paris et comprendre les références de loyers, à partir de données ouvertes."
      path="/guides"
      jsonLd={[
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Guides Compass',
          itemListElement: GUIDES.map((g, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: g.title,
            url: `${SITE_URL}/guides/${g.slug}`,
          })),
        },
      ]}
    />
    <PageLayout
      title="Guides"
      intro="Méthodes concrètes pour juger un emplacement, cadrer une zone de chalandise et lire les références de prix — en n’utilisant que des données publiques."
      crumbs={[{ label: 'Guides' }]}
    >
      <ul className="space-y-4">
        {GUIDES.map((g) => (
          <li key={g.slug} className="rounded-lg border bg-white p-6">
            <h2 className="text-lg font-semibold">
              <Link to={`/guides/${g.slug}`} className="hover:text-primary">
                {g.title}
              </Link>
            </h2>
            <p className="mt-2 text-muted-foreground">{g.description}</p>
            <Link to={`/guides/${g.slug}`} className="mt-3 inline-block text-sm text-primary underline">
              Lire le guide
            </Link>
          </li>
        ))}
      </ul>
    </PageLayout>
  </>
);

export default Guides;
