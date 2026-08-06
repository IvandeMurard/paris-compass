import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { getFaq } from '@/content/localized';
import { SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';

const COPY = {
  fr: {
    title: 'FAQ — locaux commerciaux et données ouvertes',
    description:
      'Réponses aux questions fréquentes sur Compass : locaux vacants, scores de marchabilité, flux piéton, loyers de référence, qualité de l’air, sources et licences.',
    home: 'Accueil',
    faq: 'FAQ',
    pageTitle: 'Questions fréquentes',
    intro:
      'Comment Compass fonctionne, ce que les données publiques permettent de dire sur un local commercial, et où sont leurs limites.',
  },
  en: {
    title: 'FAQ — commercial premises and open data',
    description:
      'Answers to frequently asked questions about Compass: vacant premises, walkability scores, foot traffic, reference rents, air quality, sources and licenses.',
    home: 'Home',
    faq: 'FAQ',
    pageTitle: 'Frequently asked questions',
    intro:
      'How Compass works, what public data can tell you about a commercial premises, and where its limits are.',
  },
} as const;

const Faq = () => {
  const { locale, lp } = useLocale();
  const c = COPY[locale];
  const FAQ = getFaq(locale);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: [item.answer, ...(item.details ?? [])].join(' '),
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: c.home, item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: c.faq, item: `${SITE_URL}/faq` },
    ],
  };

  return (
    <>
      <Seo
        title={c.title}
        description={c.description}
        path="/faq"
        jsonLd={[faqSchema, breadcrumb]}
      />
      <PageLayout
        title={c.pageTitle}
        intro={c.intro}
        crumbs={[{ label: c.faq }]}
      >
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((item, i) => (
            <AccordionItem key={item.question} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-[15px] leading-relaxed">
                <p className="font-medium text-foreground">{item.answer}</p>
                {item.details?.map((d) => (
                  <p key={d} className="text-muted-foreground">{d}</p>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </PageLayout>
    </>
  );
};

export default Faq;
