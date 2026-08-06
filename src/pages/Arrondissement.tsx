import { Link, useParams } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import NotFound from '@/pages/NotFound';
import { getArrondissements, getArrondissementBySlug } from '@/content/localized';
import { SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';

const COPY = {
  fr: {
    home: 'Accueil',
    paris: 'Paris',
    arrondissementSuffix: 'arrondissement',
    localTitle: (a: { label: string; name: string }) => `Local commercial ${a.label} arrondissement (${a.name})`,
    description: (a: { label: string; name: string }) =>
      `Chercher un local commercial dans le ${a.label} arrondissement de Paris (${a.name}) : quartiers, commerces actifs, transports, environnement et loyer de référence, à partir de données publiques.`,
    quartiersTitle: 'Quartiers administratifs',
    quartiersText: (label: string) =>
      `Le ${label} arrondissement est découpé en quatre quartiers administratifs. C’est la maille utile pour comparer des emplacements : deux rues d’un même arrondissement peuvent avoir des environnements commerciaux très différents.`,
    computesTitle: 'Ce que Compass calcule ici',
    computesIntro: (label: string) =>
      `En ouvrant la carte sur le ${label} arrondissement, chaque local affiché est accompagné d’indicateurs recalculés en direct pour la zone visible :`,
    bullets: [
      'Locaux vacants et commerces occupés repérés dans OpenStreetMap.',
      'Score de marchabilité sur 800 mètres : commerces, santé, transports, écoles, parcs.',
      'Flux piéton estimé à partir de la densité commerciale et de l’accès aux transports.',
      'Exposition estimée au bruit routier des axes proches.',
      'Qualité de l’air horaire : indice ATMO européen, PM2.5, NO₂.',
      'Risques naturels et technologiques recensés par Géorisques.',
      'Loyer de référence du quartier, en €/m²/mois (repère de niveau de marché).',
    ],
    computesOutro1: 'Les valeurs ne sont pas figées dans cette page : elles dépendent de la rue observée et sont recalculées à chaque déplacement de la carte.',
    seeMethodology: 'Voir la méthodologie',
    searchTitle: (label: string) => `Comment chercher dans le ${label}`,
    steps: [
      'Ouvrez la carte et centrez-la sur le quartier visé plutôt que sur l’arrondissement entier.',
      'Activez le filtre « locaux vacants » pour ne garder que les emplacements disponibles.',
      'Fixez un score minimum de commerces ou de transports selon votre activité.',
      'Comparez deux rues candidates sur le flux estimé et l’exposition au bruit.',
    ],
    othersTitle: 'Autres arrondissements',
  },
  en: {
    home: 'Home',
    paris: 'Paris',
    arrondissementSuffix: 'arrondissement',
    localTitle: (a: { label: string; name: string }) => `Commercial premises in the ${a.label} arrondissement (${a.name})`,
    description: (a: { label: string; name: string }) =>
      `Looking for a commercial premises in the ${a.label} arrondissement of Paris (${a.name}): neighborhoods, active businesses, transport, environment and reference rent, based on public data.`,
    quartiersTitle: 'Administrative neighborhoods',
    quartiersText: (label: string) =>
      `The ${label} arrondissement is divided into four administrative neighborhoods (quartiers). This is the useful scale for comparing locations: two streets in the same arrondissement can have very different commercial environments.`,
    computesTitle: 'What Compass calculates here',
    computesIntro: (label: string) =>
      `When you open the map on the ${label} arrondissement, every premises shown comes with indicators recalculated live for the visible area:`,
    bullets: [
      'Vacant premises and occupied businesses identified in OpenStreetMap.',
      'Walkability score within 800 meters: shops, healthcare, transport, schools, parks.',
      'Estimated foot traffic based on commercial density and access to transport.',
      'Estimated exposure to road traffic noise from nearby roads.',
      'Hourly air quality: European ATMO index, PM2.5, NO₂.',
      'Natural and technological risks listed by Géorisques.',
      'Reference rent for the neighborhood, in €/m²/month (market-level benchmark).',
    ],
    computesOutro1: 'These values are not fixed on this page: they depend on the street being viewed and are recalculated every time the map moves.',
    seeMethodology: 'See the methodology',
    searchTitle: (label: string) => `How to search in the ${label}`,
    steps: [
      'Open the map and center it on the target neighborhood rather than the whole arrondissement.',
      'Turn on the "vacant premises" filter to keep only available locations.',
      'Set a minimum score for shops or transport depending on your business.',
      'Compare two candidate streets on estimated foot traffic and noise exposure.',
    ],
    othersTitle: 'Other arrondissements',
  },
} as const;

const Arrondissement = () => {
  const { slug } = useParams();
  const { locale, lp } = useLocale();
  const c = COPY[locale];
  const a = getArrondissementBySlug(locale, slug);

  if (!a) return <NotFound />;

  const path = `/paris/${a.slug}`;
  const title = c.localTitle(a);
  const description = c.description(a);
  const neighbours = getArrondissements(locale).filter((x) => x.slug !== a.slug).slice(0, 6);

  return (
    <>
      <Seo
        title={title}
        description={description}
        path={path}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Place',
            name: `${a.label} arrondissement de Paris — ${a.name}`,
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Paris',
              addressCountry: 'FR',
            },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: a.center.lat,
              longitude: a.center.lng,
            },
            url: `${SITE_URL}${path}`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: c.home, item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: c.paris, item: `${SITE_URL}/paris` },
              { '@type': 'ListItem', position: 3, name: `${a.label} ${c.arrondissementSuffix}`, item: `${SITE_URL}${path}` },
            ],
          },
        ]}
      />
      <PageLayout
        title={title}
        intro={a.intro}
        crumbs={[{ label: c.paris, to: '/paris' }, { label: `${a.label} ${c.arrondissementSuffix}` }]}
      >
        <section>
          <h2 className="text-xl font-semibold">{c.quartiersTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.quartiersText(a.label)}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {a.quartiers.map((q) => (
              <li key={q} className="rounded-full border bg-white px-3 py-1 text-sm text-muted-foreground">
                {q}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.computesTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.computesIntro(a.label)}</p>
          <ul className="mt-3 list-disc pl-5 space-y-1 text-muted-foreground">
            {c.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="mt-3 text-muted-foreground">
            {c.computesOutro1}{' '}
            <Link className="text-primary underline" to={lp('/methodologie')}>
              {c.seeMethodology}
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.searchTitle(a.label)}</h2>
          <ol className="mt-3 list-decimal pl-5 space-y-1 text-muted-foreground">
            {c.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.othersTitle}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {neighbours.map((n) => (
              <li key={n.slug}>
                <Link
                  to={lp(`/paris/${n.slug}`)}
                  className="rounded-full border bg-white px-3 py-1 text-sm text-primary hover:underline"
                >
                  {n.label} — {n.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </PageLayout>
    </>
  );
};

export default Arrondissement;
