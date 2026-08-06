import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import HomeContent from '@/components/HomeContent';
import { getFaq } from '@/content/localized';
import { SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';

/** Editorial overview of the product, kept out of the map-first home page. */
const Presentation = () => {
  const { t, locale } = useLocale();
  const faq = getFaq(locale);

  return (
    <>
      <Seo
        title={t('presentation.metaTitle')}
        description={t('presentation.metaDescription')}
        path="/presentation"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.slice(0, 5).map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: t('nav.home'), item: `${SITE_URL}/` },
              {
                '@type': 'ListItem',
                position: 2,
                name: t('nav.presentation'),
                item: `${SITE_URL}/presentation`,
              },
            ],
          },
        ]}
      />
      <PageLayout
        title={t('presentation.title')}
        intro={t('presentation.intro')}
        crumbs={[{ label: t('nav.presentation') }]}
      >
        <HomeContent />
      </PageLayout>
    </>
  );
};

export default Presentation;
