import { Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { getGuides } from '@/content/localized';
import { SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';

const COPY = {
  fr: {
    title: 'Guides : choisir un local commercial avec les données publiques',
    description:
      'Guides pratiques pour évaluer l’emplacement d’un local commercial, ouvrir un commerce à Paris et comprendre les références de loyers, à partir de données ouvertes.',
    schemaName: 'Guides Compass',
    pageTitle: 'Guides',
    intro:
      'Méthodes concrètes pour juger un emplacement, cadrer une zone de chalandise et lire les références de prix — en n’utilisant que des données publiques.',
    crumb: 'Guides',
    readGuide: 'Lire le guide',
  },
  en: {
    title: 'Guides: choosing a commercial premises with public data',
    description:
      'Practical guides for assessing the location of a commercial premises, opening a business in Paris and understanding reference rents, based on open data.',
    schemaName: 'Compass Guides',
    pageTitle: 'Guides',
    intro:
      'Concrete methods for judging a location, framing a catchment area and reading price references — using only public data.',
    crumb: 'Guides',
    readGuide: 'Read the guide',
  },
} as const;

const Guides = () => {
  const { locale, lp } = useLocale();
  const c = COPY[locale];
  const GUIDES = getGuides(locale);

  return (
    <>
      <Seo
        title={c.title}
        description={c.description}
        path="/guides"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: c.schemaName,
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
        title={c.pageTitle}
        intro={c.intro}
        crumbs={[{ label: c.crumb }]}
      >
        <ul className="space-y-4">
          {GUIDES.map((g) => (
            <li key={g.slug} className="rounded-lg border bg-white p-6">
              <h2 className="text-lg font-semibold">
                <Link to={lp(`/guides/${g.slug}`)} className="hover:text-primary">
                  {g.title}
                </Link>
              </h2>
              <p className="mt-2 text-muted-foreground">{g.description}</p>
              <Link to={lp(`/guides/${g.slug}`)} className="mt-3 inline-block text-sm text-primary underline">
                {c.readGuide}
              </Link>
            </li>
          ))}
        </ul>
      </PageLayout>
    </>
  );
};

export default Guides;
