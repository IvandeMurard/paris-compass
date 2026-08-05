import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { FAQ } from '@/content/faq';
import { SITE_URL } from '@/content/site';

const Faq = () => {
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
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'FAQ', item: `${SITE_URL}/faq` },
    ],
  };

  return (
    <>
      <Seo
        title="FAQ — locaux commerciaux et données ouvertes"
        description="Réponses aux questions fréquentes sur Compass : locaux vacants, scores de marchabilité, flux piéton, loyers de référence, qualité de l’air, sources et licences."
        path="/faq"
        jsonLd={[faqSchema, breadcrumb]}
      />
      <PageLayout
        title="Questions fréquentes"
        intro="Comment Compass fonctionne, ce que les données publiques permettent de dire sur un local commercial, et où sont leurs limites."
        crumbs={[{ label: 'FAQ' }]}
      >
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((item, i) => (
            <AccordionItem key={item.question} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">
                <h2 className="text-base font-semibold">{item.question}</h2>
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
