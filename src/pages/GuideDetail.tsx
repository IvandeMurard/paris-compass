import { useParams } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import NotFound from '@/pages/NotFound';
import { getGuide } from '@/content/guides';
import { SITE_URL } from '@/content/site';

const GuideDetail = () => {
  const { slug } = useParams();
  const guide = getGuide(slug);

  if (!guide) return <NotFound />;

  const path = `/guides/${guide.slug}`;

  return (
    <>
      <Seo
        title={guide.title}
        description={guide.description}
        path={path}
        type="article"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: guide.title,
            description: guide.description,
            dateModified: guide.updated,
            author: { '@type': 'Person', name: 'Ivan de Murard' },
            publisher: { '@type': 'Organization', name: 'Compass' },
            mainEntityOfPage: `${SITE_URL}${path}`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
              { '@type': 'ListItem', position: 3, name: guide.title, item: `${SITE_URL}${path}` },
            ],
          },
        ]}
      />
      <PageLayout
        title={guide.title}
        intro={guide.intro}
        crumbs={[{ label: 'Guides', to: '/guides' }, { label: guide.title }]}
      >
        {guide.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-semibold">{s.heading}</h2>
            <p className="mt-3 font-medium">{s.lead}</p>
            {s.bullets && (
              <ul className="mt-3 list-disc pl-5 space-y-1 text-muted-foreground">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            {s.paragraphs?.map((p) => (
              <p key={p} className="mt-3 text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        ))}
        <p className="text-muted-foreground">{guide.cta}</p>
      </PageLayout>
    </>
  );
};

export default GuideDetail;
