import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { GLOSSARY } from '@/content/glossary';
import { SITE_URL } from '@/content/site';

const Glossary = () => (
  <>
    <Seo
      title="Glossaire des indicateurs et des données"
      description="Définitions des indicateurs Compass : marchabilité, flux piéton estimé, EAQI, PM2.5, NO₂, local vacant, loyer de référence, IRIS, ODbL, Licence Ouverte."
      path="/glossaire"
      jsonLd={[
        {
          '@context': 'https://schema.org',
          '@type': 'DefinedTermSet',
          name: 'Glossaire Compass',
          url: `${SITE_URL}/glossaire`,
          hasDefinedTerm: GLOSSARY.map((g) => ({
            '@type': 'DefinedTerm',
            name: g.term,
            description: g.definition,
          })),
        },
      ]}
    />
    <PageLayout
      title="Glossaire"
      intro="Les termes et indicateurs employés dans Compass, définis en une phrase."
      crumbs={[{ label: 'Glossaire' }]}
    >
      <dl className="space-y-6">
        {GLOSSARY.map((g) => (
          <div key={g.term} className="rounded-lg border bg-white p-5">
            <dt className="font-semibold">{g.term}</dt>
            <dd className="mt-2 text-muted-foreground">{g.definition}</dd>
          </div>
        ))}
      </dl>
    </PageLayout>
  </>
);

export default Glossary;
