import { Link, useParams } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import NotFound from '@/pages/NotFound';
import { ARRONDISSEMENTS, getArrondissement } from '@/content/arrondissements';
import { SITE_URL } from '@/content/site';

const Arrondissement = () => {
  const { slug } = useParams();
  const a = getArrondissement(slug);

  if (!a) return <NotFound />;

  const path = `/paris/${a.slug}`;
  const title = `Local commercial ${a.label} arrondissement (${a.name})`;
  const description = `Chercher un local commercial dans le ${a.label} arrondissement de Paris (${a.name}) : quartiers, commerces actifs, transports, environnement et loyer de référence, à partir de données publiques.`;
  const neighbours = ARRONDISSEMENTS.filter((x) => x.slug !== a.slug).slice(0, 6);

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
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'Paris', item: `${SITE_URL}/paris` },
              { '@type': 'ListItem', position: 3, name: `${a.label} arrondissement`, item: `${SITE_URL}${path}` },
            ],
          },
        ]}
      />
      <PageLayout
        title={title}
        intro={a.intro}
        crumbs={[{ label: 'Paris', to: '/paris' }, { label: `${a.label} arrondissement` }]}
      >
        <section>
          <h2 className="text-xl font-semibold">Quartiers administratifs</h2>
          <p className="mt-3 text-muted-foreground">
            Le {a.label} arrondissement est découpé en quatre quartiers administratifs. C’est la
            maille utile pour comparer des emplacements : deux rues d’un même arrondissement peuvent
            avoir des environnements commerciaux très différents.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {a.quartiers.map((q) => (
              <li key={q} className="rounded-full border bg-white px-3 py-1 text-sm text-muted-foreground">
                {q}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Ce que Compass calcule ici</h2>
          <p className="mt-3 text-muted-foreground">
            En ouvrant la carte sur le {a.label} arrondissement, chaque local affiché est
            accompagné d’indicateurs recalculés en direct pour la zone visible :
          </p>
          <ul className="mt-3 list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Locaux vacants et commerces occupés repérés dans OpenStreetMap.</li>
            <li>Score de marchabilité sur 800 mètres : commerces, santé, transports, écoles, parcs.</li>
            <li>Flux piéton estimé à partir de la densité commerciale et de l’accès aux transports.</li>
            <li>Exposition estimée au bruit routier des axes proches.</li>
            <li>Qualité de l’air horaire : indice ATMO européen, PM2.5, NO₂.</li>
            <li>Risques naturels et technologiques recensés par Géorisques.</li>
            <li>Loyer de référence du quartier, en €/m²/mois (repère de niveau de marché).</li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            Les valeurs ne sont pas figées dans cette page : elles dépendent de la rue observée et
            sont recalculées à chaque déplacement de la carte.{' '}
            <Link className="text-primary underline" to="/methodologie">
              Voir la méthodologie
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Comment chercher dans le {a.label}</h2>
          <ol className="mt-3 list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Ouvrez la carte et centrez-la sur le quartier visé plutôt que sur l’arrondissement entier.</li>
            <li>Activez le filtre « locaux vacants » pour ne garder que les emplacements disponibles.</li>
            <li>Fixez un score minimum de commerces ou de transports selon votre activité.</li>
            <li>Comparez deux rues candidates sur le flux estimé et l’exposition au bruit.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Autres arrondissements</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {neighbours.map((n) => (
              <li key={n.slug}>
                <Link
                  to={`/paris/${n.slug}`}
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
