import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { getGlossary } from '@/content/localized';
import { SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';

const COPY = {
  fr: {
    title: 'Glossaire des indicateurs et des données',
    description:
      'Définitions des indicateurs Compass : marchabilité, flux piéton estimé, EAQI, PM2.5, NO₂, local vacant, loyer de référence, IRIS, ODbL, Licence Ouverte.',
    schemaName: 'Glossaire Compass',
    pageTitle: 'Glossaire',
    intro: 'Les termes et indicateurs employés dans Compass, définis en une phrase.',
    crumb: 'Glossaire',
  },
  en: {
    title: 'Glossary of indicators and data',
    description:
      'Definitions of Compass indicators: walkability, estimated foot traffic, EAQI, PM2.5, NO₂, vacant premises, reference rent, IRIS, ODbL, Licence Ouverte.',
    schemaName: 'Compass Glossary',
    pageTitle: 'Glossary',
    intro: 'The terms and indicators used in Compass, defined in a sentence.',
    crumb: 'Glossary',
  },
} as const;

const Glossary = () => {
  const { locale, lp } = useLocale();
  const c = COPY[locale];
  const GLOSSARY = getGlossary(locale);

  return (
    <>
      <Seo
        title={c.title}
        description={c.description}
        path="/glossaire"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'DefinedTermSet',
            name: c.schemaName,
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
        title={c.pageTitle}
        intro={c.intro}
        crumbs={[{ label: c.crumb }]}
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
};

export default Glossary;
